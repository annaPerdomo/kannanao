"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { sb, upsertProfile } from "@/lib/supabase";

const FAKE_DOMAIN = "kannanao.local";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithUsername: (username: string, password: string) => Promise<{ error: string | null }>;
  signUpWithUsername: (username: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "SIGNED_IN" && session?.user) {
        const username = session.user.email?.split("@")[0] ?? "";
        void upsertProfile(session.user.id, username);
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

  const signUpWithUsername = async (username: string, password: string) => {
    const { error } = await sb.auth.signUp({
      email: toEmail(username),
      password,
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await sb.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signInWithUsername,
        signUpWithUsername,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
