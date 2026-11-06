-- ─────────────────────────────────────────────────────────────────────────
--  Dynamic Multi-Customer QR Code Manager – Supabase Database Schema
--  Run this in your Supabase project:
--    Dashboard → SQL Editor → New query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Create the multi-customer QR codes table
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL,
  label           TEXT NOT NULL,                      -- Customer or campaign name
  destination     TEXT NOT NULL,                      -- The redirect destination URL
  theme           JSONB NOT NULL DEFAULT '{}'::jsonb, -- Custom styling & theme config
  scan_count      INTEGER NOT NULL DEFAULT 0,         -- Total scans recorded
  is_active       BOOLEAN NOT NULL DEFAULT true,      -- Can pause/resume without deleting
  last_scanned_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint on code
  CONSTRAINT uq_qr_codes_code UNIQUE (code)
);

-- 2. Indexes for instant lookups
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON public.qr_codes(code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_lower_code ON public.qr_codes (lower(code));
CREATE INDEX IF NOT EXISTS idx_qr_codes_created_at ON public.qr_codes (created_at DESC);

-- Atomic scan counter prevents overlapping redirects from overwriting each other.
CREATE OR REPLACE FUNCTION public.increment_qr_scan(qr_code TEXT)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.qr_codes
  SET scan_count = scan_count + 1, last_scanned_at = now()
  WHERE lower(code) = lower(qr_code);
$$;
REVOKE ALL ON FUNCTION public.increment_qr_scan(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_qr_scan(TEXT) TO service_role;

-- 3. Comments for clarity
COMMENT ON TABLE  public.qr_codes                 IS 'Multi-customer dynamic QR codes with customizable themes and analytics.';
COMMENT ON COLUMN public.qr_codes.code            IS 'Unique identifier/code printed or shared (e.g. CUST-1001).';
COMMENT ON COLUMN public.qr_codes.label           IS 'Customer name or display note.';
COMMENT ON COLUMN public.qr_codes.destination     IS 'Target URL that scans redirect to. Editable at any time by admin.';
COMMENT ON COLUMN public.qr_codes.theme           IS 'Styling settings: colors, dot styles, corner eyes, frame text, center icon.';
COMMENT ON COLUMN public.qr_codes.scan_count      IS 'Number of times this QR code has been scanned.';

-- 4. Row-Level Security: enable and lock down
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- Deny all public access; all operations are performed via service role
DROP POLICY IF EXISTS "deny_all_anon" ON public.qr_codes;
CREATE POLICY "deny_all_anon"
  ON public.qr_codes
  FOR ALL
  TO anon
  USING (false);

-- 5. Migrate legacy single-row destination if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'qr_destination') THEN
    INSERT INTO public.qr_codes (code, label, destination, created_at, updated_at)
    SELECT 'DEFAULT', 'Legacy Main QR', url, updated_at, updated_at
    FROM public.qr_destination
    WHERE id = 1 AND url IS NOT NULL
    ON CONFLICT (code) DO NOTHING;
  END IF;
END $$;

-- 6. Initial sample customers (optional seed)
INSERT INTO public.qr_codes (code, label, destination, theme, scan_count, is_active)
VALUES
  (
    'CAFE-901',
    'Artisan Coffee Roasters',
    'https://example.com/artisan-coffee-menu',
    '{"preset":"emerald","fgColor":"#10b981","bgColor":"#041d14","eyeColor":"#34d399","dotStyle":"rounded","eyeStyle":"rounded","frameStyle":"banner-bottom","frameText":"SCAN FOR MENU","centerIcon":"coffee"}'::jsonb,
    142,
    true
  ),
  (
    'VIP-778',
    'Grand Gala Lounge & Bar',
    'https://example.com/vip-drink-list',
    '{"preset":"gold","fgColor":"#fbbf24","bgColor":"#18181b","eyeColor":"#f59e0b","dotStyle":"rounded","eyeStyle":"rounded","frameStyle":"banner-bottom","frameText":"VIP ACCESS","centerIcon":"star"}'::jsonb,
    89,
    true
  ),
  (
    'TECH-104',
    'NextGen Digital Agency',
    'https://example.com/case-studies',
    '{"preset":"midnight","fgColor":"#38bdf8","bgColor":"#0b1120","eyeColor":"#06b6d4","dotStyle":"rounded","eyeStyle":"rounded","frameStyle":"banner-bottom","frameText":"SCAN TO VISIT","centerIcon":"globe"}'::jsonb,
    230,
    true
  )
ON CONFLICT (code) DO NOTHING;

-- Schema setup complete!
