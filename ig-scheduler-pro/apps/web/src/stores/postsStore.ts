import { create } from 'zustand';
import { api } from '../api/client';
import { Post } from '../types';

interface PostsState {
  posts: Post[];
  loading: boolean;
  filter: 'all' | 'feed' | 'story' | string;
  fetchPosts: () => Promise<void>;
  createPost: (data: any) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  publishPost: (id: string) => Promise<void>;
  setFilter: (f: string) => void;
  filteredPosts: () => Post[];
}

export const usePostsStore = create<PostsState>((set, get) => ({
  posts: [],
  loading: false,
  filter: 'all',
  fetchPosts: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/posts');
      set({ posts: data, loading: false });
    } catch (e) {
      set({ loading: false });
    }
  },
  createPost: async (data) => {
    const { data: newPost } = await api.post('/posts', data);
    set(state => ({ posts: [...state.posts, newPost] }));
  },
  deletePost: async (id) => {
    await api.delete(`/posts/${id}`);
    set(state => ({ posts: state.posts.filter(p => p.id !== id) }));
  },
  publishPost: async (id) => {
    const { data } = await api.post(`/posts/${id}/publish`);
    set(state => ({
      posts: state.posts.map(p => p.id === id ? { ...p, status: 'published', igMediaId: data.igMediaId, publishedAt: data.publishedAt } : p)
    }));
  },
  setFilter: (filter) => set({ filter }),
  filteredPosts: () => {
    const { posts, filter } = get();
    if (filter === 'all') return posts;
    return posts.filter(p => p.type === filter);
  }
}));
