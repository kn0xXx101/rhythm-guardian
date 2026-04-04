-- Add RPC functions for chat functionality
-- These functions handle message sending, reading, and conversation management

-- Function to send a message
CREATE OR REPLACE FUNCTION send_message(
    p_conversation_id UUID,
    p_sender_id UUID,
    p_content TEXT,
    p_message_type TEXT DEFAULT 'text',
    p_file_url TEXT DEFAULT NULL,
    p_file_name TEXT DEFAULT NULL,
    p_file_size INTEGER DEFAULT NULL,
    p_file_type TEXT DEFAULT NULL,
    p_reply_to_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_message_id UUID;
    v_receiver_id UUID;
BEGIN
    -- Get receiver_id from conversation
    SELECT CASE 
        WHEN participant1_id = p_sender_id THEN participant2_id
        ELSE participant1_id
    END INTO v_receiver_id
    FROM conversations
    WHERE id = p_conversation_id;

    -- Insert message
    INSERT INTO messages (
        conversation_id,
        sender_id,
        receiver_id,
        content,
        reply_to
    ) VALUES (
        p_conversation_id,
        p_sender_id,
        v_receiver_id,
        p_content,
        p_reply_to_id
    ) RETURNING id INTO v_message_id;

    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark message as read
CREATE OR REPLACE FUNCTION mark_message_read(
    p_message_id UUID,
    p_user_id UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE messages
    SET read = TRUE,
        read_at = NOW()
    WHERE id = p_message_id
    AND receiver_id = p_user_id
    AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all messages in conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_read(
    p_conversation_id UUID,
    p_user_id UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE messages
    SET read = TRUE,
        read_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND receiver_id = p_user_id
    AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_count(
    p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM messages
    WHERE receiver_id = p_user_id
    AND read = FALSE
    AND is_deleted = FALSE;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete message (soft delete)
CREATE OR REPLACE FUNCTION delete_message(
    p_message_id UUID,
    p_user_id UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE messages
    SET is_deleted = TRUE,
        updated_at = NOW()
    WHERE id = p_message_id
    AND sender_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to edit message
CREATE OR REPLACE FUNCTION edit_message(
    p_message_id UUID,
    p_user_id UUID,
    p_new_content TEXT
) RETURNS VOID AS $$
BEGIN
    UPDATE messages
    SET content = p_new_content,
        is_edited = TRUE,
        edited_at = NOW(),
        updated_at = NOW()
    WHERE id = p_message_id
    AND sender_id = p_user_id
    AND is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_message TO authenticated;
GRANT EXECUTE ON FUNCTION mark_message_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_count TO authenticated;
GRANT EXECUTE ON FUNCTION delete_message TO authenticated;
GRANT EXECUTE ON FUNCTION edit_message TO authenticated;
