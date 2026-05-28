import type { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

import type { AuthContextSnapshot } from "./contexts/AuthContext";
import { queryClient } from "./lib/queryClient";
import { routeTree } from "./routeTree.gen";

export interface RouterContext {
  auth: AuthContextSnapshot;
  queryClient: QueryClient;
}

export const router = createRouter({
  routeTree,
  context: {
    auth: {
      status: "loading",
      user: null,
    },
    queryClient,
  },
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
