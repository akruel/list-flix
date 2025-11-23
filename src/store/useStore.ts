import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ContentItem } from '../types';
import { userContentService } from '../services/userContent';

interface ListStore {
  myList: ContentItem[];
  watchedIds: number[];
  watchedEpisodes: Record<number, number[]>; // showId -> episodeIds
  addToList: (item: ContentItem) => void;
  removeFromList: (id: number) => void;
  isInList: (id: number) => boolean;
  markAsWatched: (id: number) => void;
  markAsUnwatched: (id: number) => void;
  isWatched: (id: number) => boolean;
  
  markEpisodeAsWatched: (showId: number, episodeId: number) => void;
  markEpisodeAsUnwatched: (showId: number, episodeId: number) => void;
  isEpisodeWatched: (showId: number, episodeId: number) => boolean;
  
  syncWithSupabase: () => Promise<void>;
}

export const useStore = create<ListStore>()(
  persist(
    (set, get) => ({
      myList: [],
      watchedIds: [],
      watchedEpisodes: {},
      
      addToList: (item) => {
        set((state) => {
          if (state.myList.some((i) => i.id === item.id)) return state;
          // Optimistic update
          userContentService.addToWatchlist(item);
          return { myList: [...state.myList, item] };
        });
      },

      removeFromList: (id) => {
        set((state) => {
          // Optimistic update
          userContentService.removeFromWatchlist(id);
          return {
            myList: state.myList.filter((i) => i.id !== id),
          };
        });
      },

      isInList: (id) => get().myList.some((i) => i.id === id),

      markAsWatched: (id) => {
        set((state) => {
          if (state.watchedIds.includes(id)) return state;
          
          // Try to find item metadata from myList if available
          const item = state.myList.find(i => i.id === id);
          userContentService.markAsWatched(id, item?.media_type || 'movie', item || {});
          
          return { watchedIds: [...state.watchedIds, id] };
        });
      },

      markAsUnwatched: (id) => {
        set((state) => {
          userContentService.markAsUnwatched(id);
          return {
            watchedIds: state.watchedIds.filter((watchedId) => watchedId !== id),
          };
        });
      },

      isWatched: (id) => get().watchedIds.includes(id),

      markEpisodeAsWatched: (showId, episodeId) => {
        set((state) => {
          const currentShowEpisodes = state.watchedEpisodes[showId] || [];
          if (currentShowEpisodes.includes(episodeId)) return state;

          userContentService.markAsWatched(episodeId, 'episode', { show_id: showId });

          return {
            watchedEpisodes: {
              ...state.watchedEpisodes,
              [showId]: [...currentShowEpisodes, episodeId]
            }
          };
        });
      },

      markEpisodeAsUnwatched: (showId, episodeId) => {
        set((state) => {
          const currentShowEpisodes = state.watchedEpisodes[showId] || [];
          userContentService.markAsUnwatched(episodeId);

          return {
            watchedEpisodes: {
              ...state.watchedEpisodes,
              [showId]: currentShowEpisodes.filter(id => id !== episodeId)
            }
          };
        });
      },

      isEpisodeWatched: (showId, episodeId) => {
        const showEpisodes = get().watchedEpisodes[showId];
        return showEpisodes ? showEpisodes.includes(episodeId) : false;
      },

      syncWithSupabase: async () => {
        const state = get();
        // 1. Upload local data to Supabase (migration)
        await userContentService.syncLocalData(state.myList, state.watchedIds, state.watchedEpisodes);
        
        // 2. Fetch latest data from Supabase (source of truth)
        const { watchlist, watchedIds, watchedEpisodes } = await userContentService.getUserContent();
        
        set({ myList: watchlist, watchedIds, watchedEpisodes });
      }
    }),
    {
      name: 'cinepwa-storage',
    }
  )
);
