-- One review per booking (hirer can review the same musician again on a later booking)
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_reviewer_reviewee_unique;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_booking_id_reviewer_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_reviewer_booking_unique
  ON reviews (reviewer_id, booking_id)
  WHERE booking_id IS NOT NULL;

COMMENT ON INDEX reviews_reviewer_booking_unique IS 'At most one review per reviewer per booking; allows multiple reviews of the same musician across bookings';
