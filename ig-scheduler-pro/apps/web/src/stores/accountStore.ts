import { create } from 'zustand';
import { api } from '../api/client';
import { IgAccount } from '../types';

interface AccountState {
  account: IgAccount | null;
  loading: boolean;
  fetchAccount: () => Promise<void>;
  connectAccount: (data: any) => Promise<void>;
  disconnectAccount: () => Promise<void>;
}

export const useAccountStore = create<AccountState>((set) => ({
  account: null,
  loading: false,
  fetchAccount: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/accounts');
      set({ account: data, loading: false });
    } catch (e) {
      set({ loading: false });
    }
  },
  connectAccount: async (data) => {
    const { data: acc } = await api.post('/accounts/connect', data);
    set({ account: acc });
  },
  disconnectAccount: async () => {
    await api.delete('/accounts');
    set({ account: null });
  }
}));
