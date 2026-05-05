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
    -- Consolidate booking notifications
    CREATE OR REPLACE FUNCTION handle_booking_notifications()
    RETURNS TRIGGER AS $$
    DECLARE
        hirer_name TEXT;
        musician_name TEXT;
        short_id TEXT;
    BEGIN
        SELECT COALESCE(full_name, 'A hirer') INTO hirer_name FROM public.profiles WHERE user_id = NEW.hirer_id;
        SELECT COALESCE(full_name, 'A musician') INTO musician_name FROM public.profiles WHERE user_id = NEW.musician_id;
        short_id := SUBSTRING(NEW.id::text, 1, 8);

        IF TG_OP = 'INSERT' THEN
            PERFORM public.create_notification(NEW.musician_id, 'booking', 'New Booking Request', hirer_name || ' sent you a booking request.', '/musician/bookings', jsonb_build_object('booking_id', NEW.id));
            PERFORM public.notify_admins('booking', '📝 New Booking Created', hirer_name || ' created a booking with ' || musician_name, '/admin/bookings', jsonb_build_object('booking_id', NEW.id));
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.status IS DISTINCT FROM NEW.status THEN
                IF NEW.status IN ('accepted', 'upcoming') THEN
                    PERFORM public.create_notification(NEW.hirer_id, 'booking', '✅ Booking Accepted', musician_name || ' accepted your booking request.', '/hirer/bookings', jsonb_build_object('booking_id', NEW.id));
                ELSIF NEW.status = 'rejected' THEN
                    PERFORM public.create_notification(NEW.hirer_id, 'booking', '❌ Booking Declined', musician_name || ' declined your booking request.', '/hirer/bookings', jsonb_build_object('booking_id', NEW.id));
                END IF;
            END IF;
            IF OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'paid' THEN
                PERFORM public.create_notification(NEW.musician_id, 'payment', '💰 Payment Received', 'Payment received for your booking.', '/musician/bookings', jsonb_build_object('booking_id', NEW.id));
                PERFORM public.notify_admins('payment', '💰 Booking Payment Received', hirer_name || ' paid for booking ' || short_id, '/admin/bookings', jsonb_build_object('booking_id', NEW.id));
            END IF;
        END IF;
        RETURN NEW;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'handle_booking_notifications error: %', SQLERRM;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_create_booking_notification ON bookings;
    DROP TRIGGER IF EXISTS trigger_notify_admins_on_booking ON bookings;
    DROP TRIGGER IF EXISTS on_booking_change ON bookings;

    CREATE TRIGGER consolidated_booking_notifications
        AFTER INSERT OR UPDATE ON bookings
        FOR EACH ROW EXECUTE FUNCTION handle_booking_notifications();
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
