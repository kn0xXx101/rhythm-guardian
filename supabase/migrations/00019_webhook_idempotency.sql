-- Create table for storing processed webhook event IDs for idempotency
CREATE TABLE IF NOT EXISTS webhook_events (
  id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(255) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Enable RLS (though mostly used by service role)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON TABLE webhook_events IS 'Stores processed Paystack webhook event IDs to ensure idempotent processing and prevent duplicate transactions';
