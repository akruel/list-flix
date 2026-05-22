import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Activity, GroupedActivity } from "@/types";

import { ActivityCard } from "./ActivityCard";

vi.useFakeTimers();
vi.setSystemTime(new Date("2026-05-22T12:00:00Z"));

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "act-1",
    actor_id: "actor-1",
    activity_type: "episode_watched",
    list_id: "list-1",
    content_id: 101,
    content_type: "tv",
    metadata: {
      actor_name: "Alice",
      content_title: "Breaking Bad",
      poster_path: "/bb.jpg",
      season_number: 1,
      episode_number: 3,
    },
    created_at: "2026-05-22T10:00:00Z",
    ...overrides,
  };
}

describe("ActivityCard", () => {
  describe("single — episode_watched", () => {
    it("renders actor name and episode label with show title", () => {
      const item: GroupedActivity = {
        type: "single",
        activity: makeActivity({ activity_type: "episode_watched" }),
      };
      render(<ActivityCard item={item} />);
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText(/S01E03/)).toBeInTheDocument();
      expect(screen.getByText(/Breaking Bad/)).toBeInTheDocument();
    });

    it("renders generic episode text if season or episode number is missing", () => {
      const item: GroupedActivity = {
        type: "single",
        activity: makeActivity({
          activity_type: "episode_watched",
          metadata: { actor_name: "Alice", content_title: "Breaking Bad" },
        }),
      };
      render(<ActivityCard item={item} />);
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText(/assistiu um episódio de/i)).toBeInTheDocument();
      expect(screen.getByText(/Breaking Bad/)).toBeInTheDocument();
    });
  });

  describe("single — movie_watched", () => {
    it("renders watched movie text", () => {
      const item: GroupedActivity = {
        type: "single",
        activity: makeActivity({
          activity_type: "movie_watched",
          content_type: "movie",
          metadata: { actor_name: "Bob", content_title: "Inception" },
        }),
      };
      render(<ActivityCard item={item} />);
      expect(screen.getByText(/Bob/)).toBeInTheDocument();
      expect(screen.getByText(/assistiu/i)).toBeInTheDocument();
      expect(screen.getByText(/Inception/)).toBeInTheDocument();
    });
  });

  describe("single — item_added", () => {
    it("renders item added text with list name", () => {
      const item: GroupedActivity = {
        type: "single",
        activity: makeActivity({
          activity_type: "item_added",
          metadata: {
            actor_name: "Carol",
            content_title: "Dune",
            list_name: "Minha Lista",
          },
        }),
      };
      render(<ActivityCard item={item} />);
      expect(screen.getByText(/Carol/)).toBeInTheDocument();
      expect(screen.getByText(/adicionou/i)).toBeInTheDocument();
      expect(screen.getByText(/Dune/)).toBeInTheDocument();
    });
  });

  describe("single — item_removed", () => {
    it("renders item removed text", () => {
      const item: GroupedActivity = {
        type: "single",
        activity: makeActivity({
          activity_type: "item_removed",
          metadata: {
            actor_name: "Dave",
            content_title: "Matrix",
            list_name: "Clássicos",
          },
        }),
      };
      render(<ActivityCard item={item} />);
      expect(screen.getByText(/Dave/)).toBeInTheDocument();
      expect(screen.getByText(/removeu/i)).toBeInTheDocument();
    });
  });

  describe("single — member_joined", () => {
    it("renders member joined text", () => {
      const item: GroupedActivity = {
        type: "single",
        activity: makeActivity({
          activity_type: "member_joined",
          content_id: null,
          content_type: null,
          metadata: {
            actor_name: "Eve",
            list_name: "Filmes do Grupo",
          },
        }),
      };
      render(<ActivityCard item={item} />);
      expect(screen.getByText(/Eve/)).toBeInTheDocument();
      expect(screen.getByText(/entrou na lista/i)).toBeInTheDocument();
    });
  });

  describe("single — unknown type", () => {
    it("renders default fallback text", () => {
      const item: GroupedActivity = {
        type: "single",
        activity: makeActivity({
          activity_type: "unknown_type" as Activity["activity_type"],
          metadata: { actor_name: "Frank" },
        }),
      };
      render(<ActivityCard item={item} />);
      expect(screen.getByText(/Frank/)).toBeInTheDocument();
      expect(screen.getByText(/realizou uma atividade/i)).toBeInTheDocument();
    });
  });

  describe("Avatar edge cases", () => {
    it("renders fallback initial '?' when name is missing", () => {
      const item: GroupedActivity = {
        type: "single",
        activity: makeActivity({
          activity_type: "movie_watched",
          metadata: { actor_name: undefined, content_title: "Inception" },
        }),
      };
      render(<ActivityCard item={item} />);
      expect(screen.getByText("?")).toBeInTheDocument();
      expect(screen.getByText(/Alguém/)).toBeInTheDocument();
    });

    it("renders fallback initial '?' when name is just spaces", () => {
      const item: GroupedActivity = {
        type: "single",
        activity: makeActivity({
          activity_type: "movie_watched",
          metadata: { actor_name: "   ", content_title: "Inception" },
        }),
      };
      render(<ActivityCard item={item} />);
      expect(screen.getByText("?")).toBeInTheDocument();
    });

    it("renders image when avatar_url is provided", () => {
      const item: GroupedActivity = {
        type: "single",
        activity: makeActivity({
          activity_type: "movie_watched",
          metadata: {
            actor_name: "George",
            actor_avatar_url: "/george.png",
            content_title: "Inception",
          },
        }),
      };
      render(<ActivityCard item={item} />);
      const img = screen.getByRole("img", { name: /George/i });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute(
        "src",
        expect.stringContaining("/george.png"),
      );
    });

    it("renders image with fallback alt text when avatar_url is provided but name is missing", () => {
      const item: GroupedActivity = {
        type: "single",
        activity: makeActivity({
          activity_type: "movie_watched",
          metadata: {
            actor_name: undefined,
            actor_avatar_url: "/george.png",
          },
        }),
      };
      render(<ActivityCard item={item} />);
      const img = screen.getByRole("img", { name: /avatar/i });
      expect(img).toBeInTheDocument();
    });
  });

  describe("episode_batch", () => {
    it("renders batch with single actor and episode count", () => {
      const activity = makeActivity();
      const item: GroupedActivity = {
        type: "episode_batch",
        content_id: 101,
        metadata: activity.metadata,
        actors: [{ actor_id: "actor-1", name: "Alice" }],
        episodes: [activity],
        latest_at: activity.created_at,
      };
      render(<ActivityCard item={item} />);
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText(/assistiu/i)).toBeInTheDocument();
      expect(screen.getByText(/Breaking Bad/)).toBeInTheDocument();
    });

    it("renders batch with two actors using 'e'", () => {
      const a1 = makeActivity({ id: "a1" });
      const a2 = makeActivity({ id: "a2" });
      const item: GroupedActivity = {
        type: "episode_batch",
        content_id: 101,
        metadata: a1.metadata,
        actors: [
          { actor_id: "actor-1", name: "Alice" },
          { actor_id: "actor-2", name: "Bob" },
        ],
        episodes: [a1, a2],
        latest_at: a1.created_at,
      };
      render(<ActivityCard item={item} />);
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText(/Bob/)).toBeInTheDocument();
    });

    it("renders batch with 3+ actors as 'X e mais N'", () => {
      const a1 = makeActivity({ id: "a1" });
      const item: GroupedActivity = {
        type: "episode_batch",
        content_id: 101,
        metadata: a1.metadata,
        actors: [
          { actor_id: "actor-1", name: "Alice" },
          { actor_id: "actor-2", name: "Bob" },
          { actor_id: "actor-3", name: "Carol" },
        ],
        episodes: [a1],
        latest_at: a1.created_at,
      };
      render(<ActivityCard item={item} />);
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText(/mais 2/i)).toBeInTheDocument();
    });

    it("renders S01E03 label for single episode batch", () => {
      const activity = makeActivity();
      const item: GroupedActivity = {
        type: "episode_batch",
        content_id: 101,
        metadata: activity.metadata,
        actors: [{ actor_id: "actor-1", name: "Alice" }],
        episodes: [activity],
        latest_at: activity.created_at,
      };
      render(<ActivityCard item={item} />);
      expect(screen.getByText(/S01E03/)).toBeInTheDocument();
    });

    it("renders episode count when multiple episodes", () => {
      const a1 = makeActivity({ id: "a1" });
      const a2 = makeActivity({ id: "a2" });
      const item: GroupedActivity = {
        type: "episode_batch",
        content_id: 101,
        metadata: a1.metadata,
        actors: [{ actor_id: "actor-1", name: "Alice" }],
        episodes: [a1, a2],
        latest_at: a1.created_at,
      };
      render(<ActivityCard item={item} />);
      expect(screen.getByText(/2 episódios/)).toBeInTheDocument();
    });

    it("renders poster image when poster_path is provided", () => {
      const activity = makeActivity();
      const item: GroupedActivity = {
        type: "episode_batch",
        content_id: 101,
        metadata: activity.metadata,
        actors: [{ actor_id: "actor-1", name: "Alice" }],
        episodes: [activity],
        latest_at: activity.created_at,
      };
      render(<ActivityCard item={item} />);
      const img = screen.getByRole("img", { name: /Breaking Bad/i });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", expect.stringContaining("/bb.jpg"));
    });

    it("renders poster image with fallback alt when title is missing", () => {
      const activity = makeActivity({ metadata: { poster_path: "/bb.jpg" } });
      const item: GroupedActivity = {
        type: "episode_batch",
        content_id: 101,
        metadata: activity.metadata,
        actors: [{ actor_id: "actor-1", name: "Alice" }],
        episodes: [activity],
        latest_at: activity.created_at,
      };
      render(<ActivityCard item={item} />);
      const img = screen.getByRole("img", { name: /poster/i });
      expect(img).toBeInTheDocument();
    });

    it("renders episode batch with fallback texts for missing title and actor name", () => {
      const activity = makeActivity({ metadata: {} });
      const item: GroupedActivity = {
        type: "episode_batch",
        content_id: 101,
        metadata: activity.metadata,
        actors: [{ actor_id: "actor-1", name: undefined }],
        episodes: [activity],
        latest_at: activity.created_at,
      };
      render(<ActivityCard item={item} />);
      expect(screen.getByText(/Alguém/)).toBeInTheDocument();
      expect(screen.getByText(/conteúdo/)).toBeInTheDocument();
    });

    it("renders gracefully even if episodes array is empty (edge case)", () => {
      const activity = makeActivity();
      const item: GroupedActivity = {
        type: "episode_batch",
        content_id: 101,
        metadata: activity.metadata,
        actors: [{ actor_id: "actor-1", name: "Alice" }],
        episodes: [],
        latest_at: activity.created_at,
      };
      render(<ActivityCard item={item} />);
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
    });
  });
});
