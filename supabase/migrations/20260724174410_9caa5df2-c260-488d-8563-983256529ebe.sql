ALTER TABLE public.weekly_sheets
  ADD COLUMN IF NOT EXISTS edit_request_status TEXT,
  ADD COLUMN IF NOT EXISTS edit_request_reason TEXT,
  ADD COLUMN IF NOT EXISTS edit_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_resolver_id UUID;