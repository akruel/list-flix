import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";

export const pushSubscriptionService = {
  async hasSubscription(userId: string) {
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      logger.error("Failed to check push subscription:", error);
      return false;
    }

    return !!data;
  },

  async saveSubscription(input: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }) {
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: input.userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      },
      { onConflict: "user_id" },
    );

    if (error) throw error;
  },

  async removeSubscription(userId: string) {
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;
  },
};
