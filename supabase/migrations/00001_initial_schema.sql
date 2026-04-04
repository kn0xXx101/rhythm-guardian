-- ============================================================================
-- RHYTHM GUARDIAN - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- This migration creates all core tables, types, and indexes for the platform
-- including Paystack integration, payment milestones, refunds, disputes, etc.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'musician', 'hirer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'completed', 'cancelled', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partially_paid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('booking_payment', 'payout', 'refund', 'fee', 'milestone_payment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE milestone_status AS ENUM ('pending', 'paid', 'released', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE refund_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved', 'closed', 'escalated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_type AS ENUM ('full', 'split', 'milestone');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'hirer',
    status user_status NOT NULL DEFAULT 'pending',
    email TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    phone TEXT,
    location TEXT,
    bio TEXT,
    avatar_url TEXT,
    
    -- Musician specific fields
    instruments TEXT[],
    genres TEXT[],
    hourly_rate DECIMAL(10,2),
    rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    
    -- Payment details for musicians (Paystack)
    bank_account_number TEXT,
    bank_code TEXT,
    bank_account_name TEXT,
    mobile_money_number TEXT,
    mobile_money_provider TEXT,
    mobile_money_name TEXT,
    
    -- Profile completion
    profile_complete BOOLEAN DEFAULT FALSE,
    documents_submitted BOOLEAN DEFAULT FALSE,
    documents_verified BOOLEAN DEFAULT FALSE,
    profile_completion_percentage INTEGER DEFAULT 0,
    required_documents JSONB DEFAULT '[]'::jsonb,
    
    -- Additional metadata
    payment_details JSONB,
    preferences JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PLATFORM SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    booking_reminders BOOLEAN DEFAULT TRUE,
    message_notifications BOOLEAN DEFAULT TRUE,
    review_notifications BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    availability_schedule JSONB,
    timezone TEXT DEFAULT 'UTC',
    currency TEXT DEFAULT 'GHS',
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BOOKINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    musician_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
    hirer_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
    
    -- Event details
    event_type TEXT NOT NULL,
    event_date TIMESTAMPTZ,
    event_duration INTEGER,
    location TEXT,
    description TEXT,
    
    -- Payment details
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'GHS',
    payment_type payment_type DEFAULT 'full',
    payment_status payment_status DEFAULT 'pending',
    
    -- Split payment fields
    deposit_percentage DECIMAL(5,2),
    deposit_amount DECIMAL(10,2),
    balance_amount DECIMAL(10,2),
    deposit_paid BOOLEAN DEFAULT FALSE,
    deposit_paid_at TIMESTAMPTZ,
    balance_paid BOOLEAN DEFAULT FALSE,
    balance_paid_at TIMESTAMPTZ,
    
    -- Booking status
    status booking_status DEFAULT 'pending',
    service_confirmed_by_hirer BOOLEAN DEFAULT FALSE,
    service_confirmed_by_musician BOOLEAN DEFAULT FALSE,
    
    -- Payout tracking
    payout_released BOOLEAN DEFAULT FALSE,
    payout_released_at TIMESTAMPTZ,
    platform_fee DECIMAL(10,2),
    musician_payout DECIMAL(10,2),
    
    -- Auto-release settings
    auto_release_enabled BOOLEAN DEFAULT FALSE,
    auto_release_date TIMESTAMPTZ,
    
    -- Cancellation and refund
    cancellation_requested_at TIMESTAMPTZ,
    cancellation_requested_by UUID REFERENCES profiles(user_id),
    cancellation_reason TEXT,
    refund_amount DECIMAL(10,2),
    refund_percentage DECIMAL(5,2),
    refund_processed_at TIMESTAMPTZ,
    refund_reference TEXT,
    
    -- Paystack integration
    paystack_reference TEXT,
    paystack_access_code TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PAYMENT MILESTONES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    milestone_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    due_date TIMESTAMPTZ,
    status milestone_status DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    paystack_reference TEXT,
    transaction_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(booking_id, milestone_number)
);

-- ============================================================================
-- PAYMENT SPLITS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    transaction_id UUID,
    split_type TEXT NOT NULL CHECK (split_type IN ('deposit', 'balance', 'full')),
    amount DECIMAL(10,2) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    status payment_status DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    paystack_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'GHS',
    status payment_status DEFAULT 'pending',
    payment_method TEXT,
    payment_reference TEXT,
    paystack_reference TEXT,
    description TEXT,
    platform_fee DECIMAL(10,2) DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- REFUNDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id),
    amount DECIMAL(10,2) NOT NULL,
    refund_percentage DECIMAL(5,2) NOT NULL,
    reason TEXT,
    status refund_status DEFAULT 'pending',
    requested_by UUID REFERENCES profiles(user_id),
    processed_at TIMESTAMPTZ,
    paystack_reference TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- REFUND POLICIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS refund_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    days_before_event INTEGER NOT NULL,
    refund_percentage DECIMAL(5,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(days_before_event)
);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- REVIEWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
    reviewee_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(booking_id, reviewer_id)
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'system',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    action_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DISPUTES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    filed_by UUID NOT NULL REFERENCES profiles(user_id),
    filed_against UUID NOT NULL REFERENCES profiles(user_id),
    reason TEXT NOT NULL,
    description TEXT,
    status dispute_status DEFAULT 'open',
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES profiles(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DISPUTE MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS dispute_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(user_id),
    message TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DISPUTE EVIDENCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS dispute_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES profiles(user_id),
    file_url TEXT NOT NULL,
    file_type TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PRICING PACKAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS pricing_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    musician_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'custom')),
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_hours INTEGER,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PACKAGE ADDONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS package_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    musician_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PORTFOLIO ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    musician_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'video', 'audio', 'youtube', 'spotify')),
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    display_order INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- REFERRALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    referred_email TEXT NOT NULL,
    referred_user_id UUID REFERENCES profiles(user_id),
    referral_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    reward_given BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ============================================================================
