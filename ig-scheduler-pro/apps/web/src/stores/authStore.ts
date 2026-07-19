import { create } from 'zustand';
import { api } from '../api/client';
import { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, pwd: string) => Promise<void>;
  register: (email: string, pwd: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setToken: (t: string) => void;
  logoutClientSide: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  setToken: (token) => set({ accessToken: token }),
  
  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('user', JSON.stringify(data.user));
    set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true });
  },
  
  register: async (email, password) => {
    await api.post('/auth/register', { email, password });
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('user', JSON.stringify(data.user));
    set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true });
  },
  
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    localStorage.removeItem('user');
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
  
  logoutClientSide: () => {
    localStorage.removeItem('user');
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
  
  hydrate: async () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const { data } = await api.post('/auth/refresh');
        set({ accessToken: data.accessToken, user: JSON.parse(userStr), isAuthenticated: true });
      } catch {
        localStorage.removeItem('user');
        set({ user: null, accessToken: null, isAuthenticated: false });
      }
    }
  }
}));
