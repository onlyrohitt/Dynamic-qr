-- ─────────────────────────────────────────────────────────────────────────
--  Dynamic QR Code – Supabase Database Schema
--  Run this entire file once in your Supabase project:
--    Dashboard → SQL Editor → New query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Create the destination table
CREATE TABLE IF NOT EXISTS public.qr_destination (
  id          INTEGER PRIMARY KEY DEFAULT 1,    -- always a single row
  url         TEXT    NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Enforce the single-row invariant at the DB level
  CONSTRAINT single_row CHECK (id = 1)
);

-- 2. Comment for clarity
COMMENT ON TABLE  public.qr_destination         IS 'Stores the single destination URL for the dynamic QR redirect.';
COMMENT ON COLUMN public.qr_destination.url     IS 'The current redirect destination. Updated via the admin dashboard.';
COMMENT ON COLUMN public.qr_destination.updated_at IS 'Timestamp of the last URL change.';

-- 3. Row-Level Security: enable it and lock everything down
ALTER TABLE public.qr_destination ENABLE ROW LEVEL SECURITY;

-- No public SELECT, INSERT, UPDATE, or DELETE.
-- All access goes through the service-role key on the server.
-- The anon key (used in the browser) cannot touch this table at all.
DROP POLICY IF EXISTS "deny_all_anon" ON public.qr_destination;
CREATE POLICY "deny_all_anon"
  ON public.qr_destination
  FOR ALL
  TO anon
  USING (false);

-- 4. Optional: seed with a placeholder so /r works immediately after setup
--    (Remove or edit this if you want to set the URL from the dashboard first)
INSERT INTO public.qr_destination (id, url, updated_at)
VALUES (1, 'https://example.com', now())
ON CONFLICT (id) DO NOTHING;

-- Done! Your table is ready.
