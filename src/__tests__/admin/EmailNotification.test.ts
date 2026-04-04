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
    })),
  },
}));

// Mock notification service
vi.mock('@/services/notifications', () => ({
  notificationService: {
    showChatNotification: vi.fn(),
  },
}));

describe('Email Notification Tests', () => {
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
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Profile Verification Email', () => {
    it('should send verification email when admin verifies profile', async () => {
      // Mock profile fetch
      (supabaseAdmin.from as any)().single.mockResolvedValue({
        data: mockUser.profile,
        error: null,
      });

      // Mock auth user list
      (supabaseAdmin.auth.admin.listUsers as any).mockResolvedValue({
        data: { users: [mockUser] },
        error: null,
      });

      // Mock user update
      (supabaseAdmin.auth.admin.updateUserById as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock email sending
      (supabaseAdmin.auth.admin.generateLink as any).mockResolvedValue({
        data: { link: 'https://example.com/verify' },
        error: null,
      });

      const result = await adminService.verifyUser(mockUser.id);

      expect(result).toBe(true);
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

    it('should handle email sending failure gracefully', async () => {
      // Mock profile fetch
      (supabaseAdmin.from as any)().single.mockResolvedValue({
        data: mockUser.profile,
        error: null,
      });

      // Mock auth user list
      (supabaseAdmin.auth.admin.listUsers as any).mockResolvedValue({
        data: { users: [mockUser] },
        error: null,
      });

      // Mock user update
      (supabaseAdmin.auth.admin.updateUserById as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock email sending failure
      (supabaseAdmin.auth.admin.generateLink as any).mockResolvedValue({
        data: null,
        error: new Error('Failed to send email'),
      });

      const result = await adminService.verifyUser(mockUser.id);

      // Should still return true even if email fails
      expect(result).toBe(true);
      expect(supabaseAdmin.auth.admin.generateLink).toHaveBeenCalled();
    });

    it('should include correct verification data in email', async () => {
      // Mock profile fetch with complete data
      (supabaseAdmin.from as any)().single.mockResolvedValue({
        data: {
          ...mockUser.profile,
          documents_verified: true,
          profile_complete: true,
          email_verified: true,
          status: 'active',
        },
        error: null,
      });

      // Mock auth user list
      (supabaseAdmin.auth.admin.listUsers as any).mockResolvedValue({
        data: { users: [mockUser] },
        error: null,
      });

      // Mock user update
      (supabaseAdmin.auth.admin.updateUserById as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock email sending
      (supabaseAdmin.auth.admin.generateLink as any).mockResolvedValue({
        data: { link: 'https://example.com/verify' },
        error: null,
      });

      await adminService.verifyUser(mockUser.id);

      expect(supabaseAdmin.auth.admin.generateLink).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'magiclink',
          email: mockUser.email,
          options: expect.objectContaining({
            data: expect.objectContaining({
              status: 'active',
              verified: true,
              role: mockUser.role,
              email_verified: true,
              documents_verified: true,
              profile_complete: true,
            }),
          }),
        })
      );
    });
  });
});
