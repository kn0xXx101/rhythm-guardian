-- Migration: Add paystack_subaccount to profiles table

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS paystack_subaccount VARCHAR(255);

COMMENT ON COLUMN profiles.paystack_subaccount IS 'The Paystack Subaccount Code used for split payments to this musician';
