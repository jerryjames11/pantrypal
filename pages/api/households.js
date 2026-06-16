import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  const { user_id } = req.query
  if (!user_id) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { data: membership } = await sb.from('household_members')
      .select('*, household:households(*)')
      .eq('user_id', user_id).eq('status', 'active').single()
    if (!membership) return res.status(200).json({ household: null, members: [], pendingRequests: [] })

    const { data: members } = await sb.from('household_members')
      .select('*, profile:profiles(id,display_name,username,avatar_url)')
      .eq('household_id', membership.household_id).eq('status', 'active')

    // Get pending join requests (only for owner)
    let pendingRequests = []
    if (membership.household?.owner_id === user_id) {
      const { data: pending } = await sb.from('household_members')
        .select('*, profile:profiles(id,display_name,username,avatar_url)')
        .eq('household_id', membership.household_id).eq('status', 'pending_approval')
      pendingRequests = pending || []
    }

    return res.status(200).json({ household: membership.household, members: members || [], pendingRequests })
  }

  if (req.method === 'POST') {
    const { action } = req.body

    if (action === 'create') {
      const { name } = req.body
      const { data: hh, error } = await sb.from('households').insert({ name, owner_id: user_id }).select().single()
      if (error) return res.status(500).json({ error: error.message })
      await sb.from('household_members').insert({ household_id: hh.id, user_id, role: 'owner', status: 'active', joined_at: new Date().toISOString() })
      return res.status(200).json({ household: hh })
    }

    if (action === 'invite') {
      const { household_id, invitee_id } = req.body
      const { data: hh } = await sb.from('households').select('name,owner_id').eq('id', household_id).single()
      if (hh?.owner_id !== user_id) return res.status(403).json({ error: 'Only the owner can invite' })
      const { error } = await sb.from('household_members').upsert({ household_id, user_id: invitee_id, role: 'member', status: 'pending' })
      if (error) return res.status(500).json({ error: error.message })
      const { data: inviterProfile } = await sb.from('profiles').select('display_name').eq('id', user_id).single()
      await sb.from('notifications').insert({
        user_id: invitee_id, type: 'household_invite',
        title: 'Household invitation',
        body: `${inviterProfile?.display_name || 'Someone'} invited you to join "${hh.name}"`,
        data: { household_id, household_name: hh.name, from_user: user_id }
      })
      return res.status(200).json({ ok: true })
    }

    if (action === 'request_join') {
      // Non-invited user requests to join — goes to pending_approval
      const { household_id } = req.body
      const { data: hh } = await sb.from('households').select('name,owner_id').eq('id', household_id).single()
      if (!hh) return res.status(404).json({ error: 'Household not found' })
      const { error } = await sb.from('household_members').upsert({ household_id, user_id, role: 'member', status: 'pending_approval' })
      if (error) return res.status(500).json({ error: error.message })
      const { data: requesterProfile } = await sb.from('profiles').select('display_name,username').eq('id', user_id).single()
      await sb.from('notifications').insert({
        user_id: hh.owner_id, type: 'household_join_request',
        title: 'Household join request',
        body: `${requesterProfile?.display_name || 'Someone'} wants to join "${hh.name}"`,
        data: { household_id, household_name: hh.name, from_user: user_id }
      })
      return res.status(200).json({ ok: true })
    }

    if (action === 'approve_join') {
      const { household_id, member_id } = req.body
      const { data: hh } = await sb.from('households').select('owner_id').eq('id', household_id).single()
      if (hh?.owner_id !== user_id) return res.status(403).json({ error: 'Only owner can approve' })
      await sb.from('household_members').update({ status: 'active', joined_at: new Date().toISOString() }).eq('household_id', household_id).eq('user_id', member_id)
      return res.status(200).json({ ok: true })
    }

    if (action === 'reject_join') {
      const { household_id, member_id } = req.body
      const { data: hh } = await sb.from('households').select('owner_id').eq('id', household_id).single()
      if (hh?.owner_id !== user_id) return res.status(403).json({ error: 'Only owner can reject' })
      await sb.from('household_members').delete().eq('household_id', household_id).eq('user_id', member_id)
      return res.status(200).json({ ok: true })
    }

    if (action === 'accept_invite') {
      const { household_id } = req.body
      const { data: profile } = await sb.from('profiles').select('display_name').eq('id', user_id).single()
      const userName = profile?.display_name || 'User'

      // Migrate personal pantry items to household pantry as "[Name]'s Items" category
      const { data: personalItems } = await sb.from('pantry_items')
        .select('*').eq('user_id', user_id).is('household_id', null)

      if (personalItems?.length > 0) {
        const migratedItems = personalItems.map(item => ({
          ...item,
          id: undefined,
          household_id,
          category: `${userName}'s Items`,
          updated_at: new Date().toISOString()
        }))
        await sb.from('pantry_items').insert(migratedItems)
        // Mark personal items as migrated (set a flag via category name)
        await sb.from('pantry_items').update({ category: `__migrated_${household_id}` })
          .eq('user_id', user_id).is('household_id', null)
      }

      await sb.from('household_members').update({ status: 'active', joined_at: new Date().toISOString() }).eq('household_id', household_id).eq('user_id', user_id)
      return res.status(200).json({ ok: true })
    }

    if (action === 'decline_invite') {
      const { household_id } = req.body
      await sb.from('household_members').update({ status: 'left' }).eq('household_id', household_id).eq('user_id', user_id)
      return res.status(200).json({ ok: true })
    }

    if (action === 'leave') {
      const { household_id } = req.body
      const { data: profile } = await sb.from('profiles').select('display_name').eq('id', user_id).single()
      const userName = profile?.display_name || 'User'
      const migratedCategory = `${userName}'s Items`

      // Move items back to personal pantry
      const { data: myItems } = await sb.from('pantry_items')
        .select('*').eq('user_id', user_id).eq('household_id', household_id).eq('category', migratedCategory)

      if (myItems?.length > 0) {
        const restoredItems = myItems.map(item => ({
          ...item, id: undefined, household_id: null,
          category: 'Imported', updated_at: new Date().toISOString()
        }))
        await sb.from('pantry_items').insert(restoredItems)
        await sb.from('pantry_items').delete().eq('user_id', user_id).eq('household_id', household_id).eq('category', migratedCategory)
      }

      // Restore any previously migrated personal items
      await sb.from('pantry_items').update({ category: 'Uncategorized', household_id: null })
        .eq('user_id', user_id).like('category', `__migrated_%`)

      await sb.from('household_members').update({ status: 'left' }).eq('household_id', household_id).eq('user_id', user_id)
      return res.status(200).json({ ok: true })
    }

    if (action === 'remove_member') {
      const { household_id, member_id } = req.body
      const { data: hh } = await sb.from('households').select('owner_id').eq('id', household_id).single()
      if (hh?.owner_id !== user_id) return res.status(403).json({ error: 'Only owner can remove members' })
      await sb.from('household_members').update({ status: 'left' }).eq('household_id', household_id).eq('user_id', member_id)
      return res.status(200).json({ ok: true })
    }

    if (action === 'delete') {
      const { household_id } = req.body
      const { data: hh } = await sb.from('households').select('owner_id').eq('id', household_id).single()
      if (hh?.owner_id !== user_id) return res.status(403).json({ error: 'Only owner can delete' })
      await sb.from('households').delete().eq('id', household_id)
      return res.status(200).json({ ok: true })
    }
  }

  res.status(405).end()
}
