-- 00001_initial_schema.sql
-- Foundational structure for the Rhythm Guardian database

-- System Schema Grants (Critical Fix for 'permission denied for schema public')
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- 1. Create Enums
CREATE TYPE public.booking_status AS ENUM ('pending', 'accepted', 'completed', 'cancelled', 'rejected', 'expired', 'in_progress');
CREATE TYPE public.dispute_status AS ENUM ('open', 'under_review', 'resolved', 'closed', 'escalated');
CREATE TYPE public.milestone_status AS ENUM ('pending', 'paid', 'released', 'cancelled');
CREATE TYPE public.notification_type AS ENUM ('system', 'booking', 'payment', 'message', 'review', 'payout');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partially_paid');
CREATE TYPE public.payment_type AS ENUM ('full', 'split', 'milestone');
CREATE TYPE public.pricing_type AS ENUM ('hourly', 'fixed');
CREATE TYPE public.refund_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'rejected');
CREATE TYPE public.transaction_type AS ENUM ('booking_payment', 'payout', 'refund', 'fee', 'milestone_payment');
CREATE TYPE public.user_role AS ENUM ('admin', 'musician', 'hirer');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');

-- 2. Base tables starting with Profiles
CREATE TABLE public.profiles (
    user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    role public.user_role NOT NULL,
    status public.user_status DEFAULT 'pending',
    is_active BOOLEAN DEFAULT false,
    
    full_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    bio TEXT,
    location TEXT,
    
    -- Musician specific
    genres TEXT[],
    instruments TEXT[],
    pricing_model TEXT,
    hourly_rate NUMERIC,
    base_price NUMERIC,
    available_days TEXT[],
    
    -- Verification
    documents_submitted BOOLEAN DEFAULT false,
    documents_verified BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    
    -- Banking
    bank_account_name TEXT,
    bank_account_number TEXT,
    bank_code TEXT,
    mobile_money_name TEXT,
    mobile_money_number TEXT,
    mobile_money_provider TEXT,
    
    -- Stats
    rating NUMERIC DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Bookings
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hirer_id UUID REFERENCES public.profiles(user_id) NOT NULL,
    musician_id UUID REFERENCES public.profiles(user_id) NOT NULL,
    
    -- Event tracking
    event_date TIMESTAMP WITH TIME ZONE,
    event_duration INTEGER,
    duration_hours NUMERIC,
    hours_booked NUMERIC,
    event_type TEXT,
    event_description TEXT,
    event_location TEXT,
    
    -- Financials 
    pricing_type public.pricing_type,
    hourly_rate NUMERIC,
    base_amount NUMERIC,
    total_amount NUMERIC,
    deposit_amount NUMERIC,
    
    status public.booking_status DEFAULT 'pending',
    payment_status public.payment_status DEFAULT 'pending',
    deposit_paid BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    service_confirmed_at TIMESTAMP WITH TIME ZONE,
    service_confirmed_by_hirer BOOLEAN DEFAULT false,
    service_confirmed_by_musician BOOLEAN DEFAULT false
);

-- Turn on RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies, Views, and Edge Function setup triggers will need to be progressively deployed.

-- 4. Communication (Conversations and Messages)
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant1_id UUID REFERENCES public.profiles(user_id) NOT NULL,
    participant2_id UUID REFERENCES public.profiles(user_id) NOT NULL,
    booking_id UUID REFERENCES public.bookings(id),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) NOT NULL,
    sender_id UUID REFERENCES public.profiles(user_id) NOT NULL,
    receiver_id UUID REFERENCES public.profiles(user_id) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) NOT NULL,
    type public.notification_type NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Financials
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) NOT NULL,
    booking_id UUID REFERENCES public.bookings(id),
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'NGN',
    platform_fee NUMERIC,
    payment_method TEXT,
    payment_gateway TEXT,
    paystack_reference TEXT,
    gateway_response JSONB,
    channel TEXT,
    status TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) NOT NULL,
    reviewer_id UUID REFERENCES public.profiles(user_id) NOT NULL,
    reviewee_id UUID REFERENCES public.profiles(user_id) NOT NULL,
    rating INTEGER NOT NULL,
    communication_rating INTEGER,
    professionalism_rating INTEGER,
    performance_rating INTEGER,
    content TEXT,
    comment TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 7. User Settings & Portfolios
