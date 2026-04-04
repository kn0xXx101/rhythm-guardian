import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { UsersManagement } from '@/components/dashboard/UsersManagement';
import { adminService } from '@/services/admin';
import { supabaseAdmin } from '@/lib/supabase';

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

// Mock admin service
vi.mock('@/services/admin', () => ({
  adminService: {
    getUsers: vi.fn(),
    verifyUser: vi.fn(),
    updateUserStatus: vi.fn(),
  },
}));

describe('Admin Dashboard UI Integration', () => {
  const mockUsers = [
    {
      id: 'test-id-1',
      name: 'Test Musician',
      email: 'test@example.com',
      userType: 'musician',
      status: 'pending',
      verified: false,
      joinDate: '2024-01-01',
      lastActive: '2024-01-01',
      profileComplete: true,
      documentsSubmitted: true,
      documentsVerified: false,
      completionPercentage: 100,
    },
    {
      id: 'test-id-2',
      name: 'Another Musician',
      email: 'another@example.com',
      userType: 'musician',
      status: 'pending',
      verified: false,
      joinDate: '2024-01-02',
      lastActive: '2024-01-02',
      profileComplete: true,
      documentsSubmitted: true,
      documentsVerified: false,
      completionPercentage: 100,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (adminService.getUsers as any).mockResolvedValue(mockUsers);
  });

  describe('User Verification UI Flow', () => {
    it('should display pending verifications and handle verification process', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <AdminDashboardLayout>
              <UsersManagement />
            </AdminDashboardLayout>
          </AuthProvider>
        </BrowserRouter>
      );

      // Wait for users to load
      await waitFor(() => {
        expect(screen.getByText('Test Musician')).toBeInTheDocument();
        expect(screen.getByText('Another Musician')).toBeInTheDocument();
      });

      // Mock successful verification
      (adminService.verifyUser as any).mockResolvedValueOnce(true);

      // Click verify button for first user
      const verifyButtons = screen.getAllByText(/Verify/i);
      fireEvent.click(verifyButtons[0]);

      // Should show loading state
      expect(screen.getByText(/Verifying/i)).toBeInTheDocument();

      // Wait for verification to complete
      await waitFor(() => {
        expect(adminService.verifyUser).toHaveBeenCalledWith('test-id-1');
        expect(screen.getByText(/Verification successful/i)).toBeInTheDocument();
      });

      // Should update user list
      expect(adminService.getUsers).toHaveBeenCalledTimes(2);
    });

    it('should handle verification errors gracefully', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <AdminDashboardLayout>
              <UsersManagement />
            </AdminDashboardLayout>
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Musician')).toBeInTheDocument();
      });

      // Mock verification failure
      (adminService.verifyUser as any).mockRejectedValueOnce(new Error('Verification failed'));

      // Click verify button
      const verifyButton = screen.getAllByText(/Verify/i)[0];
      fireEvent.click(verifyButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Verification failed/i)).toBeInTheDocument();
        expect(screen.getByText(/Try again/i)).toBeInTheDocument();
      });
    });

    it('should filter and display users by verification status', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <AdminDashboardLayout>
              <UsersManagement />
            </AdminDashboardLayout>
          </AuthProvider>
        </BrowserRouter>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Musician')).toBeInTheDocument();
      });

      // Click status filter
      const filterButton = screen.getByText(/Filter by Status/i);
      fireEvent.click(filterButton);

      // Select 'Pending' status
      const pendingOption = screen.getByText(/Pending/i);
      fireEvent.click(pendingOption);

      // Should call getUsers with status filter
      expect(adminService.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' })
      );
    });

    it('should display document preview and verification options', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <AdminDashboardLayout>
              <UsersManagement />
            </AdminDashboardLayout>
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Musician')).toBeInTheDocument();
      });

      // Click view documents button
      const viewDocsButton = screen.getByText(/View Documents/i);
      fireEvent.click(viewDocsButton);

      // Should show document preview modal
      expect(screen.getByText(/Required Documents/i)).toBeInTheDocument();
      expect(screen.getByText(/ID Verification/i)).toBeInTheDocument();
      expect(screen.getByText(/Certification/i)).toBeInTheDocument();

      // Click verify all documents button
      const verifyAllButton = screen.getByText(/Verify All Documents/i);
      fireEvent.click(verifyAllButton);

      // Should trigger verification process
      expect(adminService.verifyUser).toHaveBeenCalledWith('test-id-1');
    });

    it('should handle concurrent verifications correctly', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <AdminDashboardLayout>
              <UsersManagement />
            </AdminDashboardLayout>
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Verify/i)).toHaveLength(2);
      });

      // Click both verify buttons quickly
      const verifyButtons = screen.getAllByText(/Verify/i);
      fireEvent.click(verifyButtons[0]);
      fireEvent.click(verifyButtons[1]);

      // Should show loading state for both
      expect(screen.getAllByText(/Verifying/i)).toHaveLength(2);

      // Mock successful verifications
      (adminService.verifyUser as any).mockResolvedValueOnce(true).mockResolvedValueOnce(true);

      // Wait for both verifications to complete
      await waitFor(() => {
        expect(adminService.verifyUser).toHaveBeenCalledTimes(2);
        expect(adminService.verifyUser).toHaveBeenCalledWith('test-id-1');
        expect(adminService.verifyUser).toHaveBeenCalledWith('test-id-2');
      });
    });
  });
});
