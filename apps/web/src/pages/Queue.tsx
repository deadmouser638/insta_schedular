import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { motion, AnimatePresence } from 'framer-motion'

interface IGAccountRef {
  id: string
  igUserId: string
  igUsername: string
  isActive: boolean
}

interface Post {
  id: string
  userId: string
  igAccountId: string
  type: string
  status: string
  caption: string | null
  hashtags: string
  imageUrls: string
  scheduledAt: string
  publishedAt: string | null
  igMediaId: string | null
  errorMessage: string | null
  method: string
  createdAt: string
  updatedAt: string
  igAccount: IGAccountRef
}

interface SchedulerStatus {
  running: boolean
  lastRunAt: string | null
  lastRunProcessed: number
  totalPublished: number
  totalFailed: number
}

type FilterTab = 'all' | 'scheduled' | 'published' | 'failed'

const FILTER_TABS: { value: FilterTab; label: string; icon: string }[] = [
  { value: 'all', label: 'All Posts', icon: '📋' },
  { value: 'scheduled', label: 'Scheduled', icon: '🕐' },
  { value: 'published', label: 'Published', icon: '✅' },
  { value: 'failed', label: 'Failed', icon: '❌' },
]

const AUTO_REFRESH_INTERVAL = 60000 // 60 seconds

