import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '@/services/auth';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
// Mock types
import type { Mock } from 'vitest';

type MockSupabase = {
  auth: {
    signUp: Mock;
    updateUser: Mock;
  };
  from: Mock;
};

// Create mock
const mockSupabase: MockSupabase = {
  auth: {
    signUp: vi.fn(),
    updateUser: vi.fn(),
  },
  from: vi.fn().mockReturnValue({
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
  }),
};

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

describe('AuthService - Profile Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a musician profile with correct initial data', async () => {
    // Mock successful auth signup
    const mockUser = { id: 'test-id', email: 'test@example.com' };
    (supabase.auth.signUp as any).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);

    // Mock successful profile creation
    (supabase.from as any)().insert.mockResolvedValue({ error: null });

    // Test musician signup
    const result = await authService.signUp(
      'test@example.com',
      'password123',
      'musician',
      'Test Musician'
    );

    // Verify auth signup was called with correct data
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: {
        data: {
          role: 'musician',
          status: 'pending',
        },
      },
    });

    // Verify profile creation was called with correct initial data
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    expect(mockSupabase.from().insert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'test-id',
        full_name: 'Test Musician',
        role: 'musician',
        status: 'pending',
        profile_completion_percentage: 20,
        documents_submitted: false,
        documents_verified: false,
        required_documents: [
          {
            type: 'id_verification',
            required: true,
            verified: false,
          },
          {
            type: 'instrument_certification',
            required: true,
            verified: false,
          },
          {
            type: 'profile_photo',
            required: true,
            verified: false,
          },
          {
            type: 'portfolio_samples',
            required: true,
            verified: false,
          },
        ],
      }),
    ]);

    expect(result.user).toBe(mockUser);
    expect(result.error).toBeNull();
  });

  it('should create a hirer profile with correct initial data', async () => {
    // Mock successful auth signup
    const mockUser = { id: 'test-id', email: 'test@example.com' };
    (supabase.auth.signUp as any).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);

    // Mock successful profile creation
    (supabase.from as any)().insert.mockResolvedValue({ error: null });

    // Test hirer signup
    const result = await authService.signUp(
      'test@example.com',
      'password123',
      'hirer',
      'Test Hirer'
    );

    // Verify profile creation for hirer
    expect(mockSupabase.from().insert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'test-id',
        full_name: 'Test Hirer',
        role: 'hirer',
        status: 'pending',
        profile_completion_percentage: 20,
        documents_submitted: false,
        documents_verified: false,
        required_documents: [
          {
            type: 'id_verification',
            required: true,
            verified: false,
          },
          {
            type: 'instrument_certification',
            required: false,
            verified: false,
          },
          {
            type: 'profile_photo',
            required: true,
            verified: false,
          },
          {
            type: 'portfolio_samples',
            required: false,
            verified: false,
          },
        ],
      }),
    ]);
  });

  it('should handle signup errors correctly', async () => {
    // Mock auth signup error
    const mockError = new Error('Signup failed');
    (supabase.auth.signUp as any).mockResolvedValue({
      data: { user: null },
      error: mockError,
    });

    const result = await authService.signUp(
      'test@example.com',
      'password123',
      'musician',
      'Test User'
    );

    expect(result.user).toBeNull();
    expect(result.error).toBe(mockError);
    expect(mockSupabase.from().insert).not.toHaveBeenCalled();
  });

  it('should handle profile creation errors correctly', async () => {
    // Mock successful auth signup but failed profile creation
    const mockUser = { id: 'test-id', email: 'test@example.com' };
    (supabase.auth.signUp as any).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);

    const profileError = new Error('Profile creation failed');
    (supabase.from as any)().insert.mockResolvedValue({ error: profileError });

    await expect(
      authService.signUp('test@example.com', 'password123', 'musician', 'Test User')
    ).rejects.toThrow(profileError);
  });
});

describe('AuthService - Profile Updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update profile completion percentage when documents are submitted', async () => {
    const mockUser = { id: 'test-id' };
    const mockProfile = {
      profile_completion_percentage: 20,
      documents_submitted: false,
      required_documents: [{ type: 'id_verification', required: true, verified: false }],
    };

    // Mock profile fetch
    (supabase.from as any)().select.mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    // Mock profile update
    (supabase.from as any)().update.mockResolvedValue({ error: null });

    await authService.updateProfile(mockUser.id, {
      full_name: 'Test User',
      role: 'musician',
      status: 'pending',
    });

    expect(mockSupabase.from().update).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_completion_percentage: expect.any(Number),
        updated_at: expect.any(String),
      })
    );
  });
});
