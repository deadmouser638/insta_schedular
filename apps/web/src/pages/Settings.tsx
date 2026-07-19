import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'

export default function Settings() {
  const { user, logout } = useAuthStore()

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
      {/* ── Header ────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-10">
        <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300 mb-2 drop-shadow-md">
          Settings
        </h1>
        <p className="text-zinc-400 text-lg font-medium">
          Manage your account preferences and configurations.
        </p>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-4xl space-y-8"
      >
        {/* Profile Card */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -5, rotateX: 2, rotateY: 2, zIndex: 10 }}
          style={{ transformStyle: 'preserve-3d' }}
          className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-xl group"
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

          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8 transform-gpu" style={{ transform: 'translateZ(30px)' }}>
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-24 h-24 rounded-[1.5rem] bg-gradient-to-br from-purple-500 to-pink-500 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(168,85,247,0.4)]"
            >
              <span className="text-4xl font-black text-white drop-shadow-lg">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </motion.div>

            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-black text-white mb-2 drop-shadow-md tracking-tight">Profile Information</h2>
              <div className="space-y-1">
                <p className="text-zinc-300 font-medium">
                  <span className="text-zinc-500 text-sm mr-2 uppercase tracking-wider">Name</span>
                  {user?.name || 'User'}
                </p>
                <p className="text-zinc-300 font-medium">
                  <span className="text-zinc-500 text-sm mr-2 uppercase tracking-wider">Email</span>
                  {user?.email || 'user@example.com'}
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 10px 20px -5px rgba(239,68,68,0.4)" }}
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className="px-6 py-3 bg-red-500/10 text-red-400 font-bold rounded-xl border border-red-500/20 shadow-inner flex items-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </motion.button>
          </div>
        </motion.div>

        {/* Preferences Card */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -5, rotateX: -2, rotateY: -2, zIndex: 10 }}
          style={{ transformStyle: 'preserve-3d' }}
          className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-xl group"
        >
          {/* Decorative gradient orbs */}
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-32 -left-32 w-80 h-80 bg-pink-500 rounded-full blur-[100px] pointer-events-none" 
          />

          <div className="relative z-10 transform-gpu" style={{ transform: 'translateZ(30px)' }}>
            <h2 className="text-2xl font-black text-white mb-6 drop-shadow-md tracking-tight flex items-center gap-3">
              <span className="text-3xl">⚙️</span>
              App Preferences
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-black/30 border border-white/5 shadow-inner">
                <div>
                  <h3 className="text-white font-bold mb-1">Theme</h3>
                  <p className="text-xs text-zinc-500 font-medium">Currently using 3D Midnight Glass.</p>
                </div>
                <div className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-300 text-sm font-bold shadow-sm">
                  Dark Mode Locked 🔒
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-black/30 border border-white/5 shadow-inner">
                <div>
                  <h3 className="text-white font-bold mb-1">Notifications</h3>
                  <p className="text-xs text-zinc-500 font-medium">Receive alerts for scheduled posts.</p>
                </div>
                <motion.div 
                  whileTap={{ scale: 0.9 }}
                  className="w-12 h-6 bg-purple-500/50 rounded-full flex items-center p-1 border border-purple-500 shadow-inner cursor-not-allowed"
                >
                  <div className="w-4 h-4 rounded-full bg-white ml-auto shadow-md" />
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
