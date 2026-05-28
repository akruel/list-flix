import { useMutation, useQueryClient } from "@tanstack/react-query";

import { userContentService } from "@/services/userContent";
import { userContentKeys } from "@/services/userContent.queries";
import { useUserContentStore } from "@/store/useUserContentStore";
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
      const previous = useUserContentStore.getState().seriesMetadata;
      useUserContentStore.getState().saveSeriesMetadata(showId, metadata);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        useUserContentStore.setState({ seriesMetadata: context.previous });
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: userContentKeys.all });
    },
  });
}
