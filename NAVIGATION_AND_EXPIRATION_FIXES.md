# Navigation and Booking Expiration Fixes

## Summary
Fixed dropdown menu navigation issues, implemented automatic booking expiration functionality, and added refund request capability for expired paid bookings.

---

## 1. Dropdown Menu Navigation Fixes

### Problem
When users clicked on dropdown menu items (Profile/Settings) and then tried to navigate using sidebar links, they were redirected to incorrect pages or the dropdown would interfere with navigation.

### Solution

#### A. TopNav Component (`src/components/layout/TopNav.tsx`)
- Added `userMenuOpen` state to control dropdown visibility
- Updated `handleProfileClick()` to navigate to correct paths:
  - Admin → `/admin`
  - Musician → `/musician/profile`
  - Hirer → `/hirer` (was incorrectly going to `/dashboard`)
- Updated `handleSettingsClick()` to navigate to role-specific settings:
  - Admin → `/admin/settings`
  - Musician → `/musician/settings`
  - Hirer → `/hirer/settings`
- Added automatic dropdown closing on navigation
- Dropdown now closes when location changes

#### B. App Routes (`src/App.tsx`)
- Added `/hirer/settings` route
- Added `/musician/settings` route
- Both routes use the `UserSettings` component

#### C. AuthContext (`src/contexts/AuthContext.tsx`)
- Fixed signup redirect for musicians: `/musician` instead of `/musician/dashboard`
- Fixed signup redirect for hirers: `/hirer` instead of `/dashboard`

---

## 2. Booking Expiration System

### Problem
Pending bookings were not being automatically marked as expired when their event date passed.

### Solution

#### A. Created Booking Expiration Service (`src/services/booking-expiration.ts`)
- `checkAndExpireBookings()`: Calls database function to expire bookings
- `shouldBookingBeExpired()`: Helper to check if a booking should be expired
- Automatically marks pending bookings as expired when event date has passed
- Sends notifications to both hirer and musician

#### B. Updated Booking Pages
**HirerBookings** (`src/pages/HirerBookings.tsx`):
- Added automatic expiration check on page load
- Refetches bookings after expiration to show updated data
- Hides "Pay Now" button for expired bookings
- Shows "Request Refund" button for expired paid bookings

**MusicianBookings** (`src/pages/MusicianBookings.tsx`):
- Added automatic expiration check on page load
- Refetches bookings after expiration to show updated data

#### C. Updated BookingContext (`src/contexts/BookingContext.tsx`)
- Added `refetch()` function to manually refresh bookings
- Exposed `refetch` in context API

#### D. Database Functions (Already existed)
- `auto_expire_pending_bookings()`: Marks expired bookings
- `notify_booking_expired()`: Sends notifications
- `check_and_expire_bookings()`: Main function called by service

#### E. Test Script (`TEST_BOOKING_EXPIRATION.sql`)
- Manual test script to check and trigger expiration
- Shows pending bookings that should be expired
- Verifies notifications were sent

---

## 3. Refund Request for Expired Bookings

### Problem
Hirers who paid for bookings that expired (service not rendered) had no way to request a refund.

### Solution

#### A. Added Refund Functionality (`src/pages/HirerBookings.tsx`)
- Added "Request Refund" button for expired bookings that have been paid
- Button only shows when:
  - Booking status is "expired"
  - Payment status is "paid_to_admin" or "service_completed"
- Automatically submits refund request with reason: "Booking expired - service not rendered"
- Shows success/error toast notifications
- Refetches bookings after refund request

#### B. Uses Existing Refund Service (`src/services/refund.ts`)
- `requestRefund()`: Submits refund request to backend
- Calls `process-refund` edge function
- Handles refund processing and notifications

---

## How It Works

### Navigation Flow
1. User clicks dropdown menu (avatar in top right)
2. User clicks "Profile" or "Settings"
3. Dropdown automatically closes
4. User is navigated to correct page based on their role
5. User can now use sidebar navigation without issues

### Expiration Flow
1. User visits their bookings page
2. System automatically checks for expired bookings
3. Pending bookings past their event date are marked as "expired"
4. Notifications sent to both parties
5. Bookings list refreshes to show updated status

### Refund Request Flow
1. Hirer sees expired booking that was paid
2. "Request Refund" button appears
3. Hirer clicks button
4. Refund request submitted automatically
5. Success notification shown
6. Admin processes refund through backend

---

## Testing

### Test Navigation
1. Log in as a hirer
2. Click avatar dropdown → Profile
3. Should go to `/hirer` (dashboard)
4. Click avatar dropdown → Settings
5. Should go to `/hirer/settings`
6. Click any sidebar link - should navigate correctly

### Test Expiration
1. Run `TEST_BOOKING_EXPIRATION.sql` in Supabase SQL editor
2. Or visit bookings page - automatic check runs
3. Check that expired bookings show "expired" status
4. Check notifications were created

### Test Refund Request
1. Create a booking and mark it as paid
2. Manually expire it or wait for expiration
3. Visit hirer bookings page
4. Should see "Request Refund" button on expired paid booking
5. Click button - should show success message
6. Check refund request in admin panel

---

## Files Modified

### Navigation Fixes
- `src/components/layout/TopNav.tsx`
- `src/App.tsx`
- `src/contexts/AuthContext.tsx`

### Expiration System
- `src/services/booking-expiration.ts` (new)
- `src/pages/HirerBookings.tsx`
- `src/pages/MusicianBookings.tsx`
- `src/contexts/BookingContext.tsx`
- `TEST_BOOKING_EXPIRATION.sql` (new)

### Refund Functionality
- `src/pages/HirerBookings.tsx` (updated)
- Uses existing `src/services/refund.ts`

### Database (Already existed)
- `supabase/migrations/00013_auto_expire_bookings.sql`
- `supabase/functions/expire-bookings/index.ts`
- `supabase/functions/process-refund/index.ts`

---

## Notes

- Edge function TypeScript errors are expected (Deno imports)
- Expiration runs automatically when users view bookings
- Can also set up cron job to call edge function regularly
- All navigation paths now align with sidebar structure
- Refund requests are processed by admin through backend
- "Pay Now" button hidden for expired bookings
- "Request Refund" button only shows for expired paid bookings
