import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { MovieCard } from "@/components/MovieCard";
import { ContentGridSkeleton } from "@/components/skeletons";
import { logger } from "@/lib/logger";
import { userContentQuery } from "@/services/userContent.queries";

import { SharedLinkError, sharedListQuery } from "./-queries";

type SharedRouteSearch = {
  id?: string;
  data?: string;
};

export const Route = createFileRoute("/_protected/shared")({
  validateSearch: (search: Record<string, unknown>): SharedRouteSearch => ({
    id: typeof search.id === "string" ? search.id : undefined,
    data: typeof search.data === "string" ? search.data : undefined,
  }),
  loaderDeps: ({ search }) => ({ id: search.id, data: search.data }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(sharedListQuery(deps)),
  pendingComponent: SharedPendingComponent,
  errorComponent: SharedErrorComponent,
  component: SharedRouteComponent,
});

function SharedPendingComponent() {
  return (
    <div data-testid="route-shared">
      <h1 className="mb-6 text-3xl font-bold">Lista Compartilhada</h1>
      <ContentGridSkeleton />
    </div>
  );
}

function SharedErrorComponent({ error }: { error: Error }) {
  if (!(error instanceof SharedLinkError)) {
    logger.error("Error loading shared list:", error);
  }

  const message =
    error instanceof SharedLinkError
      ? "Link inválido ou incompleto."
      : "Erro ao carregar a lista compartilhada.";

  return (
    <div data-testid="route-shared" className="py-20 text-center text-red-400">
      <p className="text-xl">{message}</p>
    </div>
  );
}

function SharedRouteComponent() {
  const { id, data } = Route.useSearch();
  const { data: items } = useSuspenseQuery(sharedListQuery({ id, data }));
  const { data: userContent } = useQuery(userContentQuery());
  const watchedIdSet = useMemo(
    () => new Set(userContent?.watchedIds ?? []),
    [userContent?.watchedIds],
  );

  return (
    <div data-testid="route-shared">
      <h1 className="mb-6 text-3xl font-bold">Lista Compartilhada</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => {
          const seriesWatchedCount = Object.values(
            userContent?.watchedEpisodes[item.id] ?? {},
          ).filter((metadata) => metadata.season_number !== 0).length;

          return (
            <MovieCard
              key={item.id}
              item={item}
              showProgress={true}
              watched={watchedIdSet.has(item.id)}
              seriesMetadata={userContent?.seriesMetadata[item.id]}
              seriesWatchedCount={seriesWatchedCount}
            />
          );
        })}
      </div>
    </div>
  );
}
