/// <reference types="vite/client" />
import axios from 'axios'

export const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || '/api',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    return Promise.reject(err)
  }
)
