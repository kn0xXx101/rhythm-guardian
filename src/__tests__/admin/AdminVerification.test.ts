3import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from '@/services/admin';
import { supabaseAdmin } from '@/lib/supabase';

// Mock Supabase Admin client
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        generateLink: vi.fn(),
        updateUserById: vi.fn(),
        listUsers: vi.fn()
      }
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis()
    }))
  }
}));

describe('Admin Verification Service', () => {
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
      profile_completion_percentage: 80
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Verification', () => {
    it('should verify user and send email notification', async () => {
      // Mock profile fetch
      (supabaseAdmin.from as any)().single.mockResolvedValue({
        data: mockUser.profile,
        error: null
      });

      // Mock profile update
      (supabaseAdmin.from as any)().update.mockResolvedValue({
        data: {
          ...mockUser.profile,
          status: 'active',
          email_verified: true,
          documents_verified: true,
          profile_complete: true
        },
        error: null
      });

      // Mock auth user list
      (supabaseAdmin.auth.admin.listUsers as any).mockResolvedValue({
        data: { users: [mockUser] },
        error: null
      });

      // Mock user update
      (supabaseAdmin.auth.admin.updateUserById as any).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock email sending
      (supabaseAdmin.auth.admin.generateLink as any).mockResolvedValue({
        data: { link: 'https://example.com/verify' },
        error: null
      });

      const result = await adminService.verifyUser(mockUser.id);

      expect(result).toBe(true);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('profiles', undefined);
      expect(supabaseAdmin.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          email_verified: true,
          status: 'active',
          documents_verified: true,
          profile_complete: true
        })
      );

      // Verify email notification was sent
      expect(supabaseAdmin.auth.admin.generateLink).toHaveBeenCalledWith({
        type: 'magiclink',
        email: mockUser.email,
        options: expect.any(Object)
      });
    });

    it('should handle verification errors', async () => {
      const mockError = new Error('Verification failed');
      (supabaseAdmin.from as any)().single.mockResolvedValue({
        data: null,
        error: mockError
      });

      await expect(
        adminService.verifyUser(mockUser.id)
      ).rejects.toThrow('Error verifying user');
    });

    it('should continue verification even if email fails', async () => {
      // Mock successful profile fetch and update
      (supabaseAdmin.from as any)().single.mockResolvedValue({
        data: mockUser.profile,
        error: null
      });
      (supabaseAdmin.from as any)().update.mockResolvedValue({
        data: {
          ...mockUser.profile,
          status: 'active',
          email_verified: true
        },
        error: null
      });

      // Mock auth user list
      (supabaseAdmin.auth.admin.listUsers as any).mockResolvedValue({
        data: { users: [mockUser] },
        error: null
      });

      // Mock user update
      (supabaseAdmin.auth.admin.updateUserById as any).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock email failure
      (supabaseAdmin.auth.admin.generateLink as any).mockResolvedValue({
        data: null,
        error: new Error('Email failed')
      });

      const result = await adminService.verifyUser(mockUser.id);

      // Should still return true since verification succeeded
      expect(result).toBe(true);
      expect(supabaseAdmin.from().update).toHaveBeenCalled();
    });
  });

  describe('User Status Management', () => {
    it('should update user status', async () => {
      // Mock profile fetch
      (supabaseAdmin.from as any)().single.mockResolvedValue({
        data: mockUser.profile,
        error: null
      });

      // Mock profile update
      (supabaseAdmin.from as any)().update.mockResolvedValue({
        data: {
          ...mockUser.profile,
          status: 'active'
        },
        error: null
      });

      const result = await adminService.updateUserStatus(mockUser.id, 'active');

      expect(result).toBe(true);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('profiles', undefined);
      expect(supabaseAdmin.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active'
        })
      );
    });

    it('should handle status update errors', async () => {
      const mockError = new Error('Update failed');
      (supabaseAdmin.from as any)().single.mockResolvedValue({
        data: null,
        error: mockError
      });

      await expect(
        adminService.updateUserStatus(mockUser.id, 'active')
      ).rejects.toThrow(mockError);
    });
  });
});
