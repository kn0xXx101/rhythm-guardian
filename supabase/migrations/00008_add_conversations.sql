-- Add conversations table and update messages to use conversation_id
-- This enables proper chat functionality with conversation threads

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant1_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    participant2_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(participant1_id, participant2_id)
);

-- Add conversation_id to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

-- Create index for conversation queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(participant1_id, participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

-- Migrate existing messages to conversations
-- Create conversations for existing message pairs
INSERT INTO conversations (participant1_id, participant2_id, last_message_at)
SELECT DISTINCT
    LEAST(sender_id, receiver_id) as participant1_id,
    GREATEST(sender_id, receiver_id) as participant2_id,
    MAX(created_at) as last_message_at
FROM messages
WHERE conversation_id IS NULL
GROUP BY LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id)
ON CONFLICT (participant1_id, participant2_id) DO NOTHING;

-- Update messages with conversation_id
UPDATE messages m
SET conversation_id = c.id
FROM conversations c
WHERE m.conversation_id IS NULL
AND (
    (c.participant1_id = m.sender_id AND c.participant2_id = m.receiver_id) OR
    (c.participant1_id = m.receiver_id AND c.participant2_id = m.sender_id)
);

-- Add RLS policies for conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their conversations"
ON conversations FOR SELECT
USING (
    auth.uid() = participant1_id OR 
    auth.uid() = participant2_id OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
WITH CHECK (
    auth.uid() = participant1_id OR 
    auth.uid() = participant2_id
);

CREATE POLICY "Users can update their conversations"
ON conversations FOR UPDATE
USING (
    auth.uid() = participant1_id OR 
    auth.uid() = participant2_id
);

-- Update messages RLS policy to use conversation_id
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
CREATE POLICY "Users can view their messages"
ON messages FOR SELECT
USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id OR
    EXISTS (
        SELECT 1 FROM conversations 
        WHERE id = messages.conversation_id 
        AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation on new message
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Add comments
COMMENT ON TABLE conversations IS 'Chat conversations between two users';
COMMENT ON COLUMN messages.conversation_id IS 'Reference to the conversation this message belongs to';
