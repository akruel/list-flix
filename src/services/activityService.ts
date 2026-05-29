import { groupActivities } from "@/lib/activity";
import { supabase } from "@/lib/supabase";
import type { Activity } from "@/types";

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
export { groupActivities };
