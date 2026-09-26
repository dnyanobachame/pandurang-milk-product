'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { AppRole } from '@/lib/roles';

export type AuthProfile = {
  id: string;
  full_name: string;
  role: AppRole;
  is_active: boolean;
  avatar_url: string | null;
};

type AuthContextValue = {
  user: User | null;
  profile: AuthProfile | null;
  /** true only while we don't yet know the initial auth state */
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Single source of truth for client-side auth state. Mount this once,
 * near the root of the app (see app/providers.tsx) — everything that
 * needs to know "who is logged in right now" (Header, dashboards, etc.)
 * should read it via useAuth() rather than creating its own Supabase
 * client or its own onAuthStateChange listener.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // One browser client for the lifetime of the app — not one per
  // component. createClient() itself is cheap to call, but we still
  // only want a single realtime/auth subscription.
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Guards against a slow profile fetch resolving after a newer one
  // (or a sign-out) has already started, which would otherwise stomp
  // the correct state with stale data.
  const fetchId = useRef(0);

  async function loadProfile(userId: string) {
    const thisFetch = ++fetchId.current;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, is_active, avatar_url')
      .eq('id', userId)
      .single();

    if (thisFetch !== fetchId.current) return; // superseded, ignore

    if (error || !data) {
      setProfile(null);
      return;
    }

    setProfile(data as AuthProfile);

    // If an admin deactivates this account while the tab is open, drop
    // the session immediately rather than leaving a stale "logged in"
    // header up — middleware will also catch this on next navigation,
    // but this makes it instant.
    if (data.is_active === false) {
      await supabase.auth.signOut();
    }
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id).finally(() => active && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      if (event === 'SIGNED_OUT' || !session?.user) {
        fetchId.current++; // invalidate any in-flight profile fetch
        setProfile(null);
        setLoading(false);
        return;
      }

      // SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED, INITIAL_SESSION, etc.
      // all mean "there is a current user — make sure profile is fresh".
      loadProfile(session.user.id).finally(() => setLoading(false));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  const value = useMemo(
    () => ({ user, profile, loading, signOut }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
