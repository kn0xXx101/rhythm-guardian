# Automatic Profile Creation Setup

This document explains how to set up automatic profile creation when users sign up.

## Problem

Previously, profiles were only created through application code. If the profile creation step failed or was skipped, users would exist in `auth.users` but not have corresponding entries in the `profiles` table, causing issues in the admin dashboard and other features.

## Solution

We now have multiple layers of profile creation:

1. **Database Trigger** (if accessible): Automatically creates profiles when users are inserted into `auth.users`
2. **Edge Function + Webhook**: Creates profiles via a webhook triggered by user creation events
3. **Application Code**: Still creates profiles as a fallback, using `upsert` to avoid conflicts

## Setup Instructions

### Option 1: Database Trigger (Recommended if accessible)

The migration `00032_auto_create_profile_on_user_signup.sql` automatically attempts to create a trigger on `auth.users`. If your Supabase instance allows direct access to the auth schema, this will work automatically after running the migration.

To verify:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### Option 2: Edge Function with Auth Webhook (Recommended for Supabase)

1. **Deploy the edge function**:
   ```bash
   supabase functions deploy create-profile
   ```

2. **Set up an Auth webhook in Supabase Dashboard**:
   - Go to Project Settings > API > Webhooks
   - Create a new webhook
   - Event: `auth.users:INSERT` (or use Database Webhooks for `auth.users` table)
   - URL: `https://<your-project-ref>.supabase.co/functions/v1/create-profile`
   - HTTP Method: POST
   - Include headers: `Authorization: Bearer <service-role-key>`

3. **Or use Database Webhooks**:
   - Go to Database > Webhooks
   - Create webhook on `auth.users` table
   - Event: INSERT
   - HTTP Request to your edge function URL

### Option 3: Manual Backfill for Existing Users

If you have existing users without profiles, run the backfill script:

```sql
-- Run this in Supabase SQL Editor
\i scripts/backfill-missing-profiles.sql
```

Or execute it manually:
```bash
psql -h <db-host> -U postgres -d postgres -f scripts/backfill-missing-profiles.sql
```

## How It Works

### Profile Creation Flow

1. User signs up via `AuthService.signUp()` or `AuthContext.signUp()`
2. User metadata (including `role`, `status`, and `full_name`) is stored in `auth.users`
3. **Database trigger** (if enabled) immediately creates a profile
4. **Application code** also creates/updates the profile using `upsert` (handles conflicts gracefully)
5. **Edge function** (if webhook is configured) acts as an additional safety net

### Metadata Structure

The signup code now includes `full_name` in user metadata:
```typescript
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      role,
      status: initialStatus,
      full_name: fullName  // Added for trigger/edge function
    }
  }
});
```

### Profile Data Extraction

The trigger/edge function extracts:
- **role**: From `app_metadata.role` or `user_metadata.role`, defaults to `'hirer'`
- **status**: From `app_metadata.status` or `user_metadata.status`, defaults to `'pending'` (or `'active'` for admin)
- **full_name**: From `user_metadata.full_name` or `user_metadata.name`, falls back to email prefix

## Verification

To check if profiles are being created automatically:

1. **Create a test user** via signup
2. **Check the profiles table**:
   ```sql
   SELECT * FROM profiles WHERE user_id = '<new-user-id>';
   ```
3. **Check logs**:
   - Edge function logs: Supabase Dashboard > Edge Functions > create-profile > Logs
   - Database logs: Check for trigger execution

## Troubleshooting

### Profiles still not being created

1. Check if trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

2. Check edge function logs for errors

3. Verify webhook is configured correctly in Supabase Dashboard

4. Check application logs for profile creation errors

5. Run the backfill script for existing users

### Duplicate profile errors

The application code now uses `upsert` with `ON CONFLICT`, so duplicate profile errors should not occur. If you see them, it means:
- The trigger and application code are both trying to create profiles
- This is fine - the `ON CONFLICT DO NOTHING` in the trigger and `upsert` in app code handle this gracefully

### Missing full_name

If profiles are created with just the email prefix as the name:
- Check that signup code includes `full_name` in user metadata
- The trigger/edge function will fall back to email prefix if metadata is missing

## Related Files

- Migration: `supabase/migrations/00032_auto_create_profile_on_user_signup.sql`
- Edge Function: `supabase/functions/create-profile/index.ts`
- Signup Service: `src/services/auth.ts`
- Signup Context: `src/contexts/AuthContext.tsx`
- Backfill Script: `scripts/backfill-missing-profiles.sql`

