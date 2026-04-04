-- Create conversation_list view for chat functionality
-- This view provides a comprehensive list of conversations with participant details and last message info

-- First, update the existing RLS policies to allow admin access
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;

CREATE POLICY "Users can view their conversations" ON conversations
    FOR SELECT USING (
        auth.uid() = participant1_id OR 
        auth.uid() = participant2_id OR
        -- Allow admin to see all conversations
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (
        auth.uid() = participant1_id OR 
        auth.uid() = participant2_id OR
        -- Allow admin to create conversations with anyone
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update their conversations" ON conversations
    FOR UPDATE USING (
        auth.uid() = participant1_id OR 
        auth.uid() = participant2_id OR
        -- Allow admin to update any conversation
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Also update message policies to ensure admin messages are visible
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can create messages" ON messages;

CREATE POLICY "Users can view their messages" ON messages
    FOR SELECT USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id OR
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = messages.conversation_id 
            AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
        ) OR
        -- Allow admin to see all messages
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can create messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id OR
        -- Allow admin to send messages as anyone (for system messages)
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Now create the conversation_list view
CREATE OR REPLACE VIEW conversation_list AS
SELECT 
    c.id,
    c.participant1_id as participant_1_id,
    c.participant2_id as participant_2_id,
    c.last_message_at,
    c.created_at,
    
    -- Participant 1 details
    p1.full_name as participant_1_name,
    p1.avatar_url as participant_1_avatar,
    
    -- Participant 2 details  
    p2.full_name as participant_2_name,
    p2.avatar_url as participant_2_avatar,
    
    -- Last message preview
    (
        SELECT m.content 
        FROM messages m 
        WHERE m.conversation_id = c.id 
        ORDER BY m.created_at DESC 
        LIMIT 1
    ) as last_message_preview

FROM conversations c
LEFT JOIN profiles p1 ON c.participant1_id = p1.user_id
LEFT JOIN profiles p2 ON c.participant2_id = p2.user_id;

-- Grant access to the view
GRANT SELECT ON conversation_list TO authenticated;

COMMENT ON VIEW conversation_list IS 'Comprehensive view of conversations with participant details and last message info for chat functionality';