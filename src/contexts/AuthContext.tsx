"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { sb, upsertProfile, loadProfile, updateProfileColorScheme } from "@/lib/supabase";
import { isAdminUser } from "@/lib/admin";
import type { ColorScheme } from "@/theme";

const FAKE_DOMAIN = "kannanao.local";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  displayName: string | null;
  colorScheme: ColorScheme | null;
  loading: boolean;
  signInWithUsername: (username: string, password: string) => Promise<{ error: string | null }>;
  signUpWithUsername: (username: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<{ error: string | null }>;
  updateColorScheme: (scheme: ColorScheme) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function toEmail(username: string) {
  return `${username.trim().toLowerCase()}@${FAKE_DOMAIN}`;
}

const VALID_SCHEMES: ColorScheme[] = [
  "sakura", "murasaki", "yuki",
  "ocean", "forest", "sunset", "lavender", "midnight", "matcha", "rosegold",
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [colorScheme, setColorScheme] = useState<ColorScheme | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    const profile = await loadProfile(userId);
    setDisplayName(profile?.displayName ?? null);
    const saved = profile?.colorScheme;
    if (saved && VALID_SCHEMES.includes(saved as ColorScheme)) {
      setColorScheme(saved as ColorScheme);
    }
  }

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        void fetchProfile(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "SIGNED_IN" && session?.user) {
        const username = session.user.email?.split("@")[0] ?? "";
        void upsertProfile(session.user.id, username);
        void fetchProfile(session.user.id);
      }
      if (event === "SIGNED_OUT") {
        setDisplayName(null);
        setColorScheme(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithUsername = async (username: string, password: string) => {
    const { error } = await sb.auth.signInWithPassword({
      email: toEmail(username),
      password,
    });
    return { error: error?.message ?? null };
  };

  const signUpWithUsername = async (_username: string, _password: string, _name?: string) => {
    return { error: "Sign-ups are currently closed. Join the waitlist at the landing page." };
  };

  const updateDisplayName = async (name: string) => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { error: "Not authenticated" };
    const username = user.email?.split("@")[0] ?? "";
    await upsertProfile(user.id, username, name.trim());
    setDisplayName(name.trim());
    return { error: null };
  };

  const updateColorScheme = async (scheme: ColorScheme) => {
    setColorScheme(scheme);
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      await updateProfileColorScheme(user.id, scheme);
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
        displayName,
        colorScheme,
        loading,
        signInWithUsername,
        signUpWithUsername,
        signOut,
        updateDisplayName,
        updateColorScheme,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
