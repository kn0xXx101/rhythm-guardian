-- supabase/seed.sql
-- Seeds the initial Admin user for Rhythm Guardian

DO $$
DECLARE
    v_admin_id UUID;
BEGIN
    -- Check if admin exists
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@rhythmguardian.com';
    
    IF v_admin_id IS NULL THEN
        v_admin_id := '00000000-0000-0000-0000-000000000001';
        
        -- Insert into auth.users simulating GoTrue registration
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, 
            email_confirmed_at, last_sign_in_at, 
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
            confirmation_token, email_change, email_change_token_new, recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated', 'admin@rhythmguardian.com',
            extensions.crypt('admin123', extensions.gen_salt('bf')),
            NOW(), NOW(),
            '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(),
            '', '', '', ''
        );
        
        -- Insert into auth.identities (Required for login since Supabase v2)
        INSERT INTO auth.identities (
            id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_admin_id, v_admin_id::text, format('{"sub":"%s","email":"%s"}', v_admin_id::text, 'admin@rhythmguardian.com')::jsonb,
            'email', NOW(), NOW(), NOW()
        );

        -- Insert into public.profiles (Using ON CONFLICT to handle the new sync trigger)
        INSERT INTO public.profiles (
            user_id, 
            role, 
            status, 
            is_active, 
            full_name, 
            email, 
            email_verified,
            profile_complete,
            profile_completion_percentage,
            completion_rate,
            last_active_at
        )
        VALUES (
            v_admin_id, 
            'admin', 
            'active', 
            true, 
            'System Admin', 
            'admin@rhythmguardian.com', 
            true,
            true,
            100,
            100,
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            role = EXCLUDED.role,
            status = EXCLUDED.status,
            is_active = EXCLUDED.is_active,
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            email_verified = EXCLUDED.email_verified,
            profile_complete = EXCLUDED.profile_complete,
            profile_completion_percentage = EXCLUDED.profile_completion_percentage,
            completion_rate = EXCLUDED.completion_rate,
            last_active_at = EXCLUDED.last_active_at;

        -- Initialize Platform Settings (Ensures Admin UI logic has data)
        INSERT INTO public.settings (key, value, description)
        VALUES (
            'platform_settings',
            '{
                "general": {
                    "siteName": "Rhythm Guardian",
                    "siteDescription": "Premium Musician Protection & Booking Platform",
                    "adminEmail": "admin@rhythmguardian.com",
                    "timezone": "Africa/Lagos",
                    "maintenanceMode": false
                },
                "userManagement": {
                    "allowSelfRegistration": true,
                    "autoApproveHirers": false,
                    "requireMusicianVerification": true
                },
                "bookingPayments": {
                    "currencyCode": "NGN",
                    "platformCommissionRate": 10,
                    "requireDepositPayment": true
                }
            }'::jsonb,
            'Global Platform Configuration'
        ) ON CONFLICT (key) DO NOTHING;

        RAISE NOTICE 'Admin user and platform settings created successfully.';
    ELSE
        RAISE NOTICE 'Admin user already exists.';
    END IF;
END $$;
