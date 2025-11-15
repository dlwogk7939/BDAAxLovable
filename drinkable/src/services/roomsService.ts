import { supabase } from '../lib/supabaseClient'

export async function ensureRoom(code: string) {
  const trimmed = code.trim()
  if (!trimmed) {
    throw new Error('Room code is required')
  }

  const { data, error } = await supabase
    .from('rooms')
    .upsert({ code: trimmed }, { onConflict: 'code' })
    .select('id')
    .single()

  if (error) {
    throw error
  }

  return data.id as string
}

export async function fetchRoomByCode(code: string) {
  const trimmed = code.trim()
  if (!trimmed) {
    throw new Error('Room code is required')
  }

  const { data, error } = await supabase
    .from('rooms')
    .select('id, code, created_at')
    .eq('code', trimmed)
    .single()

  if (error) {
    throw error
  }

  return data
}
