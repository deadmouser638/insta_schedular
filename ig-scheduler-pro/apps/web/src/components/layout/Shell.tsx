import React, { useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Clock, PenSquare, CalendarDays, Link2, Settings as SettingsIcon, Camera } from 'lucide-react';
import { useAccountStore } from '../../stores/accountStore';

export const Shell: React.FC = () => {
  const { account, fetchAccount } = useAccountStore();
  const location = useLocation();

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  const navItems = [
    { path: '/', icon: Clock, label: 'Queue' },
    { path: '/compose', icon: PenSquare, label: 'Compose' },
    { path: '/calendar', icon: CalendarDays, label: 'Calendar' }
  ];

  const bottomItems = [
    { path: '/connect', icon: Link2, label: 'Connect' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' }
  ];

  const NavItem = ({ path, icon: Icon, label }: any) => {
    const isActive = location.pathname === path;
    return (
      <NavLink
        to={path}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all ${
          isActive 
            ? 'bg-orange-50 text-[var(--accent)] border-l-[3px] border-[var(--accent)]' 
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-l-[3px] border-transparent'
        }`}
      >
        <Icon size={20} className={isActive ? 'text-[var(--accent)]' : 'text-gray-400'} />
        {label}
      </NavLink>
    );
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)] font-sans">
      <aside className="w-[240px] fixed inset-y-0 left-0 bg-white border-r border-gray-200 flex flex-col shrink-0 z-10 hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--ig-grad)] flex items-center justify-center text-white shadow-md">
            <Camera size={24} />
          </div>
          <div>
            <h1 className="font-extrabold text-gray-900 tracking-tight leading-none text-lg">IG Scheduler</h1>
            <span className="text-[10px] text-[var(--accent)] font-bold tracking-widest uppercase">Creator Pro</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-6">
          {navItems.map(item => <NavItem key={item.path} {...item} />)}
          <hr className="my-6 border-gray-100" />
          {bottomItems.map(item => <NavItem key={item.path} {...item} />)}
        </nav>

        <div className="p-4 mt-auto border-t border-gray-100">
          <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3 border border-gray-200">
            <div className={`w-2.5 h-2.5 rounded-full ${account ? 'bg-green-500 shadow-[0_0_8px_rgba(34,160,107,0.6)]' : 'bg-gray-300'}`} />
            <div className="text-sm font-bold text-gray-700 truncate">
              {account ? `@${account.igUsername || account.igUserId}` : 'Not connected'}
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:pl-[240px] flex flex-col min-h-screen">
        <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--ig-grad)] flex items-center justify-center text-white">
              <Camera size={18} />
            </div>
            <span className="font-extrabold text-gray-900 text-lg tracking-tight">IG Scheduler</span>
          </div>
          <div className={`w-2.5 h-2.5 rounded-full ${account ? 'bg-green-500' : 'bg-gray-300'}`} />
        </div>

        <div className="md:hidden bg-white border-b border-gray-200 px-2 py-2 flex overflow-x-auto gap-1 sticky top-[65px] z-10 shadow-sm">
          {[...navItems, ...bottomItems].map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap transition-colors ${
                isActive ? 'bg-orange-50 text-[var(--accent)]' : 'text-gray-600'
              }`}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="flex-1 px-4 py-6 md:p-8 overflow-x-hidden">
          <div className="max-w-[900px] w-full mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
