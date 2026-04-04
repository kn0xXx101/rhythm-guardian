-- ============================================================================
-- RHYTHM GUARDIAN - INITIAL DATA
-- ============================================================================
-- This migration inserts initial platform settings and configuration data

-- ============================================================================
-- PLATFORM SETTINGS
-- ============================================================================

INSERT INTO platform_settings (key, value, description) VALUES
('registration', '{"enabled": true, "require_email_verification": false, "default_role": "hirer"}'::jsonb, 'User registration settings'),
('payment', '{"currency": "GHS", "platform_fee_percentage": 10, "payment_gateway": "paystack", "auto_payout_enabled": true}'::jsonb, 'Payment configuration'),
('messaging', '{"enabled": true, "max_message_length": 5000, "allow_attachments": true}'::jsonb, 'Messaging system configuration'),
('booking', '{"require_deposit": false, "default_deposit_percentage": 30, "auto_confirm_hours": 24}'::jsonb, 'Booking system configuration'),
('notifications', '{"email_enabled": true, "push_enabled": true, "sms_enabled": false}'::jsonb, 'Notification settings'),
('security', '{"max_login_attempts": 5, "session_timeout_minutes": 60, "require_2fa_for_admin": false}'::jsonb, 'Security settings'),
('features', '{"milestones_enabled": true, "split_payments_enabled": true, "disputes_enabled": true, "referrals_enabled": true, "loyalty_points_enabled": true}'::jsonb, 'Feature flags');

-- ============================================================================
-- REFUND POLICIES
-- ============================================================================

INSERT INTO refund_policies (days_before_event, refund_percentage, description, is_active) VALUES
(30, 100, 'Full refund for cancellations 30+ days before event', true),
(14, 75, '75% refund for cancellations 14-29 days before event', true),
(7, 50, '50% refund for cancellations 7-13 days before event', true),
(3, 25, '25% refund for cancellations 3-6 days before event', true),
(0, 0, 'No refund for cancellations less than 3 days before event', true);

-- ============================================================================
-- DEFAULT REWARDS
-- ============================================================================

INSERT INTO rewards (name, description, points_required, reward_type, reward_value, is_active) VALUES
('GHS 10 Discount', 'Get GHS 10 off your next booking', 100, 'discount', 10.00, true),
('GHS 25 Discount', 'Get GHS 25 off your next booking', 250, 'discount', 25.00, true),
('GHS 50 Discount', 'Get GHS 50 off your next booking', 500, 'discount', 50.00, true),
('Free Profile Boost', 'Boost your profile visibility for 7 days', 150, 'boost', 0, true),
('Premium Badge', 'Get a premium badge on your profile for 30 days', 300, 'badge', 0, true);

-- ============================================================================
-- SAMPLE ADMIN USER (Optional - for development)
-- ============================================================================
-- Note: This creates a sample admin user for development purposes
-- In production, you should create admin users through the Supabase dashboard
-- or use the SQL provided in the documentation

-- Uncomment the following to create a sample admin user:
/*
INSERT INTO auth.users (
    instance_id, 
    id, 
    aud, 
    role, 
    email, 
    encrypted_password,
    email_confirmed_at, 
    raw_app_meta_data, 
    raw_user_meta_data,
    created_at, 
    updated_at, 
    confirmation_token, 
    email_change,
    email_change_token_new, 
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000', 
    gen_random_uuid(),
    'authenticated', 
    'authenticated', 
    'admin@rhythmguardian.com',
    crypt('admin123', gen_salt('bf')), 
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin User","role":"admin"}'::jsonb,
    NOW(), 
    NOW(), 
    '', 
    '', 
    '', 
    ''
) ON CONFLICT (email) DO NOTHING;
*/

-- ============================================================================
-- SAMPLE BANK CODES (Ghana)
-- ============================================================================
-- These are stored in platform_settings for reference in the UI

INSERT INTO platform_settings (key, value, description) VALUES
('bank_codes', '{
  "GCB": "GCB Bank",
  "SCB": "Standard Chartered Bank",
  "CAL": "CAL Bank",
  "ADB": "Agricultural Development Bank",
  "FBL": "Fidelity Bank",
  "EBG": "Ecobank Ghana",
  "GTB": "Guaranty Trust Bank",
  "ZBL": "Zenith Bank",
  "ABG": "Access Bank Ghana",
  "UBA": "United Bank for Africa",
  "SBG": "Stanbic Bank",
  "PBL": "Prudential Bank",
  "BBG": "Barclays Bank Ghana",
  "NIB": "National Investment Bank",
  "UMB": "Universal Merchant Bank",
  "SGB": "Societe Generale Ghana",
  "FNB": "First National Bank",
  "RBG": "Republic Bank Ghana",
  "OBG": "Omni Bank Ghana",
  "CBG": "Consolidated Bank Ghana"
}'::jsonb, 'Ghana bank codes for Paystack integration');

-- ============================================================================
-- MOBILE MONEY PROVIDERS (Ghana)
-- ============================================================================

