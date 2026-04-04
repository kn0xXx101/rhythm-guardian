-- ============================================================================
-- RHYTHM GUARDIAN - FUNCTIONS AND TRIGGERS
-- ============================================================================
-- This migration creates all database functions, triggers, and views

-- Drop existing triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
DROP TRIGGER IF EXISTS update_platform_settings_updated_at ON platform_settings;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
DROP TRIGGER IF EXISTS update_milestones_updated_at ON payment_milestones;
DROP TRIGGER IF EXISTS update_splits_updated_at ON payment_splits;
DROP TRIGGER IF EXISTS update_refunds_updated_at ON refunds;
DROP TRIGGER IF EXISTS update_disputes_updated_at ON disputes;
DROP TRIGGER IF EXISTS update_packages_updated_at ON pricing_packages;
DROP TRIGGER IF EXISTS update_rewards_updated_at ON rewards;
DROP TRIGGER IF EXISTS update_analytics_updated_at ON payment_analytics;
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
DROP TRIGGER IF EXISTS on_profile_updated ON profiles;
DROP TRIGGER IF EXISTS on_review_created ON reviews;
DROP TRIGGER IF EXISTS on_review_updated ON reviews;
DROP TRIGGER IF EXISTS on_message_created ON messages;
DROP TRIGGER IF EXISTS on_booking_change ON bookings;

-- ============================================================================
-- FUNCTION: Auto-update timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON platform_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON payment_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_splits_updated_at BEFORE UPDATE ON payment_splits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON refunds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON pricing_packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_updated_at BEFORE UPDATE ON payment_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: Auto-create profile on user signup
-- ============================================================================

CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (user_id, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'hirer'::user_role)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_profile_for_user();

-- ============================================================================
-- FUNCTION: Auto-create user settings on profile creation
-- ============================================================================

