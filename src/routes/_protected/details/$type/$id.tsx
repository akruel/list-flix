import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { DetailsActions } from "@/components/details/DetailsActions";
import { DetailsHero } from "@/components/details/DetailsHero";
import { ProvidersBar } from "@/components/details/ProvidersBar";
import { ListSelectionModal } from "@/components/ListSelectionModal";
import { SeasonList } from "@/components/SeasonList";
import { DetailsSkeleton } from "@/components/skeletons";
import { useSaveSeriesMetadata, useToggleWatched } from "@/hooks/mutations";
import { useIsInList, useIsWatched } from "@/hooks/userContent";
import { formatDateLong, getCountdownText } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { getTmdbImageUrl } from "@/lib/tmdb-images";
import { detailsQuery } from "@/services/tmdb.queries";

export const Route = createFileRoute("/_protected/details/$type/$id")({
  beforeLoad: ({ params }) => {
    if (params.type !== "movie" && params.type !== "tv") {
      throw redirect({ to: "/" });
    }
  },
  loader: ({ context, params }) => {
    const type = params.type as "movie" | "tv";
    return context.queryClient.ensureQueryData(
      detailsQuery(type, Number(params.id)),
    );
  },
  pendingComponent: DetailsSkeleton,
  errorComponent: DetailsErrorComponent,
  component: DetailsRouteComponent,
});

