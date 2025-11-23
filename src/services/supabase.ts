import { supabase } from '../lib/supabase';
import type { ContentItem } from '../types';

export interface SharedList {
  id: string;
  created_at: string;
  items: { id: number; type: 'movie' | 'tv' }[];
}

export const supabaseService = {
  async shareList(items: ContentItem[]): Promise<string> {
    const listData = items.map((item) => ({
      id: item.id,
      type: item.media_type,
    }));

    const { data, error } = await supabase
      .from('lists')
      .insert([{ items: listData }])
      .select()
      .single();

    if (error) {
      console.error('Error sharing list:', error);
      throw error;
    }

    return data.id;
  },

  async getSharedList(id: string): Promise<{ id: number; type: 'movie' | 'tv' }[]> {
    const { data, error } = await supabase
      .from('lists')
      .select('items')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching shared list:', error);
      throw error;
    }

    return data.items;
  },
};
