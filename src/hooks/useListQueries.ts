import { useQueries, useQuery } from "@tanstack/react-query";

import {
  listDetailsQuery,
  listsContainingContentQuery,
  listsQuery,
} from "@/services/list.queries";
import { detailsQuery } from "@/services/tmdb.queries";
import type { ListItem } from "@/types";

export function useLists(enabled = true) {
  return useQuery({
    ...listsQuery(),
    enabled,
  });
}

export function useListsContainingContent(
  contentId: number,
  contentType: "movie" | "tv",
  enabled = true,
) {
  return useQuery({
    ...listsContainingContentQuery(contentId, contentType),
    enabled,
  });
}

export function useListDetails(id: string) {
  return useQuery(listDetailsQuery(id));
}

export function useListItemDetails(items: ListItem[]) {
  return useQueries({
    queries: items.map((item) =>
      detailsQuery(item.content_type, item.content_id),
    ),
  });
}
