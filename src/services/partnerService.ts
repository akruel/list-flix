import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import type { AvailableUser, WatchPartner } from "@/types";

export const partnerService = {
  async getAvailableUsers(): Promise<AvailableUser[]> {
    const { data, error } = await supabase.rpc("list_non_anonymous_users");

    if (error) {
      logger.error("Error fetching available users:", error);
      return [];
    }

    return data as AvailableUser[];
  },

  async addPartner(userId: string): Promise<WatchPartner | null> {
    const { data, error } = await supabase
      .from("watch_partners")
      .insert({ partner_user_id: userId })
      .select()
      .single();

    if (error) {
      logger.error("Error adding partner:", error);
      return null;
    }

    return data as WatchPartner;
  },

  async removePartner(partnerId: string): Promise<void> {
    const { error } = await supabase
      .from("watch_partners")
      .delete()
      .eq("id", partnerId);

    if (error) logger.error("Error removing partner:", error);
  },

  async getPartners(): Promise<WatchPartner[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("watch_partners")
      .select("*")
      .or(`user_id.eq.${user.id},partner_user_id.eq.${user.id}`);

    if (error) {
      logger.error("Error fetching partners:", error);
      return [];
    }

    return data as WatchPartner[];
  },

  async getAcceptedPartners(): Promise<WatchPartner[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("watch_partners")
      .select("*")
      .or(`user_id.eq.${user.id},partner_user_id.eq.${user.id}`);

    if (error) {
      logger.error("Error fetching partners:", error);
      return [];
    }

    return data as WatchPartner[];
  },
};
