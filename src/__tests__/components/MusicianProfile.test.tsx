import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import MusicianProfile from '../../pages/MusicianProfile';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';

// Mock useLocation hook
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...(actual as any),
    useLocation: vi.fn(),
  };
});

// Mock Dialog components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog">{children}</div>
  ),
  DialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-trigger">{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-title">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-description">{children}</div>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
}));

// Mock useToast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(),
}));

// Mock Supabase client
vi.mock('@/lib/supabase', () => {
  const mockSubscription = {
    unsubscribe: vi.fn(),
  };
  return {
    supabase: {
      from: vi.fn(() => ({
        update: vi.fn().mockResolvedValue({ error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            role: 'musician',
            status: 'active',
            full_name: 'Test Musician',
            avatar_url: 'https://example.com/avatar.jpg',
            phone: '+233123456789',
            location: 'Accra, Ghana',
          },
          error: null,
        }),
      })),
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: {
                id: 'user-id',
                email: 'musician@test.com',
              },
            },
          },
        }),
        onAuthStateChange: vi.fn().mockImplementation((callback) => {
          callback('SIGNED_IN', {
            user: {
              id: 'user-id',
              email: 'musician@test.com',
            },
          });
          return {
            data: { subscription: mockSubscription },
          };
        }),
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null }),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        updateUser: vi.fn(),
      },
    },
  };
});

describe('MusicianProfile', () => {
  const mockProfileData = {
    full_name: 'Test Musician',
    email: 'musician@test.com',
    phone: '+233123456789',
    location: 'Accra, Ghana',
    bio: 'Professional guitarist with 10 years experience',
    avatar_url: 'https://example.com/avatar.jpg',
    instruments: ['Guitar', 'Piano'],
    genres: ['Jazz', 'Blues'],
    hourly_rate: 100,
    availability: ['weekdays', 'weekends'],
    experience_level: 'advanced',
    youtube_url: 'https://youtube.com/@test',
    instagram_url: 'https://instagram.com/test',
    tiktok_url: 'https://tiktok.com/@test',
    soundcloud_url: 'https://soundcloud.com/test',
    payment_provider: 'mtn',
    payment_number: '+233123456789',
    payment_name: 'Test Musician',
  };

  const mockToast = {
    toast: vi.fn().mockReturnValue({
      id: 'test-toast',
      dismiss: vi.fn(),
      update: vi.fn(),
    }),
    dismiss: vi.fn(),
    toasts: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useLocation to return our test state
    vi.mocked(useLocation).mockReturnValue({
      state: { profileData: mockProfileData },
      pathname: '/musician/profile',
      search: '',
      hash: '',
      key: 'test',
    });

    // Mock useToast
    vi.mocked(useToast).mockReturnValue(mockToast);
  });

  describe('Form Population', () => {
    it('should populate form fields with profile data', () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <MusicianProfile />
          </AuthProvider>
        </BrowserRouter>
      );

      const [firstName, lastName] = mockProfileData.full_name.split(' ');
      expect(screen.getByDisplayValue(firstName)).toBeInTheDocument();
      expect(screen.getByDisplayValue(lastName)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockProfileData.email)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockProfileData.phone)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockProfileData.location)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockProfileData.bio)).toBeInTheDocument();

      const profileImage = screen.getByAltText('Profile') as HTMLImageElement;
      expect(profileImage.src).toBe(mockProfileData.avatar_url);

      mockProfileData.instruments.forEach((instrument) => {
        expect(screen.getByText(instrument)).toBeInTheDocument();
      });

      mockProfileData.genres.forEach((genre) => {
        expect(screen.getByText(genre)).toBeInTheDocument();
      });

      expect(screen.getByText(/Advanced/i)).toBeInTheDocument();
    });
  });

  describe('Supabase Integration', () => {
    it('should handle profile update in Supabase', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      } as any);

      render(
        <BrowserRouter>
          <AuthProvider>
            <MusicianProfile />
          </AuthProvider>
        </BrowserRouter>
      );

      fireEvent.change(screen.getByLabelText(/First Name/i), {
        target: { value: 'Updated' },
      });
      fireEvent.change(screen.getByLabelText(/Bio/i), {
        target: { value: 'Updated bio' },
      });

      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('profiles');
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            bio: 'Updated bio',
          })
        );
      });
    });

    it('should handle Supabase errors gracefully', async () => {
      const mockUpdate = vi.fn().mockRejectedValue(new Error('Database error'));
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      } as any);

      render(
        <BrowserRouter>
          <AuthProvider>
            <MusicianProfile />
          </AuthProvider>
        </BrowserRouter>
      );

      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
          })
        );
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state while saving', async () => {
      const mockUpdate = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      } as any);

      render(
        <BrowserRouter>
          <AuthProvider>
            <MusicianProfile />
          </AuthProvider>
        </BrowserRouter>
      );

      fireEvent.click(screen.getByText('Save Changes'));

      expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeEnabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <MusicianProfile />
          </AuthProvider>
        </BrowserRouter>
      );

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);

      tabs.forEach((tab) => {
        const panelId = tab.getAttribute('aria-controls');
        if (panelId) {
          const panel = document.getElementById(panelId);
          expect(panel).toBeInTheDocument();
          expect(panel).toHaveAttribute('role', 'tabpanel');
        }
      });
    });

    it('should maintain focus management', () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <MusicianProfile />
          </AuthProvider>
        </BrowserRouter>
      );

      const firstTab = screen.getAllByRole('tab')[0];
      fireEvent.click(firstTab);
      expect(firstTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Error Handling', () => {
    it('should handle component errors gracefully', () => {
      const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        try {
          return <>{children}</>;
        } catch (error) {
          return <div>Something went wrong</div>;
        }
      };

      vi.mocked(useLocation).mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      render(
        <ErrorBoundary>
          <BrowserRouter>
            <AuthProvider>
              <MusicianProfile />
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should handle missing profile data gracefully', () => {
      vi.mocked(useLocation).mockReturnValue({
        state: null,
        pathname: '/musician/profile',
        search: '',
        hash: '',
        key: 'test',
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <MusicianProfile />
          </AuthProvider>
        </BrowserRouter>
      );

      expect(screen.getByLabelText(/First Name/i)).toHaveValue('');
      expect(screen.getByLabelText(/Last Name/i)).toHaveValue('');
      expect(screen.getByLabelText(/Email Address/i)).toHaveValue('');
    });

    it('should handle successful form submission', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <MusicianProfile />
          </AuthProvider>
        </BrowserRouter>
      );

      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Profile Updated',
          description: 'Your profile changes have been saved successfully.',
        });
      });
    });
  });
});
