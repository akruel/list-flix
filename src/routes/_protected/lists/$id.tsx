import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { logger } from "@/lib/logger";
import { listDetailsQuery } from "@/services/list.queries";

import { MyListScreen } from "./-screen";

export const Route = createFileRoute("/_protected/lists/$id")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(listDetailsQuery(params.id)),
  errorComponent: ListDetailsErrorComponent,
  component: MyListDetailsRouteComponent,
});

function ListDetailsErrorComponent({ error }: { error: Error }) {
  logger.error("List details route error:", error);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold text-white">
        Não foi possível carregar esta lista
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

function MyListDetailsRouteComponent() {
  const { id } = Route.useParams();
  return (
    <>
      <MyListScreen listId={id} />
      <Outlet />
    </>
  );
}
