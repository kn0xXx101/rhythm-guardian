-- Auto-activate musician profile when admin approves verification
-- This ensures verified musicians automatically appear in hirer search results

-- Create function to auto-activate profile on verification approval
CREATE OR REPLACE FUNCTION auto_activate_on_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- When admin verifies documents, automatically activate the profile
    IF TG_OP = 'UPDATE' 
       AND OLD.documents_verified = FALSE 
       AND NEW.documents_verified = TRUE 
       AND NEW.role = 'musician' THEN
        
        -- Set profile to active so it appears in search
        NEW.is_active := TRUE;
        
        -- Optionally set status to active if it's still pending
        IF NEW.status = 'pending' THEN
            NEW.status := 'active';
        END IF;
        
        -- Notify the musician that their profile is now verified and active
        INSERT INTO notifications (user_id, type, title, content, action_url, metadata)
        VALUES (
            NEW.user_id,
            'system',
            '🎉 Profile Verified & Activated',
            'Congratulations! Your identity has been verified by our admin team. Your profile is now active and visible to hirers in search results.',
            '/musician/profile',
            jsonb_build_object(
                'verified', true,
                'activated', true,
                'timestamp', NOW()
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS trigger_auto_activate_on_verification ON profiles;
CREATE TRIGGER trigger_auto_activate_on_verification
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_activate_on_verification();

-- Add helpful comment
COMMENT ON FUNCTION auto_activate_on_verification IS 'Automatically activates musician profile when admin verifies their documents, making them visible in hirer search results';
COMMENT ON TRIGGER trigger_auto_activate_on_verification ON profiles IS 'Triggers profile activation when documents are verified by admin';

-- Backfill: Activate any existing verified musicians who aren't active yet
UPDATE profiles
SET 
    is_active = TRUE,
    status = CASE 
        WHEN status = 'pending' THEN 'active'
        ELSE status 
    END
WHERE 
    role = 'musician'
    AND documents_verified = TRUE
    AND (is_active = FALSE OR is_active IS NULL);

-- Log the backfill results
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Auto-activated % verified musician profiles', updated_count;
END $$;