import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function getOrCreateSharedList(userA, userB) {
  // Normalize order so (A,B) and (B,A) map to the same row
  const [a, b] = [userA, userB].sort()
  const { data: existing } = await sb.from('shared_lists').select('*').eq('user_a', a).eq('user_b', b).maybeSingle()
  if (existing) return existing
  const { data: created, error } = await sb.from('shared_lists').insert({ user_a: a, user_b: b }).select().single()
  if (error) throw error
  return created
}

export default async function handler(req, res) {
  const { user_id } = req.query
  if (!user_id) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    // Personal items (no household, no shared list)
    const { data: personal, error: e1 } = await sb.from('cart_items')
      .select('*').eq('user_id', user_id).is('household_id', null).is('shared_list_id', null)
      .order('created_at', { ascending: false })
    if (e1) return res.status(500).json({ error: e1.message })

    // Household items (if user is in an active household)
    const { data: membership } = await sb.from('household_members')
      .select('household_id').eq('user_id', user_id).eq('status', 'active').maybeSingle()
    let household = []
    if (membership) {
      const { data: hhItems } = await sb.from('cart_items')
        .select('*').eq('household_id', membership.household_id).order('created_at', { ascending: false })
      household = hhItems || []
    }

    // Friend shared lists — find all shared_lists rows this user is part of
    const { data: lists } = await sb.from('shared_lists')
      .select('*').or(`user_a.eq.${user_id},user_b.eq.${user_id}`)

    // Get this user's dismissals for the home page
    const { data: dismissals } = await sb.from('shared_list_dismissals')
      .select('shared_list_id').eq('user_id', user_id)
    const dismissedIds = new Set((dismissals || []).map(d => d.shared_list_id))

    const sharedLists = []
    for (const list of (lists || [])) {
      const friendId = list.user_a === user_id ? list.user_b : list.user_a
      const { data: friendProfile } = await sb.from('profiles')
        .select('display_name,username,avatar_url').eq('id', friendId).single()
      const { data: items } = await sb.from('cart_items')
        .select('*').eq('shared_list_id', list.id).order('created_at', { ascending: false })

      // Resolve added_by / bought_by names for each item
      const userIds = [...new Set((items || []).flatMap(i => [i.added_by, i.bought_by]).filter(Boolean))]
      let nameMap = {}
      if (userIds.length > 0) {
        const { data: profiles } = await sb.from('profiles').select('id,display_name,username').in('id', userIds)
        profiles?.forEach(p => { nameMap[p.id] = p.display_name || p.username })
      }
      const enrichedItems = (items || []).map(i => ({
        ...i,
        added_by_name: nameMap[i.added_by] || null,
        bought_by_name: nameMap[i.bought_by] || null
      }))

      sharedLists.push({
        id: list.id,
        friend_id: friendId,
        friend_name: friendProfile?.display_name || friendProfile?.username || 'Friend',
        items: enrichedItems,
        dismissed_from_home: dismissedIds.has(list.id)
      })
    }

    return res.status(200).json({ personal, household, sharedLists })
  }

  if (req.method === 'POST') {
    const { action } = req.body

    if (action === 'dismiss_shared_list') {
      const { shared_list_id } = req.body
      const { error } = await sb.from('shared_list_dismissals')
        .upsert({ shared_list_id, user_id }, { onConflict: 'shared_list_id,user_id' })
      if (error) {
        console.error('Dismiss shared list error:', error)
        return res.status(500).json({ error: error.message })
      }
      return res.status(200).json({ ok: true })
    }

    const { items, household_id, shared_list_id, friend_id } = req.body
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' })

    let targetSharedListId = shared_list_id
    if (!targetSharedListId && friend_id) {
      const list = await getOrCreateSharedList(user_id, friend_id)
      targetSharedListId = list.id
    }

    const rows = items.map(i => ({
      user_id,
      name: i.name,
      qty: i.qty || '',
      category: i.category || 'Other',
      source: i.source || 'manual',
      checked: false,
      household_id: household_id || null,
      shared_list_id: targetSharedListId || null,
      added_by: (household_id || targetSharedListId) ? user_id : null
    }))

    for (const row of rows) {
      let q = sb.from('cart_items').select('id').ilike('name', row.name)
      if (row.shared_list_id) q = q.eq('shared_list_id', row.shared_list_id)
      else if (row.household_id) q = q.eq('household_id', row.household_id)
      else q = q.eq('user_id', user_id).is('household_id', null).is('shared_list_id', null)
      const { data: ex } = await q.maybeSingle()
      if (!ex) await sb.from('cart_items').insert(row)
    }

    return res.status(200).json({ ok: true, shared_list_id: targetSharedListId })
  }

  if (req.method === 'PATCH') {
    const { id, checked, qty } = req.body
    const update = {}
    if (checked !== undefined) {
      update.checked = checked
      // Look up the item first to know if it's a shared/household item needing a bought_by stamp
      const { data: item } = await sb.from('cart_items').select('household_id,shared_list_id').eq('id', id).single()
      if (item && (item.household_id || item.shared_list_id)) {
        update.bought_by = checked ? user_id : null
      }
    }
    if (qty !== undefined) update.qty = qty
    const { error } = await sb.from('cart_items').update(update).eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const { id, clearChecked, household_id, shared_list_id } = req.body
    if (clearChecked) {
      let q = sb.from('cart_items').delete().eq('checked', true)
      if (shared_list_id) q = q.eq('shared_list_id', shared_list_id)
      else if (household_id) q = q.eq('household_id', household_id)
      else q = q.eq('user_id', user_id).is('household_id', null).is('shared_list_id', null)
      await q
    } else {
      await sb.from('cart_items').delete().eq('id', id)
    }
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
