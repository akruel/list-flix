import { useMutation, useQueryClient } from "@tanstack/react-query";

import { userContentService } from "@/services/userContent";
import {
  emptyUserContent,
  type UserContent,
  userContentKeys,
} from "@/services/userContent.queries";
import type { SeriesMetadata } from "@/types";

export type SaveSeriesMetadataInput = {
  showId: number;
  metadata: SeriesMetadata;
};

export function useSaveSeriesMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ showId, metadata }: SaveSeriesMetadataInput) => {
      await userContentService.saveSeriesMetadata(showId, metadata);
    },
    onMutate: async ({ showId, metadata }) => {
      await queryClient.cancelQueries({ queryKey: userContentKeys.all });
      const previous = queryClient.getQueryData<UserContent>(
        userContentKeys.all,
      );
      queryClient.setQueryData<UserContent>(userContentKeys.all, (old) => {
        const base = old ?? emptyUserContent();
        return {
          ...base,
          seriesMetadata: { ...base.seriesMetadata, [showId]: metadata },
        };
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(userContentKeys.all, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: userContentKeys.all });
    },
  });
}
