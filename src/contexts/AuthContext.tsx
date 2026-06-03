'use client';
import type { Session, User } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

import { isAdminUser } from '@/lib/admin';
import type { InitialAuth } from '@/lib/dbMappers';
import type { AccountType } from '@/lib/supabase';
import {
  dbRecordLogin,
  loadProfile,
  sb,
  updateProfileColorScheme,
  updateProfileHomeSections,
  updateProfileShowTodo,
  updateProfileTravelMainViewMode,
  upsertProfile,
} from '@/lib/supabase';
import type { ColorScheme } from '@/theme';
import type { HomeSections } from '@/types/homeSections';
import { DEFAULT_HOME_SECTIONS, resolveHomeSections } from '@/types/homeSections';

const FAKE_DOMAIN = 'kannanao.local';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  accountType: AccountType;
  isMemberAccount: boolean;
  organizerId: string | null;
  groupId: string | null;
  groupShowLeaderboard: boolean;
  displayName: string | null;
  colorScheme: ColorScheme | null;
  showTodo: boolean;
  homeSections: HomeSections;
  travelMainViewMode: string | null;
  loading: boolean;
  signInWithUsername: (username: string, password: string) => Promise<{ error: string | null }>;
  signUpWithUsername: (
    username: string,
    password: string,
    name?: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<{ error: string | null }>;
  updateColorScheme: (scheme: ColorScheme) => Promise<void>;
  updateShowTodo: (show: boolean) => Promise<void>;
  updateHomeSections: (sections: HomeSections) => Promise<void>;
  updateTravelMainViewMode: (mode: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function toEmail(username: string) {
  return `${username.trim().toLowerCase()}@${FAKE_DOMAIN}`;
}

const VALID_SCHEMES: ColorScheme[] = [
  'sakura',
  'murasaki',
  'yuki',
  'ocean',
  'forest',
  'sunset',
  'lavender',
  'midnight',
  'matcha',
  'rosegold',
];

export function AuthProvider({
  children,
  initialAuth,
}: {
  children: ReactNode;
  /**
   * Server-resolved auth state. When provided (even with a null session), the
   * provider treats auth as already resolved — `loading` starts false and the
   * session/profile are seeded — so authenticated pages render in the initial
   * HTML instead of flashing a loading spinner. Undefined = resolve on client.
   */
  initialAuth?: InitialAuth;
}) {
  const seeded = initialAuth !== undefined;
  const initialProfile = initialAuth?.profile ?? null;
  const seededScheme =
    initialProfile?.colorScheme && VALID_SCHEMES.includes(initialProfile.colorScheme as ColorScheme)
      ? (initialProfile.colorScheme as ColorScheme)
      : null;
  const seededSections = resolveHomeSections(
    initialProfile?.homeSections,
    initialProfile?.showTodo,
  );

  const [session, setSession] = useState<Session | null>(initialAuth?.session ?? null);
  const [displayName, setDisplayName] = useState<string | null>(
    initialProfile?.displayName ?? null,
  );
  const [colorScheme, setColorScheme] = useState<ColorScheme | null>(seededScheme);
  const [showTodo, setShowTodo] = useState(seededSections.todo);
  const [homeSections, setHomeSections] = useState<HomeSections>(seededSections);
  const [travelMainViewMode, setTravelMainViewMode] = useState<string | null>(
    initialProfile?.travelMainViewMode ?? null,
  );
  const [accountType, setAccountType] = useState<AccountType>(
    initialProfile?.accountType ?? 'organizer',
  );
  const [organizerId, setOrganizerId] = useState<string | null>(
    initialProfile?.organizerId ?? null,
  );
  const [groupId, setGroupId] = useState<string | null>(initialProfile?.groupId ?? null);
  const [groupShowLeaderboard, setGroupShowLeaderboard] = useState(
    initialProfile?.groupShowLeaderboard ?? true,
  );
  const [loading, setLoading] = useState(!seeded);

  async function fetchProfile(userId: string) {
    const profile = await loadProfile(userId);
    setDisplayName(profile?.displayName ?? null);
    const saved = profile?.colorScheme;
    if (saved && VALID_SCHEMES.includes(saved as ColorScheme)) {
      setColorScheme(saved as ColorScheme);
    }
    const resolved = resolveHomeSections(profile?.homeSections, profile?.showTodo);
    setShowTodo(resolved.todo);
    setHomeSections(resolved);
    setTravelMainViewMode(profile?.travelMainViewMode ?? null);
    setAccountType(profile?.accountType ?? 'organizer');
    setOrganizerId(profile?.organizerId ?? null);
    setGroupId(profile?.groupId ?? null);
    setGroupShowLeaderboard(profile?.groupShowLeaderboard ?? true);
  }

  useEffect(() => {
    // When the server already resolved auth, skip the client getSession round —
    // the seeded session/profile are authoritative for first paint. onAuthStateChange
    // (below) still reconciles live changes (token refresh, sign-in/out).
    if (!seeded) {
      sb.auth.getSession().then(({ data }) => {
        setSession(data.session);
        if (data.session?.user) {
          void fetchProfile(data.session.user.id);
        }
        setLoading(false);
      });
    }

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event, session) => {
      // Keep the same session object identity when the access token hasn't
      // changed (e.g. the INITIAL_SESSION echo of the server-seeded session, or
      // a refresh that returns the same token). Otherwise every data hook that
      // depends on `user` would refire and refetch needlessly.
      setSession((prev) => (prev?.access_token === session?.access_token ? prev : session));
      if (event === 'SIGNED_IN' && session?.user) {
        const username = session.user.email?.split('@')[0] ?? '';
        void upsertProfile(session.user.id, username);
        void fetchProfile(session.user.id);
      }
      if (event === 'SIGNED_OUT') {
        setDisplayName(null);
        setColorScheme(null);
        setShowTodo(true);
        setHomeSections(DEFAULT_HOME_SECTIONS);
        setTravelMainViewMode(null);
        setAccountType('organizer');
        setOrganizerId(null);
        setGroupId(null);
        setGroupShowLeaderboard(true);
      }
    });

    return () => subscription.unsubscribe();
    // Runs once on mount. `seeded` is fixed for the component's lifetime (it's
    // derived from the server-provided initialAuth prop), so it's safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithUsername = async (username: string, password: string) => {
    const { error, data } = await sb.auth.signInWithPassword({
      email: toEmail(username),
      password,
    });
    if (!error && data.user) {
      void dbRecordLogin(data.user.id);
    }
    return { error: error?.message ?? null };
  };

  const signUpWithUsername = async (_username: string, _password: string, _name?: string) => {
    return { error: 'Sign-ups are currently closed. Join the waitlist at the landing page.' };
  };

  const updateDisplayName = async (name: string) => {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return { error: 'Not authenticated' };
    const username = user.email?.split('@')[0] ?? '';
    await upsertProfile(user.id, username, name.trim());
    setDisplayName(name.trim());
    return { error: null };
  };

  const updateColorScheme = async (scheme: ColorScheme) => {
    setColorScheme(scheme);
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (user) {
      await updateProfileColorScheme(user.id, scheme);
    }
  };

  const updateShowTodo = async (show: boolean) => {
    setShowTodo(show);
    setHomeSections((prev) => ({ ...prev, todo: show }));
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (user) {
      await updateProfileShowTodo(user.id, show);
    }
  };

  const updateHomeSectionsHandler = async (sections: HomeSections) => {
    setHomeSections(sections);
    setShowTodo(sections.todo);
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (user) {
      await updateProfileHomeSections(user.id, sections);
    }
  };

  const updateTravelMainViewMode = async (mode: string) => {
    setTravelMainViewMode(mode);
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (user) {
      await updateProfileTravelMainViewMode(user.id, mode);
    }
  };

  const signOut = async () => {
    await sb.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isAdmin: isAdminUser(session?.user?.email ?? undefined),
        accountType,
        isMemberAccount: accountType === 'member',
        organizerId,
        groupId,
        groupShowLeaderboard,
        displayName,
        colorScheme,
        showTodo,
        homeSections,
        travelMainViewMode,
        loading,
        signInWithUsername,
        signUpWithUsername,
        signOut,
        updateDisplayName,
        updateColorScheme,
        updateShowTodo,
        updateHomeSections: updateHomeSectionsHandler,
        updateTravelMainViewMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
