-- Check what a specific user can actually see
-- Replace USER_ID with the actual user ID from the screenshot

-- First, get the user ID (you'll need to replace this)
-- SELECT user_id, full_name, email FROM profiles WHERE email = 'user@example.com';

-- Then run this with the actual user ID:
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims TO '{"sub": "USER_ID_HERE"}';

-- What conversations can this user see?
SELECT 
    'User Can See These Conversations' as check_type,
    c.id,
    c.participant1_id,
    c.participant2_id,
    c.last_message_at,
    p1.full_name as participant1_name,
    p1.role as participant1_role,
    p2.full_name as participant2_name,
    p2.role as participant2_role,
    (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
FROM conversations c
LEFT JOIN profiles p1 ON p1.user_id = c.participant1_id
LEFT JOIN profiles p2 ON p2.user_id = c.participant2_id
-- WHERE c.participant1_id = 'USER_ID_HERE' OR c.participant2_id = 'USER_ID_HERE'
ORDER BY c.last_message_at DESC;

-- RESET ROLE;

-- Alternative: Check without RLS (as admin)
SELECT 
    'All Conversations (No RLS)' as check_type,
    c.id,
    c.participant1_id,
    c.participant2_id,
    c.last_message_at,
    p1.full_name as participant1_name,
    p1.role as participant1_role,
    p2.full_name as participant2_name,
    p2.role as participant2_role,
    (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
FROM conversations c
LEFT JOIN profiles p1 ON p1.user_id = c.participant1_id
LEFT JOIN profiles p2 ON p2.user_id = c.participant2_id
WHERE p1.role = 'admin' OR p2.role = 'admin'
ORDER BY c.last_message_at DESC;

-- Check messages from admin
SELECT 
    'Admin Messages' as check_type,
    m.id,
    m.sender_id,
    m.receiver_id,
    m.conversation_id,
    m.content,
    m.created_at,
    ps.full_name as sender_name,
    pr.full_name as receiver_name
FROM messages m
LEFT JOIN profiles ps ON ps.user_id = m.sender_id
LEFT JOIN profiles pr ON pr.user_id = m.receiver_id
WHERE ps.role = 'admin'
ORDER BY m.created_at DESC
LIMIT 10;