import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/auth';

describe('Profile Migrations', () => {
  // Test user data
  const testUser = {
    email: 'test-migrations@example.com',
    password: 'test123456',
    fullName: 'Test User',
    role: 'musician' as const,
  };

  let userId: string;

  beforeAll(async () => {
    // Create a test user
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
    // Clean up test data
    if (userId) {
      await supabase.from('profiles').delete().eq('user_id', userId);
      await supabase.auth.admin.deleteUser(userId);
    }
  });

  describe('Column Additions', () => {
    it('should have all required columns in profiles table', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select()
        .eq('user_id', userId)
        .single();

      expect(error).toBeNull();
      expect(data).toHaveProperty('profile_complete');
      expect(data).toHaveProperty('documents_submitted');
      expect(data).toHaveProperty('documents_verified');
      expect(data).toHaveProperty('profile_completion_percentage');
      expect(data).toHaveProperty('required_documents');
    });

    it('should initialize columns with correct default values', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select()
        .eq('user_id', userId)
        .single();

      expect(error).toBeNull();
      expect(data.profile_complete).toBe(false);
      expect(data.documents_submitted).toBe(false);
      expect(data.documents_verified).toBe(false);
      expect(data.profile_completion_percentage).toBe(20); // Because full_name is set
      expect(data.required_documents).toBeInstanceOf(Array);
    });
  });

  describe('Trigger Function', () => {
    it('should update profile completion percentage when fields are filled', async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          bio: 'Test bio',
          phone: '+1234567890',
          location: 'Test Location',
        })
        .eq('user_id', userId);

      expect(error).toBeNull();

      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select()
        .eq('user_id', userId)
        .single();

      expect(updatedProfile.profile_completion_percentage).toBe(80); // name + bio + phone + location
    });

    it('should set profile_complete to true when completion is 100%', async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_url: 'https://example.com/avatar.jpg',
        })
        .eq('user_id', userId);

      expect(error).toBeNull();

      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select()
        .eq('user_id', userId)
        .single();

      expect(updatedProfile.profile_completion_percentage).toBe(100);
      expect(updatedProfile.profile_complete).toBe(true);
    });

    it('should set correct required documents based on role', async () => {
      const { data: musicianProfile } = await supabase
        .from('profiles')
        .select('required_documents')
        .eq('user_id', userId)
        .single();

      expect(musicianProfile.required_documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'id',
            required: true,
            verified: false,
          }),
          expect.objectContaining({
            type: 'certification',
            required: true,
            verified: false,
          }),
          expect.objectContaining({
            type: 'portfolio',
            required: false,
            verified: false,
          }),
        ])
      );

      // Create a hirer profile to test different required documents
      const { user: hirerUser } = await authService.signUp(
        'test-hirer@example.com',
        'test123456',
        'hirer',
        'Test Hirer'
      );

      const { data: hirerProfile } = await supabase
        .from('profiles')
        .select('required_documents')
        .eq('user_id', hirerUser!.id)
        .single();

      expect(hirerProfile.required_documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'id',
            required: true,
            verified: false,
          }),
          expect.objectContaining({
            type: 'proof_of_address',
            required: true,
            verified: false,
          }),
        ])
      );

      // Clean up hirer test data
      await supabase.from('profiles').delete().eq('user_id', hirerUser!.id);
      await supabase.auth.admin.deleteUser(hirerUser!.id);
    });
  });
});
