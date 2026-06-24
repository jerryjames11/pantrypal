import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  const { user_id } = req.query
  if (!user_id) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    // Step 1: find the user's active membership (use maybeSingle + order to handle stale dupes gracefully)
    const { data: memberships, error: memErr } = await sb.from('household_members')
      .select('*').eq('user_id', user_id).eq('status', 'active').order('joined_at', { ascending: false })
    if (memErr) console.error('Membership lookup error:', memErr)
    const membership = memberships?.[0] || null
    if (!membership) return res.status(200).json({ household: null, members: [], pendingRequests: [] })

    // Step 2: get household details
    const { data: household, error: hhErr } = await sb.from('households')
      .select('*').eq('id', membership.household_id).single()
    if (hhErr) console.error('Household lookup error:', hhErr)

    // Step 3: get all active members
    const { data: memberRows } = await sb.from('household_members')
      .select('*').eq('household_id', membership.household_id).eq('status', 'active')

    // Step 4: fetch profiles for all members separately
    const memberIds = (memberRows || []).map(m => m.user_id)
    let memberProfileMap = {}
    if (memberIds.length > 0) {
      const { data: profiles } = await sb.from('profiles')
        .select('id,username,display_name,avatar_url').in('id', memberIds)
      profiles?.forEach(p => { memberProfileMap[p.id] = p })
    }
    const members = (memberRows || []).map(m => ({
      ...m, profile: memberProfileMap[m.user_id] || null
    }))

    // Step 5: pending join requests (owner only)
    let pendingRequests = []
    if (household?.owner_id === user_id) {
      const { data: pendingRows } = await sb.from('household_members')
        .select('*').eq('household_id', membership.household_id).eq('status', 'pending_approval')
      const pendingIds = (pendingRows || []).map(m => m.user_id)
      let pendingProfileMap = {}
      if (pendingIds.length > 0) {
        const { data: pendingProfiles } = await sb.from('profiles')
          .select('id,username,display_name,avatar_url').in('id', pendingIds)
        pendingProfiles?.forEach(p => { pendingProfileMap[p.id] = p })
      }
      pendingRequests = (pendingRows || []).map(m => ({
        ...m, profile: pendingProfileMap[m.user_id] || null
      }))
    }

    return res.status(200).json({ household, members, pendingRequests })
  }

  if (req.method === 'POST') {
    const { action } = req.body

    if (action === 'create') {
      const { name } = req.body
      // Guard: don't allow creating a second household while already in one
      const { data: existing } = await sb.from('household_members')
        .select('household_id').eq('user_id', user_id).eq('status', 'active').maybeSingle()
      if (existing) {
        return res.status(409).json({ error: 'You are already in a household. Leave it first to create a new one.' })
      }
      console.log('Creating household:', name, 'for user:', user_id)
      const { data: hh, error } = await sb.from('households').insert({ name, owner_id: user_id }).select().single()
      if (error) {
        console.error('Household insert error:', error)
        return res.status(500).json({ error: error.message })
      }
      console.log('Household created:', hh)
      const { error: memberError } = await sb.from('household_members').insert({ household_id: hh.id, user_id, role: 'owner', status: 'active', joined_at: new Date().toISOString() })
      if (memberError) {
        console.error('Member insert error:', memberError)
        // Roll back the household if we couldn't add the owner as a member
        await sb.from('households').delete().eq('id', hh.id)
        return res.status(500).json({ error: `Failed to set up household membership: ${memberError.message}` })
      }
      console.log('Owner membership created successfully')
      return res.status(200).json({ household: hh })
    }

    if (action === 'invite') {
      const { household_id, invitee_id } = req.body
      const { data: hh } = await sb.from('households').select('name,owner_id').eq('id', household_id).single()
      if (hh?.owner_id !== user_id) return res.status(403).json({ error: 'Only the owner can invite' })

      console.log('Inviting:', invitee_id, 'to household:', household_id)
      const { data: upsertResult, error } = await sb.from('household_members')
        .upsert(
          { household_id, user_id: invitee_id, role: 'member', status: 'pending' },
          { onConflict: 'household_id,user_id' }
        )
        .select()
      if (error) {
        console.error('Invite upsert error:', error)
        return res.status(500).json({ error: error.message })
      }
      console.log('Invite upsert result:', upsertResult)

      const { data: inviterProfile } = await sb.from('profiles').select('display_name').eq('id', user_id).single()
      const { error: notifError } = await sb.from('notifications').insert({
        user_id: invitee_id, type: 'household_invite',
        title: 'Household invitation',
        body: `${inviterProfile?.display_name || 'Someone'} invited you to join "${hh.name}"`,
        data: { household_id, household_name: hh.name, from_user: user_id }
      })
      if (notifError) {
        console.error('Invite notification insert error:', notifError)
        return res.status(500).json({ error: `Member added but notification failed: ${notifError.message}` })
      }
      console.log('Invite notification sent to:', invitee_id)
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
      try {
        // Guard: don't allow joining a second household while already in one
        const { data: existing } = await sb.from('household_members')
          .select('household_id').eq('user_id', user_id).eq('status', 'active').neq('household_id', household_id).maybeSingle()
        if (existing) {
          return res.status(409).json({ error: 'You are already in a household. Leave it first to join a new one.' })
        }

        const { data: profile } = await sb.from('profiles').select('display_name').eq('id', user_id).single()
        const userName = profile?.display_name || 'User'

        // Migrate personal pantry items to household pantry as "[Name]'s Items" category
        const { data: personalItems, error: fetchErr } = await sb.from('pantry_items')
          .select('*').eq('user_id', user_id).is('household_id', null)
        if (fetchErr) console.error('Fetch personal items error:', fetchErr)

        if (personalItems?.length > 0) {
          const migratedItems = personalItems.map(item => {
            const { id, ...rest } = item // properly strip id instead of setting to undefined
            return {
              ...rest,
              household_id,
              category: `${userName}'s Items`,
              updated_at: new Date().toISOString()
            }
          })
          const { error: insertErr } = await sb.from('pantry_items').insert(migratedItems)
          if (insertErr) console.error('Migrate items insert error:', insertErr)

          const { error: updateErr } = await sb.from('pantry_items').update({ category: `__migrated_${household_id}` })
            .eq('user_id', user_id).is('household_id', null)
          if (updateErr) console.error('Mark migrated error:', updateErr)
        }

        const { error: memberErr } = await sb.from('household_members')
          .update({ status: 'active', joined_at: new Date().toISOString() })
          .eq('household_id', household_id).eq('user_id', user_id)
        if (memberErr) {
          console.error('Member activation error:', memberErr)
          return res.status(500).json({ error: memberErr.message })
        }

        return res.status(200).json({ ok: true })
      } catch (err) {
        console.error('accept_invite crashed:', err)
        return res.status(500).json({ error: 'Failed to join household' })
      }
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
