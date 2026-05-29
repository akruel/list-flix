import { createFileRoute, redirect } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { savePostLoginTarget } from "@/lib/auth-post-login";
import { logger } from "@/lib/logger";
import { userContentQuery } from "@/services/userContent.queries";

const FullScreenLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

export const Route = createFileRoute("/_protected")({
  beforeLoad: ({ context, location }) => {
    if (context.auth.status === "none") {
      savePostLoginTarget(`${location.pathname}${window.location.search}`);
      throw redirect({ to: "/auth" });
    }
  },
  loader: ({ context }) => {
    if (context.auth.status !== "authenticated") return;
    return context.queryClient.ensureQueryData(userContentQuery());
  },
  component: ProtectedLayoutRouteComponent,
});

function ProtectedLayoutRouteComponent() {
  const { finalizePostLogin, status, user } = useAuth();
  const finalizedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      finalizedUserIdRef.current = null;
      return;
    }

    const userId = user?.id;
    if (!userId || finalizedUserIdRef.current === userId) return;

    finalizedUserIdRef.current = userId;
    void finalizePostLogin().catch((error) => {
      logger.error("finalizePostLogin failed:", error);
    });
  }, [finalizePostLogin, status, user?.id]);

  if (status !== "authenticated") {
    return <FullScreenLoader />;
  }

  return <Layout />;
}
