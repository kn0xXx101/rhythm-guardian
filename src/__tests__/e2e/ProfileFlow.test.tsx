import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import MusicianDashboard from '@/pages/MusicianDashboard';
import MusicianProfile from '@/pages/MusicianProfile';
import { supabase } from '@/lib/supabase';

// Create a mock function that returns a chainable object
const createChainableMock = () => {
  const mock = vi.fn();
  mock.mockReturnValue({
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    execute: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  });
  return mock;
};

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: createChainableMock(),
    removeSubscription: vi.fn(),
  },
}));

describe('Profile Flow E2E', () => {
  const mockProfile = {
    user_id: 'test-id',
    full_name: 'Test Musician',
    email: 'musician@test.com',
    phone: '+233123456789',
    location: 'Accra, Ghana',
    bio: 'Professional guitarist with 10 years experience',
    avatar_url: 'https://example.com/avatar.jpg',
    profile_completion_percentage: 60,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock profile fetch
    const mockFrom = supabase.from as unknown as ReturnType<typeof createChainableMock>;
    mockFrom().single.mockResolvedValue({
      data: mockProfile,
      error: null,
    });
  });

  it('should navigate from dashboard to profile with data', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<MusicianDashboard />} />
            <Route path="/musician/profile" element={<MusicianProfile />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Musician Dashboard')).toBeInTheDocument();
    });

    // Click edit profile button
    const editProfileButton = screen.getByText('Edit Profile');
    fireEvent.click(editProfileButton);

    // Verify navigation and data population
    await waitFor(() => {
      expect(screen.getByText('My Profile')).toBeInTheDocument();
      const [firstName, lastName] = mockProfile.full_name.split(' ');
      expect(screen.getByDisplayValue(firstName)).toBeInTheDocument();
      expect(screen.getByDisplayValue(lastName)).toBeInTheDocument();
    });
  });

  it('should handle malformed profile data', async () => {
    // Mock profile with malformed data
    const malformedProfile = {
      ...mockProfile,
      full_name: undefined,
      email: null,
      phone: '',
      location: null,
    };

    const mockFrom = supabase.from as unknown as ReturnType<typeof createChainableMock>;
    mockFrom().single.mockResolvedValue({
      data: malformedProfile,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<MusicianDashboard />} />
            <Route path="/musician/profile" element={<MusicianProfile />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Navigate to profile
    await waitFor(() => {
      const editProfileButton = screen.getByText('Edit Profile');
      fireEvent.click(editProfileButton);
    });

    // Verify form handles malformed data gracefully
    await waitFor(() => {
      expect(screen.getByLabelText(/First Name/i)).toHaveValue('');
      expect(screen.getByLabelText(/Last Name/i)).toHaveValue('');
      expect(screen.getByLabelText(/Email Address/i)).toHaveValue('');
      expect(screen.getByLabelText(/Phone Number/i)).toHaveValue('');
      expect(screen.getByLabelText(/Location/i)).toHaveValue('');
    });
  });

  it('should handle special characters in profile data', async () => {
    // Mock profile with special characters
    const specialProfile = {
      ...mockProfile,
      full_name: "O'Connor-Smith Jr.",
      email: 'test+special@example.com',
      location: 'São Paulo, Brazil',
      bio: 'Love playing rock & roll! 100% passionate about music.',
    };

    const mockFrom = supabase.from as unknown as ReturnType<typeof createChainableMock>;
    mockFrom().single.mockResolvedValue({
      data: specialProfile,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<MusicianDashboard />} />
            <Route path="/musician/profile" element={<MusicianProfile />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Navigate to profile
    await waitFor(() => {
      const editProfileButton = screen.getByText('Edit Profile');
      fireEvent.click(editProfileButton);
    });

    // Verify special characters are handled correctly
    await waitFor(() => {
      expect(screen.getByDisplayValue("O'Connor-Smith")).toBeInTheDocument();
      expect(screen.getByDisplayValue('Jr.')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test+special@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('São Paulo, Brazil')).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('Love playing rock & roll! 100% passionate about music.')
      ).toBeInTheDocument();
    });
  });

  it('should preserve data through navigation', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<MusicianDashboard />} />
            <Route path="/musician/profile" element={<MusicianProfile />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Navigate to profile
    await waitFor(() => {
      const editProfileButton = screen.getByText('Edit Profile');
      fireEvent.click(editProfileButton);
    });

    // Verify initial data
    await waitFor(() => {
      const [firstName, lastName] = mockProfile.full_name.split(' ');
      expect(screen.getByDisplayValue(firstName)).toBeInTheDocument();
    });

    // Navigate back
    window.history.back();

    // Navigate forward
    window.history.forward();

    // Verify data is preserved
    await waitFor(() => {
      const [firstName, lastName] = mockProfile.full_name.split(' ');
      expect(screen.getByDisplayValue(firstName)).toBeInTheDocument();
      expect(screen.getByDisplayValue(lastName)).toBeInTheDocument();
    });
  });
});
