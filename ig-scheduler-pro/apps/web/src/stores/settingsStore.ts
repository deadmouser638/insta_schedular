import { create } from 'zustand';
import { api } from '../api/client';
import { Settings } from '../types';

interface SettingsState {
  settings: Settings | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (data: Partial<Settings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  fetchSettings: async () => {
    try {
      const { data } = await api.get('/settings');
      set({ settings: data });
    } catch (e) {}
  },
  updateSettings: async (data) => {
    const { data: updated } = await api.put('/settings', data);
    set({ settings: updated });
  }
}));
