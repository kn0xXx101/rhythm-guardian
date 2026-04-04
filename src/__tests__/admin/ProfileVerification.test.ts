import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from '@/services/admin';
import { supabase } from '@/lib/supabase';
import { notificationService } from '@/services/notifications';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      admin: {
        generateLink: vi.fn(),
      },
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
    })),
  },
}));

// Mock notification service
vi.mock('@/services/notifications', () => ({
  notificationService: {
    showChatNotification: vi.fn(),
    createMessageNotification: vi.fn(),
  },
}));

describe('Admin Profile Verification', () => {
  const mockUser = {
    id: 'test-id',
    email: 'test@example.com',
    role: 'musician',
    profile: {
      full_name: 'Test Musician',
      bio: 'Professional guitarist',
      phone: '+1234567890',
      location: 'New York',
      instruments: ['Guitar', 'Piano'],
      experience_years: 10,
      preferred_genres: ['Rock', 'Jazz'],
      hourly_rate: 50,
      availability: {
        monday: ['morning', 'evening'],
        wednesday: ['afternoon'],
        friday: ['evening'],
      },
      portfolio_links: [
        'https://youtube.com/test-musician',
        'https://soundcloud.com/test-musician',
      ],
      profile_completion_percentage: 80,
      documents_submitted: true,
      documents_verified: false,
      required_documents: [
        {
          type: 'id',
          required: true,
          verified: false,
          submitted_at: '2024-01-01T00:00:00Z',
        },
        {
          type: 'certification',
          required: true,
          verified: false,
          submitted_at: '2024-01-01T00:00:00Z',
        },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Profile Information Management', () => {
    it('should fetch complete profile information', async () => {
      // Mock profile fetch
      (supabase.from as any)().single.mockResolvedValue({
        data: mockUser.profile,
        error: null,
      });

      const profile = await adminService.getUserProfile(mockUser.id);

      expect(profile).toEqual(mockUser.profile);
      expect(profile.instruments).toContain('Guitar');
      expect(profile.preferred_genres).toContain('Rock');
      expect(profile.portfolio_links).toHaveLength(2);
      expect(profile.availability).toHaveProperty('monday');
    });

    it('should update profile information', async () => {
      const updates = {
        bio: 'Updated bio',
        hourly_rate: 60,
        availability: {
          ...mockUser.profile.availability,
          saturday: ['morning'],
        },
      };

      (supabase.from as any)().update.mockResolvedValue({
        data: { ...mockUser.profile, ...updates },
        error: null,
      });

      const result = await adminService.updateUserProfile(mockUser.id, updates);

      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(supabase.from().update).toHaveBeenCalledWith(expect.objectContaining(updates));
    });
  });

  describe('Document Verification Process', () => {
    it('should verify submitted documents and send email notification', async () => {
      // Mock successful document verification
      (supabase.from as any)().update.mockResolvedValue({
        data: {
          ...mockUser.profile,
          documents_verified: true,
          required_documents: mockUser.profile.required_documents.map((doc) => ({
            ...doc,
            verified: true,
            verified_at: expect.any(String),
          })),
        },
        error: null,
      });

      // Mock successful email sending
      (supabase.auth.admin.generateLink as any).mockResolvedValue({
        data: { link: 'https://example.com/verify' },
        error: null,
      });

      const result = await adminService.verifyUserDocuments(mockUser.id, mockUser.email);

      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(supabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          documents_verified: true,
          status: 'active',
        })
      );

      // Verify email notification was sent
      expect(supabase.auth.admin.generateLink).toHaveBeenCalledWith({
        type: 'magiclink',
        email: mockUser.email,
        options: expect.any(Object),
      });
    });

    it('should handle document verification errors', async () => {
      const mockError = new Error('Verification failed');
      (supabase.from as any)().update.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(adminService.verifyUserDocuments(mockUser.id, mockUser.email)).rejects.toThrow(
        mockError
      );
    });

    it('should continue verification even if email fails', async () => {
      // Mock successful document verification
      (supabase.from as any)().update.mockResolvedValue({
        data: {
          ...mockUser.profile,
          documents_verified: true,
        },
        error: null,
      });

      // Mock email failure
      (supabase.auth.admin.generateLink as any).mockResolvedValue({
        data: null,
        error: new Error('Email failed'),
      });

      const result = await adminService.verifyUserDocuments(mockUser.id, mockUser.email);

      // Should still return true since verification succeeded
      expect(result).toBe(true);
      expect(supabase.from().update).toHaveBeenCalled();
    });
  });

  describe('Profile Completion Tracking', () => {
    it('should calculate profile completion percentage correctly', async () => {
      const incompleteProfile = {
        ...mockUser.profile,
        bio: null,
        phone: null,
        portfolio_links: [],
      };

      (supabase.from as any)().single.mockResolvedValue({
        data: incompleteProfile,
        error: null,
      });

      const profile = await adminService.getUserProfile(mockUser.id);

      expect(profile.profile_completion_percentage).toBeLessThan(
        mockUser.profile.profile_completion_percentage
      );
    });

    it('should track document submission status', async () => {
      const updatedProfile = {
        ...mockUser.profile,
        documents_submitted: true,
        required_documents: mockUser.profile.required_documents.map((doc) => ({
          ...doc,
          submitted_at: new Date().toISOString(),
        })),
      };

      (supabase.from as any)().update.mockResolvedValue({
        data: updatedProfile,
        error: null,
      });

      const result = await adminService.updateUserProfile(mockUser.id, {
        documents_submitted: true,
      });

      expect(result.error).toBeNull();
      expect(supabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          documents_submitted: true,
        })
      );
    });
  });
});
