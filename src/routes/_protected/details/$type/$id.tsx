import { createFileRoute, redirect } from "@tanstack/react-router";
import { Check, Clock, Eye, EyeOff, Plus, Share2, Star } from "lucide-react";
import { useEffect, useState } from "react";

import { ListSelectionModal } from "@/components/ListSelectionModal";
import { SeasonList } from "@/components/SeasonList";
import { DetailsSkeleton } from "@/components/skeletons";
import { logger } from "@/lib/logger";
import { tmdb } from "@/services/tmdb";
import { useStore } from "@/store/useStore";
import type { ContentDetails, Provider } from "@/types";

export const Route = createFileRoute("/_protected/details/$type/$id")({
  beforeLoad: ({ params }) => {
    if (params.type !== "movie" && params.type !== "tv") {
      throw redirect({ to: "/" });
    }
  },
  component: DetailsRouteComponent,
});

function DetailsRouteComponent() {
  const { type, id } = Route.useParams();
  const isValidType = type === "movie" || type === "tv";
  const contentType = isValidType ? type : "movie";

  const [details, setDetails] = useState<ContentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showListModal, setShowListModal] = useState(false);
  const {
    isInList,
    markAsWatched,
    markAsUnwatched,
    isWatched,
    saveSeriesMetadata,
  } = useStore();

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id || !isValidType) return;

      try {
        const data = await tmdb.getDetails(Number(id), contentType);
        setDetails(data);

        if (contentType === "tv" && data.seasons) {
          const totalRegularEpisodes = data.seasons.reduce((acc, season) => {
            if (season.season_number > 0) {
              return acc + season.episode_count;
            }
            return acc;
          }, 0);

          saveSeriesMetadata(Number(id), {
            total_episodes: totalRegularEpisodes,
            number_of_seasons: data.number_of_seasons || 0,
          });
        }
      } catch (error) {
        logger.error("Error fetching details:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchDetails();
  }, [contentType, id, isValidType, saveSeriesMetadata]);

  if (!isValidType) {
    return <div>Conteúdo não encontrado</div>;
  }

  if (loading) {
    return <DetailsSkeleton />;
  }

  if (!details) return <div>Conteúdo não encontrado</div>;

  const title =
    (details.media_type === "movie" ? details.title : details.name) || "";
  const date =
    details.media_type === "movie"
      ? details.release_date
      : details.first_air_date;
  const year = date ? new Date(date).getFullYear() : "N/A";
  const isSaved = isInList(details.id);
  const watched = isWatched(details.id);

  const handleToggleList = () => {
    setShowListModal(true);
  };

  const handleToggleWatched = () => {
    if (watched) {
      markAsUnwatched(details.id);
    } else {
      markAsWatched(details.id);
    }
  };

  const providers = details["watch/providers"]?.results?.BR;
  const flatrate = providers?.flatrate || [];
  const rent = providers?.rent || [];
  const buy = providers?.buy || [];

  return (
    <div data-testid="route-details" className="pb-10">
      <div className="relative h-[40vh] w-full md:h-[60vh]">
        <div className="absolute inset-0">
          <img
            src={tmdb.getImageUrl(details.backdrop_path || "", "original")}
            alt={title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
        </div>

        <div className="container absolute bottom-0 left-0 right-0 mx-auto flex flex-col items-end gap-6 p-4 md:flex-row">
          <img
            src={tmdb.getImageUrl(details.poster_path || "", "w300")}
            alt={title}
            className="hidden w-48 rounded-lg shadow-2xl md:block"
          />
          <div className="mb-4 flex-1">
            <h1 className="mb-2 text-3xl font-bold md:text-5xl">{title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 md:text-base">
              <span className="flex items-center gap-1 text-yellow-400">
                <Star size={16} fill="currentColor" />{" "}
                {(details.vote_average || 0).toFixed(1)}
              </span>
              <span>{year}</span>
              {details.runtime && (
                <span className="flex items-center gap-1">
                  <Clock size={16} /> {Math.floor(details.runtime / 60)}h{" "}
                  {details.runtime % 60}m
                </span>
              )}
              <div className="flex gap-2">
                {details.genres.map((g) => (
                  <span
                    key={g.id}
                    className="rounded-md bg-gray-800 px-2 py-1 text-xs"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto mt-8 px-4">
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <button
              data-testid="details-add-button"
              onClick={handleToggleList}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 font-semibold transition-colors ${
                isSaved
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-purple-600 text-white hover:bg-purple-700"
              }`}
            >
              {isSaved ? <Check size={20} /> : <Plus size={20} />}
              {isSaved ? "Salvo" : "Adicionar"}
            </button>
            <button
              data-testid="details-toggle-watched-button"
              onClick={handleToggleWatched}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 font-semibold transition-colors ${
                watched
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
            >
              {watched ? <Eye size={20} /> : <EyeOff size={20} />}
              {watched ? "Assistido" : "Marcar"}
            </button>
            <button className="flex items-center justify-center gap-2 rounded-xl bg-gray-800 py-3 font-semibold text-white transition-colors hover:bg-gray-700">
              <Share2 size={20} /> Compartilhar
            </button>
          </div>

          <section>
            <h2 className="mb-3 text-xl font-bold">Sinopse</h2>
            <p className="leading-relaxed text-gray-300">
              {details.overview || "Sinopse não disponível."}
            </p>
          </section>

          {details.media_type === "tv" && details.next_episode_to_air && (
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
                      {new Date(
                        details.next_episode_to_air.air_date,
                      ).toLocaleDateString("pt-BR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(() => {
                        const airDate = new Date(
                          details.next_episode_to_air.air_date,
                        );
                        const today = new Date();
                        const diffTime = airDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(
                          diffTime / (1000 * 60 * 60 * 24),
                        );

                        if (diffDays === 0) return "Estreia hoje!";
                        if (diffDays === 1) return "Estreia amanhã!";
                        if (diffDays > 0) return `Faltam ${diffDays} dias`;
                        return "Já disponível";
                      })()}
                    </p>
                  </div>
                </div>
                {details.next_episode_to_air.overview && (
                  <p className="text-sm leading-relaxed text-gray-300">
                    {details.next_episode_to_air.overview}
                  </p>
                )}
              </div>
            </section>
          )}

          {details.media_type === "tv" &&
            !details.next_episode_to_air &&
            details.last_episode_to_air && (
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
                    {new Date(
                      details.last_episode_to_air.air_date,
                    ).toLocaleDateString("pt-BR")}
                  </p>
                  {details.status && (
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

          {details.credits && details.credits.cast.length > 0 && (
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
                          src={tmdb.getImageUrl(actor.profile_path, "w300")}
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

          {details.seasons && (
            <SeasonList tvId={details.id} seasons={details.seasons} />
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="h-full rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-4 text-xl font-bold">Onde Assistir</h2>

            {!flatrate.length && !rent.length && !buy.length && (
              <p className="text-sm text-gray-400">
                Nenhuma informação de streaming disponível para o Brasil.
              </p>
            )}

            {flatrate.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Streaming
                </h3>
                <div className="flex flex-wrap gap-3">
                  {flatrate.map((provider) => (
                    <ProviderLogo
                      key={provider.provider_id}
                      provider={provider}
                    />
                  ))}
                </div>
              </div>
            )}

            {rent.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Alugar
                </h3>
                <div className="flex flex-wrap gap-3">
                  {rent.map((provider) => (
                    <ProviderLogo
                      key={provider.provider_id}
                      provider={provider}
                    />
                  ))}
                </div>
              </div>
            )}

            {buy.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Comprar
                </h3>
                <div className="flex flex-wrap gap-3">
                  {buy.map((provider) => (
                    <ProviderLogo
                      key={provider.provider_id}
                      provider={provider}
                    />
                  ))}
                </div>
              </div>
            )}

            {providers?.link && (
              <a
                href={providers.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 block text-center text-xs text-purple-400 hover:text-purple-300"
              >
                Ver todos no TMDB
              </a>
            )}
          </div>

          {details.media_type === "tv" && (
            <div className="h-full rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="mb-4 text-xl font-bold">Informações da Série</h2>
              <div className="space-y-3">
                {details.number_of_seasons && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Temporadas</span>
                    <span className="font-semibold text-white">
                      {details.number_of_seasons}
                    </span>
                  </div>
                )}
                {details.number_of_episodes && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Episódios</span>
                    <span className="font-semibold text-white">
                      {details.number_of_episodes}
                    </span>
                  </div>
                )}
                {details.episode_run_time &&
                  details.episode_run_time.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">
                        Duração por ep.
                      </span>
                      <span className="font-semibold text-white">
                        {details.episode_run_time[0]} min
                      </span>
                    </div>
                  )}
                {details.status && (
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
                {details.runtime && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Duração</span>
                    <span className="font-semibold text-white">
                      {Math.floor(details.runtime / 60)}h {details.runtime % 60}
                      m
                    </span>
                  </div>
                )}
                {"budget" in details &&
                  details.budget &&
                  details.budget > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Orçamento</span>
                      <span className="font-semibold text-white">
                        ${(details.budget / 1000000).toFixed(1)}M
                      </span>
                    </div>
                  )}
                {"revenue" in details &&
                  details.revenue &&
                  details.revenue > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Bilheteria</span>
                      <span className="font-semibold text-white">
                        ${(details.revenue / 1000000).toFixed(1)}M
                      </span>
                    </div>
                  )}
                {details.status && (
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

function ProviderLogo({ provider }: { provider: Provider }) {
  return (
    <div className="group relative" title={provider.provider_name}>
      <img
        src={tmdb.getImageUrl(provider.logo_path, "w300")}
        alt={provider.provider_name}
        className="h-12 w-12 rounded-lg shadow-sm transition-transform group-hover:scale-110"
      />
    </div>
  );
}
