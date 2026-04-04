# Automatic Refund System for Expired and Cancelled Bookings

## Overview
Implemented automatic refund processing for hirers when paid bookings expire, are rejected, or cancelled by musicians.

---

## Problem
Hirers who paid for bookings had no automatic way to get refunds when:
1. Booking expired (musician didn't accept before event date)
2. Musician rejected the booking
3. Musician cancelled an accepted booking

---

## Solution

### Database Migration (`supabase/migrations/00026_auto_refund_expired_cancelled.sql`)

#### Automatic Refund Trigger
Created a database trigger that automatically processes refunds when:

1. **Booking Expires** (status changes from 'pending' to 'expired')
   - Reason: "Booking expired - musician did not accept before event date"
   
2. **Musician Rejects** (status changes to 'rejected')
   - Reason: "Booking rejected by musician"
   
3. **Musician Cancels** (status changes from 'accepted' to 'cancelled')
   - Reason: "Booking cancelled by musician"

#### How It Works
```sql
TRIGGER: trigger_auto_refund_on_status_change
FUNCTION: auto_process_refund_on_status_change()

When a booking status changes to expired/rejected/cancelled:
1. Check if booking was paid (payment_status = 'paid_to_admin' or 'service_completed')
2. Create refund record in refunds table
3. Update booking payment_status to 'refunded'
4. Send notification to hirer about automatic refund
5. Log the refund for admin tracking
```

---

## Frontend Updates

### Updated Types (`src/contexts/BookingContext.tsx`)
Added new status types:
- `BookingStatus`: Added 'rejected'
- `PaymentStatus`: Added 'refunded'

### Updated UI (`src/pages/HirerBookings.tsx`)

#### Payment Status Display
- Shows "Refunded" for refunded bookings
- Shows "Paid" for paid bookings
- Shows "Unpaid" for unpaid bookings

#### Refund Button Logic
1. **Automatic Refund Processed**: Shows green badge "Refund Processed" when payment_status is 'refunded'
2. **Manual Refund Button**: Only shows if automatic refund didn't trigger (fallback)
3. **No Button**: For unpaid or already refunded bookings

---

## User Experience

### For Hirers
1. **Make Payment**: Hirer pays for booking
2. **Booking Expires/Rejected/Cancelled**: 
   - System automatically creates refund
   - Payment status changes to "Refunded"
   - Hirer receives notification
3. **View Booking**: Hirer sees "Refund Processed" badge
4. **Receive Money**: Admin processes refund through backend

### For Musicians
- No change in experience
- Rejecting or cancelling a paid booking automatically triggers refund

### For Admins
- Refund requests appear in admin panel
- Can track automatic vs manual refunds
- Process refunds through existing refund system

---

## Refund Scenarios

| Scenario | Booking Status | Payment Status | Action | Result |
|----------|---------------|----------------|--------|--------|
| Musician doesn't accept before event | pending → expired | paid_to_admin | Auto refund | Hirer refunded |
| Musician rejects booking | any → rejected | paid_to_admin | Auto refund | Hirer refunded |
| Musician cancels accepted booking | accepted → cancelled | paid_to_admin | Auto refund | Hirer refunded |
| Hirer cancels before acceptance | pending → cancelled | paid_to_admin | Manual refund | Hirer requests |
| Service completed | any → completed | service_completed | No refund | Payment released |

---

## Testing

### Test Automatic Refund on Expiration
1. Create a booking with past event date
2. Mark booking as paid
3. Run expiration check: `SELECT * FROM check_and_expire_bookings();`
4. Verify:
   - Booking status = 'expired'
   - Payment status = 'refunded'
   - Refund record created
   - Notification sent to hirer

### Test Automatic Refund on Rejection
1. Create a paid booking
2. Musician rejects: `UPDATE bookings SET status = 'rejected' WHERE id = 'booking_id';`
3. Verify automatic refund triggered

### Test Automatic Refund on Cancellation
1. Create an accepted paid booking
2. Musician cancels: `UPDATE bookings SET status = 'cancelled' WHERE id = 'booking_id';`
3. Verify automatic refund triggered

---

## Files Modified

### Database
- `supabase/migrations/00026_auto_refund_expired_cancelled.sql` (new)

### Frontend
- `src/contexts/BookingContext.tsx` - Added 'rejected' and 'refunded' types
- `src/pages/HirerBookings.tsx` - Updated UI to show refund status

---

## Benefits

1. **Automatic**: No manual intervention needed for common refund scenarios
2. **Fair**: Hirers automatically get refunds when service isn't provided
3. **Transparent**: Clear notifications and status updates
4. **Trackable**: All refunds logged for admin review
5. **Reliable**: Database triggers ensure refunds aren't missed

---

## Notes

- Refunds are created automatically but still need admin approval/processing
- Manual refund button remains as fallback for edge cases
- System logs all automatic refunds for audit trail
- Notifications keep hirers informed throughout process
