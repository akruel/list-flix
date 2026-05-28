import { create } from "zustand";
import { persist } from "zustand/middleware";

import { listService } from "../services/listService";
import type { List } from "../types";
import { NEW_KEYS } from "./migrate";

interface ListsStore {
  lists: List[];
  fetchLists: () => Promise<void>;
  createList: (name: string) => Promise<List>;
  deleteList: (id: string) => Promise<void>;
  updateList: (id: string, name: string) => Promise<void>;
}

export const useListsStore = create<ListsStore>()(
  persist(
    (set, get) => ({
      lists: [],

      fetchLists: async () => {
        const lists = await listService.getLists();
        set({ lists });
      },

      createList: async (name) => {
        const newList = await listService.createList(name);
        await get().fetchLists();
        return newList;
      },

      deleteList: async (id) => {
        await listService.deleteList(id);
        set((state) => ({
          lists: state.lists.filter((l) => l.id !== id),
        }));
      },

      updateList: async (id, name) => {
        await listService.updateList(id, name);
        set((state) => ({
          lists: state.lists.map((l) => (l.id === id ? { ...l, name } : l)),
        }));
      },
    }),
    {
      name: NEW_KEYS.lists,
    },
  ),
);