-- LOYALTY POINTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    reason TEXT,
    reference_type TEXT,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- REWARDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    reward_type TEXT,
    reward_value DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FRAUD DETECTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS fraud_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id),
    booking_id UUID REFERENCES bookings(id),
    transaction_id UUID REFERENCES transactions(id),
    alert_type TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    risk_score DECIMAL(5,2),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES profiles(user_id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES profiles(user_id),
    actor_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PAYMENT ANALYTICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    total_bookings INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    platform_fees DECIMAL(10,2) DEFAULT 0,
    musician_payouts DECIMAL(10,2) DEFAULT 0,
    completed_transactions INTEGER DEFAULT 0,
    pending_transactions INTEGER DEFAULT 0,
    failed_transactions INTEGER DEFAULT 0,
    refunded_amount DECIMAL(10,2) DEFAULT 0,
    refund_count INTEGER DEFAULT 0,
    average_booking_value DECIMAL(10,2) DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    active_musicians INTEGER DEFAULT 0,
    active_hirers INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Profiles indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_location ON profiles(location);
CREATE INDEX idx_profiles_rating ON profiles(rating DESC);
CREATE INDEX idx_profiles_email ON profiles(email);

-- Bookings indexes
CREATE INDEX idx_bookings_musician_id ON bookings(musician_id);
CREATE INDEX idx_bookings_hirer_id ON bookings(hirer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_event_date ON bookings(event_date);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_payment_type ON bookings(payment_type);
CREATE INDEX idx_bookings_payout_released ON bookings(payout_released);
CREATE INDEX idx_bookings_auto_release ON bookings(auto_release_enabled, auto_release_date) WHERE auto_release_enabled = TRUE;
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);

-- Payment milestones indexes
CREATE INDEX idx_milestones_booking_id ON payment_milestones(booking_id);
CREATE INDEX idx_milestones_status ON payment_milestones(status);
CREATE INDEX idx_milestones_due_date ON payment_milestones(due_date);

-- Payment splits indexes
CREATE INDEX idx_splits_booking_id ON payment_splits(booking_id);
CREATE INDEX idx_splits_status ON payment_splits(status);

-- Transactions indexes
CREATE INDEX idx_transactions_booking_id ON transactions(booking_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_paystack_ref ON transactions(paystack_reference);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- Refunds indexes
CREATE INDEX idx_refunds_booking_id ON refunds(booking_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_created_at ON refunds(created_at DESC);

-- Messages indexes
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_booking_id ON messages(booking_id);
CREATE INDEX idx_messages_read ON messages(receiver_id, read);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Reviews indexes
CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Disputes indexes
CREATE INDEX idx_disputes_booking_id ON disputes(booking_id);
CREATE INDEX idx_disputes_filed_by ON disputes(filed_by);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_created_at ON disputes(created_at DESC);

-- Pricing packages indexes
CREATE INDEX idx_packages_musician_id ON pricing_packages(musician_user_id);
CREATE INDEX idx_packages_active ON pricing_packages(is_active);

-- Portfolio indexes
CREATE INDEX idx_portfolio_musician_id ON portfolio_items(musician_user_id);
CREATE INDEX idx_portfolio_order ON portfolio_items(display_order);

-- Referrals indexes
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_referrals_status ON referrals(status);

-- Loyalty points indexes
CREATE INDEX idx_loyalty_user_id ON loyalty_points(user_id);
CREATE INDEX idx_loyalty_created_at ON loyalty_points(created_at DESC);

-- Fraud alerts indexes
CREATE INDEX idx_fraud_user_id ON fraud_alerts(user_id);
CREATE INDEX idx_fraud_booking_id ON fraud_alerts(booking_id);
CREATE INDEX idx_fraud_severity ON fraud_alerts(severity);
CREATE INDEX idx_fraud_status ON fraud_alerts(status);
CREATE INDEX idx_fraud_created_at ON fraud_alerts(created_at DESC);

-- Audit logs indexes
CREATE INDEX idx_audit_actor_id ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);

-- Analytics indexes
CREATE INDEX idx_analytics_date ON payment_analytics(date DESC);

-- User settings index
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- Platform settings index
CREATE INDEX idx_platform_settings_key ON platform_settings(key);

