import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  plan: "free" | "standard" | "pro" | "proplus";
  status: "active" | "suspended" | "banned";
  messages_used: number;
  storage_used_bytes: number;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isPro: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  profile: null,
  isAdmin: false,
  isPro: false,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

const FOUNDER_EMAIL = "athulkrishna456727@gmail.com";

function displayNameFrom(user: User | null, profile: Profile | null): string {
  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const fromMeta =
    (typeof meta?.display_name === "string" && meta.display_name) ||
    (typeof meta?.full_name === "string" && meta.full_name) ||
    (typeof meta?.name === "string" && meta.name) ||
    "";
  return profile?.display_name || fromMeta || user?.email?.split("@")[0] || "";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadUserData(uid: string, authUser: User | null = user) {
    const [{ data: p, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    if (profileError || rolesError) {
      console.warn("Failed to load Metrixcom user data", profileError ?? rolesError);
    }
    const nextProfile = (p as Profile) ?? null;
    const email = (nextProfile?.email || authUser?.email || "").toLowerCase();
    const hasAdminRole = Array.isArray(roles)
      && (roles as { role: string }[]).some((r) => r.role === "admin");
    // Founder always admin; other users become admin when granted the role
    // from Admin Panel → Overrides.
    const nextIsAdmin = email === FOUNDER_EMAIL || hasAdminRole;
    setProfile(nextProfile);
    setIsAdmin(nextIsAdmin);

  }

  async function refreshProfile() {
    if (user?.id) await loadUserData(user.id, user);
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setLoading(true);
        setTimeout(() => {
          loadUserData(s.user.id, s.user).finally(() => setLoading(false));
        }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadUserData(data.session.user.id, data.session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Live-sync the profile row (plan/status changes made by an admin show up
  // in the user's own session immediately).
  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    const ch = supabase
      .channel(`profile-${uid}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${uid}` },
        (payload) => {
          const row = payload.new as Profile;
          setProfile((prev) => ({ ...(prev ?? row), ...row }));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);


  const queryClient = useQueryClient();
  async function signOut() {
    try {
      await queryClient.cancelQueries();
    } catch { /* ignore */ }
    queryClient.clear();
    await supabase.auth.signOut({ scope: "global" });
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    try {
      // Best-effort: wipe any local caches so back button can't restore state
      Object.keys(localStorage)
        .filter((k) => k.startsWith("arch:") || k.startsWith("sb-"))
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
  }

  const isPro = !!profile && (profile.plan === "pro" || profile.plan === "proplus" || profile.plan === "standard");

  return (
    <Ctx.Provider
      value={{ user, session, profile, isAdmin, isPro, loading, refreshProfile, signOut }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
