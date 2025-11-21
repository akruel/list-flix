import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { tmdb } from '../services/tmdb';
import type { ContentDetails, Provider } from '../types';
import { Loader2, Star, Clock, Check, Plus, Share2, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store/useStore';

export const Details: React.FC = () => {
  const { type, id } = useParams<{ type: 'movie' | 'tv'; id: string }>();
  const [details, setDetails] = useState<ContentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToList, removeFromList, isInList, markAsWatched, markAsUnwatched, isWatched } = useStore();

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id || !type) return;
      try {
        const data = await tmdb.getDetails(Number(id), type);
        setDetails(data);
      } catch (error) {
        console.error('Error fetching details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, type]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="animate-spin text-purple-500" size={48} />
      </div>
    );
  }

  if (!details) return <div>Conteúdo não encontrado</div>;

  const title = details.media_type === 'movie' ? details.title : details.name;
  const date = details.media_type === 'movie' ? details.release_date : details.first_air_date;
  const year = date ? new Date(date).getFullYear() : 'N/A';
  const isSaved = isInList(details.id);
  const watched = isWatched(details.id);

  const handleToggleList = () => {
    if (isSaved) {
      removeFromList(details.id);
    } else {
      // Force media_type from URL param to ensure it's saved correctly
      addToList(details);
    }
  };

  const handleToggleWatched = () => {
    if (watched) {
      markAsUnwatched(details.id);
    } else {
      markAsWatched(details.id);
    }
  };
  
  // Get providers for Brazil (BR)
  const providers = details['watch/providers']?.results?.BR;
  const flatrate = providers?.flatrate || [];
  const rent = providers?.rent || [];
  const buy = providers?.buy || [];

  return (
    <div className="pb-10">
      {/* Hero Section */}
      <div className="relative h-[40vh] md:h-[60vh] w-full">
        <div className="absolute inset-0">
          <img 
            src={tmdb.getImageUrl(details.backdrop_path, 'original')} 
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 container mx-auto flex flex-col md:flex-row gap-6 items-end">
          <img 
            src={tmdb.getImageUrl(details.poster_path, 'w300')} 
            alt={title}
            className="hidden md:block w-48 rounded-lg shadow-2xl"
          />
          <div className="flex-1 mb-4">
            <h1 className="text-3xl md:text-5xl font-bold mb-2">{title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-gray-300">
              <span className="flex items-center gap-1 text-yellow-400">
                <Star size={16} fill="currentColor" /> {details.vote_average.toFixed(1)}
              </span>
              <span>{year}</span>
              {details.runtime && (
                <span className="flex items-center gap-1">
                  <Clock size={16} /> {Math.floor(details.runtime / 60)}h {details.runtime % 60}m
                </span>
              )}
              <div className="flex gap-2">
                {details.genres.map(g => (
                  <span key={g.id} className="px-2 py-1 bg-gray-800 rounded-md text-xs">{g.name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8 grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <button 
              onClick={handleToggleList}
              className={`py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                isSaved 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isSaved ? <Check size={20} /> : <Plus size={20} />} 
              {isSaved ? 'Na Lista' : 'Adicionar'}
            </button>
            <button 
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
            <button className="bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors col-span-2 md:col-span-1">
              <Share2 size={20} /> Compartilhar
            </button>
          </div>

          {/* Overview */}
          <section>
            <h2 className="text-xl font-bold mb-3">Sinopse</h2>
            <p className="text-gray-300 leading-relaxed">{details.overview || "Sinopse não disponível."}</p>
          </section>

          {/* Cast */}
          {details.credits && details.credits.cast.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-3">Elenco</h2>
              <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
                {details.credits.cast.slice(0, 10).map(actor => (
                  <div key={actor.id} className="flex-shrink-0 w-24 text-center">
                    <div className="w-24 h-24 rounded-full overflow-hidden mb-2 bg-gray-800">
                      {actor.profile_path ? (
                        <img 
                          src={tmdb.getImageUrl(actor.profile_path, 'w300')} 
                          alt={actor.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">Sem foto</div>
                      )}
                    </div>
                    <p className="text-xs font-medium truncate">{actor.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{actor.character}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar: Where to Watch */}
        <div className="space-y-6">
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <h2 className="text-xl font-bold mb-4">Onde Assistir</h2>
            
            {!flatrate.length && !rent.length && !buy.length && (
              <p className="text-gray-400 text-sm">Nenhuma informação de streaming disponível para o Brasil.</p>
            )}

            {flatrate.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Streaming</h3>
                <div className="flex flex-wrap gap-3">
                  {flatrate.map(provider => (
                    <ProviderLogo key={provider.provider_id} provider={provider} />
                  ))}
                </div>
              </div>
            )}

            {rent.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Alugar</h3>
                <div className="flex flex-wrap gap-3">
                  {rent.map(provider => (
                    <ProviderLogo key={provider.provider_id} provider={provider} />
                  ))}
                </div>
              </div>
            )}
            
            {buy.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Comprar</h3>
                <div className="flex flex-wrap gap-3">
                  {buy.map(provider => (
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
        </div>
      </div>
    </div>
  );
};

const ProviderLogo: React.FC<{ provider: Provider }> = ({ provider }) => (
  <div className="group relative" title={provider.provider_name}>
    <img 
      src={tmdb.getImageUrl(provider.logo_path, 'w300')} 
      alt={provider.provider_name}
      className="w-12 h-12 rounded-lg shadow-sm group-hover:scale-110 transition-transform"
    />
  </div>
);
