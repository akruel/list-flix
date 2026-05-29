import { getListShareUrl } from "@/lib/list-share";

import { supabase } from "../lib/supabase";
import type {
  ContentItem,
  List,
  ListItem,
  ListMember,
  WatchingContext,
} from "../types";

interface ListWithMembers extends Omit<List, "role"> {
  list_members: Array<{
    role: "owner" | "editor" | "viewer";
    user_id: string;
    member_name?: string;
  }>;
}

interface ListItemRow {
  list_id: string;
  id: string;
}

export const listService = {
  async createList(name: string): Promise<List> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const displayName =
      user?.user_metadata?.display_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name;

    const { data, error } = await supabase
      .from("lists")
      .insert([{ name }])
      .select()
      .single();

    if (error) throw error;

    // Update the owner's member_name if we have a display name
    if (displayName && user) {
      await supabase
        .from("list_members")
        .update({ member_name: displayName })
        .eq("list_id", data.id)
        .eq("user_id", user.id);
    }

    return data;
  },

  async getLists(): Promise<List[]> {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Get lists where user is a member
    const { data, error } = await supabase.from("lists").select(`
        *,
        list_members!inner (
          user_id,
          role
        )
      `);

    if (error) throw error;

    const result = data.map((list: ListWithMembers) => {
      // Find the current user's role in this list
      const currentUserMember = list.list_members.find(
        (m) => m.user_id === user.id,
      );

      return {
        ...list,
        role: currentUserMember?.role || "viewer",
      };
    });

    return result;
  },

  async getListDetails(
    id: string,
  ): Promise<{ list: List; items: ListItem[]; members: ListMember[] }> {
    const { data: list, error: listError } = await supabase
      .from("lists")
      .select(
        `
        *,
        list_members (
          user_id,
          role,
          member_name
        )
      `,
      )
      .eq("id", id)
      .single();

    if (listError) throw listError;

    // Get current user's role
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const currentUserMember = (list as ListWithMembers).list_members.find(
      (m) => m.user_id === user?.id,
    );

    const { data: items, error: itemsError } = await supabase
      .from("list_items")
      .select("*")
      .eq("list_id", id);

    if (itemsError) throw itemsError;

    return {
      list: {
        ...list,
        role: currentUserMember?.role || "viewer",
      },
      items,
      members: list.list_members,
    };
  },

  async addListItem(listId: string, item: ContentItem): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("list_items").insert([
      {
        list_id: listId,
        content_id: item.id,
        content_type: item.media_type,
        title: item.title || item.name,
        poster_path: item.poster_path,
        added_by: user?.id,
      },
    ]);

    if (error) throw error;
  },

  async addListItems(listId: string, items: ContentItem[]): Promise<void> {
    if (items.length === 0) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const rows = items.map((item) => ({
      list_id: listId,
      content_id: item.id,
      content_type: item.media_type,
      title: item.title || item.name,
      poster_path: item.poster_path,
      added_by: user?.id,
    }));

    const { error } = await supabase.from("list_items").insert(rows);

    if (error) throw error;
  },

  async removeListItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from("list_items")
      .delete()
      .eq("id", itemId);

    if (error) throw error;
  },

  async removeListMember(listId: string, memberUserId: string): Promise<void> {
    const { error } = await supabase
      .from("list_members")
      .delete()
      .eq("list_id", listId)
      .eq("user_id", memberUserId);

    if (error) throw error;
  },

  async joinList(
    listId: string,
    memberName: string,
    role: "editor" | "viewer" = "viewer",
  ): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Check if already a member
    const { data: existing } = await supabase
      .from("list_members")
      .select("role")
      .eq("list_id", listId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) return;

    const { error } = await supabase.from("list_members").insert([
      {
        list_id: listId,
        user_id: user.id,
        role, // Use provided role
        member_name: memberName,
      },
    ]);

    if (error) throw error;
  },

  getShareUrl(listId: string, role: "editor" | "viewer"): string {
    return getListShareUrl(listId, role);
  },

  async getListName(listId: string): Promise<string> {
    const { data, error } = await supabase.rpc("get_list_name", {
      list_id: listId,
    });
    if (error) throw error;
    return data;
  },

  async getListsContainingContent(
    contentId: number,
    contentType: "movie" | "tv",
  ): Promise<Record<string, string>> {
    const { data, error } = await supabase
      .from("list_items")
      .select("list_id, id")
      .eq("content_id", contentId)
      .eq("content_type", contentType);

    if (error) throw error;

    return (data || []).reduce(
      (acc: Record<string, string>, item: ListItemRow) => ({
        ...acc,
        [item.list_id]: item.id,
      }),
      {},
    );
  },

  async getWatchingContext(
    contentId: number,
    contentType: "movie" | "tv",
  ): Promise<WatchingContext[]> {
    const { data, error } = await supabase.rpc("get_watching_context", {
      p_content_id: contentId,
      p_content_type: contentType,
    });

    if (error) throw error;
    return (
      (data || []) as Array<{
        list_name: string;
        member_names: string[];
      }>
    ).map((item) => ({
      listName: item.list_name,
      memberNames: item.member_names,
    }));
  },

  async getWatchingContextBatch(
    items: Array<{ contentId: number; contentType: "movie" | "tv" }>,
  ): Promise<Record<number, WatchingContext[]>> {
    const payload = items.map((i) => ({
      content_id: i.contentId,
      content_type: i.contentType,
    }));

    const { data, error } = await supabase.rpc("get_watching_context_batch", {
      p_items: payload,
    });

    if (error) throw error;

    const map: Record<number, WatchingContext[]> = {};
    for (const row of (data || []) as Array<{
      content_id: number;
      list_name: string;
      member_names: string[];
    }>) {
      if (!map[row.content_id]) map[row.content_id] = [];
      map[row.content_id].push({
        listName: row.list_name,
        memberNames: row.member_names,
      });
    }
    return map;
  },

  async getAllSharedTvItems(): Promise<
    Array<{ content_id: number; content_type: string }>
  > {
    const { data, error } = await supabase
      .from("list_items")
      .select("content_id, content_type")
      .eq("content_type", "tv");

    if (error) throw error;
    return (data || []) as Array<{
      content_id: number;
      content_type: string;
    }>;
  },

  async deleteList(listId: string): Promise<void> {
    const { error } = await supabase.from("lists").delete().eq("id", listId);

    if (error) throw error;
  },

  async updateList(listId: string, name: string): Promise<void> {
    const { error } = await supabase
      .from("lists")
      .update({ name })
      .eq("id", listId);

    if (error) throw error;
  },
};
