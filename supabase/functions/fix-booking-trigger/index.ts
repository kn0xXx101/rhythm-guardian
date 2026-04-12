import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const sql = `
    CREATE OR REPLACE FUNCTION create_booking_notification()
    RETURNS TRIGGER AS $$
    DECLARE
        hirer_name TEXT;
        notification_title TEXT;
        notification_content TEXT;
        recipient_id UUID;
    BEGIN
        IF TG_OP = 'INSERT' THEN
            SELECT COALESCE(full_name, 'A client') INTO hirer_name FROM profiles WHERE user_id = NEW.hirer_id;
            INSERT INTO notifications (user_id, type, title, content, action_url, metadata)
            VALUES (NEW.musician_id, 'booking', 'New Booking Request',
                hirer_name || ' sent you a booking request for ' || COALESCE(NEW.event_type, 'an event'),
                '/musician/bookings', jsonb_build_object('booking_id', NEW.id));
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.status IS DISTINCT FROM NEW.status THEN
                CASE NEW.status
                    WHEN 'accepted'  THEN notification_title := 'Booking Accepted';  notification_content := 'Your booking request has been accepted'; recipient_id := NEW.hirer_id;
                    WHEN 'rejected'  THEN notification_title := 'Booking Declined';  notification_content := 'Your booking request was declined';      recipient_id := NEW.hirer_id;
                    WHEN 'completed' THEN notification_title := 'Booking Completed'; notification_content := 'Your booking has been marked as completed'; recipient_id := NEW.hirer_id;
                    WHEN 'cancelled' THEN notification_title := 'Booking Cancelled'; notification_content := 'A booking has been cancelled';
                        recipient_id := CASE WHEN NEW.cancellation_requested_by = NEW.hirer_id THEN NEW.musician_id ELSE NEW.hirer_id END;
                    ELSE recipient_id := NULL;
                END CASE;
                IF recipient_id IS NOT NULL THEN
                    INSERT INTO notifications (user_id, type, title, content, action_url, metadata)
                    VALUES (recipient_id, 'booking', notification_title, notification_content, '/bookings', jsonb_build_object('booking_id', NEW.id));
                END IF;
            END IF;
            IF OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'paid' THEN
                INSERT INTO notifications (user_id, type, title, content, action_url, metadata)
                VALUES (NEW.musician_id, 'payment', 'Payment Received',
                    'Payment received for ' || COALESCE(NEW.event_type, 'your booking'),
                    '/musician/bookings', jsonb_build_object('booking_id', NEW.id));
            END IF;
        END IF;
        RETURN NEW;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Notification trigger error (ignored): %', SQLERRM;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS on_booking_change ON bookings;
    CREATE TRIGGER on_booking_change
        AFTER INSERT OR UPDATE ON bookings
        FOR EACH ROW EXECUTE FUNCTION create_booking_notification();
  `;

  const { error } = await supabase.rpc('exec_sql', { sql }).single();

  // Try direct query if rpc not available
  if (error) {
    return new Response(JSON.stringify({ 
      error: error.message,
      instructions: 'Run DISABLE_BOOKING_TRIGGER.sql in your Supabase SQL editor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
