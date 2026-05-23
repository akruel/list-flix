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

export function groupActivities(activities: Activity[]): GroupedActivity[] {
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

          if (new Date(activity.created_at) > new Date(existing.latest_at)) {
            existing.latest_at = activity.created_at;
          }

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
