-- Settings table for Admin Settings (single JSONB row)
-- Provides a simpler storage for the full platform_settings config used by Admin Settings UI
-- The api/settings.ts tries this table first, then falls back to platform_settings key-value rows

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read (for getSettings - used across app)
CREATE POLICY "Settings are viewable by authenticated users"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify
CREATE POLICY "Only admins can modify settings"
  ON settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add platform_fee_percentage to payment config for backward compatibility with paystack/edge functions
-- that read from platform_settings key 'payment'
COMMENT ON TABLE settings IS 'Unified platform settings from Admin Settings. Key platform_settings stores full config.';
