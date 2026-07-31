import { act, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

// ─── Mock Supabase ────────────────────────────────────────────────────────────

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase', () => ({
  sb: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  },
  isConfigured: vi.fn(() => true),
  showConfigBanner: vi.fn(),
  upsertProfile: vi.fn().mockResolvedValue(undefined),
  loadProfile: vi.fn().mockResolvedValue(null),
  updateProfileColorScheme: vi.fn().mockResolvedValue(undefined),
  updateProfileShowTodo: vi.fn().mockResolvedValue(undefined),
  updateProfileAvatar: vi.fn().mockResolvedValue({ error: null }),
  dbRecordLogin: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/admin', () => ({
  isAdminUser: vi.fn(() => false),
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// ─── Test component ───────────────────────────────────────────────────────────

function AuthDisplay() {
  const { user, isAdmin, displayName, loading } = useAuth();
  if (loading) return <div>Loading auth...</div>;
  return (
    <div>
      <span data-testid="user">{user ? user.email : 'null'}</span>
      <span data-testid="isAdmin">{String(isAdmin)}</span>
      <span data-testid="displayName">{displayName ?? 'null'}</span>
    </div>
  );
}

function SignInForm() {
  const { signInWithUsername } = useAuth();
  return <button onClick={() => signInWithUsername('testuser', 'password123')}>Sign In</button>;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

function renderWithAuth(ui: React.ReactElement) {
  return renderWithProviders(<AuthProvider>{ui}</AuthProvider>);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthContext / AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no session
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  describe('unauthenticated state', () => {
    it('should expose user=null when no session exists', async () => {
      renderWithAuth(<AuthDisplay />);

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('null');
      });
    });

    it('should expose isAdmin=false when no session exists', async () => {
      renderWithAuth(<AuthDisplay />);

      await waitFor(() => {
        expect(screen.getByTestId('isAdmin').textContent).toBe('false');
      });
    });

    it('should finish loading and show non-loading state', async () => {
      renderWithAuth(<AuthDisplay />);

      await waitFor(() => {
        expect(screen.queryByText('Loading auth...')).not.toBeInTheDocument();
      });
    });
  });

  describe('signInWithUsername', () => {
    it('should call supabase signInWithPassword with email derived from username', async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: null,
        data: { user: { id: 'u1', email: 'testuser@kannanao.local' } },
      });

      renderWithAuth(<SignInForm />);

      await act(async () => {
        screen.getByRole('button', { name: 'Sign In' }).click();
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'testuser@kannanao.local',
        password: 'password123',
      });
    });

    it('should record a login event on successful sign in', async () => {
      const { dbRecordLogin } = await import('@/lib/supabase');
      mockSignInWithPassword.mockResolvedValue({
        error: null,
        data: { user: { id: 'u1', email: 'testuser@kannanao.local' } },
      });

      let capturedHook: ReturnType<typeof useAuth> | null = null;
      function Capture() {
        capturedHook = useAuth();
        return null;
      }
      renderWithAuth(<Capture />);

      await act(async () => {
        await capturedHook?.signInWithUsername('testuser', 'password123');
      });

      expect(dbRecordLogin).toHaveBeenCalledWith('u1');
    });

    it('should not record a login event on failed sign in', async () => {
      const { dbRecordLogin } = await import('@/lib/supabase');
      mockSignInWithPassword.mockResolvedValue({
        error: { message: 'Invalid credentials' },
        data: { user: null },
      });

      let capturedHook: ReturnType<typeof useAuth> | null = null;
      function Capture() {
        capturedHook = useAuth();
        return null;
      }
      renderWithAuth(<Capture />);

      await act(async () => {
        await capturedHook?.signInWithUsername('bad', 'credentials');
      });

      expect(dbRecordLogin).not.toHaveBeenCalled();
    });

    it('should return error message on failed sign in', async () => {
      let capturedHook: ReturnType<typeof useAuth> | null = null;
      function Capture() {
        capturedHook = useAuth();
        return null;
      }
      renderWithAuth(<Capture />);
      const hook = capturedHook as unknown as ReturnType<typeof useAuth>;

      mockSignInWithPassword.mockResolvedValue({
        error: { message: 'Invalid credentials' },
        data: { user: null },
      });

      const result = await act(async () => hook.signInWithUsername('bad', 'credentials'));

      expect(result?.error).toBe('Invalid credentials');
    });

    it('should return error: null on successful sign in', async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: null,
        data: { user: { id: 'u1', email: 'user@kannanao.local' } },
      });

      let capturedHook: ReturnType<typeof useAuth> | null = null;
      function Capture() {
        capturedHook = useAuth();
        return null;
      }
      renderWithAuth(<Capture />);

      const result = await act(async () => capturedHook?.signInWithUsername('user', 'pass'));

      expect(result?.error).toBeNull();
    });
  });

  describe('signUpWithUsername', () => {
    it('should return an error (sign-ups are closed)', async () => {
      let capturedHook: ReturnType<typeof useAuth> | null = null;
      function Capture() {
        capturedHook = useAuth();
        return null;
      }
      renderWithAuth(<Capture />);

      const result = await act(async () => capturedHook?.signUpWithUsername('newuser', 'password'));

      expect(result?.error).toBeTruthy();
      expect(result?.error).toContain('waitlist');
    });
  });

  describe('signOut', () => {
    it('should sign out only the local session, not every device', async () => {
      mockSignOut.mockResolvedValue({});

      let capturedHook: ReturnType<typeof useAuth> | null = null;
      function Capture() {
        capturedHook = useAuth();
        return null;
      }
      renderWithAuth(<Capture />);
      await waitFor(() => expect(capturedHook?.loading).toBe(false));

      await act(async () => {
        await capturedHook?.signOut();
      });

      // supabase-js defaults to scope 'global', which revokes every session the
      // user has on every device. The app must pass 'local' explicitly.
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    });
  });

  describe('updateDisplayName', () => {
    it('should return error when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      let capturedHook: ReturnType<typeof useAuth> | null = null;
      function Capture() {
        capturedHook = useAuth();
        return null;
      }
      renderWithAuth(<Capture />);
      await waitFor(() => expect(capturedHook?.loading).toBe(false));

      const result = await act(async () => capturedHook?.updateDisplayName('New Name'));

      expect(result?.error).toBe('Not authenticated');
    });

    it('should call upsertProfile when authenticated', async () => {
      const { upsertProfile } = await import('@/lib/supabase');
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@kannanao.local' } } });

      let capturedHook: ReturnType<typeof useAuth> | null = null;
      function Capture() {
        capturedHook = useAuth();
        return null;
      }
      renderWithAuth(<Capture />);
      await waitFor(() => expect(capturedHook?.loading).toBe(false));

      await act(async () => {
        await capturedHook?.updateDisplayName('Hana');
      });

      expect(upsertProfile).toHaveBeenCalledWith('u1', 'test', 'Hana');
    });
  });

  describe('loading state', () => {
    it('should show loading initially then resolve', async () => {
      // Delay the getSession call
      mockGetSession.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 50)),
      );

      renderWithAuth(<AuthDisplay />);
      expect(screen.getByText('Loading auth...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Loading auth...')).not.toBeInTheDocument();
      });
    });
  });

  describe('onAuthStateChange — SIGNED_IN', () => {
    it('should call upsertProfile when SIGNED_IN fires', async () => {
      const { upsertProfile } = await import('@/lib/supabase');

      let authCallback: ((event: string, session: unknown) => void) | null = null;
      mockOnAuthStateChange.mockImplementation((cb) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      renderWithAuth(<AuthDisplay />);
      await waitFor(() => expect(screen.queryByText('Loading auth...')).not.toBeInTheDocument());

      await act(async () => {
        authCallback!('SIGNED_IN', {
          user: { id: 'u1', email: 'test@kannanao.local' },
        });
      });

      expect(upsertProfile).toHaveBeenCalledWith('u1', 'test');
    });

    it('should call loadProfile when SIGNED_IN fires', async () => {
      const { loadProfile } = await import('@/lib/supabase');

      let authCallback: ((event: string, session: unknown) => void) | null = null;
      mockOnAuthStateChange.mockImplementation((cb) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      renderWithAuth(<AuthDisplay />);
      await waitFor(() => expect(screen.queryByText('Loading auth...')).not.toBeInTheDocument());

      await act(async () => {
        authCallback!('SIGNED_IN', {
          user: { id: 'u1', email: 'test@kannanao.local' },
        });
      });

      await waitFor(() => expect(loadProfile).toHaveBeenCalledWith('u1'));
    });
  });

  describe('onAuthStateChange — SIGNED_OUT', () => {
    it('should clear displayName on SIGNED_OUT', async () => {
      const { loadProfile } = await import('@/lib/supabase');
      (loadProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
        username: 'u',
        displayName: 'Hana',
        colorScheme: null,
        showTodo: true,
      });

      let authCallback: ((event: string, session: unknown) => void) | null = null;
      mockOnAuthStateChange.mockImplementation((cb) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'u1', email: 'test@kannanao.local' } } },
      });
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'u1', email: 'test@kannanao.local' } },
      });

      function NameDisplay() {
        const { displayName, loading } = useAuth();
        if (loading) return <div>Loading auth...</div>;
        return <span data-testid="name">{displayName ?? 'null'}</span>;
      }

      renderWithAuth(<NameDisplay />);
      await waitFor(() => expect(screen.queryByText('Loading auth...')).not.toBeInTheDocument());
      await waitFor(() => expect(screen.getByTestId('name').textContent).toBe('Hana'));

      await act(async () => {
        authCallback!('SIGNED_OUT', null);
      });

      expect(screen.getByTestId('name').textContent).toBe('null');
    });
  });

  describe('fetchProfile — colorScheme loading', () => {
    it('should set colorScheme from profile when it is a valid scheme', async () => {
      const { loadProfile } = await import('@/lib/supabase');
      (loadProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
        username: 'u',
        displayName: null,
        colorScheme: 'ocean',
        showTodo: true,
      });

      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'u1', email: 'test@kannanao.local' } } },
      });
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'u1', email: 'test@kannanao.local' } },
      });

      function SchemeDisplay() {
        const { colorScheme, loading } = useAuth();
        if (loading) return <div>Loading auth...</div>;
        return <span data-testid="scheme">{colorScheme ?? 'null'}</span>;
      }

      renderWithAuth(<SchemeDisplay />);
      await waitFor(() => {
        expect(screen.getByTestId('scheme').textContent).toBe('ocean');
      });
    });

    it('should NOT set colorScheme when profile returns an invalid scheme', async () => {
      const { loadProfile } = await import('@/lib/supabase');
      (loadProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
        username: 'u',
        displayName: null,
        colorScheme: 'invalidscheme',
        showTodo: true,
      });

      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'u1', email: 'test@kannanao.local' } } },
      });
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'u1', email: 'test@kannanao.local' } },
      });

      function SchemeDisplay() {
        const { colorScheme, loading } = useAuth();
        if (loading) return <div>Loading auth...</div>;
        return <span data-testid="scheme">{colorScheme ?? 'null'}</span>;
      }

      renderWithAuth(<SchemeDisplay />);
      await waitFor(() => expect(screen.queryByText('Loading auth...')).not.toBeInTheDocument());
      expect(screen.getByTestId('scheme').textContent).toBe('null');
    });
  });

  describe('updateColorScheme', () => {
    it('should call updateProfileColorScheme when user is authenticated', async () => {
      const { updateProfileColorScheme } = await import('@/lib/supabase');
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@kannanao.local' } } });

      let capturedHook: ReturnType<typeof useAuth> | null = null;
      function Capture() {
        capturedHook = useAuth();
        return null;
      }
      renderWithAuth(<Capture />);
      await waitFor(() => expect(capturedHook?.loading).toBe(false));

      await act(async () => {
        await capturedHook?.updateColorScheme('murasaki');
      });

      expect(updateProfileColorScheme).toHaveBeenCalledWith('u1', 'murasaki');
    });

    it('should not call updateProfileColorScheme when not authenticated', async () => {
      const { updateProfileColorScheme } = await import('@/lib/supabase');
      mockGetUser.mockResolvedValue({ data: { user: null } });

      let capturedHook: ReturnType<typeof useAuth> | null = null;
      function Capture() {
        capturedHook = useAuth();
        return null;
      }
      renderWithAuth(<Capture />);
      await waitFor(() => expect(capturedHook?.loading).toBe(false));

      await act(async () => {
        await capturedHook?.updateColorScheme('murasaki');
      });

      expect(updateProfileColorScheme).not.toHaveBeenCalled();
    });
  });

  describe('updateShowTodo', () => {
    it('should call updateProfileShowTodo when user is authenticated', async () => {
      const { updateProfileShowTodo } = await import('@/lib/supabase');
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@kannanao.local' } } });

      let capturedHook: ReturnType<typeof useAuth> | null = null;
      function Capture() {
        capturedHook = useAuth();
        return null;
      }
      renderWithAuth(<Capture />);
      await waitFor(() => expect(capturedHook?.loading).toBe(false));

      await act(async () => {
        await capturedHook?.updateShowTodo(false);
      });

      expect(updateProfileShowTodo).toHaveBeenCalledWith('u1', false);
    });

    it('should not call updateProfileShowTodo when not authenticated', async () => {
      const { updateProfileShowTodo } = await import('@/lib/supabase');
      mockGetUser.mockResolvedValue({ data: { user: null } });

      let capturedHook: ReturnType<typeof useAuth> | null = null;
      function Capture() {
        capturedHook = useAuth();
        return null;
      }
      renderWithAuth(<Capture />);
      await waitFor(() => expect(capturedHook?.loading).toBe(false));

      await act(async () => {
        await capturedHook?.updateShowTodo(false);
      });

      expect(updateProfileShowTodo).not.toHaveBeenCalled();
    });
  });

  describe('updateAvatar', () => {
    function captureAuth() {
      const captured: { current: ReturnType<typeof useAuth> | null } = { current: null };
      function Capture() {
        captured.current = useAuth();
        return null;
      }
      renderWithAuth(<Capture />);
      return captured;
    }

    it('should write the new avatar and keep it on success', async () => {
      const { updateProfileAvatar } = await import('@/lib/supabase');
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@kannanao.local' } } });

      const auth = captureAuth();
      await waitFor(() => expect(auth.current?.loading).toBe(false));

      await act(async () => {
        await auth.current?.updateAvatar('buddy_fox:3');
      });

      expect(updateProfileAvatar).toHaveBeenCalledWith('u1', 'buddy_fox:3');
      expect(auth.current?.avatar).toBe('buddy_fox:3');
    });

    it('should roll back to the previous avatar when the write fails', async () => {
      const { updateProfileAvatar } = await import('@/lib/supabase');
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@kannanao.local' } } });

      const auth = captureAuth();
      await waitFor(() => expect(auth.current?.loading).toBe(false));

      // Establish a saved avatar first — rolling back to null would look like
      // success on a fresh profile and hide the bug this covers.
      await act(async () => {
        await auth.current?.updateAvatar('buddy_fox:3');
      });
      expect(auth.current?.avatar).toBe('buddy_fox:3');

      vi.mocked(updateProfileAvatar).mockResolvedValueOnce({ error: 'db down' });
      let result: { error: string | null } | undefined;
      await act(async () => {
        result = await auth.current?.updateAvatar('buddy_panda:1');
      });

      expect(result?.error).toBe('db down');
      expect(auth.current?.avatar).toBe('buddy_fox:3');
    });

    it('should roll back and report when the session is gone', async () => {
      const { updateProfileAvatar } = await import('@/lib/supabase');
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@kannanao.local' } } });

      const auth = captureAuth();
      await waitFor(() => expect(auth.current?.loading).toBe(false));
      await act(async () => {
        await auth.current?.updateAvatar('buddy_fox:3');
      });

      mockGetUser.mockResolvedValue({ data: { user: null } });
      let result: { error: string | null } | undefined;
      await act(async () => {
        result = await auth.current?.updateAvatar(null);
      });

      expect(result?.error).toBeTruthy();
      expect(auth.current?.avatar).toBe('buddy_fox:3');
      expect(updateProfileAvatar).toHaveBeenCalledTimes(1);
    });
  });
});