function DetailsErrorComponent({ error }: { error: Error }) {
  logger.error("Details route error:", error);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold text-white">
        Não foi possível carregar os detalhes
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

function DetailsRouteComponent() {
  const { type, id } = Route.useParams();
  const contentType = type as "movie" | "tv";
  const numericId = Number(id);

  const { data: details } = useSuspenseQuery(
    detailsQuery(contentType, numericId),
  );
  const [showListModal, setShowListModal] = useState(false);

  const isSaved = useIsInList(numericId);
  const watched = useIsWatched(numericId);
  const { mutate: toggleWatched } = useToggleWatched();
  const { mutate: saveSeriesMetadata } = useSaveSeriesMetadata();

  const providers = details["watch/providers"]?.results?.BR;
  const flatrate = providers?.flatrate || [];
  const rent = providers?.rent || [];
  const buy = providers?.buy || [];

  // Cache the show's episode/season counts in series_cache when the user
  // intentionally starts tracking it, so list cards can render progress
  // without refetching full details. Kept out of a render effect on purpose.
  const persistSeriesMetadata = () => {
    if (contentType !== "tv" || !details.seasons) return;
    const totalRegularEpisodes = details.seasons.reduce(
      (acc, season) =>
        season.season_number > 0 ? acc + season.episode_count : acc,
      0,
    );
    saveSeriesMetadata({
      showId: numericId,
      metadata: {
        total_episodes: totalRegularEpisodes,
        number_of_seasons: details.number_of_seasons || 0,
      },
    });
  };

  const handleToggleList = () => {
    persistSeriesMetadata();
    setShowListModal(true);
  };

  const handleToggleWatched = () => {
    persistSeriesMetadata();
    toggleWatched({
      id: details.id,
      mediaType: details.media_type,
      action: watched ? "unwatch" : "watch",
    });
  };

  return (
    <div data-testid="route-details" className="pb-10">
      <DetailsHero details={details} />

      <div className="container mx-auto mt-8 px-4">
        <div className="space-y-8">
          <DetailsActions
            isSaved={isSaved}
            watched={watched}
            showWatched={contentType === "movie"}
            onToggleList={handleToggleList}
            onToggleWatched={handleToggleWatched}
          />

          <section>
            <h2 className="mb-3 text-xl font-bold">Sinopse</h2>
            <p className="leading-relaxed text-gray-300">
              {details.overview || "Sinopse não disponível."}
            </p>
          </section>

          {!!(details.media_type === "tv" && details.next_episode_to_air) && (
            <section className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-900/30 to-blue-900/30 p-6">
              <h2 className="mb-3 flex items-center gap-2 text-xl font-bold">
                <span className="text-purple-400">📺</span> Próximo Episódio
              </h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {details.next_episode_to_air.name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Temporada {details.next_episode_to_air.season_number} •
                    Episódio {details.next_episode_to_air.episode_number}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-purple-300">
                  <span className="text-2xl">📅</span>
                  <div>
                    <p className="font-semibold">
                      {formatDateLong(details.next_episode_to_air.air_date)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {getCountdownText(details.next_episode_to_air.air_date)}
                    </p>
                  </div>
                </div>
                {!!details.next_episode_to_air.overview && (
                  <p className="text-sm leading-relaxed text-gray-300">
                    {details.next_episode_to_air.overview}
                  </p>
                )}
              </div>
            </section>
          )}

          {!!(
            details.media_type === "tv" &&
            !details.next_episode_to_air &&
            details.last_episode_to_air
          ) && (
            <section className="rounded-xl border border-gray-700 bg-gray-900/50 p-6">
              <h2 className="mb-3 flex items-center gap-2 text-xl font-bold">
                <span className="text-gray-400">📺</span> Último Episódio
              </h2>
              <div className="space-y-2">
                <div>
                  <h3 className="font-semibold text-white">
                    {details.last_episode_to_air.name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Temporada {details.last_episode_to_air.season_number} •
                    Episódio {details.last_episode_to_air.episode_number}
                  </p>
                </div>
                <p className="text-sm text-gray-400">
                  Exibido em{" "}
                  {formatDateLong(details.last_episode_to_air.air_date)}
                </p>
                {!!details.status && (
                  <p className="mt-2 text-xs text-gray-500">
                    Status:{" "}
                    {details.status === "Ended"
                      ? "Série Finalizada"
                      : details.status}
                  </p>
                )}
              </div>
            </section>
          )}

          {!!(details.credits && details.credits.cast.length > 0) && (
            <section>
              <h2 className="mb-3 text-xl font-bold">Elenco</h2>
              <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-4">
                {details.credits.cast.slice(0, 10).map((actor) => (
                  <div
                    key={actor.id}
                    className="w-24 flex-shrink-0 text-center"
                  >
                    <div className="mb-2 h-24 w-24 overflow-hidden rounded-full bg-gray-800">
                      {actor.profile_path ? (
                        <img
                          src={getTmdbImageUrl(actor.profile_path, "w300")}
                          alt={actor.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                          Sem foto
                        </div>
                      )}
                    </div>
                    <p className="truncate text-xs font-medium">{actor.name}</p>
                    <p className="truncate text-[10px] text-gray-400">
                      {actor.character}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!!details.seasons && (
            <SeasonList tvId={details.id} seasons={details.seasons} />
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <ProvidersBar
            flatrate={flatrate}
            rent={rent}
            buy={buy}
            link={providers?.link}
          />

          {details.media_type === "tv" && (
            <div className="h-full rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="mb-4 text-xl font-bold">Informações da Série</h2>
              <div className="space-y-3">
                {!!details.number_of_seasons && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Temporadas</span>
                    <span className="font-semibold text-white">
                      {details.number_of_seasons}
                    </span>
                  </div>
                )}
                {!!details.number_of_episodes && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Episódios</span>
                    <span className="font-semibold text-white">
                      {details.number_of_episodes}
                    </span>
                  </div>
                )}
                {!!(
                  details.episode_run_time &&
                  details.episode_run_time.length > 0
                ) && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">
                      Duração por ep.
                    </span>
                    <span className="font-semibold text-white">
                      {details.episode_run_time[0]} min
                    </span>
                  </div>
                )}
                {!!details.status && (
                  <div className="flex items-center justify-between border-t border-gray-800 pt-2">
                    <span className="text-sm text-gray-400">Status</span>
                    <span
                      className={`rounded px-2 py-1 text-sm font-semibold ${
                        details.status === "Returning Series"
                          ? "bg-green-900/50 text-green-400"
                          : details.status === "Ended"
                            ? "bg-red-900/50 text-red-400"
                            : "bg-gray-800 text-gray-300"
                      }`}
                    >
                      {details.status === "Returning Series"
                        ? "Em Exibição"
                        : details.status === "Ended"
                          ? "Finalizada"
                          : details.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {details.media_type === "movie" && (
            <div className="h-full rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="mb-4 text-xl font-bold">Informações do Filme</h2>
              <div className="space-y-3">
                {!!details.runtime && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Duração</span>
                    <span className="font-semibold text-white">
                      {Math.floor(details.runtime / 60)}h {details.runtime % 60}
                      m
                    </span>
                  </div>
                )}
                {!!(
                  "budget" in details &&
                  details.budget &&
                  details.budget > 0
                ) && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Orçamento</span>
                    <span className="font-semibold text-white">
                      ${(details.budget / 1000000).toFixed(1)}M
                    </span>
                  </div>
                )}
                {!!(
                  "revenue" in details &&
                  details.revenue &&
                  details.revenue > 0
                ) && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Bilheteria</span>
                    <span className="font-semibold text-white">
                      ${(details.revenue / 1000000).toFixed(1)}M
                    </span>
                  </div>
                )}
                {!!details.status && (
                  <div className="flex items-center justify-between border-t border-gray-800 pt-2">
                    <span className="text-sm text-gray-400">Status</span>
                    <span className="rounded bg-gray-800 px-2 py-1 text-sm font-semibold text-gray-300">
                      {details.status === "Released"
                        ? "Lançado"
                        : details.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ListSelectionModal
        isOpen={showListModal}
        onClose={() => setShowListModal(false)}
        content={details}
      />
    </div>
  );
}
