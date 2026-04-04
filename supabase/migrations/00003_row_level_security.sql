-- ============================================================================
-- RHYTHM GUARDIAN - ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- This migration enables RLS and creates security policies for all tables

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_analytics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can view all profiles (for search/discovery)
CREATE POLICY "Profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
    ON profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can insert profiles
CREATE POLICY "Admins can insert profiles"
    ON profiles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- PLATFORM SETTINGS POLICIES
-- ============================================================================

-- Everyone can view platform settings
CREATE POLICY "Platform settings are viewable by everyone"
    ON platform_settings FOR SELECT
    USING (true);

-- Only admins can modify platform settings
CREATE POLICY "Only admins can modify platform settings"
    ON platform_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- USER SETTINGS POLICIES
-- ============================================================================

-- Users can view their own settings
CREATE POLICY "Users can view own settings"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own settings"
    ON user_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own settings"
    ON user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- BOOKINGS POLICIES
-- ============================================================================

-- Users can view bookings they're involved in
CREATE POLICY "Users can view their bookings"
    ON bookings FOR SELECT
    USING (
        auth.uid() = musician_id OR 
        auth.uid() = hirer_id OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Hirers can create bookings
CREATE POLICY "Hirers can create bookings"
    ON bookings FOR INSERT
    WITH CHECK (auth.uid() = hirer_id);

-- Musicians and hirers can update their bookings
CREATE POLICY "Users can update their bookings"
    ON bookings FOR UPDATE
    USING (
        auth.uid() = musician_id OR 
        auth.uid() = hirer_id OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can delete bookings
CREATE POLICY "Admins can delete bookings"
    ON bookings FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- PAYMENT MILESTONES POLICIES
-- ============================================================================

-- Users can view milestones for their bookings
CREATE POLICY "Users can view their booking milestones"
    ON payment_milestones FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bookings
            WHERE id = booking_id 
            AND (musician_id = auth.uid() OR hirer_id = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Users can create milestones for their bookings
CREATE POLICY "Users can create milestones for their bookings"
    ON payment_milestones FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM bookings
            WHERE id = booking_id 
            AND (musician_id = auth.uid() OR hirer_id = auth.uid())
        )
    );

-- Users can update milestones for their bookings
CREATE POLICY "Users can update their booking milestones"
    ON payment_milestones FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM bookings
            WHERE id = booking_id 
            AND (musician_id = auth.uid() OR hirer_id = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- PAYMENT SPLITS POLICIES
-- ============================================================================

-- Users can view splits for their bookings
CREATE POLICY "Users can view their booking splits"
    ON payment_splits FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bookings
            WHERE id = booking_id 
            AND (musician_id = auth.uid() OR hirer_id = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- System can create splits
CREATE POLICY "System can create splits"
    ON payment_splits FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- TRANSACTIONS POLICIES
-- ============================================================================

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
    ON transactions FOR SELECT
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM bookings
            WHERE id = booking_id 
            AND (musician_id = auth.uid() OR hirer_id = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- System can create transactions
CREATE POLICY "System can create transactions"
    ON transactions FOR INSERT
    WITH CHECK (true);

-- Admins can update transactions
CREATE POLICY "Admins can update transactions"
    ON transactions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- REFUNDS POLICIES
-- ============================================================================

-- Users can view refunds for their bookings
CREATE POLICY "Users can view their booking refunds"
    ON refunds FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bookings
            WHERE id = booking_id 
            AND (musician_id = auth.uid() OR hirer_id = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Users can request refunds for their bookings
CREATE POLICY "Users can request refunds"
    ON refunds FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM bookings
            WHERE id = booking_id 
            AND hirer_id = auth.uid()
        )
    );

-- Admins can update refunds
CREATE POLICY "Admins can update refunds"
    ON refunds FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- REFUND POLICIES POLICIES
-- ============================================================================

-- Everyone can view refund policies
CREATE POLICY "Refund policies are viewable by everyone"
    ON refund_policies FOR SELECT
    USING (true);

-- Only admins can modify refund policies
CREATE POLICY "Only admins can modify refund policies"
    ON refund_policies FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================

-- Users can view messages they sent or received
CREATE POLICY "Users can view their messages"
    ON messages FOR SELECT
    USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Users can send messages
CREATE POLICY "Users can send messages"
    ON messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- Users can update messages they sent
CREATE POLICY "Users can update their sent messages"
    ON messages FOR UPDATE
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- ============================================================================
-- REVIEWS POLICIES
-- ============================================================================

-- Everyone can view reviews
CREATE POLICY "Reviews are viewable by everyone"
    ON reviews FOR SELECT
    USING (true);

-- Users can create reviews for their bookings
CREATE POLICY "Users can create reviews for their bookings"
    ON reviews FOR INSERT
    WITH CHECK (
        auth.uid() = reviewer_id AND
        EXISTS (
            SELECT 1 FROM bookings
            WHERE id = booking_id 
            AND (musician_id = auth.uid() OR hirer_id = auth.uid())
            AND status = 'completed'
        )
    );

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
    ON reviews FOR UPDATE
    USING (auth.uid() = reviewer_id OR auth.uid() = reviewee_id);

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- System can create notifications
CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- DISPUTES POLICIES
-- ============================================================================

-- Users can view disputes they're involved in
CREATE POLICY "Users can view their disputes"
    ON disputes FOR SELECT
    USING (
        auth.uid() = filed_by OR 
        auth.uid() = filed_against OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Users can file disputes
CREATE POLICY "Users can file disputes"
    ON disputes FOR INSERT
    WITH CHECK (auth.uid() = filed_by);

-- Admins can update disputes
CREATE POLICY "Admins can update disputes"
    ON disputes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- DISPUTE MESSAGES POLICIES
-- ============================================================================

-- Users can view messages in their disputes
CREATE POLICY "Users can view their dispute messages"
    ON dispute_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM disputes
            WHERE id = dispute_id 
            AND (filed_by = auth.uid() OR filed_against = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Users can send messages in their disputes
CREATE POLICY "Users can send dispute messages"
    ON dispute_messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        (EXISTS (
            SELECT 1 FROM disputes
            WHERE id = dispute_id 
            AND (filed_by = auth.uid() OR filed_against = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        ))
    );

-- ============================================================================
-- DISPUTE EVIDENCE POLICIES
-- ============================================================================

-- Users can view evidence in their disputes
CREATE POLICY "Users can view their dispute evidence"
    ON dispute_evidence FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM disputes
            WHERE id = dispute_id 
            AND (filed_by = auth.uid() OR filed_against = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Users can upload evidence to their disputes
CREATE POLICY "Users can upload dispute evidence"
    ON dispute_evidence FOR INSERT
    WITH CHECK (
        auth.uid() = uploaded_by AND
        EXISTS (
            SELECT 1 FROM disputes
            WHERE id = dispute_id 
            AND (filed_by = auth.uid() OR filed_against = auth.uid())
        )
    );

-- ============================================================================
-- PRICING PACKAGES POLICIES
-- ============================================================================

-- Everyone can view active packages
CREATE POLICY "Active packages are viewable by everyone"
    ON pricing_packages FOR SELECT
    USING (is_active = true OR musician_user_id = auth.uid());

-- Musicians can manage their own packages
CREATE POLICY "Musicians can manage own packages"
    ON pricing_packages FOR ALL
    USING (auth.uid() = musician_user_id);

-- ============================================================================
-- PACKAGE ADDONS POLICIES
-- ============================================================================

-- Everyone can view active addons
CREATE POLICY "Active addons are viewable by everyone"
    ON package_addons FOR SELECT
    USING (is_active = true OR musician_user_id = auth.uid());

-- Musicians can manage their own addons
CREATE POLICY "Musicians can manage own addons"
    ON package_addons FOR ALL
    USING (auth.uid() = musician_user_id);

-- ============================================================================
-- PORTFOLIO ITEMS POLICIES
-- ============================================================================

-- Everyone can view portfolio items
CREATE POLICY "Portfolio items are viewable by everyone"
    ON portfolio_items FOR SELECT
    USING (true);

-- Musicians can manage their own portfolio
CREATE POLICY "Musicians can manage own portfolio"
    ON portfolio_items FOR ALL
    USING (auth.uid() = musician_user_id);

-- ============================================================================
-- REFERRALS POLICIES
-- ============================================================================

-- Users can view their own referrals
CREATE POLICY "Users can view own referrals"
    ON referrals FOR SELECT
    USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

-- Users can create referrals
CREATE POLICY "Users can create referrals"
    ON referrals FOR INSERT
    WITH CHECK (auth.uid() = referrer_id);

-- System can update referrals
CREATE POLICY "System can update referrals"
    ON referrals FOR UPDATE
    USING (true);

-- ============================================================================
-- LOYALTY POINTS POLICIES
-- ============================================================================

-- Users can view their own loyalty points
CREATE POLICY "Users can view own loyalty points"
    ON loyalty_points FOR SELECT
    USING (auth.uid() = user_id);

-- System can create loyalty points
CREATE POLICY "System can create loyalty points"
    ON loyalty_points FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- REWARDS POLICIES
-- ============================================================================

-- Everyone can view active rewards
CREATE POLICY "Active rewards are viewable by everyone"
    ON rewards FOR SELECT
    USING (is_active = true);

-- Only admins can modify rewards
CREATE POLICY "Only admins can modify rewards"
    ON rewards FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- FRAUD ALERTS POLICIES
-- ============================================================================

-- Only admins can view fraud alerts
CREATE POLICY "Only admins can view fraud alerts"
    ON fraud_alerts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- System can create fraud alerts
CREATE POLICY "System can create fraud alerts"
    ON fraud_alerts FOR INSERT
    WITH CHECK (true);

-- Only admins can update fraud alerts
CREATE POLICY "Only admins can update fraud alerts"
    ON fraud_alerts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- AUDIT LOGS POLICIES
-- ============================================================================

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- System can create audit logs
CREATE POLICY "System can create audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- PAYMENT ANALYTICS POLICIES
-- ============================================================================

-- Only admins can view payment analytics
CREATE POLICY "Only admins can view payment analytics"
    ON payment_analytics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- System can create/update analytics
CREATE POLICY "System can manage analytics"
    ON payment_analytics FOR ALL
    USING (true);