CREATE TABLE public.user_settings (
    user_id UUID REFERENCES public.profiles(user_id) PRIMARY KEY,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    message_notifications BOOLEAN DEFAULT true,
    booking_reminders BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    review_notifications BOOLEAN DEFAULT true,
    timezone TEXT DEFAULT 'UTC',
    currency TEXT DEFAULT 'GHS',
    availability_schedule JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    musician_user_id UUID REFERENCES public.profiles(user_id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    media_url TEXT NOT NULL,
    media_type TEXT,
    thumbnail_url TEXT,
    display_order INTEGER,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hirer_id UUID REFERENCES public.profiles(user_id) NOT NULL,
    musician_id UUID REFERENCES public.profiles(user_id) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hirer_id, musician_id)
);

-- 8. Platform Integrity (Disputes & Support)
CREATE TABLE public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) NOT NULL,
    opened_by UUID REFERENCES public.profiles(user_id) NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status public.dispute_status DEFAULT 'open',
    resolution TEXT,
    resolved_by UUID REFERENCES public.profiles(user_id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.dispute_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID REFERENCES public.disputes(id) NOT NULL,
    sender_id UUID REFERENCES public.profiles(user_id) NOT NULL,
    content TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'normal',
    category TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.support_tickets(id) NOT NULL,
    sender_id UUID REFERENCES public.profiles(user_id) NOT NULL,
    content TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. System Configurations & Security
CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES public.profiles(user_id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.fraud_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id),
    transaction_id UUID REFERENCES public.transactions(id),
    risk_score NUMERIC,
    alert_type TEXT,
    details JSONB,
    status TEXT DEFAULT 'open',
    resolved_by UUID REFERENCES public.profiles(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Financial Extensions (Refunds & Analytics)
CREATE TABLE public.refund_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    days_before_event INTEGER NOT NULL,
    refund_percentage NUMERIC NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) NOT NULL,
    amount NUMERIC NOT NULL,
    refund_percentage NUMERIC NOT NULL,
    reason TEXT,
    status public.refund_status DEFAULT 'pending',
    requested_by UUID REFERENCES public.profiles(user_id),
    transaction_id UUID REFERENCES public.transactions(id),
    paystack_reference TEXT,
    error_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.payment_analytics (
    date DATE PRIMARY KEY,
    total_revenue NUMERIC DEFAULT 0,
    platform_fees NUMERIC DEFAULT 0,
    successful_transactions INTEGER DEFAULT 0,
    failed_transactions INTEGER DEFAULT 0,
    refunded_amount NUMERIC DEFAULT 0,
    active_hirers INTEGER DEFAULT 0,
    active_musicians INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on RLS for the newly added tables
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_analytics ENABLE ROW LEVEL SECURITY;

-- 11. Remaining Core Dependencies
CREATE TABLE public.pricing_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    musician_user_id UUID REFERENCES public.profiles(user_id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    duration_hours NUMERIC,
    tier TEXT,
    is_active BOOLEAN DEFAULT true,
    features JSONB,
    display_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES public.profiles(user_id) NOT NULL,
    referred_email TEXT NOT NULL,
    referred_user_id UUID REFERENCES public.profiles(user_id),
    referral_code TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    reward_given BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    reward_type TEXT,
    reward_value NUMERIC,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.pricing_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- 12. Core System Views
CREATE OR REPLACE VIEW public.bookings_with_profiles AS
SELECT 
    b.*,
    hp.full_name as hirer_name,
    hp.email as hirer_email,
    hp.phone as hirer_phone,
    mp.full_name as musician_name,
    mp.email as musician_email,
    mp.phone as musician_phone,
    -- Financial derivation for dashboard views
    (b.total_amount - COALESCE((SELECT SUM(amount) FROM public.transactions WHERE booking_id = b.id AND type = 'fee'), 0)) as musician_payout,
    -- Payout status abstraction
    CASE WHEN b.payment_status = 'paid' THEN true ELSE false END as payout_released,
    b.completed_at as payout_released_at
FROM public.bookings b
LEFT JOIN public.profiles hp ON b.hirer_id = hp.user_id
LEFT JOIN public.profiles mp ON b.musician_id = mp.user_id;

CREATE OR REPLACE VIEW public.analytics_summary AS
SELECT
    COALESCE(SUM(total_revenue), 0) as total_revenue,
    COALESCE(SUM(platform_fees), 0) as total_platform_fees,
    COALESCE(SUM(successful_transactions), 0) as total_bookings,
    COALESCE(SUM(refunded_amount), 0) as total_payouts,    
    (SELECT COALESCE(SUM(total_revenue), 0) FROM public.payment_analytics WHERE date >= CURRENT_DATE - INTERVAL '7 days') as revenue_last_7_days,
    (SELECT COALESCE(SUM(total_revenue), 0) FROM public.payment_analytics WHERE date >= CURRENT_DATE - INTERVAL '30 days') as revenue_last_30_days,
    (SELECT COALESCE(SUM(successful_transactions), 0) FROM public.payment_analytics WHERE date >= CURRENT_DATE - INTERVAL '7 days') as bookings_last_7_days,
    (SELECT COALESCE(SUM(successful_transactions), 0) FROM public.payment_analytics WHERE date >= CURRENT_DATE - INTERVAL '30 days') as bookings_last_30_days,
    CASE 
        WHEN SUM(successful_transactions) > 0 THEN SUM(total_revenue) / SUM(successful_transactions)
        ELSE 0 
    END as avg_booking_value
FROM public.payment_analytics;

-- 13. System Functions (RPCs)
CREATE OR REPLACE FUNCTION public.send_message(
    p_sender_id UUID,
    p_conversation_id UUID,
    p_content TEXT,
    -- optional payload params omitted for baseline
    p_receiver_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_message_id UUID;
    v_receiver_id UUID;
BEGIN
    SELECT 
        CASE WHEN participant1_id = p_sender_id THEN participant2_id ELSE participant1_id END
    INTO v_receiver_id
    FROM public.conversations WHERE id = p_conversation_id;

    INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content)
    VALUES (p_conversation_id, p_sender_id, COALESCE(p_receiver_id, v_receiver_id), p_content)
    RETURNING id INTO v_message_id;

    UPDATE public.conversations 
    SET last_message_at = NOW() 
    WHERE id = p_conversation_id;

    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.mark_message_read(p_message_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.messages
    SET is_read = true
    WHERE id = p_message_id AND receiver_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.confirm_service(booking_id UUID, confirming_role TEXT)
RETURNS JSON AS $$
DECLARE
    v_booking public.bookings;
BEGIN
    SELECT * INTO v_booking FROM public.bookings WHERE id = booking_id;
    
    IF confirming_role = 'hirer' THEN
        UPDATE public.bookings SET service_confirmed_by_hirer = true, service_confirmed_at = NOW() WHERE id = booking_id;
    ELSIF confirming_role = 'musician' THEN
        UPDATE public.bookings SET service_confirmed_by_musician = true WHERE id = booking_id;
    END IF;

    -- If both confirmed, auto-complete
    IF (SELECT service_confirmed_by_hirer FROM public.bookings WHERE id = booking_id) = true AND 
       (SELECT service_confirmed_by_musician FROM public.bookings WHERE id = booking_id) = true THEN
       UPDATE public.bookings SET status = 'completed', completed_at = NOW() WHERE id = booking_id;
    END IF;

    RETURN '{"success": true}'::json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 14. Triggers
CREATE OR REPLACE FUNCTION public.create_booking_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Handles INSERT (new bookings)
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.notifications (user_id, type, title, content, metadata)
        VALUES (
            NEW.musician_id,
            'booking',
            'New Booking Request',
            'You have received a new booking request.',
            jsonb_build_object('booking_id', NEW.id)
        );
    -- Handles UPDATE (status changes)
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        IF NEW.status = 'accepted' THEN
            INSERT INTO public.notifications (user_id, type, title, content, metadata)
            VALUES (NEW.hirer_id, 'booking', 'Booking Accepted', 'Your booking request was accepted!', jsonb_build_object('booking_id', NEW.id));
        ELSIF NEW.status = 'rejected' OR NEW.status = 'cancelled' THEN
            INSERT INTO public.notifications (user_id, type, title, content, metadata)
            VALUES (NEW.hirer_id, 'booking', 'Booking ' || NEW.status, 'Your booking was ' || NEW.status, jsonb_build_object('booking_id', NEW.id));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER on_booking_change
    AFTER INSERT OR UPDATE OF status ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.create_booking_notification();

-- 14.b Security Revokes for RPCS
REVOKE EXECUTE ON FUNCTION public.send_message(UUID, UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_message(UUID, UUID, TEXT, UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.mark_message_read(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_message_read(UUID, UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.confirm_service(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_service(UUID, TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.create_booking_notification() FROM PUBLIC;

-- 15. Frontend Feature Extensions (mapped from types/features.ts)
CREATE TABLE public.search_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    name TEXT,
    instruments TEXT[],
    genres TEXT[],
    min_price NUMERIC,
    max_price NUMERIC,
    location TEXT,
    radius NUMERIC,
    min_rating NUMERIC,
    experience_level TEXT,
    is_default BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.musician_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    musician_user_id UUID,
    date TEXT,
    status TEXT,
    time_slots JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);


CREATE TABLE public.availability_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    musician_user_id UUID,
    day_of_week NUMERIC,
    start_time TEXT,
    end_time TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.package_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    musician_user_id UUID,
    name TEXT,
    description TEXT,
    price NUMERIC,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    email_bookings BOOLEAN,
    email_messages BOOLEAN,
    email_reviews BOOLEAN,
    email_promotions BOOLEAN,
    in_app_bookings BOOLEAN,
    in_app_messages BOOLEAN,
    in_app_reviews BOOLEAN,
    in_app_system BOOLEAN,
    push_bookings BOOLEAN,
    push_messages BOOLEAN,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.featured_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    musician_user_id UUID,
    package TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    amount_paid NUMERIC,
    position NUMERIC,
    impressions NUMERIC,
    clicks NUMERIC,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.promotion_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT,
    type TEXT,
    value NUMERIC,
    description TEXT,
    max_uses NUMERIC,
    uses_count NUMERIC,
    min_booking_amount NUMERIC,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.review_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID,
    musician_user_id UUID,
    response TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.review_medias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID,
    type TEXT,
    url TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    points NUMERIC,
    reason TEXT,
    reference_type TEXT,
    reference_id UUID,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.dispute_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID,
    uploaded_by TEXT,
    type TEXT,
    url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.booking_protection_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    description TEXT,
    coverage_percentage NUMERIC,
    fee_percentage NUMERIC,
    max_claim_amount NUMERIC,
    terms TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.cancellation_policys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    description TEXT,
    hours_before_event NUMERIC,
    refund_percentage NUMERIC,
    is_default BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.protection_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID,
    claimant_id UUID,
    claim_type TEXT,
    claim_amount NUMERIC,
    status TEXT,
    description TEXT,
    evidence_urls TEXT[],
    admin_notes TEXT,
    processed_by TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.verification_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    document_type TEXT,
    front_url TEXT,
    back_url TEXT,
    status TEXT,
    rejection_reason TEXT,
    verified_by TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.verification_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    check_type TEXT,
    status TEXT,
    data JSONB,
    checked_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.background_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    provider TEXT,
    status TEXT,
    report_url TEXT,
    result_data JSONB,
    initiated_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    event_type TEXT,
    event_name TEXT,
    properties JSONB,
    session_id UUID,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.earnings_summarys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    musician_user_id UUID,
    period_start TEXT,
    period_end TEXT,
    total_earnings NUMERIC,
    platform_fees NUMERIC,
    net_earnings NUMERIC,
    completed_bookings NUMERIC,
    cancelled_bookings NUMERIC,
    refunded_amount NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    name TEXT,
    report_type TEXT,
    filters JSONB,
    columns TEXT[],
    schedule TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.booking_negotiations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID,
    hirer_id UUID,
    musician_id UUID,
    status TEXT,
    current_offer_by TEXT,
    current_price NUMERIC,
    original_price NUMERIC,
    notes TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.custom_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negotiation_id UUID,
    proposed_by TEXT,
    price NUMERIC,
    duration_hours NUMERIC,
    description TEXT,
    includes TEXT[],
    terms TEXT,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.video_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID,
    host_id UUID,
    participant_id UUID,
    call_type TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    duration_minutes NUMERIC,
    room_url TEXT,
    status TEXT,
    notes TEXT,
    recording_url TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    subject TEXT,
    body_html TEXT,
    body_text TEXT,
    variables TEXT[],
    category TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.scheduled_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    template_name TEXT,
    trigger_event TEXT,
    delay_hours NUMERIC,
    variables JSONB,
    status TEXT,
    scheduled_for TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    completed_steps TEXT[],
    current_step TEXT,
    is_completed BOOLEAN,
    skipped BOOLEAN,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.feature_tours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    tour_name TEXT,
    completed BOOLEAN,
    last_step NUMERIC,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
);


ALTER TABLE public.search_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.musician_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_medias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_protection_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_policys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protection_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_summarys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_tours ENABLE ROW LEVEL SECURITY;

-- 16. Row Level Security Policies
CREATE Policy "System Admin bypass" ON public.profiles FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Public Select" ON public.profiles FOR SELECT USING ( true );
CREATE Policy "Owner Update" ON public.profiles FOR UPDATE USING ( auth.uid() = user_id );
CREATE Policy "System Admin bypass" ON public.bookings FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.bookings FOR ALL USING ( auth.uid() IN (hirer_id, musician_id) );
CREATE Policy "System Admin bypass" ON public.conversations FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.conversations FOR ALL USING ( auth.uid() IN (participant1_id, participant2_id) );
CREATE Policy "System Admin bypass" ON public.messages FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.messages FOR ALL USING ( auth.uid() IN (sender_id, receiver_id) );
CREATE Policy "System Admin bypass" ON public.notifications FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.notifications FOR ALL USING ( auth.uid() = user_id );
CREATE Policy "System Admin bypass" ON public.transactions FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.transactions FOR ALL USING ( auth.uid() = user_id );
CREATE Policy "System Admin bypass" ON public.reviews FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.reviews FOR ALL USING ( auth.uid() IN (SELECT b.hirer_id FROM public.bookings b WHERE b.id = booking_id) OR auth.uid() IN (SELECT b.musician_id FROM public.bookings b WHERE b.id = booking_id) );
CREATE Policy "System Admin bypass" ON public.user_settings FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.user_settings FOR ALL USING ( auth.uid() = user_id );
CREATE Policy "System Admin bypass" ON public.portfolio_items FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.portfolio_items FOR ALL USING ( auth.uid() = musician_user_id );
CREATE Policy "System Admin bypass" ON public.favorites FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.favorites FOR ALL USING ( auth.uid() IN (hirer_id, musician_id) );
CREATE Policy "System Admin bypass" ON public.disputes FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.disputes FOR ALL USING ( auth.uid() IN (SELECT b.hirer_id FROM public.bookings b WHERE b.id = booking_id) OR auth.uid() IN (SELECT b.musician_id FROM public.bookings b WHERE b.id = booking_id) );
CREATE Policy "System Admin bypass" ON public.dispute_messages FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Public Access fallback" ON public.dispute_messages FOR SELECT USING ( true );
CREATE Policy "System Admin bypass" ON public.support_tickets FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.support_tickets FOR ALL USING ( auth.uid() = user_id );
CREATE Policy "System Admin bypass" ON public.ticket_messages FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Public Access fallback" ON public.ticket_messages FOR SELECT USING ( true );
CREATE Policy "System Admin bypass" ON public.settings FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Public Select" ON public.settings FOR SELECT USING ( true );
CREATE Policy "System Admin bypass" ON public.platform_settings FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Public Select" ON public.platform_settings FOR SELECT USING ( true );
CREATE Policy "System Admin bypass" ON public.audit_logs FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.audit_logs FOR ALL USING ( auth.uid() = actor_user_id );
CREATE Policy "System Admin bypass" ON public.fraud_alerts FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.fraud_alerts FOR ALL USING ( auth.uid() = user_id );
CREATE Policy "System Admin bypass" ON public.refund_policies FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Public Select" ON public.refund_policies FOR SELECT USING ( true );
CREATE Policy "System Admin bypass" ON public.refunds FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.refunds FOR ALL USING ( auth.uid() IN (SELECT b.hirer_id FROM public.bookings b WHERE b.id = booking_id) OR auth.uid() IN (SELECT b.musician_id FROM public.bookings b WHERE b.id = booking_id) );
CREATE Policy "System Admin bypass" ON public.payment_analytics FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Public Access fallback" ON public.payment_analytics FOR SELECT USING ( true );
CREATE Policy "System Admin bypass" ON public.pricing_packages FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.pricing_packages FOR ALL USING ( auth.uid() = musician_user_id );
CREATE Policy "System Admin bypass" ON public.referrals FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.referrals FOR ALL USING ( auth.uid() IN (referrer_id, referred_user_id) );
CREATE Policy "System Admin bypass" ON public.rewards FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Public Access fallback" ON public.rewards FOR SELECT USING ( true );
CREATE Policy "System Admin bypass" ON public.search_preferences FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.search_preferences FOR ALL USING ( auth.uid() = user_id );
CREATE Policy "System Admin bypass" ON public.musician_availability FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.musician_availability FOR ALL USING ( auth.uid() = musician_user_id );
CREATE Policy "System Admin bypass" ON public.availability_patterns FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.availability_patterns FOR ALL USING ( auth.uid() = musician_user_id );
CREATE Policy "System Admin bypass" ON public.package_addons FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.package_addons FOR ALL USING ( auth.uid() = musician_user_id );
CREATE Policy "System Admin bypass" ON public.notification_preferences FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.notification_preferences FOR ALL USING ( auth.uid() = user_id );
CREATE Policy "System Admin bypass" ON public.featured_listings FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.featured_listings FOR ALL USING ( auth.uid() = musician_user_id );
CREATE Policy "System Admin bypass" ON public.promotion_codes FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Public Access fallback" ON public.promotion_codes FOR SELECT USING ( true );
CREATE Policy "System Admin bypass" ON public.review_responses FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.review_responses FOR ALL USING ( auth.uid() = musician_user_id );
CREATE Policy "System Admin bypass" ON public.review_medias FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Public Access fallback" ON public.review_medias FOR SELECT USING ( true );
CREATE Policy "System Admin bypass" ON public.loyalty_points FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.loyalty_points FOR ALL USING ( auth.uid() = user_id );
CREATE Policy "System Admin bypass" ON public.dispute_evidence FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Public Access fallback" ON public.dispute_evidence FOR SELECT USING ( true );
CREATE Policy "System Admin bypass" ON public.booking_protection_plans FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Public Access fallback" ON public.booking_protection_plans FOR SELECT USING ( true );
CREATE Policy "System Admin bypass" ON public.cancellation_policys FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Public Access fallback" ON public.cancellation_policys FOR SELECT USING ( true );
CREATE Policy "System Admin bypass" ON public.protection_claims FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.protection_claims FOR ALL USING ( auth.uid() IN (SELECT b.hirer_id FROM public.bookings b WHERE b.id = booking_id) OR auth.uid() IN (SELECT b.musician_id FROM public.bookings b WHERE b.id = booking_id) );
CREATE Policy "System Admin bypass" ON public.verification_documents FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.verification_documents FOR ALL USING ( auth.uid() = user_id );
CREATE Policy "System Admin bypass" ON public.verification_checks FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.verification_checks FOR ALL USING ( auth.uid() = user_id );
CREATE Policy "System Admin bypass" ON public.background_checks FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.background_checks FOR ALL USING ( auth.uid() = user_id );
CREATE Policy "System Admin bypass" ON public.analytics_events FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.analytics_events FOR ALL USING ( auth.uid() = user_id );
CREATE Policy "System Admin bypass" ON public.earnings_summarys FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.earnings_summarys FOR ALL USING ( auth.uid() = musician_user_id );
CREATE Policy "System Admin bypass" ON public.report_templates FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.report_templates FOR ALL USING ( auth.uid() = user_id );
CREATE Policy "System Admin bypass" ON public.booking_negotiations FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.booking_negotiations FOR ALL USING ( auth.uid() IN (hirer_id, musician_id) );
CREATE Policy "System Admin bypass" ON public.custom_proposals FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Public Access fallback" ON public.custom_proposals FOR SELECT USING ( true );
CREATE Policy "System Admin bypass" ON public.video_calls FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.video_calls FOR ALL USING ( auth.uid() IN (SELECT b.hirer_id FROM public.bookings b WHERE b.id = booking_id) OR auth.uid() IN (SELECT b.musician_id FROM public.bookings b WHERE b.id = booking_id) );
CREATE Policy "System Admin bypass" ON public.email_templates FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Public Access fallback" ON public.email_templates FOR SELECT USING ( true );
CREATE Policy "System Admin bypass" ON public.scheduled_emails FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.scheduled_emails FOR ALL USING ( auth.uid() = user_id );
CREATE Policy "System Admin bypass" ON public.onboarding_progress FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.onboarding_progress FOR ALL USING ( auth.uid() = user_id );
CREATE Policy "System Admin bypass" ON public.feature_tours FOR ALL USING ( (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' );
CREATE Policy "Owner Access" ON public.feature_tours FOR ALL USING ( auth.uid() = user_id );

