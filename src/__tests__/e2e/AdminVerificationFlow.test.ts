import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from '@/services/admin';
import { supabaseAdmin } from '@/lib/supabase';
import { notificationService } from '@/services/notifications';

// Mock Supabase Admin client
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        generateLink: vi.fn(),
        updateUserById: vi.fn(),
        listUsers: vi.fn(),
      },
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
    })),
  },
}));

// Mock notification service
vi.mock('@/services/notifications', () => ({
  notificationService: {
    showChatNotification: vi.fn(),
  },
}));

describe('End-to-End Admin Verification Flow', () => {
  const mockUser = {
    id: 'test-id',
    email: 'test@example.com',
    role: 'musician',
    profile: {
      user_id: 'test-id',
      full_name: 'Test Musician',
      role: 'musician',
      status: 'pending',
      email_verified: false,
      documents_submitted: true,
      documents_verified: false,
      profile_complete: false,
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
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Verification Flow', () => {
    it('should handle the complete verification process', async () => {
      // Step 1: Admin views pending verifications
      (supabaseAdmin.from as any)().select.mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue({
          data: [mockUser.profile],
          error: null,
        }),
      }));

      // Step 2: Admin reviews documents
      const verificationResult = await adminService.verifyUser(mockUser.id);
      expect(verificationResult).toBe(true);

      // Step 3: System updates profile status
      expect(supabaseAdmin.from).toHaveBeenCalledWith('profiles');
      expect(supabaseAdmin.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          documents_verified: true,
          email_verified: true,
        })
      );

      // Step 4: System sends verification email
      expect(supabaseAdmin.auth.admin.generateLink).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'magiclink',
          email: mockUser.email,
        })
      );
    });

    it('should handle concurrent verification attempts', async () => {
      // Simulate first verification attempt
      const firstAttempt = adminService.verifyUser(mockUser.id);

      // Simulate concurrent attempt
      const secondAttempt = adminService.verifyUser(mockUser.id);

      // Both should complete without errors
      await expect(Promise.all([firstAttempt, secondAttempt])).resolves.toEqual([true, true]);
    });

    it('should handle network failures during verification', async () => {
      // Simulate network failure during profile update
      (supabaseAdmin.from as any)().update.mockRejectedValueOnce(new Error('Network error'));

      // Should throw error and not send email
      await expect(adminService.verifyUser(mockUser.id)).rejects.toThrow();
      expect(supabaseAdmin.auth.admin.generateLink).not.toHaveBeenCalled();
    });
  });

  describe('Invalid Document Submissions', () => {
    it('should handle missing required documents', async () => {
      const incompleteProfile = {
        ...mockUser.profile,
        required_documents: [
          {
            type: 'id',
            required: true,
            verified: false,
            submitted_at: null,
          },
        ],
      };

      (supabaseAdmin.from as any)().single.mockResolvedValue({
        data: incompleteProfile,
        error: null,
      });

      await expect(adminService.verifyUser(mockUser.id)).rejects.toThrow(
        'Missing required documents'
      );
    });

    it('should handle corrupted document data', async () => {
      const corruptedProfile = {
        ...mockUser.profile,
        required_documents: 'invalid-data', // Should be an array
      };

      (supabaseAdmin.from as any)().single.mockResolvedValue({
        data: corruptedProfile,
        error: null,
      });

      await expect(adminService.verifyUser(mockUser.id)).rejects.toThrow('Invalid document data');
    });
  });

  describe('Performance Testing', () => {
    it('should handle multiple simultaneous verifications', async () => {
      const users = Array(10)
        .fill(null)
        .map((_, i) => ({
          ...mockUser,
          id: `test-id-${i}`,
          email: `test${i}@example.com`,
        }));

      const verificationPromises = users.map((user) => adminService.verifyUser(user.id));

      // All verifications should complete successfully
      const results = await Promise.allSettled(verificationPromises);
      expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
    });

    it('should handle large profile updates', async () => {
      const largeProfile = {
        ...mockUser.profile,
        // Add large amount of data
        performance_history: Array(1000).fill({
          event: 'Test Event',
          date: new Date().toISOString(),
          venue: 'Test Venue',
          details: 'Lorem ipsum dolor sit amet...',
        }),
      };

      (supabaseAdmin.from as any)().single.mockResolvedValue({
        data: largeProfile,
        error: null,
      });

      // Should complete without timeout
      await expect(adminService.verifyUser(mockUser.id)).resolves.toBe(true);
    });
  });

  describe('Email Verification Link', () => {
    it('should generate valid verification link with correct data', async () => {
      (supabaseAdmin.from as any)().single.mockResolvedValue({
        data: mockUser.profile,
        error: null,
      });

      await adminService.verifyUser(mockUser.id);

      expect(supabaseAdmin.auth.admin.generateLink).toHaveBeenCalledWith({
        type: 'magiclink',
        email: mockUser.email,
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/login'),
          data: expect.objectContaining({
            status: 'active',
            verified: true,
            role: mockUser.role,
          }),
        }),
      });
    });

    it('should handle email service failures', async () => {
      // Mock email service failure
      (supabaseAdmin.auth.admin.generateLink as any).mockRejectedValueOnce(
        new Error('Email service unavailable')
      );

      // Should still complete verification even if email fails
      await expect(adminService.verifyUser(mockUser.id)).resolves.toBe(true);
    });

    it('should retry failed email attempts', async () => {
      // Mock first attempt failure, second attempt success
      (supabaseAdmin.auth.admin.generateLink as any)
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          data: { link: 'https://example.com/verify' },
          error: null,
        });

      await adminService.verifyUser(mockUser.id);

      // Should have attempted twice
      expect(supabaseAdmin.auth.admin.generateLink).toHaveBeenCalledTimes(2);
    });
  });
});
