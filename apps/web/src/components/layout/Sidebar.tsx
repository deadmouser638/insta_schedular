import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export function Sidebar() {
  const location = useLocation()
  const logout = useAuthStore(s => s.logout)

  const links = [
    { name: 'Queue', path: '/dashboard', icon: '📅' },
    { name: 'Compose', path: '/compose', icon: '✨' },
    { name: 'Calendar', path: '/calendar', icon: '📆' },
    { name: 'Accounts', path: '/connect', icon: '📸' },
    { name: 'Settings', path: '/settings', icon: '⚙️' },
  ]

  return (
    <div className="w-64 bg-zinc-950/80 backdrop-blur-3xl border-r border-white/5 h-screen flex flex-col text-white sticky top-0 shadow-2xl z-20">
      <div className="p-8">
        <h2 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400 drop-shadow-sm">Scheduler</h2>
      </div>
      <nav className="flex-1 px-4 space-y-1.5">
        {links.map(link => {
          const active = location.pathname === link.path || location.pathname.startsWith(link.path)
          return (
            <Link key={link.path} to={link.path} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${active ? 'bg-gradient-to-r from-purple-600/90 to-pink-600/90 shadow-lg shadow-purple-900/20 text-white font-medium' : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200'}`}>
              <span className={`text-xl transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{link.icon}</span>
              {link.name}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-zinc-900/50 border border-white/5 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold shadow-inner">U</div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Admin User</p>
                <p className="text-xs text-zinc-500 truncate">Pro Plan</p>
            </div>
        </div>
        <button onClick={() => logout()} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-2xl transition-all duration-300 font-medium">
            <span className="text-xl">🚪</span> Logout
        </button>
      </div>
    </div>
  )
}
