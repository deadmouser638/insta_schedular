import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api',
  withCredentials: true, // Send cookies (refresh token)
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = []

const processQueue = (error: any, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token as any)
  })
  failedQueue = []
}

api.interceptors.request.use((config) => {
  // We do not store accessToken anymore because we're bypassing login
  // But usually you would do:
  /*
  const token = useAuthStore.getState().accessToken
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  */
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config

    if (err.response?.status === 401 && !originalRequest._retry) {
      // Intentionally doing nothing here as we are bypassing auth flow
      return Promise.reject(err)
    }

    // Usually you would try to refresh token here.

    return Promise.reject(err)
  }
)
