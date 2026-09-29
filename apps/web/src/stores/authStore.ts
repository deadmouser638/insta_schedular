import { create } from 'zustand'

interface AuthState {
  isAuthenticated: boolean
  accessToken: string | null
  user: {
    id: string
    email: string
    name?: string
    niche?: string
    defaultTone?: string
  } | null
  login: (user: any, token: string) => void
  setAccessToken: (token: string) => void
  setUser: (user: any) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: true, // Bypassing login
  accessToken: 'dev-token-sample',
  user: {
    id: 'dev-bypass',
    name: 'Dev user',
    email: 'dev@example.com'
  },
  login: (user, token) => set({ isAuthenticated: true, user, accessToken: token }),
  setAccessToken: (token) => set({ accessToken: token, isAuthenticated: true }),
  setUser: (user) => set({ user, isAuthenticated: true }),
  logout: () => {
    set({ isAuthenticated: false, user: null, accessToken: null })
  },
}))
