import { useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext, type AuthContextType, type PlanType, type Profile } from "./AuthContext";
import { isFullAccessEmail } from "@/core/fullAccess";
import { AuthService } from "@/services/auth/auth.service";
import { checkAdminStatus, syncSubscriptionPlan } from "@/features/auth/services/auth-queries";

const TRIAL_DAYS = 7;

const asFullAccessProfile = (profile: Profile): Profile => ({
  ...profile,
  plan: "lifetime",
  blocked: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const currentUserId = useRef<string | null>(null);
  const switchAccount = useCallback((nextId: string | null) => {
    if (currentUserId.current === nextId) return;
    currentUserId.current = nextId;
    queryClient.clear(); // inclui consultas privadas sem userId na queryKey
    if (nextId) setLoading(true);
    setProfile(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    setUserRole("user");
  }, [queryClient]);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string>("user");

  const fetchProfile = useCallback(async (userId: string, email?: string | null) => {
    try {
      const data = await AuthService.getProfile(userId);
      if (data && currentUserId.current === userId) {
        setProfile(
          isFullAccessEmail(email)
            ? asFullAccessProfile(data as Profile)
            : (data as Profile)
        );
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  }, []);

  const checkAdmin = useCallback(async (userId: string, email?: string | null) => {
    if (isFullAccessEmail(email)) {
      if (currentUserId.current !== userId) return;
      setIsAdmin(true);
      setIsSuperAdmin(true);
      setUserRole("super_admin");
      return;
    }

    try {
      const { isAdmin: admin, isSuperAdmin: superAdmin, roles } = await checkAdminStatus(userId);
      if (currentUserId.current !== userId) return;
      setIsAdmin(admin);
      setIsSuperAdmin(superAdmin);
      setUserRole(superAdmin ? "super_admin" : admin ? "admin" : roles[0] || "user");
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  }, []);

  const syncSubscription = useCallback(async (accessToken: string, userId: string) => {
    try {
      const data = await syncSubscriptionPlan(accessToken);
      if (data?.plan) {
        setProfile((prev) => {
          if (!prev || currentUserId.current !== userId || prev.id !== userId) return prev;
          return isFullAccessEmail(prev.email)
            ? asFullAccessProfile(prev)
            : { ...prev, plan: data.plan as PlanType };
        });
      }
    } catch (e) {
      console.error("Error checking subscription:", e);
    }
  }, []);

  const loadUserData = useCallback(async (userId: string, accessToken?: string, email?: string | null) => {
    // Carrega dados essenciais primeiro
    await Promise.all([
      fetchProfile(userId, email),
      checkAdmin(userId, email),
    ]);
    
    // Carrega subscrição em background para não travar o login
    if (accessToken) {
      syncSubscription(accessToken, userId).catch(err => 
        console.error("[Auth] Background subscription sync failed:", err)
      );
    }
  }, [fetchProfile, checkAdmin, syncSubscription]);

  useEffect(() => {
    const authStorageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
    let mounted = true;

    // console.log("[Auth] Effect starting...");

    const initAuth = async () => {
      try {
        // Step 1: Subscribe to changes immediately
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, nextSession) => {
            if (!mounted) return;
            
            const hasUser = !!nextSession?.user;
            switchAccount(nextSession?.user?.id ?? null);
            setSession(nextSession);
            
            if (hasUser) {
              // Only block loading for essential data
              loadUserData(nextSession.user!.id, nextSession!.access_token, nextSession!.user.email)
                .finally(() => {
                  if (mounted && currentUserId.current === nextSession!.user.id) setLoading(false);
                });
            } else {
              setProfile(null);
              setIsAdmin(false);
              setIsSuperAdmin(false);
              setUserRole("user");
              setLoading(false);
            }
          }
        );

        // Step 2: Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (mounted) {
          if (error) {
            console.error("[Auth] Session error:", error);
            if (error.message.includes("refresh_token") || error.message.includes("invalid")) {
              localStorage.removeItem(authStorageKey);
            }
            setLoading(false);
          } else if (initialSession?.user) {
            switchAccount(initialSession.user.id);
            setSession(initialSession);
            // Non-blocking load
            loadUserData(initialSession.user.id, initialSession.access_token, initialSession.user.email)
              .finally(() => {
                if (mounted) setLoading(false);
              });
          } else {
            setLoading(false);
          }
        }

        return subscription;
      } catch (err) {
        console.error("[Auth] Init crash:", err);
        if (mounted) setLoading(false);
        return null;
      }
    };

    const subPromise = initAuth();

    // Final safety timeout (redundant but safe)
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false);
      }
    }, 6000);

    return () => {
      mounted = false;
      subPromise.then(sub => sub?.unsubscribe());
      clearTimeout(timeout);
    };
  }, [loadUserData, switchAccount]);

  const signOut = async () => {
    await AuthService.signOut();
    switchAccount(null);
    setSession(null);
    setProfile(null);
  };

  const trialDaysLeft = (() => {
    if (!profile?.created_at || profile.plan !== "free") return TRIAL_DAYS;
    const created = new Date(profile.created_at).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    return Math.max(0, TRIAL_DAYS - elapsed);
  })();

  const isTrialExpired =
    !isFullAccessEmail(session?.user.email) &&
    !isAdmin &&
    !isSuperAdmin &&
    profile?.plan === "free" &&
    trialDaysLeft <= 0;

  const value: AuthContextType = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isAdmin,
    isSuperAdmin,
    userRole,
    isTrialExpired,
    trialDaysLeft,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


