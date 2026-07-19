import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { motion, AnimatePresence } from 'framer-motion'

interface IGAccount {
  id: string
  igUserId: string
  igUsername: string
  tokenExpiresAt: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  daysUntilExpiry: number
  isExpired: boolean
  isExpiringSoon: boolean
  status: 'connected' | 'expired' | 'expiring_soon' | 'disconnected'
}

export default function Connect() {
  const [accounts, setAccounts] = useState<IGAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // Manual connection state
  const [showManual, setShowManual] = useState(false)
  const [manualToken, setManualToken] = useState('')
  const [manualIgId, setManualIgId] = useState('')
  const [manualConnecting, setManualConnecting] = useState(false)

  // ── Fetch connected accounts ────────────────────────────────────
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/instagram/accounts')
      setAccounts(res.data)
    } catch (err) {
      console.error('Failed to fetch accounts:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Handle OAuth redirect result ────────────────────────────────
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const count = searchParams.get('count')

    if (success === 'true') {
      setNotification({
        type: 'success',
        message: count
          ? `Successfully connected ${count} Instagram account${Number(count) > 1 ? 's' : ''}! 🎉`
          : 'Instagram account connected successfully! 🎉',
      })
      // Clean the URL params
      setSearchParams({}, { replace: true })
    } else if (error) {
      setNotification({ type: 'error', message: decodeURIComponent(error) })
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // ── Initial load ────────────────────────────────────────────────
  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  // Auto-dismiss notifications after 8 seconds
  useEffect(() => {
    if (!notification) return
    const t = setTimeout(() => setNotification(null), 8000)
    return () => clearTimeout(t)
  }, [notification])

  // ── Connect handler ─────────────────────────────────────────────
  const handleConnect = async () => {
    try {
      setConnecting(true)
      const res = await api.get('/instagram/auth-url')
      window.location.href = res.data.authUrl
    } catch (err: any) {
      setConnecting(false)
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to start Instagram connection',
      })
    }
  }

  // ── Disconnect handler ──────────────────────────────────────────
  const handleDisconnect = async (accountId: string) => {
    if (!window.confirm('Are you sure you want to disconnect this Instagram account?')) return

    try {
      setDisconnecting(accountId)
      await api.delete(`/accounts/${accountId}`)
      setAccounts(prev => prev.filter(a => a.id !== accountId))
      setNotification({ type: 'success', message: 'Account disconnected successfully 👋' })
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to disconnect account',
      })
    } finally {
      setDisconnecting(null)
    }
  }

  // ── Manual connect handler ──────────────────────────────────────
  const handleManualConnect = async () => {
    if (!manualToken.trim() || !manualIgId.trim()) {
      setNotification({ type: 'error', message: 'Both fields are required' })
      return
    }
    try {
      setManualConnecting(true)
      const res = await api.post('/instagram/connect-manual', {
        pageAccessToken: manualToken.trim(),
        igBusinessAccountId: manualIgId.trim(),
      })
      setNotification({ type: 'success', message: res.data.message })
      setManualToken('')
      setManualIgId('')
      setShowManual(false)
      fetchAccounts()
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Manual connection failed',
      })
    } finally {
      setManualConnecting(false)
    }
  }

  // ── Status badge component ──────────────────────────────────────
  const StatusBadge = ({ status }: { status: IGAccount['status'] }) => {
    const config = {
      connected: { label: 'Connected', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', border: 'border-emerald-500/20' },
      expiring_soon: { label: 'Expiring Soon', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400', border: 'border-amber-500/20' },
      expired: { label: 'Expired', bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400', border: 'border-red-500/20' },
      disconnected: { label: 'Disconnected', bg: 'bg-zinc-500/10', text: 'text-zinc-400', dot: 'bg-zinc-400', border: 'border-white/10' },
    }
    const c = config[status]
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-inner ${c.bg} ${c.text} ${c.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === 'connected' ? 'animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : ''}`} />
        {c.label}
      </span>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring", stiffness: 200, damping: 20 }
    }
  }

  return (
    <div className="min-h-screen p-6 md:p-10 relative z-10 perspective-[1000px] overflow-hidden">
      {/* ── Notification Banner ───────────────────────────────────── */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`mb-6 flex items-center gap-3 px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 shadow-emerald-500/10'
                : 'bg-red-500/10 border-red-500/20 text-red-300 shadow-red-500/10'
            }`}
          >
            <span className="text-xl drop-shadow-md">{notification.type === 'success' ? '✨' : '⚠️'}</span>
            <p className="flex-1 text-sm font-bold tracking-wide">{notification.message}</p>
            <button
              onClick={() => setNotification(null)}
              className="text-white/40 hover:text-white transition-colors text-lg leading-none font-bold"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-10">
        <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300 mb-2 drop-shadow-md">
          Instagram Accounts
        </h1>
        <p className="text-zinc-400 text-lg font-medium">
          Connect your Instagram Business accounts to start scheduling magic.
        </p>
      </motion.div>

      {/* ── Connect Card ──────────────────────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-xl mb-10 group"
      >
        {/* Decorative gradient orbs */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -right-32 w-80 h-80 bg-purple-500 rounded-full blur-[100px] pointer-events-none" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.15, 0.1]
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-32 -left-32 w-80 h-80 bg-pink-500 rounded-full blur-[100px] pointer-events-none" 
        />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <motion.div 
              whileHover={{ rotate: 10, scale: 1.1 }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_10px_30px_rgba(168,85,247,0.4)] flex-shrink-0"
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-lg">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </motion.div>
            <div>
              <h2 className="text-3xl font-black text-white mb-2 drop-shadow-md tracking-tight">Connect Meta</h2>
              <p className="text-zinc-300 text-sm max-w-lg font-medium leading-relaxed">
                Link your Instagram Business or Creator account via Facebook Login.
                Your account must be connected to a Facebook Page to use the Graph API.
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -10px rgba(168,85,247,0.6)" }}
            whileTap={{ scale: 0.95 }}
            onClick={handleConnect}
            disabled={connecting}
            className="relative px-8 py-5 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white font-black text-lg rounded-2xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 overflow-hidden group/btn flex-shrink-0 border border-white/20"
          >
            <div className="absolute inset-0 bg-white/20 w-0 group-hover/btn:w-full transition-all duration-500 ease-out" />
            <span className="relative z-10 flex items-center gap-3">
              {connecting ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-4 border-white/40 border-t-white rounded-full drop-shadow-md" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover/btn:rotate-12 transition-transform duration-300 drop-shadow-md">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Connect Account
                </>
              )}
            </span>
          </motion.button>
        </div>
      </motion.div>

      {/* ── Manual Connection (Dev Mode) ───────────────────────────── */}
      <div className="mb-10">
        <button
          onClick={() => setShowManual(!showManual)}
          className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-300 transition-colors duration-300 px-4 py-2 border border-transparent hover:border-white/10 rounded-xl bg-white/5 hover:bg-white/10"
        >
          <motion.svg
            animate={{ rotate: showManual ? 90 : 0 }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </motion.svg>
          {showManual ? 'Hide' : 'Show'} Manual Connection (Dev Mode)
        </button>

        <AnimatePresence>
          {showManual && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              className="mt-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-8 backdrop-blur-md shadow-lg overflow-hidden"
            >
              <h3 className="text-lg font-black text-amber-400 mb-3 tracking-wide">🔧 Manual Connection — Graph API Mode</h3>
              <p className="text-sm font-medium text-amber-200/70 mb-6">
                If OAuth doesn't find your pages (common in dev mode), connect manually using the Graph API Explorer.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-amber-200/90 mb-2 uppercase tracking-wider">Page Access Token</label>
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="EAAxxxxxx..."
                    className="w-full px-5 py-4 bg-black/40 border border-amber-500/20 rounded-2xl text-white text-sm font-medium placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-amber-200/90 mb-2 uppercase tracking-wider">IG Business Account ID</label>
                  <input
                    type="text"
                    value={manualIgId}
                    onChange={(e) => setManualIgId(e.target.value)}
                    placeholder="17841400xxxxxx"
                    className="w-full px-5 py-4 bg-black/40 border border-amber-500/20 rounded-2xl text-white text-sm font-medium placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all shadow-inner"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleManualConnect}
                  disabled={manualConnecting || !manualToken.trim() || !manualIgId.trim()}
                  className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black rounded-2xl text-sm transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {manualConnecting ? (
                    <>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-4 border-amber-900/40 border-t-amber-950 rounded-full" />
                      Connecting...
                    </>
                  ) : (
                    '🔗 Connect Manually'
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Accounts List ─────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} 
            className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" 
          />
        </div>
      ) : accounts.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-24 border border-dashed border-white/20 rounded-3xl bg-zinc-900/40 backdrop-blur-xl shadow-2xl"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5 drop-shadow-xl">
            <span className="text-4xl text-zinc-500">🔌</span>
          </div>
          <h3 className="text-2xl font-black text-white mb-2 tracking-tight">No Accounts Connected</h3>
          <p className="text-zinc-400 max-w-sm mx-auto font-medium">
            Click "Connect Account" above to link your Instagram Business account and unleash the scheduling power.
          </p>
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 tracking-tight">
              Connected Accounts
              <span className="ml-3 px-3 py-1 bg-white/10 text-white text-sm rounded-xl">{accounts.length}</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {accounts.map((acc) => (
              <motion.div
                variants={itemVariants}
                whileHover={{ y: -8, rotateX: 5, rotateY: -2, zIndex: 10 }}
                style={{ transformStyle: 'preserve-3d' }}
                key={acc.id}
                className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900/60 hover:bg-zinc-900/80 backdrop-blur-xl p-8 transition-all duration-300 shadow-xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_20px_rgba(168,85,247,0.2)] hover:border-purple-500/30 flex flex-col justify-between"
              >
                <div className="flex flex-col gap-6 transform-gpu" style={{ transform: 'translateZ(30px)' }}>
                  <div className="flex items-center gap-5">
                    {/* Avatar */}
                    <motion.div 
                      whileHover={{ scale: 1.1, rotate: 10 }}
                      className="w-16 h-16 rounded-[1.2rem] bg-gradient-to-br from-purple-500 to-pink-500 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                    >
                      <span className="text-3xl font-black text-white drop-shadow-md">
                        {acc.igUsername.charAt(0).toUpperCase()}
                      </span>
                    </motion.div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 mb-2">
                        <h4 className="text-xl font-black text-white truncate tracking-tight">@{acc.igUsername}</h4>
                        <div className="self-start">
                          <StatusBadge status={acc.status} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/30 rounded-2xl p-4 border border-white/5 space-y-2">
                    <p className="flex justify-between text-xs font-bold text-zinc-400">
                      <span>IG User ID</span>
                      <span className="text-zinc-200 font-mono">{acc.igUserId}</span>
                    </p>
                    <p className="flex justify-between text-xs font-bold text-zinc-400">
                      <span>Token Status</span>
                      {acc.status === 'expired' ? (
                        <span className="text-red-400 font-mono">Expired</span>
                      ) : (
                        <span className={`font-mono ${acc.isExpiringSoon ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {acc.daysUntilExpiry}d remaining
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 mt-6 transform-gpu" style={{ transform: 'translateZ(40px)' }}>
                  {(acc.status === 'expired' || acc.status === 'expiring_soon') && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleConnect}
                      className="flex-1 px-4 py-3 text-sm font-bold text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-xl border border-purple-500/30 flex items-center justify-center gap-2 shadow-inner"
                    >
                      <span>🔄</span> Reconnect
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDisconnect(acc.id)}
                    disabled={disconnecting === acc.id}
                    className="flex-1 px-4 py-3 text-sm font-bold text-red-400 bg-red-500/10 rounded-xl border border-red-500/30 disabled:opacity-50 flex items-center justify-center gap-2 shadow-inner"
                  >
                    {disconnecting === acc.id ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-red-400/40 border-t-red-400 rounded-full" />
                    ) : (
                      <><span>🚫</span> Disconnect</>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Help Info ─────────────────────────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-12 rounded-3xl border border-white/10 bg-zinc-900/40 p-8 backdrop-blur-xl shadow-lg relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-[80px] pointer-events-none" />
        <h4 className="text-lg font-black text-white mb-6 flex items-center gap-3 tracking-wide">
          <span className="text-2xl drop-shadow-md">💡</span> Essential Requirements
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex gap-3 shadow-inner">
            <span className="text-xl">🏢</span>
            <p className="text-sm font-medium text-zinc-300">
              Needs an Instagram <strong className="text-zinc-100">Business</strong> or <strong className="text-zinc-100">Creator</strong> account.
            </p>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex gap-3 shadow-inner">
            <span className="text-xl">📘</span>
            <p className="text-sm font-medium text-zinc-300">
              Account must be strongly linked to a <strong className="text-zinc-100">Facebook Page</strong>.
            </p>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex gap-3 shadow-inner">
            <span className="text-xl">🔐</span>
            <p className="text-sm font-medium text-zinc-300">
              Requires <strong className="text-purple-400">instagram_basic</strong> and <strong className="text-purple-400">instagram_content_publish</strong> permissions.
            </p>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex gap-3 shadow-inner">
            <span className="text-xl">⏳</span>
            <p className="text-sm font-medium text-zinc-300">
              Tokens auto-expire after <strong className="text-red-400">60 days</strong> (Meta rule). Reconnect to refresh.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
