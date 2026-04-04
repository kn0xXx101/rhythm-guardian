import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/auth';

describe('Profile API Integration', () => {
  const testUser = {
    email: 'test-api@example.com',
    password: 'test123456',
    fullName: 'Test API User',
    role: 'musician' as const,
  };

  let userId: string;

  beforeAll(async () => {
    const { user, error } = await authService.signUp(
      testUser.email,
      testUser.password,
      testUser.role,
      testUser.fullName
    );
    if (error) throw error;
    userId = user!.id;
  });

  afterAll(async () => {
    if (userId) {
      await supabase.from('profiles').delete().eq('user_id', userId);
      await supabase.auth.admin.deleteUser(userId);
    }
  });

  describe('Profile Updates', () => {
    it('should update profile fields and calculate completion percentage', async () => {
      // Update basic profile information
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          bio: 'Professional musician with 10 years of experience',
          phone: '+1234567890',
        })
        .eq('user_id', userId);

      expect(updateError).toBeNull();

      // Verify profile completion percentage updated
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_completion_percentage')
        .eq('user_id', userId)
        .single();

      expect(profile.profile_completion_percentage).toBe(60); // name + bio + phone
    });

    it('should handle invalid profile updates', async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          phone: 'invalid-phone', // Should be in proper phone format
        })
        .eq('user_id', userId);

      expect(error).not.toBeNull();
    });
  });

  describe('Document Submission', () => {
    it('should track document submission status', async () => {
      // Simulate document submission
      const { error: submitError } = await supabase
        .from('profiles')
        .update({
          required_documents: [
            {
              type: 'id',
              required: true,
              verified: false,
              submitted_at: new Date().toISOString(),
            },
            {
              type: 'certification',
              required: true,
              verified: false,
              submitted_at: new Date().toISOString(),
            },
          ],
          documents_submitted: true,
        })
        .eq('user_id', userId);

      expect(submitError).toBeNull();

      // Verify submission status
      const { data: profile } = await supabase
        .from('profiles')
        .select('documents_submitted, required_documents')
        .eq('user_id', userId)
        .single();

      expect(profile.documents_submitted).toBe(true);
      expect(profile.required_documents).toHaveLength(2);
      expect(profile.required_documents[0].submitted_at).toBeTruthy();
    });

    it('should handle document verification', async () => {
      // Simulate admin verifying documents
      const { error: verifyError } = await supabase
        .from('profiles')
        .update({
          required_documents: [
            {
              type: 'id',
              required: true,
              verified: true,
              verified_at: new Date().toISOString(),
            },
            {
              type: 'certification',
              required: true,
              verified: true,
              verified_at: new Date().toISOString(),
            },
          ],
          documents_verified: true,
        })
        .eq('user_id', userId);

      expect(verifyError).toBeNull();

      // Verify verification status
      const { data: profile } = await supabase
        .from('profiles')
        .select('documents_verified, required_documents')
        .eq('user_id', userId)
        .single();

      expect(profile.documents_verified).toBe(true);
      expect(profile.required_documents.every((doc: any) => doc.verified)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required fields', async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          required_documents: null, // Required field cannot be null
        })
        .eq('user_id', userId);

      expect(error).not.toBeNull();
    });

    it('should handle invalid document structure', async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          required_documents: [{ invalid: 'structure' }], // Invalid document structure
        })
        .eq('user_id', userId);

      expect(error).not.toBeNull();
    });
  });
});
