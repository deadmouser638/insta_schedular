export interface User {
  id: string;
  email: string;
}

export interface Settings {
  niche?: string;
  defaultTone?: string;
  defaultSlots?: string[];
}

export interface IgAccount {
  id: string;
  userId: string;
  igUserId: string;
  igUsername?: string;
  imgHost: string;
  connectedAt: string;
}

export interface Post {
  id: string;
  userId: string;
  type: string;
  caption?: string;
  hashtags: string[];
  mediaUrls: string[];
  scheduledAt: string;
  method: string;
  status: string;
  igMediaId?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  error: string | any[];
}
