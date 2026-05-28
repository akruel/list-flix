import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useJoinList } from "@/hooks/mutations";
import { logger } from "@/lib/logger";
import { authService } from "@/services/auth";
import { listNameQuery } from "@/services/list.queries";

const joinSearchSchema = z.object({
  role: z.enum(["editor", "viewer"]).catch("viewer"),
});

const userProfileQueryKey = ["auth", "userProfile"] as const;

export const Route = createFileRoute("/_protected/lists/$id/join")({
  validateSearch: joinSearchSchema,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(listNameQuery(params.id)),
  errorComponent: JoinListErrorComponent,
  component: JoinListRouteComponent,
});

function JoinListErrorComponent({ error }: { error: Error }) {
  logger.error("Join list route error:", error);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold text-white">
        Não foi possível carregar os detalhes da lista
      </h1>
      <p className="text-gray-400">Verifique sua conexão e tente novamente.</p>
      {import.meta.env.DEV ? (
        <pre className="max-w-full overflow-auto rounded-md bg-gray-900 px-4 py-2 text-left text-xs text-gray-400">
          {error.message}
        </pre>
      ) : null}
      <Link
        to="/lists"
        search={{ tab: "custom" }}
        className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
      >
        Voltar para minhas listas
      </Link>
    </div>
  );
}

type JoinPhase = "idle" | "forceInput" | "joining" | "success" | "error";

function JoinListRouteComponent() {
  const { id } = Route.useParams();
  const { role } = Route.useSearch();
  const navigate = useNavigate();
  const joinList = useJoinList();
  const joinSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const listNameResult = useQuery(listNameQuery(id));
  const profileResult = useQuery({
    queryKey: userProfileQueryKey,
    queryFn: () => authService.getUserProfile(),
    retry: false,
  });

  const [memberNameOverride, setMemberNameOverride] = useState<string | null>(
    null,
  );
  const [joinPhase, setJoinPhase] = useState<JoinPhase>("idle");
  const [submitError, setSubmitError] = useState<string>("");

  useEffect(() => {
    return () => {
      if (joinSuccessTimeoutRef.current) {
        clearTimeout(joinSuccessTimeoutRef.current);
        joinSuccessTimeoutRef.current = null;
      }
    };
  }, []);

  const listName = listNameResult.data ?? "";
  const profileDisplayName = profileResult.data?.displayName ?? "";
  const memberName = memberNameOverride ?? profileDisplayName;
  const queriesLoading = listNameResult.isLoading || profileResult.isLoading;
  const queriesErrored = listNameResult.isError || profileResult.isError;

  const status:
    | "loading"
    | "input"
    | "confirm"
    | "joining"
    | "success"
    | "error" =
    joinPhase === "joining"
      ? "joining"
      : joinPhase === "success"
        ? "success"
        : joinPhase === "error" || queriesErrored
          ? "error"
          : queriesLoading
            ? "loading"
            : joinPhase === "forceInput" || !profileDisplayName
              ? "input"
              : "confirm";

  const errorMessage =
    submitError ||
    (queriesErrored ? "Não foi possível carregar os detalhes da lista." : "");

  const isBlockingClose = status === "joining" || status === "success";

  const closeToLists = () => {
    navigate({ to: "/lists", search: { tab: "custom" } });
  };

  const handleJoinSubmit = async () => {
    if (!memberName.trim()) return;

    setSubmitError("");
    setJoinPhase("joining");
    try {
      await joinList.mutateAsync({ listId: id, memberName, role });
      setJoinPhase("success");
      joinSuccessTimeoutRef.current = setTimeout(() => {
        navigate({ to: "/lists/$id", params: { id } });
      }, 1500);
    } catch (err) {
      logger.error(err);
      setSubmitError("Não foi possível entrar na lista.");
      setJoinPhase("error");
    }
  };

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    void handleJoinSubmit();
  };

  const handleDialogChange = (open: boolean) => {
    if (!open && !isBlockingClose) {
      closeToLists();
    }
  };

  const roleBadgeClassName =
    role === "editor"
      ? "bg-purple-600/20 text-purple-400 border border-purple-500/50"
      : "bg-blue-600/20 text-blue-400 border border-blue-500/50";

  const roleDescription =
    role === "editor"
      ? "Você poderá adicionar e remover itens desta lista."
      : "Você terá acesso somente para visualizar esta lista.";

  const roleLabel = role === "editor" ? "✏️ Editor" : "👁️ Visualizador";

  return (
    <Dialog open={true} onOpenChange={handleDialogChange}>
      <DialogContent
        data-testid="route-list-join"
        className="w-full max-w-md bg-card text-card-foreground"
        hideClose={isBlockingClose}
        onEscapeKeyDown={(event) => {
          if (isBlockingClose) {
            event.preventDefault();
          }
        }}
        onPointerDownOutside={(event) => {
          if (isBlockingClose) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle>Entrar na lista</DialogTitle>
          <DialogDescription>
            Você foi convidado para participar da lista{" "}
            <span className="font-semibold text-foreground">
              {listName || "..."}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        {status === "loading" && (
          <div className="py-6 text-center">
            <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Carregando detalhes da lista...
            </p>
          </div>
        )}

        {status === "input" && (
          <>
            <div className="text-center">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${roleBadgeClassName}`}
              >
                {roleLabel}
              </span>
              <p className="mt-2 text-xs text-muted-foreground">
                {roleDescription}
              </p>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="join-member-name"
                  className="text-sm font-medium"
                >
                  Seu nome
                </label>
                <Input
                  id="join-member-name"
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberNameOverride(e.target.value)}
                  placeholder="Digite seu nome"
                  required
                />
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={closeToLists}>
                  Cancelar
                </Button>
                <Button type="submit">Entrar na lista</Button>
              </DialogFooter>
            </form>
          </>
        )}

        {status === "confirm" && (
          <div className="text-center">
            <p className="mb-5 text-muted-foreground">
              Entrando na lista{" "}
              <span className="font-semibold text-foreground">{listName}</span>{" "}
              como{" "}
              <span className="font-semibold text-primary">{memberName}</span>
            </p>

            <div className="mb-6 text-center">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${roleBadgeClassName}`}
              >
                {roleLabel}
              </span>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={closeToLists}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void handleJoinSubmit();
                }}
              >
                Confirmar entrada
              </Button>
            </DialogFooter>
            <Button
              type="button"
              variant="link"
              onClick={() => setJoinPhase("forceInput")}
              className="mt-2"
            >
              Entrar com outro nome
            </Button>
          </div>
        )}

        {status === "joining" && (
          <div className="py-6 text-center">
            <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-primary" />
            <p className="text-base font-medium">Entrando na lista...</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Aguarde enquanto confirmamos seu acesso.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="py-6 text-center">
            <div className="mb-3 text-5xl text-green-500">✓</div>
            <p className="text-base font-medium">
              Você entrou na lista com sucesso.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Redirecionando...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="py-4 text-center">
            <div className="mb-3 text-5xl text-red-500">✕</div>
            <p className="mb-2 text-base font-medium">Algo deu errado</p>
            <p className="mb-5 text-sm text-muted-foreground">{errorMessage}</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeToLists}>
                Voltar para minhas listas
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
