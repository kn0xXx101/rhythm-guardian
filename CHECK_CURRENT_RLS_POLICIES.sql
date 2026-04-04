-- Check current RLS policies on conversations and messages tables

SELECT 
    'Conversations RLS Policies' as table_name,
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'conversations'
ORDER BY policyname;

SELECT 
    'Messages RLS Policies' as table_name,
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;