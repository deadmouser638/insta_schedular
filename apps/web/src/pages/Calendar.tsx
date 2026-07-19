import { motion } from 'framer-motion'

export default function Calendar() {
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
          Calendar
        </h1>
        <p className="text-zinc-400 text-lg font-medium">
          Visualize your scheduled posts across the month.
        </p>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-6xl mx-auto"
      >
        <motion.div 
          variants={itemVariants}
          whileHover={{ rotateX: 2, rotateY: -2, zIndex: 10 }}
          style={{ transformStyle: 'preserve-3d' }}
          className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900/60 p-12 shadow-2xl backdrop-blur-xl flex flex-col items-center justify-center min-h-[500px] group"
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

          <motion.div 
            whileHover={{ scale: 1.1, rotate: 10 }}
            className="w-24 h-24 mb-6 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.3)] backdrop-blur-xl transform-gpu z-10"
            style={{ transform: 'translateZ(30px)' }}
          >
            <span className="text-5xl drop-shadow-lg">📅</span>
          </motion.div>
          
          <div className="text-center z-10 transform-gpu" style={{ transform: 'translateZ(40px)' }}>
            <h2 className="text-3xl font-black text-white mb-4 tracking-tight drop-shadow-md">Interactive Calendar</h2>
            <p className="text-zinc-400 text-lg max-w-lg mx-auto font-medium leading-relaxed">
              We are currently forging a beautiful 3D monthly view to manage your Instagram content visually. Stay tuned for the magic! ✨
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
