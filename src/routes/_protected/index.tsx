import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { MovieCard } from "@/components/MovieCard";
import { ContentGridSkeleton } from "@/components/skeletons";
import { tmdb } from "@/services/tmdb";
import type { ContentItem } from "@/types";

export const Route = createFileRoute("/_protected/")({
  component: HomeRouteComponent,
});

function HomeRouteComponent() {
  const [trending, setTrending] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const data = await tmdb.getTrending("week");
        setTrending(data);
      } catch (error) {
        console.error("Error fetching trending:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchTrending();
  }, []);

  if (loading) {
    return (
      <div data-testid="route-home">
        <h1 className="mb-6 text-3xl font-bold">Em Alta</h1>
        <ContentGridSkeleton />
      </div>
    );
  }

  return (
    <div data-testid="route-home">
      <h1 className="mb-6 text-3xl font-bold">Em Alta</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {trending.map((item) => (
          <MovieCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
