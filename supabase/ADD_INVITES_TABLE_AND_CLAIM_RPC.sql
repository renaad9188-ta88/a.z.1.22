-- Invites system for bulk WhatsApp outreach (admin-managed).
-- Run in Supabase SQL Editor.

-- 1) Table
CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invite_token uuid NOT NULL DEFAULT uuid_generate_v4(),
  full_name text,
  phone text NOT NULL,
  whatsapp_phone text,
  country text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','queued','sent','joined','failed','opted_out')),
  invited_at timestamptz,
  joined_at timestamptz,
  joined_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS invites_invite_token_key ON public.invites(invite_token);
CREATE UNIQUE INDEX IF NOT EXISTS invites_phone_key ON public.invites(phone);
CREATE INDEX IF NOT EXISTS invites_status_idx ON public.invites(status);
CREATE INDEX IF NOT EXISTS invites_created_at_idx ON public.invites(created_at DESC);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- 2) Policies (admin only) — relies on profiles(role='admin')
DROP POLICY IF EXISTS "Admins manage invites" ON public.invites;
CREATE POLICY "Admins manage invites"
  ON public.invites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND lower(coalesce(p.role, 'user')) = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND lower(coalesce(p.role, 'user')) = 'admin'
    )
  );

-- 3) RPC to claim invite after signup (safe for authenticated users)
CREATE OR REPLACE FUNCTION public.claim_invite(p_invite_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  did boolean := false;
BEGIN
  IF auth.uid() IS NULL OR p_invite_token IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.invites
  SET
    status = 'joined',
    joined_user_id = auth.uid(),
    joined_at = now(),
    updated_at = now()
  WHERE invite_token = p_invite_token
    AND joined_user_id IS NULL
    AND status IN ('new','queued','sent')
  RETURNING true INTO did;

  RETURN COALESCE(did, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_invite(uuid) TO authenticated;


