# Fix Support Tickets - Quick Instructions

## 🚨 Issue
The support ticket system is showing "Unable to create support request" because the database migration hasn't been run yet.

## ✅ Solution
You need to run the enhanced support tickets migration in your Supabase database.

### Step 1: Run the Migration
1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/00033_enhanced_support_tickets.sql`
4. Click **Run** to execute the migration

### Step 2: Verify Installation
After running the migration, test by:
1. Going to your app
2. Opening AI Assistant chat
3. Typing "connect to admin"
4. You should see a success message instead of the error

## 🎯 What This Migration Does
- Creates the `create_support_ticket` function that was missing
- Adds session management with automatic timeouts
- Sets up real-time notifications
- Enables admin response routing through AI Assistant

## 🔧 Alternative: Quick Fix
If you want to run just the essential function first, you can run this minimal SQL:

```sql
-- Quick fix: Just create the basic function
CREATE OR REPLACE FUNCTION create_support_ticket(
    p_user_id uuid,
    p_subject text,
    p_message text,
    p_category text DEFAULT NULL,
    p_priority text DEFAULT 'medium'
)
RETURNS uuid AS $
DECLARE
    v_ticket_id uuid;
    v_user_name text;
BEGIN
    SELECT full_name INTO v_user_name FROM profiles WHERE user_id = p_user_id;
    
    INSERT INTO support_tickets (user_id, status, priority, category, subject, original_message)
    VALUES (p_user_id, 'open', p_priority, p_category, p_subject, p_message)
    RETURNING id INTO v_ticket_id;
    
    INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, sender_name, content)
    VALUES (v_ticket_id, 'user', p_user_id, v_user_name, p_message);
    
    RETURN v_ticket_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;
```

But for the full enhanced experience with session management, run the complete migration file.

## ✅ After Migration
Once the migration is run, users will be able to:
- Connect to admin successfully
- Get real-time admin responses in AI Assistant chat
- Have automatic session timeouts
- Receive proper notifications

The error will be fixed and the support system will work perfectly! 🚀