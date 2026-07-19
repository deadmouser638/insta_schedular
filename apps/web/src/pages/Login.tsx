import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { api } from '../api/client'
import { useAuthStore } from '../stores/authStore'
import { useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type FormData = z.infer<typeof schema>

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })
  const setAccessToken = useAuthStore(s => s.setAccessToken)
  const setUser = useAuthStore(s => s.setUser)
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handleAutoLogin = async () => {
      try {
        setLoading(true)
        // Attempt login, if fails try register
        try {
          const res = await api.post('/auth/login', { email: 'dev@example.com', password: 'password123' })
          setAccessToken(res.data.accessToken)
          setUser(res.data.user)
          navigate('/dashboard')
        } catch {
          await api.post('/auth/register', { email: 'dev@example.com', password: 'password123', name: 'Dev User' })
          const res = await api.post('/auth/login', { email: 'dev@example.com', password: 'password123' })
          setAccessToken(res.data.accessToken)
          setUser(res.data.user)
          navigate('/dashboard')
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Dev auto-login failed')
      } finally {
        setLoading(false)
      }
    }
    
    handleAutoLogin()
  }, [])

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true)
      const res = await api.post('/auth/login', data)
      setAccessToken(res.data.accessToken)
      setUser(res.data.user)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/30 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-600/30 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>

      <div className="w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10 transition-all duration-500 hover:border-white/20">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 mb-2 text-center tracking-tight">Welcome Back</h1>
        <p className="text-zinc-400 text-center mb-8">Sign in to IG Scheduler Pro</p>
        
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-6 text-sm flex items-center animate-in slide-in-from-top-2">{error}</div>}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5 ml-1">Email</label>
            <input {...register('email')} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-zinc-600 shadow-inner" placeholder="you@example.com" />
            {errors.email && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5 ml-1">Password</label>
            <input type="password" {...register('password')} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-zinc-600 shadow-inner" placeholder="••••••••" />
            {errors.password && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex justify-center items-center">
            {loading ? <span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></span> : 'Sign In'}
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-zinc-400">
          Don't have an account? <Link to="/register" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">Register here</Link>
        </p>
      </div>
    </div>
  )
}
