-- Enable the conversation creation trigger
-- The trigger was disabled, preventing conversations from being created automatically

-- Enable the trigger
ALTER TABLE messages ENABLE TRIGGER ensure_conversation_on_message;

-- Verify it's enabled
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'ensure_conversation_on_message' 
        AND tgenabled = 'O'
    ) THEN
        RAISE NOTICE 'Trigger ensure_conversation_on_message is now ENABLED';
    ELSE
        RAISE WARNING 'Trigger ensure_conversation_on_message is still DISABLED';
    END IF;
END $$;

-- Backfill: Create conversations for existing messages that don't have them
INSERT INTO conversations (participant1_id, participant2_id, last_message_at, created_at, updated_at)
SELECT DISTINCT
    LEAST(m.sender_id, m.receiver_id) as participant1_id,
    GREATEST(m.sender_id, m.receiver_id) as participant2_id,
    MAX(m.created_at) as last_message_at,
    MIN(m.created_at) as created_at,
    MAX(m.created_at) as updated_at
FROM messages m
WHERE m.conversation_id IS NULL
  AND m.sender_id != m.receiver_id
GROUP BY LEAST(m.sender_id, m.receiver_id), GREATEST(m.sender_id, m.receiver_id)
ON CONFLICT (participant1_id, participant2_id) DO UPDATE
SET last_message_at = EXCLUDED.last_message_at,
    updated_at = EXCLUDED.updated_at;

-- Update messages that don't have conversation_id set
UPDATE messages m
SET conversation_id = c.id
FROM conversations c
WHERE m.conversation_id IS NULL
AND (
    (c.participant1_id = m.sender_id AND c.participant2_id = m.receiver_id) OR
    (c.participant1_id = m.receiver_id AND c.participant2_id = m.sender_id)
);

COMMENT ON TRIGGER ensure_conversation_on_message ON messages IS 'Automatically creates or updates conversations when messages are sent - NOW ENABLED';