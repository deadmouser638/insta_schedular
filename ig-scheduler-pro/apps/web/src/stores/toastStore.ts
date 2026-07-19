import { create } from 'zustand';

interface ToastState {
  message: string;
  type: 'success' | 'error' | '';
  visible: boolean;
  toast: (msg: string, type?: 'success' | 'error' | '') => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: '',
  type: '',
  visible: false,
  toast: (message, type = '') => {
    set({ message, type, visible: true });
    setTimeout(() => {
      set({ visible: false });
    }, 2800);
  }
}));
