-- ============================================================================
-- ADD MISSING COLUMNS TO NOTIFICATIONS TABLE
-- ============================================================================
-- This migration adds all missing columns to match the expected schema

-- Add missing columns to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS data JSONB,
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS link TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_data ON notifications USING GIN(data);
CREATE INDEX IF NOT EXISTS idx_notifications_metadata ON notifications USING GIN(metadata);

-- Update existing read notifications to have read_at timestamp
UPDATE notifications 
SET read_at = updated_at 
WHERE read = TRUE AND read_at IS NULL;

-- Add comments
COMMENT ON COLUMN notifications.read_at IS 'Timestamp when the notification was marked as read';
COMMENT ON COLUMN notifications.data IS 'Additional data payload for the notification';
COMMENT ON COLUMN notifications.icon IS 'Icon identifier for the notification';
COMMENT ON COLUMN notifications.link IS 'External link associated with the notification';
COMMENT ON COLUMN notifications.metadata IS 'Additional metadata for the notification';
COMMENT ON COLUMN notifications.priority IS 'Priority level of the notification (low, normal, high, urgent)';

-- Log completion
DO $$ 
BEGIN 
    RAISE NOTICE 'Added missing columns to notifications table: read_at, data, icon, link, metadata, priority';
END $$;