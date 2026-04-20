-- Migration: fix_notifications_type_check
-- Adds 'achievement' to the allowed notification types.
-- Safe: DROP CONSTRAINT + ADD CONSTRAINT does not touch existing rows
-- (existing values 'task','system','reminder','academic' remain valid).

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'task'::text,
    'system'::text,
    'reminder'::text,
    'academic'::text,
    'achievement'::text
  ]));
