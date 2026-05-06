-- supabase/seed.sql
-- Seeds the initial Admin user for Rhythm Guardian

DO $$
DECLARE
    v_admin_id UUID;
BEGIN
    -- Check if admin exists
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@rhythmguardian.com';
    
    IF v_admin_id IS NULL THEN
        v_admin_id := gen_random_uuid();
        
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

        -- Insert into public.profiles
        INSERT INTO public.profiles (user_id, role, status, is_active, full_name, email, email_verified)
        VALUES (v_admin_id, 'admin', 'active', true, 'System Admin', 'admin@rhythmguardian.com', true);

        RAISE NOTICE 'Admin user created successfully.';
    ELSE
        RAISE NOTICE 'Admin user already exists.';
    END IF;
END $$;
