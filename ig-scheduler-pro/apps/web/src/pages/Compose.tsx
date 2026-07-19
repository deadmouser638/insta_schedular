import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePostsStore } from '../stores/postsStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useToastStore } from '../stores/toastStore';
import { api } from '../api/client';
import { Sparkles, UploadCloud, X, Calendar, Image as ImageIcon, Plus } from 'lucide-react';

export const Compose: React.FC = () => {
  const [mode, setMode] = useState<'feed' | 'story'>('feed');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  
  const [caption, setCaption] = useState('');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('chill');
  const [niche, setNiche] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('12:00');
  const [method, setMethod] = useState<'api' | 'reminder'>('api');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const { settings, fetchSettings } = useSettingsStore();
  const { createPost } = usePostsStore();
  const { toast } = useToastStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      if (settings.niche) setNiche(settings.niche);
      if (settings.defaultTone) setTone(settings.defaultTone);
      if (settings.defaultSlots && settings.defaultSlots.length > 0) setTime(settings.defaultSlots[0]);
    }
  }, [settings]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const allowed = mode === 'story' ? [newFiles[0]] : [...files, ...newFiles].slice(0, 10);
      setFiles(allowed.filter(Boolean));
      setPreviews(allowed.filter(Boolean).map(f => URL.createObjectURL(f)));
    }
  };

  const removeFile = (idx: number) => {
    setFiles(files.filter((_, i) => i !== idx));
    setPreviews(previews.filter((_, i) => i !== idx));
  };

  const generateAI = async () => {
    if (!topic && !niche) return toast('Please specify a topic or ensure your niche is set.', 'error');
    setGenerating(true);
    try {
      const { data } = await api.post('/captions', { type: mode, tone, topic, niche });
      setCaption(data.caption);
      setHashtags(data.hashtags || []);
      toast('Caption generated!', 'success');
    } catch (e) {
      toast('Failed to generate caption', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0) return toast('Please add at least one image', 'error');
    
    setSaving(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        toast(`Uploading image ${i+1}/${files.length}...`);
        const { data: { uploadUrl, publicUrl } } = await api.post('/uploads/presign', { filename: file.name, contentType: file.type });
        await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        uploadedUrls.push(publicUrl);
      }
      
      const scheduledDateTime = new Date(`${date}T${time}:00`).toISOString();
      const type = uploadedUrls.length > 1 ? 'carousel' : mode;

      await createPost({
        type,
        caption,
        hashtags,
        mediaUrls: uploadedUrls,
        scheduledAt: scheduledDateTime,
        method
      });
      
      toast('Post scheduled successfully!', 'success');
      navigate('/');
    } catch (e) {
      toast('Failed to save post', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create Post</h1>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${mode === 'feed' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setMode('feed')}>Feed / Carousel</button>
          <button className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${mode === 'story' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => { setMode('story'); setFiles([]); setPreviews([]); }}>Story</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2"><ImageIcon size={16}/> Media {mode === 'feed' && <span className="text-gray-400 font-medium text-xs">(Up to 10 images)</span>}</h3>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-orange-50 hover:border-orange-200 cursor-pointer transition group appearance-none"
            >
              <UploadCloud size={40} className="text-gray-300 group-hover:text-orange-400 mb-3 transition-colors" />
              <div className="text-sm font-bold text-gray-700">Click to upload images</div>
              <div className="text-xs text-gray-400 mt-1 font-medium z-10">JPG, PNG up to 10MB</div>
              <input type="file" hidden multiple={mode === 'feed'} accept="image/*" ref={fileInputRef} onChange={handleFileChange} />
            </div>

            {previews.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {previews.map((src, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden shadow-sm group">
                    <img src={src} className="w-full h-full object-cover" alt="" />
                    <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-widest flex items-center gap-2">Caption & AI</h3>
            </div>
            
            <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 mb-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Topic (optional)</label>
                  <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. golden hour at beach" className="w-full px-3 py-2 mt-1 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-orange-500 outline-none font-bold placeholder-gray-300 bg-white" />
                </div>
                <div className="w-full sm:w-32 shrink-0">
                  <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Tone</label>
                  <select value={tone} onChange={e => setTone(e.target.value)} className="w-full px-3 py-2 mt-1 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-orange-500 outline-none appearance-none bg-white font-bold text-gray-700">
                    <option value="chill">Chill</option>
                    <option value="funny">Funny</option>
                    <option value="professional">Pro</option>
                    <option value="motivational">Motivational</option>
                  </select>
                </div>
              </div>
              <button onClick={generateAI} disabled={generating} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white py-2.5 rounded-lg font-bold text-sm shadow-md transition disabled:opacity-70 disabled:cursor-wait">
                {generating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Sparkles size={16} />}
                {generating ? 'Writing magic...' : 'Auto-Generate Caption'}
              </button>
            </div>

            <textarea 
              rows={5} 
              value={caption} 
              onChange={e => setCaption(e.target.value)} 
              placeholder="Write your caption here..." 
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[var(--accent)] font-medium text-gray-800 outline-none resize-none bg-gray-50/50"
            />
            
            {hashtags.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">Suggested Tags</p>
                <div className="flex flex-wrap gap-2">
                  {hashtags.map(t => (
                    <button key={t} onClick={() => setCaption(c => c + (c ? ' ' : '') + t)} className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition border border-blue-100 flex items-center gap-1 shadow-sm">
                      <Plus size={12}/>{t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
            <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2"><Calendar size={16}/> Schedule</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-400 font-bold text-gray-700" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Time</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-400 font-bold text-gray-700" />
              </div>
              
              <div className="pt-3">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-2 ml-1">Publish Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setMethod('api')} className={`p-3 rounded-xl text-center border-2 transition ${method === 'api' ? 'border-[var(--accent)] bg-orange-50 text-[var(--accent)]' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'} font-extrabold text-sm`}>
                    Auto API
                  </button>
                  <button type="button" onClick={() => setMethod('reminder')} className={`p-3 rounded-xl text-center border-2 transition ${method === 'reminder' ? 'border-[var(--accent)] bg-orange-50 text-[var(--accent)]' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'} font-extrabold text-sm`}>
                    Reminder
                  </button>
                </div>
              </div>
            </div>

            <hr className="my-6 border-gray-100" />
            
            <button 
              onClick={handleSubmit} 
              disabled={saving}
              className="w-full py-4 px-4 bg-[var(--accent)] hover:bg-[#d64319] text-white rounded-xl font-extrabold tracking-wide transition-all shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {saving ? 'Uploading...' : '🚀 Schedule Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
