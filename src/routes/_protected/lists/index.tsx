import { createFileRoute } from "@tanstack/react-router";

import { MyListScreen } from "./-screen";

type ListsSearch = {
  tab?: "watchlist" | "custom";
};

export const Route = createFileRoute("/_protected/lists/")({
  validateSearch: (search: Record<string, unknown>): ListsSearch => ({
    tab:
      search.tab === "watchlist" || search.tab === "custom"
        ? search.tab
        : undefined,
  }),
  component: MyListsIndexRouteComponent,
});

function MyListsIndexRouteComponent() {
  const { tab } = Route.useSearch();
  return <MyListScreen initialTab={tab} />;
}
