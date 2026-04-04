# Final Issues to Fix

## Issue 1: Financial Monitor Showing All Zeros
**Problem**: Financial Monitor displays ₵0.00 revenue, 0 completed, 0 pending, and "No transactions found"

**Root Cause**: Transactions are not being created in the `transactions` table when payments are made. The PaymentModal updates bookings but doesn't create transaction records due to database constraint issues.

**Solution Needed**:
1. Check if transactions exist in database (run SIMPLE_TRANSACTION_CHECK.sql)
2. If no transactions exist, create them from existing bookings
3. Fix the constraint issue preventing transaction creation

## Issue 2: Star Ratings Showing 0.0
**Problem**: Musician profiles show 0.0 rating even when reviews exist

**Root Cause**: The rating and total_reviews fields in the profiles table are not being updated when reviews are submitted.

**Solution Needed**:
1. Create a trigger to automatically update profile ratings when reviews are added
2. Recalculate existing ratings from current reviews
3. Ensure ReviewDialog updates the profile after submitting a review

## Immediate Actions Required:

### For Financial Monitor:
Run this SQL to check if transactions exist:
```sql
SELECT COUNT(*) FROM transactions;
SELECT * FROM transactions WHERE status = 'paid' LIMIT 5;
```

If no transactions exist, we need to create them from the bookings table.

### For Star Ratings:
Run this SQL to check reviews and ratings:
```sql
SELECT 
    p.user_id,
    p.full_name,
    p.rating,
    p.total_reviews,
    COUNT(r.id) as actual_review_count,
    AVG(r.rating) as actual_average_rating
FROM profiles p
LEFT JOIN reviews r ON r.musician_id = p.user_id
WHERE p.role = 'musician'
GROUP BY p.user_id, p.full_name, p.rating, p.total_reviews;
```

This will show if there's a mismatch between stored ratings and actual reviews.