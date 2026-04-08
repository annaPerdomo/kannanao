"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { sb, upsertProfile, loadProfile } from "@/lib/supabase";

const FAKE_DOMAIN = "kannanao.local";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  displayName: string | null;
  loading: boolean;
  signInWithUsername: (username: string, password: string) => Promise<{ error: string | null }>;
  signUpWithUsername: (username: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<{ error: string | null }>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchDisplayName(userId: string) {
    const profile = await loadProfile(userId);
    setDisplayName(profile?.displayName ?? null);
  }

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        void fetchDisplayName(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "SIGNED_IN" && session?.user) {
        const username = session.user.email?.split("@")[0] ?? "";
        void upsertProfile(session.user.id, username);
        void fetchDisplayName(session.user.id);
      }
      if (event === "SIGNED_OUT") {
        setDisplayName(null);
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

  const signUpWithUsername = async (username: string, password: string, name?: string) => {
    const { data, error } = await sb.auth.signUp({
      email: toEmail(username),
      password,
    });
    if (!error && data.user && name?.trim()) {
      await upsertProfile(data.user.id, username, name.trim());
      setDisplayName(name.trim());
    }
    return { error: error?.message ?? null };
  };

  const updateDisplayName = async (name: string) => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { error: "Not authenticated" };
    const username = user.email?.split("@")[0] ?? "";
    await upsertProfile(user.id, username, name.trim());
    setDisplayName(name.trim());
    return { error: null };
  };

  const signOut = async () => {
    await sb.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        displayName,
        loading,
        signInWithUsername,
        signUpWithUsername,
        signOut,
        updateDisplayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
