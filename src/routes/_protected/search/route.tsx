import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/search")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
