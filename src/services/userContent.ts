import { supabase } from '../lib/supabase';
import type { ContentItem, WatchedEpisodeMetadata, SeriesMetadata } from '../types';

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

    // 1. Get existing interactions to avoid duplicates
    const { data: existing } = await supabase
      .from('user_interactions')
      .select('content_id, interaction_type, content_type');

    const existingWatchlist = new Set(
      existing
        ?.filter(i => i.interaction_type === 'watchlist')
        .map(i => i.content_id)
    );
    
    const existingWatched = new Set(
      existing
        ?.filter(i => i.interaction_type === 'watched' && i.content_type !== 'episode')
        .map(i => i.content_id)
    );

    const existingWatchedEpisodes = new Set(
      existing
        ?.filter(i => i.interaction_type === 'watched' && i.content_type === 'episode')
        .map(i => i.content_id)
    );

    const updates = [];

    // 2. Prepare watchlist inserts
    for (const item of localList) {
      if (!existingWatchlist.has(item.id)) {
        updates.push({
          user_id: user.id,
          content_id: item.id,
          content_type: item.media_type,
          interaction_type: 'watchlist',
          metadata: item
        });
      }
    }

    // 3. Prepare watched inserts (movies/tv)
    for (const id of localWatchedIds) {
      if (!existingWatched.has(id)) {
        const item = localList.find(i => i.id === id);
        updates.push({
          user_id: user.id,
          content_id: id,
          content_type: item?.media_type || 'movie',
          interaction_type: 'watched',
          metadata: item || {}
        });
      }
    }

    // 4. Prepare watched episodes inserts
    for (const [showId, episodesMap] of Object.entries(localWatchedEpisodes)) {
      for (const [episodeId, metadata] of Object.entries(episodesMap)) {
        if (!existingWatchedEpisodes.has(Number(episodeId))) {
          updates.push({
            user_id: user.id,
            content_id: Number(episodeId),
            content_type: 'episode',
            interaction_type: 'watched',
            metadata: { 
              show_id: Number(showId),
              season_number: metadata.season_number,
              episode_number: metadata.episode_number
            }
          });
        }
      }
    }

    if (updates.length > 0) {
      const { error } = await supabase
        .from('user_interactions')
        .insert(updates);
      
      if (error) console.error('Error syncing data:', error);
    }
  },

  async getUserContent() {
    const { data, error } = await supabase
      .from('user_interactions')
      .select('*');

    if (error) {
      console.error('Error fetching user content:', error);
      return { watchlist: [], watchedIds: [], watchedEpisodes: {}, seriesMetadata: {} };
    }

    const watchlist = data
      .filter(i => i.interaction_type === 'watchlist')
      .map(i => i.metadata as ContentItem);

    const watchedIds = data
      .filter(i => i.interaction_type === 'watched' && i.content_type !== 'episode')
      .map(i => i.content_id);

    const watchedEpisodes: Record<number, Record<number, WatchedEpisodeMetadata>> = {};
    
    data
      .filter(i => i.interaction_type === 'watched' && i.content_type === 'episode')
      .forEach(i => {
        const showId = i.metadata?.show_id;
        const seasonNumber = i.metadata?.season_number;
        const episodeNumber = i.metadata?.episode_number;
        
        if (showId && typeof seasonNumber === 'number' && typeof episodeNumber === 'number') {
          if (!watchedEpisodes[showId]) {
            watchedEpisodes[showId] = {};
          }
          watchedEpisodes[showId][i.content_id] = {
            season_number: seasonNumber,
            episode_number: episodeNumber
          };
        }
      });

    const seriesMetadata: Record<number, SeriesMetadata> = {};
    
    data
      .filter(i => i.content_type === 'series_metadata')
      .forEach(i => {
        const showId = i.content_id;
        if (i.metadata?.total_episodes && typeof i.metadata.total_episodes === 'number') {
          seriesMetadata[showId] = {
            total_episodes: i.metadata.total_episodes,
            number_of_seasons: i.metadata.number_of_seasons || 0
          };
        }
      });

    return { watchlist, watchedIds, watchedEpisodes, seriesMetadata };
  },

  async addToWatchlist(item: ContentItem) {
    const { error } = await supabase
      .from('user_interactions')
      .insert({
        content_id: item.id,
        content_type: item.media_type,
        interaction_type: 'watchlist',
        metadata: item
      });

    if (error) console.error('Error adding to watchlist:', error);
  },

  async removeFromWatchlist(contentId: number) {
    const { error } = await supabase
      .from('user_interactions')
      .delete()
      .match({ 
        content_id: contentId, 
        interaction_type: 'watchlist' 
      });

    if (error) console.error('Error removing from watchlist:', error);
  },

  async markAsWatched(contentId: number, contentType: ContentType = 'movie', metadata: Record<string, unknown> = {}) {
    const { error } = await supabase
      .from('user_interactions')
      .insert({
        content_id: contentId,
        content_type: contentType,
        interaction_type: 'watched',
        metadata
      });

    if (error) console.error('Error marking as watched:', error);
  },

  async markAsUnwatched(contentId: number) {
    const { error } = await supabase
      .from('user_interactions')
      .delete()
      .match({ 
        content_id: contentId, 
        interaction_type: 'watched' 
      });

    if (error) console.error('Error marking as unwatched:', error);
  },

  async saveSeriesMetadata(showId: number, metadata: SeriesMetadata) {
    // Upsert series metadata - delete old, insert new
    await supabase
      .from('user_interactions')
      .delete()
      .match({ 
        content_id: showId, 
        content_type: 'series_metadata' 
      });

    const { error } = await supabase
      .from('user_interactions')
      .insert({
        content_id: showId,
        content_type: 'series_metadata',
        interaction_type: 'watchlist', // Using watchlist as a placeholder
        metadata: {
          total_episodes: metadata.total_episodes,
          number_of_seasons: metadata.number_of_seasons
        }
      });

    if (error) console.error('Error saving series metadata:', error);
  }
};
