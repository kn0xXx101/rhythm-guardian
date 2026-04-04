-- Standalone RLS fix - run this directly if migration 00039 didn't work

-- Drop and recreate conversation policies with admin support
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;

CREATE POLICY "Users can view their conversations" ON conversations
    FOR SELECT USING (
        auth.uid() = participant1_id OR 
        auth.uid() = participant2_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (
        auth.uid() = participant1_id OR 
        auth.uid() = participant2_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update their conversations" ON conversations
    FOR UPDATE USING (
        auth.uid() = participant1_id OR 
        auth.uid() = participant2_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Drop and recreate message policies with admin support
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
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can create messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Verify the policies were created
SELECT 'Verification: Conversations policies' as check_type, COUNT(*) as policy_count
FROM pg_policies WHERE tablename = 'conversations';

SELECT 'Verification: Messages policies' as check_type, COUNT(*) as policy_count
FROM pg_policies WHERE tablename = 'messages';