export default function Queue() {
  const navigate = useNavigate()

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [editCaption, setEditCaption] = useState('')
  const [editScheduledAt, setEditScheduledAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null)
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(AUTO_REFRESH_INTERVAL / 1000)

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Fetch posts ─────────────────────────────────────────────────
  const fetchPosts = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const params: Record<string, string> = {}
      if (activeTab !== 'all') params.status = activeTab
      const res = await api.get('/posts', { params })
      setPosts(res.data)
    } catch (err) {
      console.error('Failed to fetch posts:', err)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  // ── Fetch scheduler status ──────────────────────────────────────
  const fetchSchedulerStatus = useCallback(async () => {
    try {
      const res = await api.get('/scheduler/status')
      setSchedulerStatus(res.data)
    } catch {
      // Scheduler status endpoint might not exist yet
    }
  }, [])

  // ── Initial load ────────────────────────────────────────────────
  useEffect(() => {
    fetchPosts()
    fetchSchedulerStatus()
  }, [fetchPosts, fetchSchedulerStatus])

  // ── Auto-refresh every 60 seconds ──────────────────────────────
  useEffect(() => {
    // Reset countdown
    setSecondsUntilRefresh(AUTO_REFRESH_INTERVAL / 1000)

    // Clear existing timers
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)

    // Main refresh interval
    refreshTimerRef.current = setInterval(() => {
      fetchPosts(true) // silent refresh — no loading spinner
      fetchSchedulerStatus()
      setSecondsUntilRefresh(AUTO_REFRESH_INTERVAL / 1000)
    }, AUTO_REFRESH_INTERVAL)

    // Countdown timer (updates every second)
    countdownRef.current = setInterval(() => {
      setSecondsUntilRefresh(prev => (prev <= 1 ? AUTO_REFRESH_INTERVAL / 1000 : prev - 1))
    }, 1000)

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [fetchPosts, fetchSchedulerStatus])

  // Auto-dismiss notifications
  useEffect(() => {
    if (!notification) return
    const t = setTimeout(() => setNotification(null), 5000)
    return () => clearTimeout(t)
  }, [notification])

  // ── Publish Now handler ─────────────────────────────────────────
  const handlePublishNow = async (postId: string) => {
    if (!window.confirm('Publish this post to Instagram right now?')) return
    try {
      setPublishingId(postId)
      await api.post(`/posts/${postId}/publish-now`)
      // Update local state to show publishing status
      setPosts(prev =>
        prev.map(p => (p.id === postId ? { ...p, status: 'publishing' } : p))
      )
      setNotification({ type: 'success', message: 'Publishing started! Status will update automatically.' })
      // Refresh after 8 seconds to pick up the result
      setTimeout(() => fetchPosts(true), 8000)
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.error || err.response?.data?.message || 'Failed to start publishing',
      })
    } finally {
      setPublishingId(null)
    }
  }

  // ── Delete handler ──────────────────────────────────────────────
  const handleDelete = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this scheduled post?')) return
    try {
      setDeletingId(postId)
      await api.delete(`/posts/${postId}`)
      setPosts(prev => prev.filter(p => p.id !== postId))
      setNotification({ type: 'success', message: 'Post deleted successfully' })
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete post',
      })
    } finally {
      setDeletingId(null)
    }
  }

  // ── Open edit modal ─────────────────────────────────────────────
  const openEdit = (post: Post) => {
    setEditingPost(post)
    setEditCaption(post.caption || '')
    const dt = new Date(post.scheduledAt)
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset())
    setEditScheduledAt(dt.toISOString().slice(0, 16))
  }

  // ── Save edit ───────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editingPost) return
    if (!editCaption.trim()) {
      setNotification({ type: 'error', message: 'Caption cannot be empty' })
      return
    }
    if (new Date(editScheduledAt) <= new Date()) {
      setNotification({ type: 'error', message: 'Scheduled time must be in the future' })
      return
    }

    try {
      setSaving(true)
      const res = await api.put(`/posts/${editingPost.id}`, {
        caption: editCaption.trim(),
        scheduledAt: new Date(editScheduledAt).toISOString(),
      })
      setPosts(prev => prev.map(p => (p.id === editingPost.id ? res.data : p)))
      setEditingPost(null)
      setNotification({ type: 'success', message: 'Post updated successfully' })
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update post',
      })
    } finally {
      setSaving(false)
    }
  }

  // ── Manual refresh ──────────────────────────────────────────────
  const handleManualRefresh = () => {
    fetchPosts(true)
    fetchSchedulerStatus()
    setSecondsUntilRefresh(AUTO_REFRESH_INTERVAL / 1000)
  }

  // ── Helpers ─────────────────────────────────────────────────────
  const parseJsonArray = (str: string): string[] => {
    try { return JSON.parse(str) } catch { return [] }
  }

  const getFirstImage = (post: Post): string | null => {
    const urls = parseJsonArray(post.imageUrls)
    return urls.length > 0 ? urls[0] : null
  }

  const getMinDatetime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  }

  // ── Status badge ────────────────────────────────────────────────
  const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { label: string; bg: string; text: string; dot: string }> = {
      scheduled: { label: 'Scheduled', bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
      published: { label: 'Published', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
      publishing: { label: 'Publishing…', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
      failed: { label: 'Failed', bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
      draft: { label: 'Draft', bg: 'bg-zinc-500/10', text: 'text-zinc-400', dot: 'bg-zinc-400' },
    }
    const c = config[status] || config.draft
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === 'publishing' ? 'animate-pulse' : ''}`} />
        {c.label}
      </span>
    )
  }

  const typeIcon: Record<string, string> = { feed: '🖼️', story: '📱', carousel: '🎠' }

  const stats = {
    all: posts.length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    published: posts.filter(p => p.status === 'published').length,
    failed: posts.filter(p => p.status === 'failed').length,
  }

  // Framer Motion Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 50, rotateX: 20 },
    show: { 
      opacity: 1, 
      y: 0, 
      rotateX: 0,
      transition: { type: "spring", stiffness: 200, damping: 20 }
    }
  }

  return (
    <div className="min-h-screen p-6 md:p-10 relative z-10 perspective-[1000px]">
      {/* ── Notification ─────────────────────────────────────────── */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-6 flex items-center gap-3 px-5 py-4 rounded-2xl border backdrop-blur-md shadow-2xl ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 shadow-emerald-500/10'
                : 'bg-red-500/10 border-red-500/20 text-red-300 shadow-red-500/10'
            }`}
          >
            <span className="text-xl">{notification.type === 'success' ? '✅' : '❌'}</span>
            <p className="flex-1 text-sm font-medium">{notification.message}</p>
            <button onClick={() => setNotification(null)} className="text-white/40 hover:text-white/80 transition-colors text-lg leading-none">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scheduler Status Bar ──────────────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-wrap items-center gap-4 px-5 py-3.5 rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl shadow-lg"
      >
        {/* Scheduler indicator */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8">
            <div className="absolute w-8 h-8 rounded-full bg-emerald-500/30 animate-ping" style={{ animationDuration: '3s' }} />
            <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-400 drop-shadow-md">Scheduler Running ✅</p>
            <p className="text-xs text-zinc-400">Checking every minute for due posts</p>
          </div>
        </div>

        <div className="hidden sm:block w-px h-8 bg-white/10" />

        {/* Stats from scheduler */}
        {schedulerStatus && (
          <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
            {schedulerStatus.lastRunAt && (
              <span title="Last scheduler run">
                Last check: {new Date(schedulerStatus.lastRunAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <span className="text-emerald-400">
              {schedulerStatus.totalPublished} published
            </span>
            {schedulerStatus.totalFailed > 0 && (
              <span className="text-red-400">
                {schedulerStatus.totalFailed} failed
              </span>
            )}
          </div>
        )}

        {/* Auto-refresh countdown + manual refresh */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-zinc-500 font-mono tabular-nums bg-white/5 px-2 py-1 rounded">
            refresh in {secondsUntilRefresh}s
          </span>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleManualRefresh}
            title="Refresh now"
            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-white/10 text-zinc-300 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </motion.button>
        </div>
      </motion.div>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300 mb-2 drop-shadow-md">
            Dashboard
          </h1>
          <p className="text-zinc-400 text-lg font-medium">Manage your scheduled Instagram posts.</p>
        </motion.div>
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px rgba(168,85,247,0.5)" }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/compose')}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center gap-2 flex-shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Post
        </motion.button>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────── */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      >
        {([
          { label: 'Total', value: stats.all, gradient: 'from-purple-600/20 to-pink-600/20', border: 'border-purple-500/20', text: 'text-purple-300', glow: 'shadow-purple-500/20' },
          { label: 'Scheduled', value: stats.scheduled, gradient: 'from-blue-600/20 to-cyan-600/20', border: 'border-blue-500/20', text: 'text-blue-300', glow: 'shadow-blue-500/20' },
          { label: 'Published', value: stats.published, gradient: 'from-emerald-600/20 to-teal-600/20', border: 'border-emerald-500/20', text: 'text-emerald-300', glow: 'shadow-emerald-500/20' },
          { label: 'Failed', value: stats.failed, gradient: 'from-red-600/20 to-orange-600/20', border: 'border-red-500/20', text: 'text-red-300', glow: 'shadow-red-500/20' },
        ]).map(s => (
          <motion.div 
            key={s.label} 
            variants={cardVariants}
            whileHover={{ y: -5, scale: 1.02 }}
            className={`rounded-2xl border ${s.border} bg-gradient-to-br ${s.gradient} p-6 backdrop-blur-xl shadow-lg hover:shadow-2xl hover:${s.glow} transition-all`}
          >
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">{s.label}</p>
            <p className={`text-4xl font-black ${s.text} drop-shadow-md`}>{s.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Filter Tabs ──────────────────────────────────────────── */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1 scrollbar-hide">
        {FILTER_TABS.map(tab => {
          const isActive = activeTab === tab.value
          return (
            <motion.button
              key={tab.value}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.value)}
              className={`relative overflow-hidden flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap border ${
                isActive
                  ? 'text-white border-transparent shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                  : 'bg-zinc-900/40 text-zinc-400 hover:text-white border-white/10 hover:border-white/20'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeFilterBg"
                  className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10 text-lg">{tab.icon}</span>
              <span className="relative z-10">{tab.label}</span>
              {tab.value === 'all' && (
                <span className={`relative z-10 ml-2 px-2 py-0.5 text-xs rounded-lg font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-black/40 text-zinc-300'
                }`}>
                  {stats[tab.value]}
                </span>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* ── Posts Grid ────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" 
          />
        </div>
      ) : posts.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-24 border border-dashed border-white/20 rounded-3xl bg-zinc-900/40 backdrop-blur-xl shadow-2xl"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5 drop-shadow-xl">
            <span className="text-4xl text-zinc-500">📭</span>
          </div>
          <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
            {activeTab === 'all' ? 'No Posts Yet' : `No ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Posts`}
          </h3>
          <p className="text-zinc-400 max-w-sm mx-auto mb-8 font-medium">
            {activeTab === 'all'
              ? 'Ready to make some magic? Create your first post and schedule it.'
              : `You don't have any ${activeTab} posts right now.`}
          </p>
          {activeTab === 'all' && (
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0_0_20px_rgba(168,85,247,0.6)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/compose')}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-2xl transition-all"
            >
              Create First Post
            </motion.button>
          )}
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-max"
        >
          {posts.map(post => {
            const imgUrl = getFirstImage(post)
            const hashtags = parseJsonArray(post.hashtags)
            const isEditable = post.status === 'scheduled' || post.status === 'draft'
            const isPublishable = post.status === 'scheduled'
            const isPublishing = post.status === 'publishing'

            return (
              <motion.div
                key={post.id}
                variants={cardVariants}
                whileHover={{ y: -8, rotateX: 5, rotateY: -2, zIndex: 10 }}
                style={{ transformStyle: 'preserve-3d' }}
                className={`group rounded-3xl border bg-zinc-900/60 backdrop-blur-xl overflow-hidden transition-all duration-300 shadow-xl flex flex-col ${
                  isPublishing
                    ? 'border-amber-500/40 shadow-[0_0_30px_rgba(251,191,36,0.2)]'
                    : 'border-white/10 hover:border-purple-500/30 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_20px_rgba(168,85,247,0.2)]'
                }`}
              >
                {/* ── Image Preview ──────────────────────────────────── */}
                {imgUrl ? (
                  <div className="relative h-56 bg-zinc-800/80 overflow-hidden transform-gpu" style={{ transform: 'translateZ(20px)' }}>
                    <motion.img
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      src={imgUrl}
                      alt="Post preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        target.parentElement!.classList.add('flex', 'items-center', 'justify-center')
                        const fallback = document.createElement('span')
                        fallback.className = 'text-zinc-500 text-sm font-bold'
                        fallback.textContent = 'Image unavailable'
                        target.parentElement!.appendChild(fallback)
                      }}
                    />
                    {isPublishing && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-10 h-10 border-4 border-amber-400/30 border-t-amber-400 rounded-full" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <StatusBadge status={post.status} />
                    </div>
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-xl text-xs font-bold text-white shadow-lg border border-white/10">
                        {typeIcon[post.type] || '📝'} {post.type}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-40 bg-zinc-800/50 flex items-center justify-center border-b border-white/10 relative transform-gpu" style={{ transform: 'translateZ(20px)' }}>
                    {isPublishing && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-10">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-10 h-10 border-4 border-amber-400/30 border-t-amber-400 rounded-full" />
                      </div>
                    )}
                    <div className="text-center">
                      <span className="text-5xl drop-shadow-lg">{typeIcon[post.type] || '📝'}</span>
                      <div className="mt-4">
                        <StatusBadge status={post.status} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Card Body ───────────────────────────────────────── */}
                <div className="p-6 flex-1 flex flex-col transform-gpu" style={{ transform: 'translateZ(40px)' }}>
                  {/* Caption */}
                  <p className="text-sm font-medium text-zinc-300 mb-4 line-clamp-3 leading-relaxed flex-1 group-hover:text-white transition-colors">
                    {post.caption || <span className="text-zinc-600 italic">No caption provided.</span>}
                  </p>

                  {/* Hashtags */}
                  {hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-5">
                      {hashtags.slice(0, 4).map((tag, i) => (
                        <span key={i} className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-lg text-xs font-bold">
                          {tag}
                        </span>
                      ))}
                      {hashtags.length > 4 && (
                        <span className="px-2.5 py-1 bg-zinc-800 text-zinc-400 border border-white/10 rounded-lg text-xs font-bold">
                          +{hashtags.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center gap-3 text-xs font-medium text-zinc-400 mb-5 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-lg">
                      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-inner">
                        <span className="text-[10px] font-black text-white">
                          {post.igAccount?.igUsername?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <span className="truncate max-w-[100px] text-zinc-300">@{post.igAccount?.igUsername || 'unknown'}</span>
                    </div>
                    <span className="text-zinc-600">•</span>
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <span className="text-purple-400">🕐</span>
                      <span>
                        {new Date(post.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })},{' '}
                        {new Date(post.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Published info */}
                  {post.status === 'published' && post.publishedAt && (
                    <div className="mb-5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-400 flex items-center gap-2 shadow-inner">
                      <span className="text-lg">✅</span>
                      Published {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}

                  {post.status === 'failed' && post.errorMessage && (
                    <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-bold text-red-400 shadow-inner">
                      ⚠️ {post.errorMessage}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 mt-auto">
                    {isPublishable && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePublishNow(post.id)}
                        disabled={publishingId === post.id}
                        className="flex-1 px-4 py-3 text-sm font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl border border-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {publishingId === post.id ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full" />
                        ) : (
                          <><span>🚀</span> Publish</>
                        )}
                      </motion.button>
                    )}

                    {isEditable && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openEdit(post)}
                        className="flex-1 px-4 py-3 text-sm font-bold text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-xl border border-purple-500/30"
                      >
                        Edit
                      </motion.button>
                    )}

                    {isEditable && (
                      <motion.button
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(post.id)}
                        disabled={deletingId === post.id}
                        className="px-4 py-3 text-sm font-bold text-red-400 bg-red-500/10 rounded-xl border border-red-500/30 disabled:opacity-50"
                      >
                        {deletingId === post.id ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-red-400/40 border-t-red-400 rounded-full" />
                        ) : (
                          '🗑️'
                        )}
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* ── Edit Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {editingPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md" 
              onClick={() => setEditingPost(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-xl rounded-3xl border border-white/20 bg-zinc-900/90 shadow-2xl shadow-purple-900/20 p-8 backdrop-blur-xl"
            >
              <h2 className="text-3xl font-black text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                Edit Post
              </h2>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-zinc-300">Caption</label>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white/5 ${
                    editCaption.length > 2200 ? 'text-red-400' : editCaption.length > 2000 ? 'text-amber-400' : 'text-zinc-400'
                  }`}>
                    {editCaption.length}/2200
                  </span>
                </div>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  rows={5}
                  className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300 text-sm resize-none shadow-inner font-medium"
                />
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-zinc-300 mb-2">Schedule Date & Time</label>
                <input
                  type="datetime-local"
                  value={editScheduledAt}
                  onChange={(e) => setEditScheduledAt(e.target.value)}
                  min={getMinDatetime()}
                  className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300 text-sm font-medium [color-scheme:dark] shadow-inner"
                />
              </div>

              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setEditingPost(null)}
                  className="flex-1 px-6 py-4 text-sm font-bold text-zinc-300 bg-white/5 border border-white/10 rounded-2xl transition-all"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(168,85,247,0.4)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveEdit}
                  disabled={saving || editCaption.length > 2200}
                  className="flex-[2] px-6 py-4 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full" />
                  ) : (
                    'Save Changes'
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
