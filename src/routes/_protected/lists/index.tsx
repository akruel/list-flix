import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { listsQuery } from "@/services/list.queries";

import { MyListScreen } from "./-screen";

const listsSearchSchema = z.object({
  tab: z.enum(["watchlist", "custom"]).optional(),
});

export const Route = createFileRoute("/_protected/lists/")({
  validateSearch: listsSearchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(listsQuery()),
  errorComponent: ListsErrorComponent,
  component: MyListsIndexRouteComponent,
});

function ListsErrorComponent({ error }: { error: Error }) {
  logger.error("Lists route error:", error);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold text-white">
        Não foi possível carregar suas listas
      </h1>
      <p className="text-gray-400">Verifique sua conexão e tente novamente.</p>
      {import.meta.env.DEV ? (
        <pre className="max-w-full overflow-auto rounded-md bg-gray-900 px-4 py-2 text-left text-xs text-gray-400">
          {error.message}
        </pre>
      ) : null}
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
      >
        Voltar para o início
      </Link>
    </div>
  );
}

function MyListsIndexRouteComponent() {
  const { tab } = Route.useSearch();
  return <MyListScreen initialTab={tab} />;
}
