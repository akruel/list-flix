import { getDayKeyFromIso } from "@/lib/date-utils";
import { supabase } from "@/lib/supabase";
import type { Activity, GroupedActivity } from "@/types";

export const activityService = {
  async getActivityFeed(limit = 50, offset = 0): Promise<Activity[]> {
    const { data, error } = await supabase.rpc("get_activity_feed", {
      p_limit: limit,
      p_offset: offset,
    });

    if (error) throw error;
    return (data ?? []) as Activity[];
  },
};

/**
 * Groups episode_watched activities by (content_id, day).
 * Multiple actors watching the same show on the same day are consolidated.
 * All other activity types remain as singles.
 * Input must be sorted by created_at DESC.
 */
export function groupActivities(activities: Activity[]): GroupedActivity[] {
  // Map key: `${content_id}:${dayKey}` → batch index in result array
  const episodeBatchIndex = new Map<string, number>();
  const result: GroupedActivity[] = [];

  for (const activity of activities) {
    if (
      activity.activity_type === "episode_watched" &&
      activity.content_id !== null
    ) {
      const dayKey = getDayKeyFromIso(activity.created_at);
      const batchKey = `${activity.content_id}:${dayKey}`;
      const existingIndex = episodeBatchIndex.get(batchKey);

      if (existingIndex !== undefined) {
        const existing = result[existingIndex];
        if (existing.type === "episode_batch") {
          existing.episodes.push(activity);

          // Add actor if not already present
          const alreadyHasActor = existing.actors.some(
            (a) => a.actor_id === activity.actor_id,
          );
          if (!alreadyHasActor) {
            existing.actors.push({
              actor_id: activity.actor_id,
              name: activity.metadata.actor_name,
              avatar_url: activity.metadata.actor_avatar_url,
            });
          }
        }
      } else {
        const newIndex = result.length;
        episodeBatchIndex.set(batchKey, newIndex);
        result.push({
          type: "episode_batch",
          content_id: activity.content_id,
          metadata: activity.metadata,
          actors: [
            {
              actor_id: activity.actor_id,
              name: activity.metadata.actor_name,
              avatar_url: activity.metadata.actor_avatar_url,
            },
          ],
          episodes: [activity],
          latest_at: activity.created_at,
        });
      }
    } else {
      result.push({ type: "single", activity });
    }
  }

  return result;
}
