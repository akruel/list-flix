import { supabase } from '../lib/supabase';
import type { ContentItem } from '../types';

export interface SharedList {
  id: string;
  created_at: string;
  items: { id: number; type: 'movie' | 'tv' }[];
}

export const supabaseService = {
  async shareList(items: ContentItem[]): Promise<string> {
    // 1. Create the list
    const { data: list, error: listError } = await supabase
      .from('lists')
      .insert([{ name: 'Shared List' }]) // Default name
      .select()
      .single();

    if (listError) {
      console.error('Error creating list:', listError);
      throw listError;
    }

    // 2. Add items to the list
    const listItems = items.map((item) => ({
      list_id: list.id,
      content_id: item.id,
      content_type: item.media_type,
    }));

    const { error: itemsError } = await supabase
      .from('list_items')
      .insert(listItems);

    if (itemsError) {
      console.error('Error adding items to list:', itemsError);
      throw itemsError;
    }

    return list.id;
  },

  async getSharedList(id: string): Promise<{ id: number; type: 'movie' | 'tv' }[]> {
    const { data, error } = await supabase
      .from('list_items')
      .select('content_id, content_type')
      .eq('list_id', id);

    if (error) {
      console.error('Error fetching shared list:', error);
      throw error;
    }

    return data.map((item) => ({
      id: item.content_id,
      type: item.content_type as 'movie' | 'tv',
    }));
  },
};
