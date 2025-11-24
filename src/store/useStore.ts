import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ContentItem, List, WatchedEpisodeMetadata } from '../types';
import { userContentService } from '../services/userContent';
import { listService } from '../services/listService';

interface ListStore {
  myList: ContentItem[];
  watchedIds: number[];
  watchedEpisodes: Record<number, Record<number, WatchedEpisodeMetadata>>; // showId -> { episodeId -> metadata }
  addToList: (item: ContentItem) => void;
  removeFromList: (id: number) => void;
  isInList: (id: number) => boolean;
  markAsWatched: (id: number) => void;
  markAsUnwatched: (id: number) => void;
  isWatched: (id: number) => boolean;
  
  markEpisodeAsWatched: (showId: number, episodeId: number, seasonNumber: number, episodeNumber: number) => void;
  markEpisodeAsUnwatched: (showId: number, episodeId: number) => void;
  isEpisodeWatched: (showId: number, episodeId: number) => boolean;
  getSeasonProgress: (showId: number, seasonNumber: number) => { watchedCount: number };
  getSeriesProgress: (showId: number) => { watchedCount: number };
  
  syncWithSupabase: () => Promise<void>;

  // Shared Lists
  lists: List[];
  fetchLists: () => Promise<void>;
  createList: (name: string) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
}

export const useStore = create<ListStore>()(
  persist(
    (set, get) => ({
      myList: [],
      watchedIds: [],
      watchedEpisodes: {},
      lists: [],
      
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
          userContentService.markAsWatched(id, item?.media_type || 'movie', (item || {}) as Record<string, unknown>);
          
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

      markEpisodeAsWatched: (showId, episodeId, seasonNumber, episodeNumber) => {
        set((state) => {
          const currentShowEpisodes = state.watchedEpisodes[showId] || {};
          if (currentShowEpisodes[episodeId]) return state;

          userContentService.markAsWatched(episodeId, 'episode', { 
            show_id: showId,
            season_number: seasonNumber,
            episode_number: episodeNumber
          });

          return {
            watchedEpisodes: {
              ...state.watchedEpisodes,
              [showId]: {
                ...currentShowEpisodes,
                [episodeId]: { season_number: seasonNumber, episode_number: episodeNumber }
              }
            }
          };
        });
      },

      markEpisodeAsUnwatched: (showId, episodeId) => {
        set((state) => {
          const currentShowEpisodes = state.watchedEpisodes[showId] || {};
          userContentService.markAsUnwatched(episodeId);

          const remainingEpisodes = { ...currentShowEpisodes };
          delete remainingEpisodes[episodeId];

          return {
            watchedEpisodes: {
              ...state.watchedEpisodes,
              [showId]: remainingEpisodes
            }
          };
        });
      },

      isEpisodeWatched: (showId, episodeId) => {
        const showEpisodes = get().watchedEpisodes[showId];
        return showEpisodes ? episodeId in showEpisodes : false;
      },

      getSeasonProgress: (showId, seasonNumber) => {
        const showEpisodes = get().watchedEpisodes[showId] || {};
        const watchedCount = Object.values(showEpisodes).filter(
          (metadata) => metadata.season_number === seasonNumber
        ).length;
        return { watchedCount };
      },

      getSeriesProgress: (showId) => {
        const showEpisodes = get().watchedEpisodes[showId] || {};
        const watchedCount = Object.keys(showEpisodes).length;
        return { watchedCount };
      },

      syncWithSupabase: async () => {
        const state = get();
        // 1. Upload local data to Supabase (migration)
        await userContentService.syncLocalData(state.myList, state.watchedIds, state.watchedEpisodes);
        
        // 2. Fetch latest data from Supabase (source of truth)
        const { watchlist, watchedIds, watchedEpisodes } = await userContentService.getUserContent();
        
        set({ myList: watchlist, watchedIds, watchedEpisodes });
      },

      fetchLists: async () => {
        const lists = await listService.getLists();
        set({ lists });
      },

      createList: async (name) => {
        await listService.createList(name);
        get().fetchLists();
      },

      deleteList: async (id) => {
        await listService.deleteList(id);
        set((state) => ({
          lists: state.lists.filter((l) => l.id !== id),
        }));
      },
    }),
    {
      name: 'cinepwa-storage',
    }
  )
);
