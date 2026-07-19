import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { usePostsStore } from '../stores/postsStore';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { Settings as ConfigIcon, Download, LogOut, Clock, X, Plus } from 'lucide-react';
import { useToastStore } from '../stores/toastStore';

export const Settings: React.FC = () => {
  const { settings, fetchSettings, updateSettings } = useSettingsStore();
  const { posts } = usePostsStore();
  const { logout } = useAuthStore();
  const { toast } = useToastStore();
  const navigate = useNavigate();

  const [niche, setNiche] = useState('');
  const [defaultTone, setDefaultTone] = useState('chill');
  const [slots, setSlots] = useState<string[]>([]);
  const [newSlot, setNewSlot] = useState('12:00');

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setNiche(settings.niche || '');
      setDefaultTone(settings.defaultTone || 'chill');
      setSlots(settings.defaultSlots || []);
    }
  }, [settings]);

  const saveGeneral = async () => {
    await updateSettings({ niche, defaultTone });
    toast('Profile settings saved!', 'success');
  };

  const saveSlots = async (newSlots: string[]) => {
    setSlots(newSlots);
    await updateSettings({ defaultSlots: newSlots });
    toast('Schedule slots updated', 'success');
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(posts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ig-queue-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to log out completely and clear all local data?')) {
      await logout();
      navigate('/login');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Configuration</h1>
        <p className="text-gray-500 font-medium mt-1">Manage AI context defaults and app parameters.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2"><ConfigIcon size={18} className="text-[var(--accent)]"/> Creator Profile</h3>
          
          <div className="space-y-6 flex-1">
            <div>
              <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2 ml-1">Your Niche</label>
              <input value={niche} onChange={e => setNiche(e.target.value)} type="text" className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-[var(--accent)] outline-none transition font-extrabold text-gray-900 placeholder-gray-300" placeholder="E.g. indie hacking, fitness" />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2 ml-1">Default AI Tone</label>
              <select value={defaultTone} onChange={e => setDefaultTone(e.target.value)} className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-[var(--accent)] outline-none transition font-extrabold text-gray-900 appearance-none">
                <option value="chill">Chill & Relatable</option>
                <option value="funny">Funny & Witty</option>
                <option value="professional">Professional / Direct</option>
                <option value="motivational">Motivational Quotes</option>
              </select>
            </div>
          </div>
          
          <button onClick={saveGeneral} className="mt-8 w-full py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-extrabold transition text-lg shadow-md hover:-translate-y-0.5 hover:shadow-lg">Update Profile</button>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2"><Clock size={18} className="text-blue-500"/> Default Schedule Slots</h3>
          
          <div className="space-y-4 flex-1">
            <div className="flex flex-wrap gap-2.5">
              {slots.map(s => (
                <div key={s} className="bg-blue-50 text-blue-700 border border-blue-100 px-4 py-2 rounded-xl text-sm font-extrabold flex items-center gap-2 shadow-sm">
                  {s} <button onClick={() => saveSlots(slots.filter(x => x !== s))} className="hover:text-red-500 bg-blue-100 p-1 rounded-md transition"><X size={14} strokeWidth={3}/></button>
                </div>
              ))}
              {slots.length === 0 && <span className="text-sm font-bold text-gray-400 py-2">No defaults set</span>}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-100">
              <input type="time" value={newSlot} onChange={e => setNewSlot(e.target.value)} className="px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold flex-1 focus:border-blue-400 outline-none" />
              <button 
                onClick={() => { if(!slots.includes(newSlot)) saveSlots([...slots, newSlot].sort()); }} 
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold transition shadow-md whitespace-nowrap flex items-center gap-2"
              >
                <Plus size={18}/> Add Slot
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-red-50 mt-8">
        <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-widest mb-6">Data & Sessions</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={handleExport} className="flex-1 py-4 bg-gray-50 hover:bg-gray-100 border-2 border-gray-100 text-gray-700 rounded-2xl font-extrabold flex items-center justify-center gap-2 transition hover:-translate-y-0.5">
            <Download size={20} strokeWidth={2.5} /> Export Queue JSON
          </button>
          <button onClick={handleClear} className="flex-1 py-4 bg-red-50 hover:bg-red-100 border-2 border-red-100 text-red-600 rounded-2xl font-extrabold flex items-center justify-center gap-2 transition hover:-translate-y-0.5 shadow-sm">
            <LogOut size={20} strokeWidth={2.5} /> Wipe Local & Logout
          </button>
        </div>
      </div>
    </div>
  );
};
