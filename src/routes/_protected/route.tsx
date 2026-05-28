import { createFileRoute, redirect, useLocation } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { authService } from "@/services/auth";
import { useUserContentStore } from "@/store/useUserContentStore";

const FullScreenLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

export const Route = createFileRoute("/_protected")({
  beforeLoad: ({ context, location }) => {
    if (context.auth.status === "none") {
      authService.savePostLoginTarget(
        `${location.pathname}${window.location.search}`,
      );
      throw redirect({ to: "/auth" });
    }
  },
  component: ProtectedLayoutRouteComponent,
});

function ProtectedLayoutRouteComponent() {
  const { status, user } = useAuth();
  const syncWithSupabase = useUserContentStore(
    (state) => state.syncWithSupabase,
  );
  const location = useLocation();

  const [isSessionProcessing, setIsSessionProcessing] = useState(false);
  const lastHandledUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (status === "none") {
      lastHandledUserIdRef.current = null;
    }
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const userId = user?.id;
    if (!userId) return;
    if (lastHandledUserIdRef.current === userId) return;

    let cancelled = false;

    const initializeSession = async () => {
      setIsSessionProcessing(true);

      try {
        await authService.finalizePostLogin();
        if (cancelled) return;

        await syncWithSupabase();
        if (cancelled) return;
        lastHandledUserIdRef.current = userId;
      } catch (error) {
        logger.error("Session initialization failed:", error);
      } finally {
        if (!cancelled) {
          setIsSessionProcessing(false);
        }
      }
    };

    void initializeSession();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, status, syncWithSupabase, user?.id]);

  const isProtectedBlocked =
    status === "loading" || status === "none" || isSessionProcessing;

  if (isProtectedBlocked) {
    return <FullScreenLoader />;
  }

  return <Layout />;
}
