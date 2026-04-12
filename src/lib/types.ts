/**
 * Types shared between the client and server go here.
 */

export interface Message {
  id: number;
  user_id: string;
  content: string;
  is_edited?: boolean | number;
  is_deleted?: boolean | number;
  reply_to_message_id?: number | null;
  reply_to_content?: string | null;
  reply_to_user_id?: string | null;
  reply_to_user_name?: string | null;
  is_pinned?: boolean | number;
  event_id?: number | null;
  event?: Event;
  listing_id?: number | null;
  listing?: MarketListing;
  created_at: string;
  updated_at?: string;
  user_name: string;
  user_avatar_url?: string | null;
  user_room_number?: string | null;
  user_is_deleted?: number | null;
  user_is_active?: number | null;
  type?: 'message';
  reactions?: Reaction[];
  attachments?: Attachment[];
  reads?: MessageRead[];
  is_active_announcement?: boolean | number;
  announcement_expires_at?: string | null;
}

export interface Reaction {
  id: number;
  message_id?: number;
  user_id: string;
  user_name: string;
  emoji: string;
  created_at?: string;
}

export interface Attachment {
  id: number;
  message_id?: number;
  filename: string;
  file_key: string;
  file_size: number;
  content_type: string;
  created_at?: string;
}

export interface MessageRead {
  id: number;
  message_id?: number;
  user_id: string;
  user_name: string;
  user_avatar_url?: string | null;
  read_at: string;
}

export interface SystemMessage {
  id: number;
  type: 'system';
  user_id: string;
  message?: string;
  metadata?: string;
  created_at: string;
}

export interface Event {
  id: number;
  name: string;
  description?: string;
  location?: string;
  start_datetime: string;
  end_datetime: string;
  max_members: number;
  image_url?: string;
  creator_user_id: string;
  creator_name?: string;
  creator_is_deleted?: number | null;
  creator_is_active?: number | null;
  message_id?: number;
  created_at: string;
  updated_at: string;
  current_members?: number;
  is_joined?: boolean | number;
  is_creator?: boolean | number;
  is_expired?: boolean | number;
}

export interface MarketListing {
  id: number;
  title: string;
  description: string;
  type: 'offering' | 'requesting';
  transaction_type: 'sale' | 'rent' | 'buy';
  is_free: boolean | number;
  price?: number | null;
  rental_start_datetime?: string | null;
  rental_end_datetime?: string | null;
  status: 'open' | 'discussion' | 'confirmed' | 'closed';
  creator_user_id: string;
  creator_name?: string;
  creator_avatar?: string;
  creator_room?: string;
  creator_is_deleted?: number | null;
  creator_is_active?: number | null;
  is_deleted?: boolean | number;
  is_completed?: boolean | number;
  message_id?: number;
  created_at: string;
  updated_at: string;
  images?: string[];
  interested_count?: number;
  is_interested?: boolean | number;
}

export interface EventMember {
  id: number;
  event_id: number;
  user_id: string;
  is_admin: boolean | number;
  joined_at: string;
  created_at: string;
  updated_at: string;
}
