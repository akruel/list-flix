import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ContentItem } from '../types';

interface ListStore {
  myList: ContentItem[];
  watchedIds: number[];
  addToList: (item: ContentItem) => void;
  removeFromList: (id: number) => void;
  isInList: (id: number) => boolean;
  markAsWatched: (id: number) => void;
  markAsUnwatched: (id: number) => void;
  isWatched: (id: number) => boolean;
}

export const useStore = create<ListStore>()(
  persist(
    (set, get) => ({
      myList: [],
      watchedIds: [],
      addToList: (item) => set((state) => {
        if (state.myList.some((i) => i.id === item.id)) return state;
        return { myList: [...state.myList, item] };
      }),
      removeFromList: (id) => set((state) => ({
        myList: state.myList.filter((i) => i.id !== id),
      })),
      isInList: (id) => get().myList.some((i) => i.id === id),
      markAsWatched: (id) => set((state) => {
        if (state.watchedIds.includes(id)) return state;
        return { watchedIds: [...state.watchedIds, id] };
      }),
      markAsUnwatched: (id) => set((state) => ({
        watchedIds: state.watchedIds.filter((watchedId) => watchedId !== id),
      })),
      isWatched: (id) => get().watchedIds.includes(id),
    }),
    {
      name: 'cinepwa-storage',
    }
  )
);
