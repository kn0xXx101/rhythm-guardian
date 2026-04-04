-- Add all missing columns to messages table
-- This allows message editing, soft-deleting, and replying to messages

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_messages_edited_at ON messages(edited_at) WHERE edited_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON messages(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_is_edited ON messages(is_edited) WHERE is_edited = TRUE;
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to) WHERE reply_to IS NOT NULL;

-- Add comments
COMMENT ON COLUMN messages.edited_at IS 'Timestamp when the message was last edited';
COMMENT ON COLUMN messages.is_deleted IS 'Soft delete flag for messages';
COMMENT ON COLUMN messages.is_edited IS 'Flag indicating if message has been edited';
COMMENT ON COLUMN messages.reply_to IS 'Reference to the message being replied to';
