/// <reference types="vite/client" />
import axios from 'axios'

export const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3001/api',
  withCredentials: true,
})

let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = []

api.interceptors.request.use((config) => {
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    return Promise.reject(err)
  }
)
