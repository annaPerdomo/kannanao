import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { ColorScheme } from '@/theme';

export interface MockAuthValue {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  displayName: string | null;
  colorScheme: ColorScheme | null;
  showTodo: boolean;
  loading: boolean;
  signInWithUsername: (username: string, password: string) => Promise<{ error: string | null }>;
  signUpWithUsername: (username: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<{ error: string | null }>;
  updateColorScheme: (scheme: ColorScheme) => Promise<void>;
  updateShowTodo: (show: boolean) => Promise<void>;
}

// Re-export the same context shape so the real useAuth hook works in tests
// (we mock the module itself in hook tests; here we just expose the context)
export const AuthContext = createContext<MockAuthValue>({
  session: null,
  user: null,
  isAdmin: false,
  displayName: null,
  colorScheme: null,
  showTodo: true,
  loading: false,
  signInWithUsername: async () => ({ error: null }),
  signUpWithUsername: async () => ({ error: null }),
  signOut: async () => {},
  updateDisplayName: async () => ({ error: null }),
  updateColorScheme: async () => {},
  updateShowTodo: async () => {},
});
