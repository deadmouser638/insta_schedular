import React, { useState, useEffect } from 'react';
import { usePostsStore } from '../stores/postsStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TypeBadge } from '../components/ui/TypeBadge';

export const Calendar: React.FC = () => {
  const { posts, fetchPosts } = usePostsStore();
  const [date, setDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const year = date.getFullYear();
  const month = date.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i));

  const monthPosts = posts.filter(p => {
    const d = new Date(p.scheduledAt);
    return d.getFullYear() === year && d.getMonth() === month && p.status !== 'failed';
  });

  const selectedPosts = monthPosts.filter(p => new Date(p.scheduledAt).getDate() === selectedDate.getDate() && selectedDate.getMonth() === month).sort((a,b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  return (
    <div className="flex flex-col xl:flex-row gap-8 min-h-[calc(100vh-100px)] animate-in fade-in duration-300">
      <div className="flex-1 bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-100 h-fit">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{date.toLocaleDateString('default', { month: 'long', year: 'numeric' })}</h2>
          <div className="flex gap-2">
            <button onClick={() => setDate(new Date(year, month - 1, 1))} className="p-2 border-2 border-gray-100 rounded-xl hover:bg-gray-50 hover:border-gray-200 transition text-gray-400 hover:text-gray-900"><ChevronLeft size={20}/></button>
            <button onClick={() => setDate(new Date(year, month + 1, 1))} className="p-2 border-2 border-gray-100 rounded-xl hover:bg-gray-50 hover:border-gray-200 transition text-gray-400 hover:text-gray-900"><ChevronRight size={20}/></button>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-4 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 lg:gap-3">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="aspect-[4/3] rounded-2xl bg-gray-50/50" />;
            const isToday = new Date().toDateString() === d.toDateString();
            const isSelected = selectedDate.toDateString() === d.toDateString();
            const dayPosts = monthPosts.filter(p => new Date(p.scheduledAt).getDate() === d.getDate());
            
            return (
              <button 
                key={i} 
                onClick={() => setSelectedDate(d)}
                className={`aspect-[4/3] rounded-2xl relative flex flex-col items-center justify-center font-bold text-sm transition-all hover:-translate-y-0.5 
                  ${isSelected ? 'border-2 border-[var(--accent)] bg-orange-50 text-[var(--accent)] shadow-md ring-4 ring-orange-50/50' 
                    : isToday ? 'bg-orange-100/50 text-orange-700 border border-orange-200' : 'bg-white border-2 border-gray-100 text-gray-700 hover:border-orange-200 hover:bg-orange-50/30'}
                `}
              >
                <span className={isSelected || isToday ? 'text-lg' : ''}>{d.getDate()}</span>
                {dayPosts.length > 0 && (
                  <div className="absolute bottom-3 flex gap-1 justify-center w-full px-2">
                    {dayPosts.slice(0, 3).map((_, idx) => (
                      <div key={idx} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[var(--accent)]' : 'bg-blue-500'}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-full xl:w-[420px] bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-fit sticky top-24">
        <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-widest mb-6">🗓 {selectedDate.toLocaleDateString('default', { month: 'long', day: 'numeric' })}</h3>
        
        {selectedPosts.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <h4 className="font-extrabold text-gray-400 mb-1 text-lg">Empty Day</h4>
            <p className="text-sm font-medium text-gray-400">No posts scheduled</p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedPosts.map((post, idx) => (
              <div key={post.id} className="p-4 border-2 border-gray-100 rounded-2xl flex gap-4 hover:shadow-md transition bg-white group hover:border-orange-100 relative">
                <div className="absolute left-[-2px] top-1/2 -translate-y-1/2 w-1 h-8 bg-gray-200 group-hover:bg-orange-400 rounded-r-md transition-colors" />
                <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0 shadow-inner">
                  {post.mediaUrls[0] && <img src={post.mediaUrls[0]} className="w-full h-full object-cover" alt="" />}
                </div>
                <div className="flex-1 min-w-0 py-0.5 space-y-2">
                  <div className="flex justify-between items-start">
                    <TypeBadge type={post.type} />
                    <span className="text-xs font-extrabold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">{new Date(post.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 truncate leading-snug">{post.caption || '<No caption>'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
