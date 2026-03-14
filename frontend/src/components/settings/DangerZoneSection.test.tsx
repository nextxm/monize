import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/render';
import { DangerZoneSection } from './DangerZoneSection';
import { User } from '@/types/auth';

vi.mock('@/lib/user-settings', () => ({
  userSettingsApi: {
    deleteAccount: vi.fn(),
    deleteData: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  authApi: {
    initiateOidc: vi.fn(),
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    logout: vi.fn(),
  })),
}));

vi.mock('@/lib/errors', () => ({
  getErrorMessage: vi.fn((_error: unknown, fallback: string) => fallback),
}));

import { userSettingsApi } from '@/lib/user-settings';
import toast from 'react-hot-toast';

const localUser: User = {
  id: '123',
  email: 'test@example.com',
  authProvider: 'local',
  hasPassword: true,
  role: 'user',
  isActive: true,
  mustChangePassword: false,
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

const oidcUser: User = {
  ...localUser,
  authProvider: 'oidc',
  hasPassword: false,
};

describe('DangerZoneSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the danger zone heading and both action buttons', () => {
    render(<DangerZoneSection user={localUser} />);

    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Data...' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Account' })).toBeInTheDocument();
  });

  describe('Delete Account', () => {
    it('shows confirmation inputs when Delete Account is clicked', () => {
      render(<DangerZoneSection user={localUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));

      expect(screen.getByText(/Type DELETE to confirm/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type DELETE')).toBeInTheDocument();
      expect(screen.getByText(/Enter your password:/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm Delete' })).toBeDisabled();
    });

    it('requires both DELETE text and password for local users', () => {
      render(<DangerZoneSection user={localUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));

      // Just DELETE text is not enough
      fireEvent.change(screen.getByPlaceholderText('Type DELETE'), { target: { value: 'DELETE' } });
      expect(screen.getByRole('button', { name: 'Confirm Delete' })).toBeDisabled();

      // Add password too
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'mypass' } });
      expect(screen.getByRole('button', { name: 'Confirm Delete' })).not.toBeDisabled();
    });

    it('does not show password field for OIDC-only users', () => {
      render(<DangerZoneSection user={oidcUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));

      expect(screen.queryByText(/Enter your password:/)).not.toBeInTheDocument();
    });

    it('calls deleteAccount API with password when confirmed', async () => {
      (userSettingsApi.deleteAccount as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      render(<DangerZoneSection user={localUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));
      fireEvent.change(screen.getByPlaceholderText('Type DELETE'), { target: { value: 'DELETE' } });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'mypass' } });
      fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }));

      await waitFor(() => {
        expect(userSettingsApi.deleteAccount).toHaveBeenCalledWith({ password: 'mypass' });
        expect(toast.success).toHaveBeenCalledWith('Account deleted');
      });
    });

    it('hides confirmation when Cancel is clicked', () => {
      render(<DangerZoneSection user={localUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));
      expect(screen.getByText(/Type DELETE to confirm/)).toBeInTheDocument();

      // There may be multiple Cancel buttons; get the last one (delete account section)
      const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButtons[cancelButtons.length - 1]);
      expect(screen.queryByText(/Type DELETE to confirm/)).not.toBeInTheDocument();
    });
  });

  describe('Delete Data', () => {
    it('shows data deletion options when Delete Data is clicked', () => {
      render(<DangerZoneSection user={localUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Delete Data...' }));

      expect(screen.getByText(/The following will always be deleted/)).toBeInTheDocument();
      expect(screen.getByText('Accounts')).toBeInTheDocument();
      expect(screen.getByText('Categories')).toBeInTheDocument();
      expect(screen.getByText('Payees')).toBeInTheDocument();
      expect(screen.getByText('Currency preferences')).toBeInTheDocument();
    });

    it('requires password for local auth users', () => {
      render(<DangerZoneSection user={localUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Delete Data...' }));

      expect(screen.getByText(/Enter your password to confirm/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm Delete Data' })).toBeDisabled();
    });

    it('shows OIDC re-auth button for OIDC-only users', () => {
      render(<DangerZoneSection user={oidcUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Delete Data...' }));

      expect(screen.getByText(/Re-authenticate with your identity provider/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Re-authenticate and Delete' })).toBeInTheDocument();
    });

    it('calls deleteData API with password and options', async () => {
      (userSettingsApi.deleteData as ReturnType<typeof vi.fn>).mockResolvedValue({ deleted: { transactions: 50 } });

      render(<DangerZoneSection user={localUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Delete Data...' }));
      fireEvent.click(screen.getByLabelText('Accounts'));
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'mypassword' } });
      fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete Data' }));

      await waitFor(() => {
        expect(userSettingsApi.deleteData).toHaveBeenCalledWith({
          password: 'mypassword',
          deleteAccounts: true,
          deleteCategories: false,
          deletePayees: false,
          deleteExchangeRates: false,
        });
        expect(toast.success).toHaveBeenCalledWith('Deleted 50 records successfully');
      });
    });

    it('hides data delete form when Cancel is clicked', () => {
      render(<DangerZoneSection user={localUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Delete Data...' }));
      expect(screen.getByText(/The following will always be deleted/)).toBeInTheDocument();

      const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButtons[0]);

      expect(screen.queryByText(/The following will always be deleted/)).not.toBeInTheDocument();
    });

    it('shows balance reset note when accounts are not being deleted', () => {
      render(<DangerZoneSection user={localUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Delete Data...' }));

      expect(screen.getByText(/Account balances will be reset/)).toBeInTheDocument();
    });

    it('hides balance reset note when accounts are being deleted', () => {
      render(<DangerZoneSection user={localUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Delete Data...' }));
      fireEvent.click(screen.getByLabelText('Accounts'));

      expect(screen.queryByText(/Account balances will be reset/)).not.toBeInTheDocument();
    });
  });
});
