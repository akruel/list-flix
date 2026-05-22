import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, List, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ActivityCard } from "@/components/ActivityCard";
import { ActivityFeedSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { getDayGroupLabel, getDayKeyFromIso } from "@/lib/date-utils";
import { activityService, groupActivities } from "@/services/activityService";
import type { GroupedActivity } from "@/types";

export const Route = createFileRoute("/_protected/activity")({
  component: ActivityRouteComponent,
});

const PAGE_SIZE = 50;

function ActivityRouteComponent() {
  const [items, setItems] = useState<GroupedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);
  // Incrementing this triggers a re-fetch; reset=true means start from page 0
  const [fetchTrigger, setFetchTrigger] = useState<{
    reset: boolean;
    tick: number;
  }>({ reset: true, tick: 0 });

  useEffect(() => {
    let cancelled = false;
    const { reset } = fetchTrigger;

    const fetchFeed = async () => {
      const offset = reset ? 0 : offsetRef.current;

      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const raw = await activityService.getActivityFeed(PAGE_SIZE, offset);
        if (cancelled) return;

        const grouped = groupActivities(raw);
        setItems((prev) => (reset ? grouped : [...prev, ...grouped]));
        offsetRef.current = offset + raw.length;
        setHasMore(raw.length === PAGE_SIZE);
      } catch {
        if (!cancelled) setError("Não foi possível carregar as atividades.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };

    fetchFeed();

    return () => {
      cancelled = true;
    };
  }, [fetchTrigger]);

  const handleRefresh = () => {
    setFetchTrigger((prev) => ({ reset: true, tick: prev.tick + 1 }));
  };

  const handleLoadMore = () => {
    setFetchTrigger((prev) => ({ reset: false, tick: prev.tick + 1 }));
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div data-testid="route-activity" className="mx-auto max-w-lg">
        <ActivityHeader onRefresh={handleRefresh} refreshDisabled />
        <ActivityFeedSkeleton />
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div data-testid="route-activity" className="mx-auto max-w-lg">
        <ActivityHeader onRefresh={handleRefresh} />
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div data-testid="route-activity" className="mx-auto max-w-lg">
        <ActivityHeader onRefresh={handleRefresh} />
        <EmptyState />
      </div>
    );
  }

  // ── Feed ───────────────────────────────────────────────────────────────────
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

      {hasMore ? (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Carregando..." : "Carregar mais"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActivityHeader({
  onRefresh,
  refreshDisabled,
}: {
  onRefresh: () => void;
  refreshDisabled?: boolean;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-2xl font-bold text-foreground">Atividades</h1>
      <button
        onClick={onRefresh}
        disabled={refreshDisabled}
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
