import { supabase } from '../lib/supabase';
import type { ContentItem, WatchedEpisodeMetadata, SeriesMetadata, Episode } from '../types';

export type InteractionType = 'watchlist' | 'watched';
export type ContentType = 'movie' | 'tv' | 'episode';


export const userContentService = {
  async syncLocalData(
    localList: ContentItem[], 
    localWatchedIds: number[],
    localWatchedEpisodes: Record<number, Record<number, WatchedEpisodeMetadata>> = {}
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Get existing data to avoid duplicates
    const [
      { data: watchlistData },
      { data: watchedMoviesData },
      { data: watchedEpisodesData }
    ] = await Promise.all([
      supabase.from('watchlists').select('tmdb_id'),
      supabase.from('watched_movies').select('tmdb_id'),
      supabase.from('watched_episodes').select('tmdb_episode_id')
    ]);

    const existingWatchlist = new Set(watchlistData?.map(i => i.tmdb_id));
    const existingWatchedMovies = new Set(watchedMoviesData?.map(i => i.tmdb_id));
    const existingWatchedEpisodes = new Set(watchedEpisodesData?.map(i => i.tmdb_episode_id));

    const watchlistUpdates = [];
    const watchedMoviesUpdates = [];
    const watchedEpisodesUpdates = [];

    // 2. Prepare watchlist inserts
    for (const item of localList) {
      if (!existingWatchlist.has(item.id)) {
        watchlistUpdates.push({
          user_id: user.id,
          tmdb_id: item.id,
          media_type: item.media_type
        });
      }
    }

    // 3. Prepare watched movies inserts
    for (const id of localWatchedIds) {
      if (!existingWatchedMovies.has(id)) {
        watchedMoviesUpdates.push({
          user_id: user.id,
          tmdb_id: id
        });
      }
    }

    // 4. Prepare watched episodes inserts
    for (const [showId, episodesMap] of Object.entries(localWatchedEpisodes)) {
      for (const [episodeId, metadata] of Object.entries(episodesMap)) {
        if (!existingWatchedEpisodes.has(Number(episodeId))) {
          watchedEpisodesUpdates.push({
            user_id: user.id,
            tmdb_episode_id: Number(episodeId),
            tmdb_show_id: Number(showId),
            season_number: metadata.season_number,
            episode_number: metadata.episode_number
          });
        }
      }
    }

    // Execute updates in parallel
    const promises = [];
    if (watchlistUpdates.length > 0) {
      promises.push(supabase.from('watchlists').insert(watchlistUpdates));
    }
    if (watchedMoviesUpdates.length > 0) {
      promises.push(supabase.from('watched_movies').insert(watchedMoviesUpdates));
    }
    if (watchedEpisodesUpdates.length > 0) {
      promises.push(supabase.from('watched_episodes').insert(watchedEpisodesUpdates));
    }

    if (promises.length > 0) {
      const results = await Promise.all(promises);
      results.forEach(({ error }) => {
        if (error) console.error('Error syncing data:', error);
      });
    }
  },

  async getUserContent() {
    const [
      { data: watchlistData, error: watchlistError },
      { data: watchedMoviesData, error: watchedMoviesError },
      { data: watchedEpisodesData, error: watchedEpisodesError },
      { data: seriesCacheData, error: seriesCacheError }
    ] = await Promise.all([
      supabase.from('watchlists').select('*'),
      supabase.from('watched_movies').select('*'),
      supabase.from('watched_episodes').select('*'),
      supabase.from('series_cache').select('*')
    ]);

    if (watchlistError || watchedMoviesError || watchedEpisodesError || seriesCacheError) {
      console.error('Error fetching user content:', { watchlistError, watchedMoviesError, watchedEpisodesError, seriesCacheError });
      return { watchlist: [], watchedIds: [], watchedEpisodes: {}, seriesMetadata: {} };
    }

    // Transform Watchlist
    const watchlist: ContentItem[] = (watchlistData || []).map(i => ({
      id: i.tmdb_id,
      media_type: i.media_type as 'movie' | 'tv',
      title: '', // Placeholder
      name: '', 
      poster_path: '', 
      vote_average: 0, 
      overview: '', 
      release_date: '', 
      first_air_date: '', 
    }));

    const watchedIds = (watchedMoviesData || []).map(i => i.tmdb_id);

    const watchedEpisodes: Record<number, Record<number, WatchedEpisodeMetadata>> = {};
    
    (watchedEpisodesData || []).forEach(i => {
      if (!watchedEpisodes[i.tmdb_show_id]) {
        watchedEpisodes[i.tmdb_show_id] = {};
      }
      watchedEpisodes[i.tmdb_show_id][i.tmdb_episode_id] = {
        season_number: i.season_number,
        episode_number: i.episode_number
      };
    });

    const seriesMetadata: Record<number, SeriesMetadata> = {};
    (seriesCacheData || []).forEach(i => {
      seriesMetadata[i.tmdb_id] = {
        total_episodes: i.total_episodes,
        number_of_seasons: i.number_of_seasons
      };
    });

    return { watchlist, watchedIds, watchedEpisodes, seriesMetadata };
  },

  async addToWatchlist(item: ContentItem) {
    const { error } = await supabase
      .from('watchlists')
      .insert({
        tmdb_id: item.id,
        media_type: item.media_type
      });

    if (error) console.error('Error adding to watchlist:', error);
  },

  async removeFromWatchlist(contentId: number) {
    const { error } = await supabase
      .from('watchlists')
      .delete()
      .match({ tmdb_id: contentId });

    if (error) console.error('Error removing from watchlist:', error);
  },

  async markAsWatched(contentId: number, contentType: ContentType = 'movie', metadata: Record<string, unknown> = {}) {
    if (contentType === 'movie') {
      const { error } = await supabase
        .from('watched_movies')
        .insert({
          tmdb_id: contentId
        });
      if (error) console.error('Error marking movie as watched:', error);
    } else if (contentType === 'episode') {
      const { error } = await supabase
        .from('watched_episodes')
        .insert({
          tmdb_episode_id: contentId,
          tmdb_show_id: metadata.show_id,
          season_number: metadata.season_number,
          episode_number: metadata.episode_number,
        });
      if (error) console.error('Error marking episode as watched:', error);
    }
  },

  async markAsUnwatched(contentId: number) {
    const { error: movieError } = await supabase
      .from('watched_movies')
      .delete()
      .eq('tmdb_id', contentId);

    const { error: episodeError } = await supabase
      .from('watched_episodes')
      .delete()
      .eq('tmdb_episode_id', contentId);
   
    if (movieError) console.error('Error marking movie as unwatched:', movieError);
    if (episodeError) console.error('Error marking episode as unwatched:', episodeError);
  },

  async saveSeriesMetadata(showId: number, metadata: SeriesMetadata) {
    const { error } = await supabase
      .from('series_cache')
      .upsert({
        tmdb_id: showId,
        total_episodes: metadata.total_episodes,
        number_of_seasons: metadata.number_of_seasons,
        updated_at: new Date().toISOString()
      });

    if (error) console.error('Error saving series metadata:', error);
  },

  async markSeasonAsWatched(seriesId: number, seasonNumber: number, episodes: Episode[]) {
    // Prepare payload for RPC
    const payload = episodes.map(ep => ({
      tmdb_id: ep.id,
      tmdb_show_id: seriesId,
      season_number: seasonNumber,
      episode_number: ep.episode_number
    }));

    const { error } = await supabase.rpc('mark_season_watched', {
      episodes: payload
    });

    if (error) console.error('Error marking season as watched:', error);
  },

  async markSeasonAsUnwatched(seriesId: number, seasonNumber: number) {
    const { error } = await supabase.rpc('mark_season_unwatched', {
      show_id: seriesId,
      season_num: seasonNumber
    });

    if (error) console.error('Error marking season as unwatched:', error);
  },

  async hasData(userId: string): Promise<boolean> {
    const [
      { count: watchlistCount },
      { count: watchedMoviesCount },
      { count: watchedEpisodesCount }
    ] = await Promise.all([
      supabase.from('watchlists').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('watched_movies').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('watched_episodes').select('*', { count: 'exact', head: true }).eq('user_id', userId)
    ]);

    return (watchlistCount || 0) > 0 || (watchedMoviesCount || 0) > 0 || (watchedEpisodesCount || 0) > 0;
  }
};
