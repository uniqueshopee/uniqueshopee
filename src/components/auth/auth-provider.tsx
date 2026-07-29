"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ensureCurrentUserProfile,
  getCurrentUserRoleKey,
  signOutSupabase,
  type AuthProfile,
  type AuthRoleKey,
} from "@/lib/supabase/auth";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  role: AuthRoleKey | null;
  isAuthenticated: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<{ success: boolean; error: Error | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadAuthState() {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return {
      session: null,
      user: null,
      profile: null,
      role: null,
    };
  }

  const {
    data: { session },
  } = await client.auth.getSession();

  const user = session?.user ?? null;

  if (!user) {
    return {
      session: null,
      user: null,
      profile: null,
      role: null,
    };
  }

  const [profile, role] = await Promise.all([
    ensureCurrentUserProfile(client),
    getCurrentUserRoleKey(client),
  ]);

  return {
    session,
    user,
    profile,
    role,
  };
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [role, setRole] = useState<AuthRoleKey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getSupabaseBrowserClient();

    if (!client) {
      setLoading(false);
      return;
    }

    let active = true;

    const syncAuth = async () => {
      const nextState = await loadAuthState();

      if (!active) {
        return;
      }

      setSession(nextState.session);
      setUser(nextState.user);
      setProfile(nextState.profile);
      setRole(nextState.role);
      setLoading(false);
    };

    void syncAuth();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      void (async () => {
        if (!active) {
          return;
        }

        if (!nextSession?.user) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setRole(null);
          setLoading(false);
          return;
        }

        const [nextProfile, nextRole] = await Promise.all([
          ensureCurrentUserProfile(client),
          getCurrentUserRoleKey(client),
        ]);

        if (!active) {
          return;
        }

        setSession(nextSession);
        setUser(nextSession.user);
        setProfile(nextProfile);
        setRole(nextRole);
        setLoading(false);
      })();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      role,
      isAuthenticated: !!session?.user,
      loading,
      refresh: async () => {
        const nextState = await loadAuthState();
        setSession(nextState.session);
        setUser(nextState.user);
        setProfile(nextState.profile);
        setRole(nextState.role);
        setLoading(false);
      },
      signOut: async () => {
        const result = await signOutSupabase();
        setSession(null);
        setUser(null);
        setProfile(null);
        setRole(null);
        return result;
      },
    }),
    [loading, profile, role, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

export { AuthProvider, useAuth };
