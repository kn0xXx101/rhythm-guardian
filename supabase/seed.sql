-- supabase/seed.sql
-- Seeds the initial Admin user for Rhythm Guardian

DO $$
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- 1. Create or Update Auth User (Fundamental columns only)
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, 
        email_confirmed_at, last_sign_in_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated', 'admin@rhythmguardian.com',
        extensions.crypt('admin123', extensions.gen_salt('bf')),
        NOW(), NOW(),
        '{"provider":"email","providers":["email"],"role":"admin"}', '{"full_name":"System Admin","role":"admin"}', NOW(), NOW()
    ) ON CONFLICT (id) DO NOTHING;

    -- 2. Link Identity (Required for login)
    INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
        v_admin_id, v_admin_id, 'admin@rhythmguardian.com', 
        format('{"sub":"%s","email":"%s"}', v_admin_id::text, 'admin@rhythmguardian.com')::jsonb,
        'email', NOW(), NOW(), NOW()
    ) ON CONFLICT (provider, provider_id) DO NOTHING;

    -- 3. Create Public Profile (Aligned with 1:1 Parity)
    INSERT INTO public.profiles (
        user_id, role, status, is_active, full_name, email, 
        email_verified, profile_complete, profile_completion_percentage,
        completion_rate, last_active_at
    )
    VALUES (
        v_admin_id, 'admin', 'active', true, 'System Admin', 'admin@rhythmguardian.com', 
        true, true, 100, 100, NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET
        role = 'admin',
        status = 'active',
        is_active = true,
        email_verified = true;

    -- 4. Initialize Platform Settings
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
            }
        }'::jsonb,
        'Global Platform Configuration'
    ) ON CONFLICT (key) DO NOTHING;

END $$;