CREATE OR REPLACE FUNCTION create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_settings (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profile_created
    AFTER INSERT ON profiles
    FOR EACH ROW EXECUTE FUNCTION create_user_settings();

-- ============================================================================
-- FUNCTION: Calculate profile completion percentage
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_profile_completion(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    completion_score INTEGER := 0;
    total_fields INTEGER := 10;
    profile_record RECORD;
BEGIN
    SELECT * INTO profile_record FROM profiles WHERE user_id = p_user_id;
    
    IF profile_record IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Basic fields (1 point each)
    IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF profile_record.email IS NOT NULL AND profile_record.email != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF profile_record.phone IS NOT NULL AND profile_record.phone != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF profile_record.location IS NOT NULL AND profile_record.location != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF profile_record.bio IS NOT NULL AND profile_record.bio != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF profile_record.avatar_url IS NOT NULL AND profile_record.avatar_url != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    -- Role-specific fields
    IF profile_record.role = 'musician' THEN
        IF profile_record.instruments IS NOT NULL AND array_length(profile_record.instruments, 1) > 0 THEN
            completion_score := completion_score + 1;
        END IF;
        
        IF profile_record.genres IS NOT NULL AND array_length(profile_record.genres, 1) > 0 THEN
            completion_score := completion_score + 1;
        END IF;
        
        IF profile_record.hourly_rate IS NOT NULL AND profile_record.hourly_rate > 0 THEN
            completion_score := completion_score + 1;
        END IF;
        
        -- Payment details
        IF (profile_record.bank_account_number IS NOT NULL AND profile_record.bank_code IS NOT NULL) 
           OR (profile_record.mobile_money_number IS NOT NULL AND profile_record.mobile_money_provider IS NOT NULL) THEN
            completion_score := completion_score + 1;
        END IF;
    ELSE
        -- For non-musicians, give full score for role-specific fields
        completion_score := completion_score + 4;
    END IF;
    
    RETURN (completion_score * 100) / total_fields;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Update profile completion on profile change
-- ============================================================================

CREATE OR REPLACE FUNCTION update_profile_completion()
RETURNS TRIGGER AS $$
DECLARE
    completion INTEGER;
BEGIN
    completion := calculate_profile_completion(NEW.user_id);
    NEW.profile_completion_percentage := completion;
    NEW.profile_complete := (completion >= 80);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profile_updated
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_profile_completion();

-- ============================================================================
-- FUNCTION: Auto-update musician ratings after review
-- ============================================================================

CREATE OR REPLACE FUNCTION update_musician_rating()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    review_count INTEGER;
BEGIN
    SELECT AVG(rating), COUNT(*) INTO avg_rating, review_count
    FROM reviews
    WHERE reviewee_id = NEW.reviewee_id;
    
    UPDATE profiles
    SET rating = COALESCE(avg_rating, 0),
        total_reviews = review_count
    WHERE user_id = NEW.reviewee_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_created
    AFTER INSERT ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_musician_rating();

CREATE TRIGGER on_review_updated
    AFTER UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_musician_rating();

-- ============================================================================
-- FUNCTION: Auto-create notification for new message
-- ============================================================================

CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    sender_name TEXT;
BEGIN
    SELECT full_name INTO sender_name FROM profiles WHERE user_id = NEW.sender_id;
    
    INSERT INTO notifications (user_id, type, title, content, action_url, metadata)
    VALUES (
        NEW.receiver_id,
        'message',
        'New Message',
        sender_name || ' sent you a message',
        '/messages',
        jsonb_build_object('message_id', NEW.id, 'sender_id', NEW.sender_id)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_created
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION create_message_notification();

-- ============================================================================
-- FUNCTION: Auto-create notification for booking status change
-- ============================================================================

CREATE OR REPLACE FUNCTION create_booking_notification()
RETURNS TRIGGER AS $$
DECLARE
    notification_title TEXT;
    notification_content TEXT;
    recipient_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- New booking notification to musician
        SELECT full_name INTO notification_content FROM profiles WHERE user_id = NEW.hirer_id;
        INSERT INTO notifications (user_id, type, title, content, action_url, metadata)
        VALUES (
            NEW.musician_id,
            'booking',
            'New Booking Request',
            notification_content || ' sent you a booking request for ' || NEW.event_type,
            '/musician/bookings',
            jsonb_build_object('booking_id', NEW.id)
        );
    ELSIF TG_OP = 'UPDATE' THEN
        -- Status change notifications
        IF OLD.status != NEW.status THEN
            CASE NEW.status
                WHEN 'accepted' THEN
                    notification_title := 'Booking Accepted';
                    notification_content := 'Your booking request has been accepted';
                    recipient_id := NEW.hirer_id;
                WHEN 'rejected' THEN
                    notification_title := 'Booking Declined';
                    notification_content := 'Your booking request was declined';
                    recipient_id := NEW.hirer_id;
                WHEN 'completed' THEN
                    notification_title := 'Booking Completed';
                    notification_content := 'Your booking has been marked as completed';
                    recipient_id := NEW.hirer_id;
                WHEN 'cancelled' THEN
                    notification_title := 'Booking Cancelled';
                    notification_content := 'A booking has been cancelled';
                    recipient_id := CASE WHEN NEW.cancellation_requested_by = NEW.hirer_id THEN NEW.musician_id ELSE NEW.hirer_id END;
                ELSE
                    RETURN NEW;
            END CASE;
            
            INSERT INTO notifications (user_id, type, title, content, action_url, metadata)
            VALUES (
                recipient_id,
                'booking',
                notification_title,
                notification_content,
                '/bookings',
                jsonb_build_object('booking_id', NEW.id)
            );
        END IF;
        
        -- Payment status change
        IF OLD.payment_status != NEW.payment_status AND NEW.payment_status = 'paid' THEN
            INSERT INTO notifications (user_id, type, title, content, action_url, metadata)
            VALUES (
                NEW.musician_id,
                'payment',
                'Payment Received',
                'Payment received for ' || NEW.event_type,
                '/musician/bookings',
                jsonb_build_object('booking_id', NEW.id)
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_booking_change
    AFTER INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION create_booking_notification();

-- ============================================================================
-- FUNCTION: Calculate refund amount based on cancellation policy
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_refund_amount(
    booking_id UUID,
    cancellation_date TIMESTAMPTZ
)
RETURNS TABLE (
    refund_amount DECIMAL(10,2),
    refund_percentage DECIMAL(5,2),
    policy_description TEXT
) AS $$
DECLARE
    booking_record RECORD;
    days_before INTEGER;
    policy_record RECORD;
BEGIN
    SELECT * INTO booking_record FROM bookings WHERE id = booking_id;
    
    IF booking_record IS NULL THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;
    
    -- Calculate days before event
    days_before := EXTRACT(DAY FROM (booking_record.event_date - cancellation_date));
    
    -- Get applicable refund policy
    SELECT * INTO policy_record
    FROM refund_policies
    WHERE days_before_event <= days_before
    AND is_active = TRUE
    ORDER BY days_before_event DESC
    LIMIT 1;
    
    IF policy_record IS NULL THEN
        -- No refund if no policy matches
        RETURN QUERY SELECT 
            0::DECIMAL(10,2),
            0::DECIMAL(5,2),
            'No refund available'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            (booking_record.total_amount * policy_record.refund_percentage / 100)::DECIMAL(10,2),
            policy_record.refund_percentage,
            policy_record.description;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Calculate payment split (deposit/balance)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_payment_split(
    total_amount DECIMAL(10,2),
    deposit_percentage DECIMAL(5,2)
)
RETURNS TABLE (
    deposit_amount DECIMAL(10,2),
    balance_amount DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY SELECT 
        (total_amount * deposit_percentage / 100)::DECIMAL(10,2),
        (total_amount * (100 - deposit_percentage) / 100)::DECIMAL(10,2);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Create default milestones for a booking
-- ============================================================================

CREATE OR REPLACE FUNCTION create_default_milestones(
    p_booking_id UUID,
    p_milestone_count INTEGER DEFAULT 3
)
RETURNS VOID AS $$
DECLARE
    booking_amount DECIMAL(10,2);
    milestone_percentage DECIMAL(5,2);
    milestone_amount DECIMAL(10,2);
    i INTEGER;
BEGIN
    SELECT total_amount INTO booking_amount FROM bookings WHERE id = p_booking_id;
    
    IF booking_amount IS NULL THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;
    
    milestone_percentage := (100.0 / p_milestone_count)::DECIMAL(5,2);
    
    FOR i IN 1..p_milestone_count LOOP
        IF i = p_milestone_count THEN
            -- Last milestone gets remaining amount to handle rounding
            SELECT booking_amount - COALESCE(SUM(amount), 0) INTO milestone_amount
            FROM payment_milestones WHERE booking_id = p_booking_id;
        ELSE
            milestone_amount := (booking_amount * milestone_percentage / 100)::DECIMAL(10,2);
        END IF;
        
        INSERT INTO payment_milestones (
            booking_id,
            milestone_number,
            title,
            amount,
            percentage
        ) VALUES (
            p_booking_id,
            i,
            'Milestone ' || i,
            milestone_amount,
            milestone_percentage
        );
    END LOOP;
    
    -- Update booking payment type
    UPDATE bookings SET payment_type = 'milestone' WHERE id = p_booking_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Validate milestone percentages add up to 100%
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_milestone_percentages(p_booking_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    total_percentage DECIMAL(5,2);
BEGIN
    SELECT SUM(percentage) INTO total_percentage
    FROM payment_milestones
    WHERE booking_id = p_booking_id;
    
    RETURN COALESCE(total_percentage, 0) = 100;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Increment portfolio views
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_portfolio_views(portfolio_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE portfolio_items
    SET views = views + 1
    WHERE id = portfolio_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Calculate daily analytics
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_daily_analytics(target_date DATE)
RETURNS VOID AS $$
DECLARE
    analytics_record RECORD;
BEGIN
    SELECT
        COUNT(DISTINCT b.id) as total_bookings,
        COALESCE(SUM(b.total_amount), 0) as total_revenue,
        COALESCE(SUM(b.platform_fee), 0) as platform_fees,
        COALESCE(SUM(b.musician_payout), 0) as musician_payouts,
        COUNT(DISTINCT CASE WHEN t.status = 'paid' THEN t.id END) as completed_transactions,
        COUNT(DISTINCT CASE WHEN t.status = 'pending' THEN t.id END) as pending_transactions,
        COUNT(DISTINCT CASE WHEN t.status = 'failed' THEN t.id END) as failed_transactions,
        COALESCE(SUM(r.amount), 0) as refunded_amount,
        COUNT(DISTINCT r.id) as refund_count,
        COALESCE(AVG(b.total_amount), 0) as average_booking_value,
        COUNT(DISTINCT CASE WHEN DATE(p.created_at) = target_date THEN p.user_id END) as new_users,
        COUNT(DISTINCT CASE WHEN p.role = 'musician' AND p.last_active_at >= target_date THEN p.user_id END) as active_musicians,
        COUNT(DISTINCT CASE WHEN p.role = 'hirer' AND p.last_active_at >= target_date THEN p.user_id END) as active_hirers
    INTO analytics_record
    FROM bookings b
    LEFT JOIN transactions t ON t.booking_id = b.id AND DATE(t.created_at) = target_date
    LEFT JOIN refunds r ON r.booking_id = b.id AND DATE(r.created_at) = target_date
    CROSS JOIN profiles p
    WHERE DATE(b.created_at) = target_date;
    
    INSERT INTO payment_analytics (
        date, total_bookings, total_revenue, platform_fees, musician_payouts,
        completed_transactions, pending_transactions, failed_transactions,
        refunded_amount, refund_count, average_booking_value,
        new_users, active_musicians, active_hirers
    ) VALUES (
        target_date,
        analytics_record.total_bookings,
        analytics_record.total_revenue,
        analytics_record.platform_fees,
        analytics_record.musician_payouts,
        analytics_record.completed_transactions,
        analytics_record.pending_transactions,
        analytics_record.failed_transactions,
        analytics_record.refunded_amount,
        analytics_record.refund_count,
        analytics_record.average_booking_value,
        analytics_record.new_users,
        analytics_record.active_musicians,
        analytics_record.active_hirers
    )
    ON CONFLICT (date) DO UPDATE SET
        total_bookings = EXCLUDED.total_bookings,
        total_revenue = EXCLUDED.total_revenue,
        platform_fees = EXCLUDED.platform_fees,
        musician_payouts = EXCLUDED.musician_payouts,
        completed_transactions = EXCLUDED.completed_transactions,
        pending_transactions = EXCLUDED.pending_transactions,
        failed_transactions = EXCLUDED.failed_transactions,
        refunded_amount = EXCLUDED.refunded_amount,
        refund_count = EXCLUDED.refund_count,
        average_booking_value = EXCLUDED.average_booking_value,
        new_users = EXCLUDED.new_users,
        active_musicians = EXCLUDED.active_musicians,
        active_hirers = EXCLUDED.active_hirers,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEW: Bookings with profile information
-- ============================================================================

CREATE OR REPLACE VIEW bookings_with_profiles AS
SELECT 
    b.*,
    mp.full_name as musician_name,
    mp.email as musician_email,
    mp.phone as musician_phone,
    mp.bank_account_number,
    mp.bank_code,
    mp.bank_account_name,
    mp.mobile_money_number,
    mp.mobile_money_provider,
    hp.full_name as hirer_name,
    hp.email as hirer_email,
    hp.phone as hirer_phone
FROM bookings b
LEFT JOIN profiles mp ON b.musician_id = mp.user_id
LEFT JOIN profiles hp ON b.hirer_id = hp.user_id;

-- ============================================================================
-- VIEW: Milestone progress
-- ============================================================================

CREATE OR REPLACE VIEW milestone_progress AS
SELECT 
    b.id as booking_id,
    mp.full_name as musician_name,
    hp.full_name as hirer_name,
    b.event_type,
    b.total_amount,
    COUNT(m.id) > 0 as has_milestones,
    COUNT(m.id) as milestones_count,
    COUNT(CASE WHEN m.status = 'paid' THEN 1 END) as milestones_paid_count,
    COUNT(CASE WHEN m.status = 'released' THEN 1 END) as milestones_released_count,
    COALESCE((COUNT(CASE WHEN m.status = 'paid' THEN 1 END)::DECIMAL / NULLIF(COUNT(m.id), 0)) * 100, 0) as payment_progress_percentage,
    COALESCE((COUNT(CASE WHEN m.status = 'released' THEN 1 END)::DECIMAL / NULLIF(COUNT(m.id), 0)) * 100, 0) as release_progress_percentage,
    json_agg(m.* ORDER BY m.milestone_number) as milestones
FROM bookings b
LEFT JOIN payment_milestones m ON m.booking_id = b.id
LEFT JOIN profiles mp ON b.musician_id = mp.user_id
LEFT JOIN profiles hp ON b.hirer_id = hp.user_id
WHERE b.payment_type = 'milestone'
GROUP BY b.id, mp.full_name, hp.full_name, b.event_type, b.total_amount;

-- ============================================================================
-- VIEW: Analytics summary
-- ============================================================================

CREATE OR REPLACE VIEW analytics_summary AS
SELECT
    COALESCE(SUM(total_revenue), 0) as total_revenue,
    COALESCE(SUM(platform_fees), 0) as total_platform_fees,
    COALESCE(SUM(musician_payouts), 0) as total_payouts,
    COALESCE(SUM(total_bookings), 0) as total_bookings,
    COALESCE(SUM(CASE WHEN date >= CURRENT_DATE - INTERVAL '7 days' THEN total_bookings ELSE 0 END), 0) as bookings_last_7_days,
    COALESCE(SUM(CASE WHEN date >= CURRENT_DATE - INTERVAL '30 days' THEN total_bookings ELSE 0 END), 0) as bookings_last_30_days,
    COALESCE(SUM(CASE WHEN date >= CURRENT_DATE - INTERVAL '7 days' THEN total_revenue ELSE 0 END), 0) as revenue_last_7_days,
    COALESCE(SUM(CASE WHEN date >= CURRENT_DATE - INTERVAL '30 days' THEN total_revenue ELSE 0 END), 0) as revenue_last_30_days,
    COALESCE(AVG(average_booking_value), 0) as avg_booking_value
FROM payment_analytics;
