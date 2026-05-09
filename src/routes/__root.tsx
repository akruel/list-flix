import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from "@tanstack/react-router";
import { Toaster } from "sonner";

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
});
