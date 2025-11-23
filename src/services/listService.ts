import { supabase } from '../lib/supabase';
import type { List, ListItem, ContentItem } from '../types';

export const listService = {
  async createList(name: string): Promise<List> {
    const { data, error } = await supabase
      .from('lists')
      .insert([{ name }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getLists(): Promise<List[]> {
    // Get lists where user is a member
    const { data, error } = await supabase
      .from('lists')
      .select(`
        *,
        list_members!inner (
          role
        )
      `);

    if (error) throw error;

    return data.map((list: any) => ({
      ...list,
      role: list.list_members[0].role,
    }));
  },

  async getListDetails(id: string): Promise<{ list: List; items: ListItem[] }> {
    const { data: list, error: listError } = await supabase
      .from('lists')
      .select(`
        *,
        list_members!inner (
          role
        )
      `)
      .eq('id', id)
      .single();

    if (listError) throw listError;

    const { data: items, error: itemsError } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', id);

    if (itemsError) throw itemsError;

    return {
      list: {
        ...list,
        role: list.list_members[0].role,
      },
      items,
    };
  },

  async addListItem(listId: string, item: ContentItem): Promise<void> {
    const { error } = await supabase
      .from('list_items')
      .insert([
        {
          list_id: listId,
          content_id: item.id,
          content_type: item.media_type,
        },
      ]);

    if (error) throw error;
  },

  async removeListItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('list_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  },

  async joinList(listId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if already a member
    const { data: existing } = await supabase
      .from('list_members')
      .select('role')
      .eq('list_id', listId)
      .eq('user_id', user.id)
      .single();

    if (existing) return;

    const { error } = await supabase
      .from('list_members')
      .insert([
        {
          list_id: listId,
          user_id: user.id,
          role: 'viewer', // Default role
        },
      ]);

    if (error) throw error;
  },
  
  getShareUrl(listId: string): string {
    return `${window.location.origin}/lists/${listId}/join`;
  }
};
