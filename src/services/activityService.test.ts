import { describe, expect, it, vi } from "vitest";

export const mockRpc = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import type { Activity } from "@/types";

import { activityService, groupActivities } from "./activityService";

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: crypto.randomUUID(),
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
      episode_number: 1,
    },
    created_at: "2026-05-22T10:00:00Z",
    ...overrides,
  };
}

describe("activityService.getActivityFeed", () => {
  it("calls supabase.rpc with default limits and offset", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    const feed = await activityService.getActivityFeed();
    expect(mockRpc).toHaveBeenCalledWith("get_activity_feed", {
      p_limit: 50,
      p_offset: 0,
    });
    expect(feed).toEqual([]);
  });

  it("calls supabase.rpc with custom limits and offset", async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ id: "act-1" }], error: null });
    const feed = await activityService.getActivityFeed(20, 10);
    expect(mockRpc).toHaveBeenCalledWith("get_activity_feed", {
      p_limit: 20,
      p_offset: 10,
    });
    expect(feed).toEqual([{ id: "act-1" }]);
  });

  it("throws when supabase.rpc returns an error", async () => {
    const errorObj = new Error("Database error");
    mockRpc.mockResolvedValueOnce({ data: null, error: errorObj });
    await expect(activityService.getActivityFeed()).rejects.toThrow(
      "Database error",
    );
  });

  it("returns empty array if data is null but no error", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });
    const feed = await activityService.getActivityFeed();
    expect(feed).toEqual([]);
  });
});

describe("groupActivities", () => {
  it("returns empty array for empty input", () => {
    expect(groupActivities([])).toEqual([]);
  });

  it("wraps non-episode-watched activities as singles", () => {
    const activity = makeActivity({ activity_type: "movie_watched" });
    const result = groupActivities([activity]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: "single", activity });
  });

  it("wraps member_joined as single", () => {
    const activity = makeActivity({
      activity_type: "member_joined",
      content_id: null,
      content_type: null,
    });
    const result = groupActivities([activity]);
    expect(result[0]).toEqual({ type: "single", activity });
  });

  it("wraps item_added as single", () => {
    const activity = makeActivity({ activity_type: "item_added" });
    const result = groupActivities([activity]);
    expect(result[0]).toEqual({ type: "single", activity });
  });

  it("wraps item_removed as single", () => {
    const activity = makeActivity({ activity_type: "item_removed" });
    const result = groupActivities([activity]);
    expect(result[0]).toEqual({ type: "single", activity });
  });

  it("creates an episode_batch for a single episode_watched event", () => {
    const activity = makeActivity();
    const result = groupActivities([activity]);

    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe("episode_batch");

    const group = result[0];

    if (group?.type !== "episode_batch")
      throw new Error("Expected episode_batch");
    expect(group.content_id).toBe(101);
    expect(group.episodes).toHaveLength(1);
    expect(group.actors).toHaveLength(1);
    expect(group.actors[0]?.actor_id).toBe("actor-1");
    expect(group.latest_at).toBe(activity.created_at);
  });

  it("batches multiple episode_watched events for same show on same day", () => {
    const a1 = makeActivity({ id: "a1", created_at: "2026-05-22T10:00:00Z" });
    const a2 = makeActivity({
      id: "a2",
      created_at: "2026-05-22T12:00:00Z",
      metadata: { ...a1.metadata, episode_number: 2 },
    });

    const result = groupActivities([a1, a2]);
    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe("episode_batch");

    const group = result[0];
    if (group?.type !== "episode_batch")
      throw new Error("Expected episode_batch");
    expect(group.episodes).toHaveLength(2);
  });

  it("does NOT batch episode_watched events from different days", () => {
    const a1 = makeActivity({ id: "a1", created_at: "2026-05-21T10:00:00Z" });
    const a2 = makeActivity({ id: "a2", created_at: "2026-05-22T10:00:00Z" });

    const result = groupActivities([a1, a2]);
    expect(result).toHaveLength(2);
  });

  it("does NOT batch episode_watched events for different shows", () => {
    const a1 = makeActivity({ id: "a1", content_id: 101 });
    const a2 = makeActivity({ id: "a2", content_id: 202 });

    const result = groupActivities([a1, a2]);
    expect(result).toHaveLength(2);
  });

  it("merges multiple actors watching same show on same day", () => {
    const a1 = makeActivity({
      id: "a1",
      actor_id: "actor-1",
      metadata: { actor_name: "Alice" },
    });
    const a2 = makeActivity({
      id: "a2",
      actor_id: "actor-2",
      metadata: { actor_name: "Bob" },
    });

    const result = groupActivities([a1, a2]);
    expect(result).toHaveLength(1);

    const group = result[0];
    if (group?.type !== "episode_batch")
      throw new Error("Expected episode_batch");
    expect(group.actors).toHaveLength(2);
    const ids = group.actors.map((a) => a.actor_id);
    expect(ids).toContain("actor-1");
    expect(ids).toContain("actor-2");
  });

  it("does not duplicate actor when same actor watches multiple episodes of same show on same day", () => {
    const a1 = makeActivity({
      id: "a1",
      actor_id: "actor-1",
      metadata: { actor_name: "Alice", episode_number: 1 },
    });
    const a2 = makeActivity({
      id: "a2",
      actor_id: "actor-1",
      metadata: { actor_name: "Alice", episode_number: 2 },
    });

    const result = groupActivities([a1, a2]);
    const group = result[0];
    if (group?.type !== "episode_batch")
      throw new Error("Expected episode_batch");
    expect(group.actors).toHaveLength(1);
    expect(group.episodes).toHaveLength(2);
  });

  it("episode_watched with null content_id falls through as single", () => {
    const activity = makeActivity({ content_id: null });
    const result = groupActivities([activity]);
    expect(result[0]?.type).toBe("single");
  });

  it("preserves order of non-batched items relative to batches", () => {
    const watched = makeActivity({
      id: "w1",
      activity_type: "episode_watched",
    });
    const added = makeActivity({ id: "a1", activity_type: "item_added" });

    const result = groupActivities([watched, added]);
    expect(result).toHaveLength(2);
    expect(result[0]?.type).toBe("episode_batch");
    expect(result[1]?.type).toBe("single");
  });
});
