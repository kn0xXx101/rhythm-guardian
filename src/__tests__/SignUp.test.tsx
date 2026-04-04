import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignUp from '../pages/SignUp';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';

describe('SignUp Page', () => {
  beforeEach(() => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <SignUp />
        </AuthProvider>
      </BrowserRouter>
    );
  });

  test('renders signup form', () => {
    expect(screen.getByText(/Create Your Account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
  });

  test('validates form inputs and shows errors', async () => {
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Full name must be at least 3 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
      expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  test('allows user to fill and submit form', async () => {
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'Password1!' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'Password1!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(
        screen.queryByText(/Full name must be at least 3 characters/i)
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/Please enter a valid email address/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Password must be at least 8 characters/i)).not.toBeInTheDocument();
    });
  });
});
