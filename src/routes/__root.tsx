import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from "@tanstack/react-router";
import { Toaster } from "sonner";

import { logger } from "../lib/logger";
import type { RouterContext } from "../router";

const toasterStyle = {
  background: "rgb(31 41 55)",
  border: "1px solid rgb(55 65 81)",
  color: "rgb(243 244 246)",
};

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="text-muted-foreground">
        A rota que você tentou acessar não existe.
      </p>
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Voltar para o início
      </Link>
    </div>
  );
}

function RootErrorComponent({ error }: { error: Error }) {
  logger.error("Root route error:", error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground">
      <h1 className="text-2xl font-bold">Algo deu errado</h1>
      <p className="text-muted-foreground">
        Não foi possível carregar esta tela. Tente novamente em alguns
        instantes.
      </p>
      {import.meta.env.DEV ? (
        <pre className="max-w-full overflow-auto rounded-md bg-muted px-4 py-2 text-left text-xs text-muted-foreground">
          {error.message}
        </pre>
      ) : null}
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Recarregar
      </button>
    </div>
  );
}

function RootComponent() {
  return (
    <>
      <Toaster
        position="top-center"
        expand={false}
        richColors
        closeButton
        toastOptions={{
          style: toasterStyle,
        }}
      />
      <Outlet />
    </>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: RootErrorComponent,
});
