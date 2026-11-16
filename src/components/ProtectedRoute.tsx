import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { AccountBlockedScreen } from "@/features/auth/components/AccountBlockedScreen";
import { TrialExpiredScreen } from "@/features/auth/components/TrialExpiredScreen";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading, signOut, isTrialExpired, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (profile?.blocked && !isSuperAdmin) {
    return <AccountBlockedScreen onSignOut={signOut} />;
  }

  // Allow access to specific paths even if trial expired
  const allowedPaths = ["/planos", "/perfil", "/payment-success"];
  const isAllowedPath = allowedPaths.some(p => location.pathname.startsWith(p));

  if (isTrialExpired && !isAllowedPath) {
    return <TrialExpiredScreen onSignOut={signOut} />;
  }

  return <>{children}</>;
}

