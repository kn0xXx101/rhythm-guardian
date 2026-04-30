# Supabase Email Confirmation Diagnostic

## Current Issue
- Users sign up successfully but don't receive confirmation emails
- Login fails with "Invalid email or password" even with correct credentials
- This indicates email confirmations are enabled but emails aren't being sent

## Diagnostic Steps

### 1. Check Supabase Auth Settings
Go to your Supabase project dashboard: https://app.supabase.com/project/vptqcceuufmgwahrimor/auth/settings

**Check these settings:**

#### Email Confirmations
- [ ] "Enable email confirmations" should be **CHECKED**
- [ ] "Confirm email" should be **ENABLED**

#### Site URL Configuration
- [ ] Site URL should be: `https://rhythm-guardian.vercel.app` (or your production domain)
- [ ] For development, add: `http://localhost:5173`

#### Redirect URLs
Add these to the "Redirect URLs" list:
- [ ] `https://rhythm-guardian.vercel.app/auth/email-confirmed`
- [ ] `http://localhost:5173/auth/email-confirmed`
- [ ] `https://rhythm-guardian.vercel.app/**` (wildcard for all paths)
- [ ] `http://localhost:5173/**` (wildcard for development)

### 2. Check Email Provider Settings
Go to: https://app.supabase.com/project/vptqcceuufmgwahrimor/auth/providers

#### SMTP Configuration
- [ ] If using custom SMTP: Verify SMTP settings are correct
- [ ] If using Supabase built-in: Check rate limits (very limited for free tier)

#### Email Templates
- [ ] Verify "Confirm signup" template is enabled
- [ ] Check template content includes `{{ .ConfirmationURL }}`

### 3. Test Email Delivery

#### Manual Test
1. Go to Supabase Auth > Users
2. Find a test user
3. Click "Send confirmation email" manually
4. Check if email arrives

#### Check Logs
1. Go to Supabase Logs
2. Filter by "auth" 
3. Look for email sending errors

### 4. Common Issues & Solutions

#### Issue: Emails go to spam
**Solution:** 
- Use custom SMTP with proper SPF/DKIM records
- Or upgrade Supabase plan for better deliverability

#### Issue: Rate limits exceeded
**Solution:**
- Supabase free tier has very low email limits
- Upgrade plan or use custom SMTP

#### Issue: Wrong redirect URL
**Solution:**
- Ensure redirect URLs match exactly (including https/http)
- Add wildcard patterns for flexibility

#### Issue: Email confirmations disabled
**Solution:**
- Enable in Auth settings
- Users created before enabling won't need confirmation

## Quick Fix Options

### Option 1: Disable Email Confirmations (Quick but less secure)
1. Go to Auth Settings
2. Uncheck "Enable email confirmations"
3. Existing users can now log in immediately
4. New users won't need email confirmation

### Option 2: Manual Email Confirmation (Temporary)
1. Go to Auth > Users
2. Find the user who can't log in
3. Click "Confirm email" manually
4. User can now log in

### Option 3: Proper SMTP Setup (Recommended)
1. Set up custom SMTP (Gmail, SendGrid, etc.)
2. Configure in Auth > Settings > SMTP
3. Test email delivery
4. Update DNS records if needed

## Environment Variables Check

Verify these are correct in your `.env`:
```
VITE_SUPABASE_URL=https://vptqcceuufmgwahrimor.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Code Changes Made

The code has been updated to:
1. Detect when email confirmation is required
2. Show appropriate messages to users
3. Handle both confirmed and unconfirmed states
4. Provide better error messages

## Next Steps

1. **Immediate:** Check Supabase Auth settings (steps 1-2 above)
2. **If emails still don't work:** Set up custom SMTP
3. **If urgent:** Temporarily disable email confirmations
4. **Long term:** Implement proper email infrastructure

## Testing

After making changes:
1. Sign up with a new test email
2. Check if confirmation email arrives
3. Click the link and verify it redirects properly
4. Try logging in with the confirmed account