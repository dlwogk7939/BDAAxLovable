import { supabase } from '../lib/supabaseClient'

export interface DrinkStatusPayload {
  roomId: string
  userName: string
  bac: number
  level: number
}

export interface DrinkStatusRow {
  id: number
  room_id: string
  user_name: string | null
  bac: number | null
  level: number | null
  updated_at: string | null
}

export async function shareDrinkStatus(payload: DrinkStatusPayload) {
  if (!payload.roomId) {
    throw new Error('roomId is required')
  }

  return supabase.from('drinks').insert({
    room_id: payload.roomId,
    user_name: payload.userName,
    bac: payload.bac,
    level: payload.level,
    updated_at: new Date().toISOString(),
  })
}

export async function fetchRoomDrinks(roomId: string) {
  if (!roomId) {
    throw new Error('roomId is required')
  }

  const { data, error } = await supabase
    .from('drinks')
    .select('id, room_id, user_name, bac, level, updated_at')
    .eq('room_id', roomId)
    .order('updated_at', { ascending: false })

  if (error) {
    throw error
  }

  return data as DrinkStatusRow[]
}

interface DrinkSubscriptionCallbacks {
  onInsert: (row: DrinkStatusRow) => void
}

export function subscribeToDrinks(roomId: string, callbacks: DrinkSubscriptionCallbacks) {
  const channel = supabase
    .channel(`public:drinks:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'drinks', filter: `room_id=eq.${roomId}` },
      (payload) => {
        callbacks.onInsert(payload.new as DrinkStatusRow)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