INSERT INTO platform_settings (key, value, description) VALUES
('mobile_money_providers', '{
  "MTN": "MTN Mobile Money",
  "VOD": "Vodafone Cash",
  "ATL": "AirtelTigo Money"
}'::jsonb, 'Ghana mobile money providers for Paystack integration');

-- ============================================================================
-- FRAUD DETECTION THRESHOLDS
-- ============================================================================

INSERT INTO platform_settings (key, value, description) VALUES
('fraud_detection', '{
  "max_booking_amount": 10000,
  "max_bookings_per_day": 5,
  "max_failed_payments": 3,
  "suspicious_keywords": ["test", "fake", "scam"],
  "velocity_check_enabled": true,
  "ip_blacklist_enabled": true,
  "device_fingerprint_enabled": false
}'::jsonb, 'Fraud detection configuration');

-- ============================================================================
-- EMAIL TEMPLATES CONFIGURATION
-- ============================================================================

INSERT INTO platform_settings (key, value, description) VALUES
('email_templates', '{
  "booking_confirmation": {
    "subject": "Booking Confirmation - {{event_type}}",
    "enabled": true
  },
  "booking_accepted": {
    "subject": "Your Booking Has Been Accepted",
    "enabled": true
  },
  "booking_cancelled": {
    "subject": "Booking Cancelled",
    "enabled": true
  },
  "payment_received": {
    "subject": "Payment Received",
    "enabled": true
  },
  "payout_released": {
    "subject": "Payment Released to Your Account",
    "enabled": true
  },
  "refund_processed": {
    "subject": "Refund Processed",
    "enabled": true
  },
  "review_reminder": {
    "subject": "Please Review Your Recent Booking",
    "enabled": true
  },
  "welcome": {
    "subject": "Welcome to Rhythm Guardian",
    "enabled": true
  }
}'::jsonb, 'Email template configuration');

-- ============================================================================
-- NOTIFICATION PREFERENCES DEFAULTS
-- ============================================================================

INSERT INTO platform_settings (key, value, description) VALUES
('notification_defaults', '{
  "email_notifications": true,
  "push_notifications": true,
  "booking_reminders": true,
  "message_notifications": true,
  "review_notifications": true,
  "marketing_emails": false,
  "payment_notifications": true,
  "payout_notifications": true
}'::jsonb, 'Default notification preferences for new users');

-- ============================================================================
-- BOOKING CONFIRMATION SETTINGS
-- ============================================================================

INSERT INTO platform_settings (key, value, description) VALUES
('booking_confirmation', '{
  "auto_release_days": 3,
  "require_both_confirmations": true,
  "reminder_hours_before_event": 24,
  "allow_early_payout": false,
  "minimum_confirmation_hours": 24
}'::jsonb, 'Booking confirmation and payout release settings');

-- ============================================================================
-- SEARCH AND DISCOVERY SETTINGS
-- ============================================================================

INSERT INTO platform_settings (key, value, description) VALUES
('search_settings', '{
  "max_search_radius_km": 100,
  "default_search_radius_km": 25,
  "results_per_page": 20,
  "enable_featured_musicians": true,
  "boost_verified_profiles": true,
  "boost_high_rated_profiles": true
}'::jsonb, 'Search and discovery configuration');

-- ============================================================================
-- RATE LIMITING SETTINGS
-- ============================================================================

INSERT INTO platform_settings (key, value, description) VALUES
('rate_limiting', '{
  "api_requests_per_minute": 60,
  "booking_requests_per_hour": 10,
  "message_requests_per_minute": 20,
  "search_requests_per_minute": 30,
  "enabled": true
}'::jsonb, 'Rate limiting configuration');

-- ============================================================================
-- MAINTENANCE MODE
-- ============================================================================

INSERT INTO platform_settings (key, value, description) VALUES
('maintenance', '{
  "enabled": false,
  "message": "We are currently performing scheduled maintenance. Please check back soon.",
  "allowed_ips": [],
  "estimated_completion": null
}'::jsonb, 'Maintenance mode settings');

-- ============================================================================
-- ANALYTICS SETTINGS
-- ============================================================================

INSERT INTO platform_settings (key, value, description) VALUES
('analytics', '{
  "enabled": true,
  "track_page_views": true,
  "track_events": true,
  "track_user_behavior": true,
  "retention_days": 365
}'::jsonb, 'Analytics and tracking configuration');

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RHYTHM GUARDIAN DATABASE SETUP COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All tables, functions, triggers, and initial data have been created.';
    RAISE NOTICE 'Registration is ENABLED by default.';
    RAISE NOTICE 'Platform fee is set to 10%% (90%% to musicians).';
    RAISE NOTICE 'Currency is set to GHS (Ghana Cedis).';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create an admin user through Supabase dashboard or SQL';
    RAISE NOTICE '2. Configure Paystack API keys in environment variables';
    RAISE NOTICE '3. Test user registration and booking flow';
    RAISE NOTICE '4. Configure email service for notifications';
    RAISE NOTICE '========================================';
END $$;
