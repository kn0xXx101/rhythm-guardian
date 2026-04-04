-- Ensure Admin Messages Create Conversations
-- This migration ensures that when admin sends a message to a user,
-- a conversation entry is created so the message appears in the user's chat list

-- Function to ensure conversation exists when a message is sent
CREATE OR REPLACE FUNCTION ensure_conversation_exists()
RETURNS TRIGGER AS $$
DECLARE
    existing_conversation_id UUID;
BEGIN
    -- Skip if sender and receiver are the same
    IF NEW.sender_id = NEW.receiver_id THEN
        RETURN NEW;
    END IF;
    
    -- Check if conversation already exists between these two users
    SELECT id INTO existing_conversation_id
    FROM conversations
    WHERE (participant1_id = NEW.sender_id AND participant2_id = NEW.receiver_id)
       OR (participant1_id = NEW.receiver_id AND participant2_id = NEW.sender_id)
    LIMIT 1;
    
    -- If conversation doesn't exist, create it
    IF existing_conversation_id IS NULL THEN
        INSERT INTO conversations (participant1_id, participant2_id, last_message_at, created_at, updated_at)
        VALUES (
            LEAST(NEW.sender_id, NEW.receiver_id),
            GREATEST(NEW.sender_id, NEW.receiver_id),
            NEW.created_at,
            NEW.created_at,
            NEW.created_at
        )
        RETURNING id INTO existing_conversation_id;
    ELSE
        -- Update existing conversation's last_message_at
        UPDATE conversations
        SET last_message_at = NEW.created_at,
            updated_at = NEW.created_at
        WHERE id = existing_conversation_id;
    END IF;
    
    -- Set the conversation_id on the message
    NEW.conversation_id := existing_conversation_id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the message insert
        RAISE WARNING 'Failed to ensure conversation exists: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run before message insert
DROP TRIGGER IF EXISTS ensure_conversation_on_message ON messages;
CREATE TRIGGER ensure_conversation_on_message
    BEFORE INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION ensure_conversation_exists();

-- Backfill: Create conversations for existing messages that don't have them
INSERT INTO conversations (participant1_id, participant2_id, last_message_at, created_at, updated_at)
SELECT DISTINCT
    LEAST(m.sender_id, m.receiver_id) as participant1_id,
    GREATEST(m.sender_id, m.receiver_id) as participant2_id,
    MAX(m.created_at) as last_message_at,
    MIN(m.created_at) as created_at,
    MAX(m.created_at) as updated_at
FROM messages m
WHERE NOT EXISTS (
    SELECT 1 FROM conversations c
    WHERE (c.participant1_id = m.sender_id AND c.participant2_id = m.receiver_id)
       OR (c.participant1_id = m.receiver_id AND c.participant2_id = m.sender_id)
)
AND m.sender_id != m.receiver_id
GROUP BY LEAST(m.sender_id, m.receiver_id), GREATEST(m.sender_id, m.receiver_id)
ON CONFLICT (participant1_id, participant2_id) DO NOTHING;

-- Update messages that don't have conversation_id set
UPDATE messages m
SET conversation_id = c.id
FROM conversations c
WHERE m.conversation_id IS NULL
AND (
    (c.participant1_id = m.sender_id AND c.participant2_id = m.receiver_id) OR
    (c.participant1_id = m.receiver_id AND c.participant2_id = m.sender_id)
);

COMMENT ON FUNCTION ensure_conversation_exists IS 'Ensures a conversation entry exists when a message is sent, so messages appear in chat lists';
COMMENT ON TRIGGER ensure_conversation_on_message ON messages IS 'Automatically creates or updates conversations when messages are sent';
