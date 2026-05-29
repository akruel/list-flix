import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { consumePostLoginTarget } from "@/lib/auth-post-login";
import { logger } from "@/lib/logger";
import { getPostLoginDestination } from "@/lib/postLoginNavigation";

type CallbackState = "loading" | "error";

export const Route = createFileRoute("/auth_/callback")({
  component: AuthCallbackRouteComponent,
});

function AuthCallbackRouteComponent() {
  const navigate = useNavigate();
  const { finalizePostLogin, status } = useAuth();

  const [state, setState] = useState<CallbackState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectAfterLogin = useCallback(() => {
    const target = getPostLoginDestination(consumePostLoginTarget());
    navigate({ ...target, replace: true });
  }, [navigate]);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "none") {
      navigate({ to: "/auth", replace: true });
      return;
    }

    let cancelled = false;

    const finalize = async () => {
      try {
        await finalizePostLogin();
        if (cancelled) return;

        redirectAfterLogin();
      } catch (error) {
        logger.error("Auth callback finalization failed:", error);
        if (!cancelled) {
          setState("error");
          setErrorMessage("Erro ao finalizar login. Tente novamente.");
        }
      }
    };

    void finalize();

    return () => {
      cancelled = true;
    };
  }, [finalizePostLogin, navigate, redirectAfterLogin, status]);

  if (state === "error") {
    return (
      <div
        data-testid="route-auth-callback"
        className="flex min-h-screen items-center justify-center bg-background px-4"
      >
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold text-foreground">Falha no login</h1>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
          <Button onClick={() => navigate({ to: "/auth", replace: true })}>
            Voltar para autenticação
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="route-auth-callback"
      className="flex min-h-screen items-center justify-center bg-background"
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Finalizando autenticação...
        </p>
      </div>
    </div>
  );
}
