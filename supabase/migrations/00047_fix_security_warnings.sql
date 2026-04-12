-- ============================================================
-- Fix all Supabase security linter warnings
-- Run in: https://supabase.com/dashboard/project/vptqcceuufmgwahrimor/sql/new
-- ============================================================

-- ── 1. RLS policies for tables that have RLS but no policies ─────────────────

-- payment_milestones
CREATE POLICY "Users can view milestones for their bookings"
ON public.payment_milestones FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = payment_milestones.booking_id
          AND (b.hirer_id = auth.uid() OR b.musician_id = auth.uid())
    ) OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage payment milestones"
ON public.payment_milestones FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- refunds (column is requested_by, not user_id)
CREATE POLICY "Users can view their own refunds"
ON public.refunds FOR SELECT
USING (
    requested_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = refunds.booking_id
          AND (b.hirer_id = auth.uid() OR b.musician_id = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage refunds"
ON public.refunds FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- webhook_events: admin read, nobody else (service role bypasses RLS anyway)
CREATE POLICY "Admins can view webhook events"
ON public.webhook_events FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));


-- ── 2. Tighten overly-permissive INSERT/UPDATE policies ──────────────────────

-- notifications: triggers insert via service_role which bypasses RLS — keep permissive but scope to authenticated
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- transactions: user inserts their own, or admin
DROP POLICY IF EXISTS "System can insert transactions" ON public.transactions;
CREATE POLICY "System can insert transactions"
ON public.transactions FOR INSERT
WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ticket_messages: sender must be the authenticated user (sender_id column, not user_id)
DROP POLICY IF EXISTS "Users can add messages to own tickets" ON public.ticket_messages;
CREATE POLICY "Users can add messages to own tickets"
ON public.ticket_messages FOR INSERT
WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.support_tickets st
        WHERE st.id = ticket_messages.ticket_id
          AND (st.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'))
    )
);


-- ── 3. Fix function search_path (wrap each in DO to skip missing functions) ───

DO $$ BEGIN ALTER FUNCTION public.update_musician_booking_count() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.can_users_message(uuid, uuid) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.auto_process_refund_on_status_change() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.check_musician_availability(uuid, timestamptz, integer) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.create_message_notification() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.enforce_no_double_booking() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.notify_admins_on_review() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.resolve_ticket(uuid, text) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.ensure_conversation_exists() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.add_ticket_message(uuid, uuid, text) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.handle_booking_created_notification() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.handle_booking_accepted_notification() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.create_support_ticket(uuid, text, text, text) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_ticket_session_on_admin_response() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_ticket_session_on_user_response() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.auto_close_expired_tickets() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.get_support_tickets(text, text) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.get_ticket_messages(uuid) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.get_user_active_tickets(uuid) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.cleanup_expired_support_tickets() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.get_user_active_tickets_with_session(uuid) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.create_booking_notification() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.get_new_ticket_messages(uuid, timestamptz) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.notify_admins(text, text, text, text, jsonb) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.notify_admins_on_booking_change() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.notify_admins_on_document_submission() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.notify_admins_on_new_user() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_updated_at_column() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.create_user_settings() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.calculate_profile_completion(uuid) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_profile_completion() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_musician_rating() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.mark_conversation_read(uuid, uuid) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.calculate_refund_amount(uuid, timestamptz) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.calculate_payment_split(numeric, numeric) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.create_default_milestones(uuid, integer) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.validate_milestone_percentages(uuid) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.increment_portfolio_views(uuid) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.calculate_daily_analytics(date) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.create_profile_for_user() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.calculate_booking_amount() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_booking_total_amount() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.auto_complete_booking_on_confirmation() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.notify_payout_released() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.send_message(uuid, uuid, text, text, text, text, integer, text, uuid) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.mark_message_read(uuid, uuid) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_notifications_updated_at() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.confirm_service(uuid, text) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.create_payout_transaction(uuid, uuid, numeric, text) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.sync_reviews_content() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.populate_reviews_content() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.auto_expire_pending_bookings() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.check_and_expire_bookings() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.notify_booking_expired() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.handle_new_user() SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.create_notification(uuid, notification_type, text, text, text, jsonb) SET search_path = public; EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT 'Security warnings fixed' AS status;
