import { supabase } from '../lib/supabase';
import type { ContentItem } from '../types';

export type InteractionType = 'watchlist' | 'watched';
export type ContentType = 'movie' | 'tv' | 'episode';


export const userContentService = {
  async syncLocalData(
    localList: ContentItem[], 
    localWatchedIds: number[],
    localWatchedEpisodes: Record<number, number[]> = {}
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
    for (const [showId, episodeIds] of Object.entries(localWatchedEpisodes)) {
      for (const episodeId of episodeIds) {
        if (!existingWatchedEpisodes.has(episodeId)) {
          updates.push({
            user_id: user.id,
            content_id: episodeId,
            content_type: 'episode',
            interaction_type: 'watched',
            metadata: { show_id: Number(showId) }
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
      return { watchlist: [], watchedIds: [], watchedEpisodes: {} };
    }

    const watchlist = data
      .filter(i => i.interaction_type === 'watchlist')
      .map(i => i.metadata as ContentItem);

    const watchedIds = data
      .filter(i => i.interaction_type === 'watched' && i.content_type !== 'episode')
      .map(i => i.content_id);

    const watchedEpisodes: Record<number, number[]> = {};
    
    data
      .filter(i => i.interaction_type === 'watched' && i.content_type === 'episode')
      .forEach(i => {
        const showId = i.metadata?.show_id;
        if (showId) {
          if (!watchedEpisodes[showId]) {
            watchedEpisodes[showId] = [];
          }
          watchedEpisodes[showId].push(i.content_id);
        }
      });

    return { watchlist, watchedIds, watchedEpisodes };
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

  async markAsWatched(contentId: number, contentType: ContentType = 'movie', metadata: any = {}) {
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
  }
};
