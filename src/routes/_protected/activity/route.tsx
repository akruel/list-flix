import {
  useQueryClient,
  useQueryErrorResetBoundary,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Bell, List, RefreshCw } from "lucide-react";
import { useEffect, useMemo } from "react";

import { ActivityCard } from "@/components/ActivityCard";
import { ActivityFeedSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { groupActivities } from "@/lib/activity";
import { getDayGroupLabel, getDayKeyFromIso } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { activityFeedQuery, activityKeys } from "@/services/activity.queries";
import type { GroupedActivity } from "@/types";

export const Route = createFileRoute("/_protected/activity")({
  loader: ({ context }) =>
    context.queryClient.ensureInfiniteQueryData(activityFeedQuery()),
  pendingComponent: ActivityPendingComponent,
  errorComponent: ActivityErrorComponent,
  component: ActivityRouteComponent,
});

function ActivityPendingComponent() {
  return (
    <div data-testid="route-activity" className="mx-auto max-w-lg">
      <ActivityHeader refreshDisabled />
      <ActivityFeedSkeleton />
    </div>
  );
}

function ActivityErrorComponent({ error }: { error: Error }) {
  const router = useRouter();
  const queryErrorResetBoundary = useQueryErrorResetBoundary();

  logger.error("Activity route error:", error);

  useEffect(() => {
    queryErrorResetBoundary.reset();
  }, [queryErrorResetBoundary]);

  const handleRetry = () => {
    void router.invalidate();
  };

  return (
    <div data-testid="route-activity" className="mx-auto max-w-lg">
      <ActivityHeader onRefresh={handleRetry} />
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Bell className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar as atividades.
        </p>
        <Button variant="outline" size="sm" onClick={handleRetry}>
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}

function ActivityRouteComponent() {
  const queryClient = useQueryClient();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useSuspenseInfiniteQuery(activityFeedQuery());

  const items = useMemo(() => groupActivities(data.pages.flat()), [data.pages]);

  const handleRefresh = () => {
    void queryClient.resetQueries({ queryKey: activityKeys.feed() });
  };

  const handleLoadMore = () => {
    void fetchNextPage();
  };

  if (items.length === 0) {
    return (
      <div data-testid="route-activity" className="mx-auto max-w-lg">
        <ActivityHeader onRefresh={handleRefresh} />
        <EmptyState />
      </div>
    );
  }

  const grouped = groupByDay(items);

  return (
    <div data-testid="route-activity" className="mx-auto max-w-lg">
      <ActivityHeader onRefresh={handleRefresh} />
      <div className="space-y-6">
        {grouped.map(({ dayLabel, dayItems }) => (
          <section key={dayLabel}>
            <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {dayLabel}
            </h2>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {dayItems.map((item, idx) => (
                <div
                  key={getItemKey(item)}
                  className={
                    idx < dayItems.length - 1 ? "border-b border-border" : ""
                  }
                >
                  <ActivityCard item={item} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {isFetchNextPageError ? (
        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar mais atividades.
          </p>
          <Button variant="outline" size="sm" onClick={handleLoadMore}>
            Tentar novamente
          </Button>
        </div>
      ) : hasNextPage ? (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Carregando..." : "Carregar mais"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ActivityHeader({
  onRefresh,
  refreshDisabled,
}: {
  onRefresh?: () => void;
  refreshDisabled?: boolean;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-2xl font-bold text-foreground">Atividades</h1>
      <button
        onClick={onRefresh}
        disabled={refreshDisabled || !onRefresh}
        aria-label="Atualizar feed"
        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
      >
        <RefreshCw size={18} />
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Bell className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-foreground">Nenhuma atividade ainda</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Aqui você verá quando membros das suas listas compartilhadas
          assistirem ou adicionarem conteúdo.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to="/lists">
          <List size={16} className="mr-2" />
          Ver minhas listas
        </Link>
      </Button>
    </div>
  );
}

function getItemKey(item: GroupedActivity): string {
  if (item.type === "episode_batch") {
    return `batch-${item.content_id}-${item.latest_at}`;
  }
  return item.activity.id;
}

function getItemDate(item: GroupedActivity): string {
  if (item.type === "episode_batch") return item.latest_at;
  return item.activity.created_at;
}

function groupByDay(
  items: GroupedActivity[],
): { dayLabel: string; dayItems: GroupedActivity[] }[] {
  const map = new Map<string, GroupedActivity[]>();
  const order: string[] = [];

  for (const item of items) {
    const key = getDayKeyFromIso(getItemDate(item));
    const existing = map.get(key);
    if (!existing) {
      map.set(key, [item]);
      order.push(key);
    } else {
      existing.push(item);
    }
  }

  return order.map((key) => {
    const dayItems = map.get(key) ?? [];
    const firstItem = dayItems[0];
    const dayLabel = firstItem ? getDayGroupLabel(getItemDate(firstItem)) : key;
    return { dayLabel, dayItems };
  });
}
