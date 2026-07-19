import { create } from 'zustand'

interface AuthState {
  isAuthenticated: boolean
  user: {
    id: string
    email: string
    name?: string
    niche?: string
    defaultTone?: string
  } | null
  login: (user: any, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: true, // Bypassing login
  user: {
    id: 'dev-bypass',
    name: 'Dev user',
    email: 'dev@example.com'
  },
  login: (user, _token) => set({ isAuthenticated: true, user }),
  logout: () => {
    set({ isAuthenticated: false, user: null })
  },
}))
