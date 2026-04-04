-- Fix RLS policies to allow users to see admin conversations
-- The issue is that users can't see conversations with admin due to restrictive RLS

-- Drop existing conversation policies
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;

-- Create new, more permissive conversation policies
CREATE POLICY "Users can view conversations they participate in" ON conversations
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

CREATE POLICY "Users can update conversations they participate in" ON conversations
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
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can create messages" ON messages;

CREATE POLICY "Users can view messages they sent or received" ON messages
    FOR SELECT USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id OR
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

-- Note: Admin role should already exist from initial schema
-- If not, it needs to be added manually: ALTER TYPE user_role ADD VALUE 'admin';

COMMENT ON POLICY "Users can view conversations they participate in" ON conversations IS 'Allows users to see their conversations including those with admin';
COMMENT ON POLICY "Users can view messages they sent or received" ON messages IS 'Allows users to see their messages including those from admin';