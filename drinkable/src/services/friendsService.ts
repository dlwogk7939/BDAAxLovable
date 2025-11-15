import { supabase } from '../lib/supabaseClient'

export interface FriendProfile {
  id: string
  name: string
  heightCm: number
  weightKg: number
  avgTolerance: string
  currentBac: number
}

export type FriendsTableRow = {
  id: string
  name: string
  height_cm: number
  weight_kg: number
  avg_tolerance: string
  current_bac: number | null
}

const mapFriendRow = (row: FriendsTableRow): FriendProfile => ({
  id: row.id,
  name: row.name,
  heightCm: row.height_cm,
  weightKg: row.weight_kg,
  avgTolerance: row.avg_tolerance,
  currentBac: row.current_bac ?? 0,
})

export const sortFriendsByName = (list: FriendProfile[]) =>
  [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

export async function fetchFriends() {
  const { data, error } = await supabase
    .from('friends')
    .select('id,name,height_cm,weight_kg,avg_tolerance,current_bac')
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return sortFriendsByName((data as FriendsTableRow[]).map(mapFriendRow))
}

interface FriendSubscriptionCallbacks {
  onUpsert: (friend: FriendProfile) => void
  onDelete: (id: string) => void
}

export function subscribeToFriends(callbacks: FriendSubscriptionCallbacks) {
  const channel = supabase
    .channel('public:friends')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'friends' },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const deletedId = (payload.old as FriendsTableRow | null)?.id
          if (deletedId) {
            callbacks.onDelete(deletedId)
          }
          return
        }

        const newRow = payload.new as FriendsTableRow | null
        if (!newRow) {
          return
        }
        callbacks.onUpsert(mapFriendRow(newRow))
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
