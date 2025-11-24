import { supabase } from '../lib/supabase';

export interface SharedList {
  id: string;
  created_at: string;
  items: { id: number; type: 'movie' | 'tv' }[];
}

export const supabaseService = {
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
