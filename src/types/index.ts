export interface ContentItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  media_type: 'movie' | 'tv';
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
}

export interface UserContent {
  id: string;
  user_id: string;
  content_id: number;
  content_type: 'movie' | 'tv' | 'episode';
  interaction_type: 'watchlist' | 'watched';
  metadata: any;
  created_at: string;
}

export interface List {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  role?: 'owner' | 'editor' | 'viewer'; // Computed from list_members
}

export interface ListMember {
  list_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at: string;
}

export interface ListItem {
  id: string;
  list_id: string;
  content_id: number;
  content_type: 'movie' | 'tv';
  added_by: string;
  created_at: string;
  // Joined fields
  content?: ContentItem; 
}
