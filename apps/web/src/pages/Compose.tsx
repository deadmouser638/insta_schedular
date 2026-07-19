import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { motion, AnimatePresence } from 'framer-motion'

interface IGAccount {
  id: string
  igUserId: string
  igUsername: string
  status: string
  isActive: boolean
}

type PostType = 'feed' | 'story' | 'carousel'

const POST_TYPES: { value: PostType; label: string; icon: string; desc: string }[] = [
  { value: 'feed', label: 'Feed Post', icon: '🖼️', desc: 'Appears in the main grid' },
  { value: 'story', label: 'Story', icon: '📱', desc: 'Disappears after 24 hours' },
  { value: 'carousel', label: 'Carousel', icon: '🎠', desc: 'Multi-image swipeable post' },
]

export default function Compose() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Form state ──────────────────────────────────────────────────
  const [imageUrl, setImageUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [hashtagsInput, setHashtagsInput] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [igAccountId, setIgAccountId] = useState('')
  const [postType, setPostType] = useState<PostType>('feed')

  // ── UI state ────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<IGAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // ── Image upload state ──────────────────────────────────────────
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileType, setFileType] = useState<string | null>(null)

  // ── Load connected IG accounts ──────────────────────────────────
  const fetchAccounts = useCallback(async () => {
    try {
      setLoadingAccounts(true)
      const res = await api.get('/instagram/accounts')
      const active = (res.data as IGAccount[]).filter(a => a.isActive && a.status !== 'expired')
      setAccounts(active)
      if (active.length === 1) {
        setIgAccountId(active[0].id)
      }
    } catch (err) {
      console.error('Failed to load accounts:', err)
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  // Auto-dismiss notifications
  useEffect(() => {
    if (!notification) return
    const t = setTimeout(() => setNotification(null), 6000)
    return () => clearTimeout(t)
  }, [notification])

  // ── Set minimum datetime to now ─────────────────────────────────
  const getMinDatetime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  }

  // ── Parse hashtags from comma-separated input ───────────────────
  const parseHashtags = (input: string): string[] => {
    return input
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .map(tag => (tag.startsWith('#') ? tag : `#${tag}`))
  }

  // ── Upload media file ───────────────────────────────────────────
  const uploadImage = async (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setErrors(prev => ({ ...prev, imageUrl: 'Only image and video files are allowed' }))
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, imageUrl: 'File must be under 100MB' }))
      return
    }

    // Show local preview immediately
    setPreviewUrl(URL.createObjectURL(file))
    setFileName(file.name)
    setFileType(file.type)
    setErrors(prev => { const n = { ...prev }; delete n.imageUrl; return n })

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('image', file)

      const res = await api.post('/uploads/image', formData)

      setImageUrl(res.data.url)
      setFileType(res.data.mimetype || file.type)
      setNotification({ type: 'success', message: `Media uploaded: ${file.name}` })
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Upload failed — try again';
      setErrors(prev => ({ ...prev, imageUrl: msg }))
      setPreviewUrl(null)
      setFileName(null)
      setFileType(null)
      setImageUrl('')
    } finally {
      setUploading(false)
    }
  }

  // ── Drag and drop handlers ──────────────────────────────────────
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadImage(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadImage(file)
  }

  const removeImage = () => {
    setImageUrl('')
    setFileName(null)
    setFileType(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // ── Client-side validation ──────────────────────────────────────
  const validate = (): boolean => {
    const errs: Record<string, string> = {}

    if (!imageUrl.trim()) {
      errs.imageUrl = 'Please upload media (image or video)'
    }

    if (!caption.trim()) {
      errs.caption = 'Caption is required'
    } else if (caption.length > 2200) {
      errs.caption = `Caption too long (${caption.length}/2200)`
    }

    if (!hashtagsInput.trim()) {
      errs.hashtags = 'At least one hashtag is required'
    }

    if (!scheduledAt) {
      errs.scheduledAt = 'Schedule date & time is required'
    } else if (new Date(scheduledAt) <= new Date()) {
      errs.scheduledAt = 'Scheduled time must be in the future'
    }

    if (!igAccountId) {
      errs.igAccountId = 'Select an Instagram account'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Submit handler ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      setSubmitting(true)
      const hashtags = parseHashtags(hashtagsInput)

      await api.post('/posts/create', {
        igAccountId,
        type: postType,
        caption: caption.trim(),
        hashtags,
        imageUrls: [imageUrl.trim()],
        scheduledAt: new Date(scheduledAt).toISOString(),
        method: 'api',
      })

      setNotification({ type: 'success', message: 'Post scheduled successfully! 🎉' })

      // Reset form
      removeImage()
      setCaption('')
      setHashtagsInput('')
      setScheduledAt('')
      setPostType('feed')
      setErrors({})
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (err.response?.data?.issues
          ? err.response.data.issues.map((i: any) => i.message).join(', ')
          : 'Failed to schedule post')
      setNotification({ type: 'error', message: msg })
    } finally {
      setSubmitting(false)
    }
  }

  const captionLen = caption.length
  const captionColor =
    captionLen > 2200 ? 'text-red-400' : captionLen > 2000 ? 'text-amber-400' : 'text-zinc-500'

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const panelVariants = {
    hidden: { opacity: 0, y: 50, rotateX: 15 },
    show: { 
      opacity: 1, 
      y: 0, 
      rotateX: 0,
      transition: { type: "spring", stiffness: 200, damping: 20 }
    }
  }

  return (
    <div className="min-h-screen p-6 md:p-10 relative z-10 perspective-[1000px] overflow-hidden">
      {/* ── Notification ─────────────────────────────────────────── */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`mb-6 flex items-center gap-3 px-5 py-4 rounded-2xl border backdrop-blur-md shadow-2xl ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 shadow-emerald-500/10'
                : 'bg-red-500/10 border-red-500/20 text-red-300 shadow-red-500/10'
            }`}
          >
            <span className="text-xl">{notification.type === 'success' ? '✅' : '❌'}</span>
            <p className="flex-1 text-sm font-bold">{notification.message}</p>
            <button
              onClick={() => setNotification(null)}
              className="text-white/40 hover:text-white/80 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ───────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-10">
        <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300 mb-2 drop-shadow-md">
          Compose Post
        </h1>
        <p className="text-zinc-400 text-lg font-medium">Create and schedule a new Instagram post.</p>
      </motion.div>

      {/* ── No accounts warning ──────────────────────────────────── */}
      <AnimatePresence>
        {!loadingAccounts && accounts.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 flex items-center gap-4 px-6 py-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.15)]"
          >
            <span className="text-2xl drop-shadow-md">⚠️</span>
            <div className="flex-1">
              <p className="text-amber-300 font-bold">No Instagram accounts connected</p>
              <p className="text-amber-400/80 text-sm mt-0.5 font-medium">
                You need to connect at least one Instagram account before scheduling posts.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/connect')}
              className="px-5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold rounded-xl border border-amber-500/30 transition-all shadow-inner"
            >
              Connect Account
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* ── Left Column: Main Form ─────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* ── Instagram Account Selector ────────────────────────── */}
            <motion.div 
              variants={panelVariants}
              whileHover={{ scale: 1.01, zIndex: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
              className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6 backdrop-blur-xl shadow-xl transition-all"
            >
              <label className="block text-sm font-bold text-zinc-300 mb-4 tracking-wide uppercase">
                Instagram Account <span className="text-red-400">*</span>
              </label>
              {loadingAccounts ? (
                <div className="flex items-center gap-3 text-zinc-400 text-sm font-medium py-4">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full" />
                  Loading accounts...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {accounts.map((acc) => {
                    const isActiveAcc = igAccountId === acc.id
                    return (
                      <motion.button
                        key={acc.id}
                        type="button"
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setIgAccountId(acc.id)
                          setErrors(prev => { const n = { ...prev }; delete n.igAccountId; return n })
                        }}
                        className={`relative overflow-hidden flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                          isActiveAcc
                            ? 'border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                            : 'border-white/10 bg-zinc-800/50 hover:border-white/20 hover:bg-zinc-800/80 shadow-md'
                        }`}
                      >
                        {isActiveAcc && (
                          <motion.div layoutId="activeAccBg" className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20" />
                        )}
                        <div
                          className={`relative z-10 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner ${
                            isActiveAcc
                              ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                              : 'bg-zinc-700/80 border border-white/10'
                          }`}
                        >
                          <span className="text-white font-black text-lg">
                            {acc.igUsername.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="relative z-10 min-w-0">
                          <p className={`text-sm font-bold truncate ${isActiveAcc ? 'text-white drop-shadow-sm' : 'text-zinc-300'}`}>
                            @{acc.igUsername}
                          </p>
                          <p className="text-xs font-medium text-zinc-500 truncate">ID: {acc.igUserId}</p>
                        </div>
                        {isActiveAcc && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative z-10 ml-auto flex-shrink-0">
                            <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center shadow-lg">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          </motion.div>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              )}
              {errors.igAccountId && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-sm font-bold text-red-400">
                  {errors.igAccountId}
                </motion.p>
              )}
            </motion.div>

            {/* ── Media Upload (Drag & Drop) ───────────────────────── */}
            <motion.div 
              variants={panelVariants}
              whileHover={{ scale: 1.01, zIndex: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
              className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6 backdrop-blur-xl shadow-xl transition-all"
            >
              <label className="block text-sm font-bold text-zinc-300 mb-4 tracking-wide uppercase">
                Media <span className="text-red-400">*</span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/x-msvideo,video/webm"
                onChange={handleFileSelect}
                className="hidden"
              />

              {!previewUrl && !imageUrl ? (
                <motion.div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex flex-col items-center justify-center py-16 px-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 group ${
                    dragActive
                      ? 'border-purple-400 bg-purple-500/20 scale-[1.02] shadow-[0_0_30px_rgba(168,85,247,0.3)]'
                      : errors.imageUrl
                        ? 'border-red-500/50 bg-red-500/10 hover:border-red-400/60'
                        : 'border-white/20 bg-zinc-800/40 hover:border-purple-500/50 hover:bg-zinc-800/60'
                  }`}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-4">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 border-4 border-purple-500/40 border-t-purple-500 rounded-full drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                      <p className="text-base font-bold text-purple-400 animate-pulse">Uploading magic...</p>
                    </div>
                  ) : (
                    <>
                      <motion.div 
                        animate={{ y: dragActive ? -10 : 0 }}
                        className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-5 transition-all shadow-inner ${
                        dragActive ? 'bg-purple-500 drop-shadow-lg' : 'bg-zinc-800 group-hover:bg-zinc-700'
                      }`}>
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={dragActive ? '#fff' : '#a1a1aa'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </motion.div>
                      <p className="text-lg text-zinc-200 font-bold mb-2">
                        {dragActive ? 'Drop it like it\'s hot! 🔥' : 'Drag & drop media here'}
                      </p>
                      <p className="text-sm font-medium text-zinc-500">
                        or <span className="text-purple-400 underline decoration-purple-400/50 hover:decoration-purple-400 transition-colors">click to browse</span> — Images/Videos up to 100MB
                      </p>
                    </>
                  )}
                </motion.div>
              ) : (
                /* ── Media preview ─────────────────────────── */
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative rounded-2xl overflow-hidden border border-white/20 bg-zinc-900 group shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                >
                  {fileType?.startsWith('video/') ? (
                    <video
                      src={previewUrl || imageUrl}
                      controls
                      className="w-full max-h-96 object-contain bg-black"
                    />
                  ) : (
                    <motion.img
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.5 }}
                      src={previewUrl || imageUrl}
                      alt="Preview"
                      className="w-full max-h-96 object-cover"
                    />
                  )}

                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm z-20">
                    <div className="flex gap-4 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3 bg-white/20 backdrop-blur-md text-white font-bold rounded-xl border border-white/30 hover:bg-white/30 shadow-lg"
                      >
                        Replace
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.4)' }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={removeImage}
                        className="px-6 py-3 bg-red-500/30 backdrop-blur-md text-white font-bold rounded-xl border border-red-500/50 shadow-lg"
                      >
                        Remove
                      </motion.button>
                    </div>
                  </div>

                  <div className="absolute top-4 right-4 flex gap-2 z-10">
                    {uploading && (
                      <span className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/30 backdrop-blur-md rounded-xl text-xs font-bold text-amber-200 border border-amber-500/50 shadow-lg">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-amber-400/40 border-t-amber-400 rounded-full" />
                        Uploading
                      </span>
                    )}
                    {imageUrl && !uploading && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/30 backdrop-blur-md rounded-xl text-xs font-bold text-emerald-200 border border-emerald-500/50 shadow-lg">
                        ✓ Ready
                      </span>
                    )}
                  </div>

                  {fileName && (
                    <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-xl text-xs font-bold text-zinc-200 border border-white/10 z-10 shadow-lg">
                      {fileName}
                    </div>
                  )}
                </motion.div>
              )}

              {errors.imageUrl && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-sm font-bold text-red-400">{errors.imageUrl}</motion.p>
              )}
            </motion.div>

            {/* ── Caption ───────────────────────────────────────────── */}
            <motion.div 
              variants={panelVariants}
              whileHover={{ scale: 1.01, zIndex: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
              className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6 backdrop-blur-xl shadow-xl transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <label htmlFor="caption" className="block text-sm font-bold text-zinc-300 tracking-wide uppercase">
                  Caption <span className="text-red-400">*</span>
                </label>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg bg-zinc-800 border border-white/5 shadow-inner ${captionColor}`}>
                  {captionLen}/2200
                </span>
              </div>
              <textarea
                id="caption"
                value={caption}
                onChange={(e) => {
                  setCaption(e.target.value)
                  setErrors(prev => { const n = { ...prev }; delete n.caption; return n })
                }}
                placeholder="Write an amazing caption for your post..."
                rows={5}
                className={`w-full px-5 py-4 bg-black/40 border rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 transition-all duration-300 text-sm font-medium resize-none shadow-inner ${
                  errors.caption
                    ? 'border-red-500/50 focus:ring-red-500/30 bg-red-500/5'
                    : 'border-white/10 focus:ring-purple-500/50 focus:border-purple-500/50 focus:bg-black/60'
                }`}
              />
              {errors.caption && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-sm font-bold text-red-400">{errors.caption}</motion.p>
              )}
            </motion.div>

            {/* ── Hashtags ──────────────────────────────────────────── */}
            <motion.div 
              variants={panelVariants}
              whileHover={{ scale: 1.01, zIndex: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
              className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6 backdrop-blur-xl shadow-xl transition-all"
            >
              <label htmlFor="hashtags" className="block text-sm font-bold text-zinc-300 mb-1 tracking-wide uppercase">
                Hashtags <span className="text-red-400">*</span>
              </label>
              <p className="text-xs font-medium text-zinc-500 mb-4">Separate with commas. The # is magically added.</p>
              <input
                id="hashtags"
                type="text"
                value={hashtagsInput}
                onChange={(e) => {
                  setHashtagsInput(e.target.value)
                  setErrors(prev => { const n = { ...prev }; delete n.hashtags; return n })
                }}
                placeholder="travel, photography, sunset, vibes"
                className={`w-full px-5 py-4 bg-black/40 border rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 transition-all duration-300 text-sm font-medium shadow-inner ${
                  errors.hashtags
                    ? 'border-red-500/50 focus:ring-red-500/30 bg-red-500/5'
                    : 'border-white/10 focus:ring-purple-500/50 focus:border-purple-500/50 focus:bg-black/60'
                }`}
              />
              {errors.hashtags && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-sm font-bold text-red-400">{errors.hashtags}</motion.p>
              )}

              {/* Tag preview */}
              <AnimatePresence>
                {hashtagsInput.trim() && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    className="mt-4 flex flex-wrap gap-2"
                  >
                    {parseHashtags(hashtagsInput).map((tag, i) => (
                      <motion.span
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="px-3 py-1.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold shadow-sm"
                      >
                        {tag}
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* ── Right Column: Settings & Submit ────────────────────── */}
          <div className="space-y-6">
            
            {/* ── Post Type ─────────────────────────────────────────── */}
            <motion.div 
              variants={panelVariants}
              whileHover={{ scale: 1.02, zIndex: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
              className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6 backdrop-blur-xl shadow-xl transition-all"
            >
              <label className="block text-sm font-bold text-zinc-300 mb-4 tracking-wide uppercase">
                Format <span className="text-red-400">*</span>
              </label>
              <div className="space-y-3">
                {POST_TYPES.map((pt) => {
                  const isSelected = postType === pt.value
                  return (
                    <motion.button
                      key={pt.value}
                      type="button"
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setPostType(pt.value)}
                      className={`relative w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left overflow-hidden ${
                        isSelected
                          ? 'border-transparent text-white shadow-[0_5px_15px_rgba(168,85,247,0.3)]'
                          : 'border-white/10 bg-zinc-800/40 hover:border-white/20 hover:bg-zinc-800/60'
                      }`}
                    >
                      {isSelected && (
                        <motion.div layoutId="formatBg" className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/50 rounded-2xl" />
                      )}
                      <span className="relative z-10 text-2xl drop-shadow-md">{pt.icon}</span>
                      <div className="relative z-10">
                        <p className={`text-sm font-bold ${isSelected ? 'text-white drop-shadow-sm' : 'text-zinc-300'}`}>
                          {pt.label}
                        </p>
                        <p className="text-xs font-medium text-zinc-500 mt-0.5">{pt.desc}</p>
                      </div>
                      {isSelected && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative z-10 ml-auto">
                          <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center shadow-lg">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        </motion.div>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>

            {/* ── Schedule DateTime ──────────────────────────────────── */}
            <motion.div 
              variants={panelVariants}
              whileHover={{ scale: 1.02, zIndex: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
              className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6 backdrop-blur-xl shadow-xl transition-all"
            >
              <label htmlFor="scheduledAt" className="block text-sm font-bold text-zinc-300 mb-1 tracking-wide uppercase">
                Schedule Date & Time <span className="text-red-400">*</span>
              </label>
              <p className="text-xs font-medium text-zinc-500 mb-4">Must be set in the future</p>
              <input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => {
                  setScheduledAt(e.target.value)
                  setErrors(prev => { const n = { ...prev }; delete n.scheduledAt; return n })
                }}
                min={getMinDatetime()}
                className={`w-full px-5 py-4 bg-black/40 border rounded-2xl text-white focus:outline-none focus:ring-2 transition-all duration-300 text-sm font-bold [color-scheme:dark] shadow-inner ${
                  errors.scheduledAt
                    ? 'border-red-500/50 focus:ring-red-500/30 bg-red-500/5'
                    : 'border-white/10 focus:ring-purple-500/50 focus:border-purple-500/50 focus:bg-black/60'
                }`}
              />
              {errors.scheduledAt && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-sm font-bold text-red-400">{errors.scheduledAt}</motion.p>
              )}

              {/* Friendly time display */}
              <AnimatePresence>
                {scheduledAt && !errors.scheduledAt && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl"
                  >
                    <p className="text-xs font-bold text-purple-300 flex items-center gap-2">
                      <span className="text-lg">📅</span> 
                      <span>
                        {new Date(scheduledAt).toLocaleDateString('en-US', {
                          weekday: 'long', year: 'numeric', month: 'short', day: 'numeric',
                        })} at {new Date(scheduledAt).toLocaleTimeString('en-US', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── Submit Button ──────────────────────────────────────── */}
            <motion.button
              variants={panelVariants}
              whileHover={{ scale: 1.05, y: -4, boxShadow: "0 15px 30px -5px rgba(168,85,247,0.6)" }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={submitting || (accounts.length === 0 && !loadingAccounts)}
              className="w-full relative px-8 py-5 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white font-black tracking-wide rounded-3xl shadow-[0_10px_20px_rgba(168,85,247,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg border border-white/20 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 w-0 group-hover:w-full transition-all duration-500 ease-out" />
              <span className="relative z-10 flex items-center gap-3">
                {submitting ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-6 h-6 border-4 border-white/40 border-t-white rounded-full drop-shadow-md" />
                    Baking Your Post...
                  </>
                ) : (
                  <>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-md">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Schedule Post
                  </>
                )}
              </span>
            </motion.button>

            {/* ── Quick nav ──────────────────────────────────────────── */}
            <motion.button
              variants={panelVariants}
              whileHover={{ x: 5 }}
              type="button"
              onClick={() => navigate('/')}
              className="w-full px-6 py-4 text-sm font-bold text-zinc-400 hover:text-white bg-zinc-900/40 hover:bg-zinc-800/80 border border-white/5 hover:border-white/20 rounded-2xl transition-all shadow-sm"
            >
              View Scheduled Queue →
            </motion.button>
          </div>
        </motion.div>
      </form>
    </div>
  )
}
