import { supabaseService } from "@/services/supabase";
import { tmdb } from "@/services/tmdb";
import type { ContentItem } from "@/types";

export type SharedListParams = {
  id?: string;
  data?: string;
};

/** Thrown when the shared link carries neither a list id nor inline data. */
export class SharedLinkError extends Error {}

export const sharedListQuery = ({ id, data }: SharedListParams) => ({
  queryKey: ["sharedList", id ?? null, data ?? null] as const,
  queryFn: async (): Promise<ContentItem[]> => {
    if (!id && !data) {
      throw new SharedLinkError("Link inválido ou incompleto.");
    }

    let listData: { id: number; type: "movie" | "tv" }[] = [];
    if (id) {
      listData = await supabaseService.getSharedList(id);
    } else if (data) {
      const decoded = atob(data);
      listData = JSON.parse(decoded) as { id: number; type: "movie" | "tv" }[];
    }

    return Promise.all(
      listData.map((item) => tmdb.getDetails(item.id, item.type)),
    );
  },
});
