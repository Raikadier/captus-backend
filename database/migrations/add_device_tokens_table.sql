-- Migration: add_device_tokens_table
-- Phase 3 — FCM Push Notifications
-- Stores FCM registration tokens per device/user.
-- A user may have multiple devices (mobile + tablet), so one row per token.
--
-- SAFE TO RUN: uses IF NOT EXISTS / OR REPLACE everywhere.
-- Consistent with existing schema: references public.users (same as
-- notifications, notification_preferences, tasks, etc.)

CREATE TABLE IF NOT EXISTS public.device_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,           -- FCM registration token
  platform    TEXT NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'ios', 'web')),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup of all tokens for a user
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON public.device_tokens (user_id);

-- RLS: users can only see/manage their own tokens; service role has full access.
-- auth.uid() matches public.users.id because the sync trigger keeps them in sync.
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own device tokens"
  ON public.device_tokens
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at on upsert
CREATE OR REPLACE FUNCTION public.update_device_tokens_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Drop trigger first so re-runs don't error
DROP TRIGGER IF EXISTS trg_device_tokens_updated_at ON public.device_tokens;

CREATE TRIGGER trg_device_tokens_updated_at
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_device_tokens_updated_at();
