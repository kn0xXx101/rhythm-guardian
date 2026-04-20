# Supabase Auth email templates

These HTML files match **Rhythm Guardian** web UI: violet primary (`#7C3AED`), soft lavender page background (`#FAF8FF`), Poppins, rounded cards, and shared footer links.

## How to use

1. Open the [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **Email Templates**.
2. Choose the template type (Confirm signup, Magic link, Reset password, etc.).
3. Paste the contents of the matching file from this folder into the editor.
4. Save.

## Template variables (Go templates)

Supabase injects these at send time:

| Variable | Used in |
|----------|---------|
| `{{ .ConfirmationURL }}` | Primary action link (confirm email, reset password, magic link). |
| `{{ .SiteURL }}` | Your project **Site URL** (Authentication → URL Configuration). Used for logo link and footer **Terms / Privacy / Open app**. |
| `{{ .Email }}` | Recipient email (optional — add to copy if you want “Hi, {{ .Email }}”). |

If `{{ .SiteURL }}` is empty in preview, set **Site URL** under Authentication → URL Configuration.

## Files

| File | Auth template |
|------|----------------|
| `confirm-signup.html` | **Confirm signup** |
| `magic-link.html` | **Magic link** |
| `reset-password.html` | **Reset password** |

Transactional emails built in app code (payments, bookings, etc.) live in `src/lib/email-templates.ts` and should stay visually consistent with these.
