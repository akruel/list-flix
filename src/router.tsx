import { createRouter } from '@tanstack/react-router';
import type { AuthContextSnapshot } from './contexts/AuthContext';
import { routeTree } from './routeTree.gen';

export interface RouterContext {
  auth: AuthContextSnapshot;
}

export const router = createRouter({
  routeTree,
  context: {
    auth: {
      status: 'loading',
      user: null,
    },
  },
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
