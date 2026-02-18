export type InviteRow = {
  id: string
  invite_token: string
  full_name: string | null
  phone: string
  whatsapp_phone: string | null
  country: string | null
  status: 'new' | 'queued' | 'sent' | 'joined' | 'failed' | 'opted_out'
  invited_at: string | null
  joined_at: string | null
  joined_user_id: string | null
  notes: string | null
  batch_id: string | null
  batch_scheduled_at: string | null
  batch_sent_at: string | null
  manually_confirmed_sent?: boolean | null
  confirmed_sent_by?: string | null
  confirmed_sent_at?: string | null
  confirmed_sent_role?: 'admin' | 'supervisor' | null
  created_at: string
  updated_at: string
}

export type ImportItem = {
  full_name: string | null
  phone: string
  whatsapp_phone: string | null
  country: string | null
}

