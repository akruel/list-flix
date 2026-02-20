import { useEffect, useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Check, Clock, Eye, EyeOff, Plus, Share2, Star } from 'lucide-react'
import { ListSelectionModal } from '@/components/ListSelectionModal'
import { SeasonList } from '@/components/SeasonList'
import { DetailsSkeleton } from '@/components/skeletons'
import { useStore } from '@/store/useStore'
import { tmdb } from '@/services/tmdb'
import type { ContentDetails, Provider } from '@/types'

export const Route = createFileRoute('/_protected/details/$type/$id')({
  beforeLoad: ({ params }) => {
    if (params.type !== 'movie' && params.type !== 'tv') {
      throw redirect({ to: '/' })
    }
  },
  component: DetailsRouteComponent,
})

function DetailsRouteComponent() {
  const { type, id } = Route.useParams()
  const isValidType = type === 'movie' || type === 'tv'
  const contentType = isValidType ? type : 'movie'

  const [details, setDetails] = useState<ContentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [showListModal, setShowListModal] = useState(false)
  const {
    isInList,
    markAsWatched,
    markAsUnwatched,
    isWatched,
    saveSeriesMetadata,
  } = useStore()

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id || !isValidType) return

      try {
        const data = await tmdb.getDetails(Number(id), contentType)
        setDetails(data)

        if (contentType === 'tv' && data.seasons) {
          const totalRegularEpisodes = data.seasons.reduce((acc, season) => {
            if (season.season_number > 0) {
              return acc + season.episode_count
            }
            return acc
          }, 0)

          saveSeriesMetadata(Number(id), {
            total_episodes: totalRegularEpisodes,
            number_of_seasons: data.number_of_seasons || 0,
          })
        }
      } catch (error) {
        console.error('Error fetching details:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchDetails()
  }, [contentType, id, isValidType, saveSeriesMetadata])

  if (!isValidType) {
    return <div>Conteúdo não encontrado</div>
  }

  if (loading) {
    return <DetailsSkeleton />
  }

  if (!details) return <div>Conteúdo não encontrado</div>

  const title =
    (details.media_type === 'movie' ? details.title : details.name) || ''
  const date =
    details.media_type === 'movie' ? details.release_date : details.first_air_date
  const year = date ? new Date(date).getFullYear() : 'N/A'
  const isSaved = isInList(details.id)
  const watched = isWatched(details.id)

  const handleToggleList = () => {
    setShowListModal(true)
  }

  const handleToggleWatched = () => {
    if (watched) {
      markAsUnwatched(details.id)
    } else {
      markAsWatched(details.id)
    }
  }

  const providers = details['watch/providers']?.results?.BR
  const flatrate = providers?.flatrate || []
  const rent = providers?.rent || []
  const buy = providers?.buy || []

  return (
    <div data-testid="route-details" className="pb-10">
      <div className="relative h-[40vh] md:h-[60vh] w-full">
        <div className="absolute inset-0">
          <img
            src={tmdb.getImageUrl(details.backdrop_path || '', 'original')}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 container mx-auto flex flex-col md:flex-row gap-6 items-end">
          <img
            src={tmdb.getImageUrl(details.poster_path || '', 'w300')}
            alt={title}
            className="hidden md:block w-48 rounded-lg shadow-2xl"
          />
          <div className="flex-1 mb-4">
            <h1 className="text-3xl md:text-5xl font-bold mb-2">{title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-gray-300">
              <span className="flex items-center gap-1 text-yellow-400">
                <Star size={16} fill="currentColor" />{' '}
                {(details.vote_average || 0).toFixed(1)}
              </span>
              <span>{year}</span>
              {details.runtime && (
                <span className="flex items-center gap-1">
                  <Clock size={16} /> {Math.floor(details.runtime / 60)}h{' '}
                  {details.runtime % 60}m
                </span>
              )}
              <div className="flex gap-2">
                {details.genres.map((g) => (
                  <span
                    key={g.id}
                    className="px-2 py-1 bg-gray-800 rounded-md text-xs"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8">
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              data-testid="details-add-button"
              onClick={handleToggleList}
              className={`py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                isSaved
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isSaved ? <Check size={20} /> : <Plus size={20} />}
              {isSaved ? 'Salvo' : 'Adicionar'}
            </button>
            <button
              data-testid="details-toggle-watched-button"
              onClick={handleToggleWatched}
              className={`py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                watched
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
              }`}
            >
              {watched ? <Eye size={20} /> : <EyeOff size={20} />}
              {watched ? 'Assistido' : 'Marcar'}
            </button>
            <button className="bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
              <Share2 size={20} /> Compartilhar
            </button>
          </div>

          <section>
            <h2 className="text-xl font-bold mb-3">Sinopse</h2>
            <p className="text-gray-300 leading-relaxed">
              {details.overview || 'Sinopse não disponível.'}
            </p>
          </section>

          {details.media_type === 'tv' && details.next_episode_to_air && (
            <section className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 p-6 rounded-xl border border-purple-500/30">
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="text-purple-400">📺</span> Próximo Episódio
              </h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg text-white">
                    {details.next_episode_to_air.name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Temporada {details.next_episode_to_air.season_number} • Episódio{' '}
                    {details.next_episode_to_air.episode_number}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-purple-300">
                  <span className="text-2xl">📅</span>
                  <div>
                    <p className="font-semibold">
                      {new Date(
                        details.next_episode_to_air.air_date,
                      ).toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(() => {
                        const airDate = new Date(
                          details.next_episode_to_air.air_date,
                        )
                        const today = new Date()
                        const diffTime = airDate.getTime() - today.getTime()
                        const diffDays = Math.ceil(
                          diffTime / (1000 * 60 * 60 * 24),
                        )

                        if (diffDays === 0) return 'Estreia hoje!'
                        if (diffDays === 1) return 'Estreia amanhã!'
                        if (diffDays > 0) return `Faltam ${diffDays} dias`
                        return 'Já disponível'
                      })()}
                    </p>
                  </div>
                </div>
                {details.next_episode_to_air.overview && (
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {details.next_episode_to_air.overview}
                  </p>
                )}
              </div>
            </section>
          )}

          {details.media_type === 'tv' &&
            !details.next_episode_to_air &&
            details.last_episode_to_air && (
              <section className="bg-gray-900/50 p-6 rounded-xl border border-gray-700">
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
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
                    Exibido em{' '}
                    {new Date(
                      details.last_episode_to_air.air_date,
                    ).toLocaleDateString('pt-BR')}
                  </p>
                  {details.status && (
                    <p className="text-xs text-gray-500 mt-2">
                      Status:{' '}
                      {details.status === 'Ended'
                        ? 'Série Finalizada'
                        : details.status}
                    </p>
                  )}
                </div>
              </section>
            )}

          {details.credits && details.credits.cast.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-3">Elenco</h2>
              <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
                {details.credits.cast.slice(0, 10).map((actor) => (
                  <div key={actor.id} className="flex-shrink-0 w-24 text-center">
                    <div className="w-24 h-24 rounded-full overflow-hidden mb-2 bg-gray-800">
                      {actor.profile_path ? (
                        <img
                          src={tmdb.getImageUrl(actor.profile_path, 'w300')}
                          alt={actor.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                          Sem foto
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-medium truncate">{actor.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 h-full">
            <h2 className="text-xl font-bold mb-4">Onde Assistir</h2>

            {!flatrate.length && !rent.length && !buy.length && (
              <p className="text-gray-400 text-sm">
                Nenhuma informação de streaming disponível para o Brasil.
              </p>
            )}

            {flatrate.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                  Streaming
                </h3>
                <div className="flex flex-wrap gap-3">
                  {flatrate.map((provider) => (
                    <ProviderLogo key={provider.provider_id} provider={provider} />
                  ))}
                </div>
              </div>
            )}

            {rent.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                  Alugar
                </h3>
                <div className="flex flex-wrap gap-3">
                  {rent.map((provider) => (
                    <ProviderLogo key={provider.provider_id} provider={provider} />
                  ))}
                </div>
              </div>
            )}

            {buy.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                  Comprar
                </h3>
                <div className="flex flex-wrap gap-3">
                  {buy.map((provider) => (
                    <ProviderLogo key={provider.provider_id} provider={provider} />
                  ))}
                </div>
              </div>
            )}

            {providers?.link && (
              <a
                href={providers.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-6 text-center text-xs text-purple-400 hover:text-purple-300"
              >
                Ver todos no TMDB
              </a>
            )}
          </div>

          {details.media_type === 'tv' && (
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 h-full">
              <h2 className="text-xl font-bold mb-4">Informações da Série</h2>
              <div className="space-y-3">
                {details.number_of_seasons && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Temporadas</span>
                    <span className="font-semibold text-white">
                      {details.number_of_seasons}
                    </span>
                  </div>
                )}
                {details.number_of_episodes && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Episódios</span>
                    <span className="font-semibold text-white">
                      {details.number_of_episodes}
                    </span>
                  </div>
                )}
                {details.episode_run_time && details.episode_run_time.length > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Duração por ep.</span>
                    <span className="font-semibold text-white">
                      {details.episode_run_time[0]} min
                    </span>
                  </div>
                )}
                {details.status && (
                  <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                    <span className="text-gray-400 text-sm">Status</span>
                    <span
                      className={`font-semibold text-sm px-2 py-1 rounded ${
                        details.status === 'Returning Series'
                          ? 'bg-green-900/50 text-green-400'
                          : details.status === 'Ended'
                            ? 'bg-red-900/50 text-red-400'
                            : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {details.status === 'Returning Series'
                        ? 'Em Exibição'
                        : details.status === 'Ended'
                          ? 'Finalizada'
                          : details.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {details.media_type === 'movie' && (
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 h-full">
              <h2 className="text-xl font-bold mb-4">Informações do Filme</h2>
              <div className="space-y-3">
                {details.runtime && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Duração</span>
                    <span className="font-semibold text-white">
                      {Math.floor(details.runtime / 60)}h {details.runtime % 60}m
                    </span>
                  </div>
                )}
                {'budget' in details && details.budget && details.budget > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Orçamento</span>
                    <span className="font-semibold text-white">
                      ${(details.budget / 1000000).toFixed(1)}M
                    </span>
                  </div>
                )}
                {'revenue' in details && details.revenue && details.revenue > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Bilheteria</span>
                    <span className="font-semibold text-white">
                      ${(details.revenue / 1000000).toFixed(1)}M
                    </span>
                  </div>
                )}
                {details.status && (
                  <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                    <span className="text-gray-400 text-sm">Status</span>
                    <span className="font-semibold text-sm px-2 py-1 rounded bg-gray-800 text-gray-300">
                      {details.status === 'Released' ? 'Lançado' : details.status}
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
  )
}

function ProviderLogo({ provider }: { provider: Provider }) {
  return (
    <div className="group relative" title={provider.provider_name}>
      <img
        src={tmdb.getImageUrl(provider.logo_path, 'w300')}
        alt={provider.provider_name}
        className="w-12 h-12 rounded-lg shadow-sm group-hover:scale-110 transition-transform"
      />
    </div>
  )
}
