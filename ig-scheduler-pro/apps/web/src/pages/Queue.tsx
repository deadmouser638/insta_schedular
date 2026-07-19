import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePostsStore } from '../stores/postsStore';
import { useAccountStore } from '../stores/accountStore';
import { StatCard } from '../components/ui/StatCard';
import { TypeBadge } from '../components/ui/TypeBadge';
import { Modal } from '../components/ui/Modal';
import { Eye, Trash2, Play, Plus } from 'lucide-react';

export const Queue: React.FC = () => {
  const { fetchPosts, filteredPosts, setFilter, filter, loading, deletePost, publishPost } = usePostsStore();
  const { fetchAccount } = useAccountStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
    fetchAccount();
  }, [fetchPosts, fetchAccount]);

  const posts = filteredPosts();
  const now = new Date();
  
  const queuedCount = posts.filter(p => p.status === 'scheduled').length;
  const postedCount = posts.filter(p => p.status === 'published').length;
  const todayCount = posts.filter(p => new Date(p.scheduledAt).toDateString() === now.toDateString()).length;

  const selectedPost = posts.find(p => p.id === selectedId);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Post Queue</h1>
          <p className="text-gray-500 font-medium mt-1">Manage all your upcoming Instagram posts.</p>
        </div>
        <Link to="/compose" className="flex items-center gap-2 bg-[var(--accent)] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#d64319] transition shadow-md hover:shadow-lg hover:-translate-y-0.5">
          <Plus size={18} strokeWidth={3} /> New Post
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard value={queuedCount} label="Queued Posts" accent="blue" />
        <StatCard value={todayCount} label="Due Today" accent="orange" />
        <StatCard value={postedCount} label="Published" accent="green" />
      </div>

      <div className="flex gap-2 mb-4 border-b border-gray-200 pb-4">
        {['all', 'feed', 'story'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-full text-sm font-extrabold capitalize transition-all ${
              filter === f ? 'bg-gray-900 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading && posts.length === 0 ? (
          <div className="p-10 text-center text-gray-400 font-bold animate-pulse">Loading queue...</div>
        ) : posts.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-gray-50 border border-gray-100 text-gray-300 rounded-full flex items-center justify-center mb-5 text-4xl shadow-inner">📭</div>
            <h3 className="text-xl font-extrabold text-gray-900 mb-2">Queue is empty</h3>
            <p className="text-gray-500 font-medium mb-8 max-w-sm">Looks like you don't have any scheduled posts yet. Fill up your backlog!</p>
            <Link to="/compose" className="text-[var(--accent)] font-extrabold bg-orange-50 border border-orange-100 px-8 py-3 rounded-xl hover:bg-orange-100 transition shadow-sm">
              Create your first post
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {posts.map(post => {
              const isOverdue = new Date(post.scheduledAt) < now && post.status === 'scheduled';
              return (
                <div key={post.id} className="p-5 flex items-center gap-5 hover:bg-gray-50 transition group">
                  <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden shrink-0 border border-black/5 shadow-inner">
                    {post.mediaUrls[0] && <img src={post.mediaUrls[0]} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate pr-4">
                      {post.caption || '<No caption>'}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <TypeBadge type={post.type} />
                      <span className="text-xs text-gray-500 font-bold tracking-wide">
                        {new Date(post.scheduledAt).toLocaleString([], { dateStyle:'medium', timeStyle:'short' })}
                      </span>
                      {isOverdue && <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full uppercase tracking-widest">Overdue</span>}
                      {post.status === 'published' && <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">✓ Published</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setSelectedId(post.id)} className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition font-bold" title="View details">
                      <Eye size={18} />
                    </button>
                    <button onClick={() => deletePost(post.id)} className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition font-bold" title="Delete post">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={!!selectedId} onClose={() => setSelectedId(null)} title="Post Details">
        {selectedPost && (
          <div className="space-y-6">
            <div className="w-full h-56 bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden shadow-inner flex overflow-x-auto snap-x p-2 gap-2">
              {selectedPost.mediaUrls.map((url, i) => (
                <img key={i} src={url} alt="" className="h-full object-contain snap-center shrink-0 rounded-xl bg-white shadow-sm border border-gray-200" />
              ))}
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Caption</h4>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">{selectedPost.caption}</p>
              {selectedPost.hashtags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {selectedPost.hashtags.map(tag => (
                    <span key={tag} className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-md">{tag}</span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-white rounded-xl p-4 flex justify-between items-center shadow-sm border border-gray-200">
              <div>
                <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Status</div>
                <div className="font-extrabold text-gray-900 mt-1 capitalize flex items-center gap-2">
                  {selectedPost.status === 'published' ? <div className="w-2 h-2 rounded-full bg-green-500"/> : <div className="w-2 h-2 rounded-full bg-blue-500"/>}
                  {selectedPost.status}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Dispatch Method</div>
                <div className="font-extrabold text-gray-900 mt-1 uppercase">{selectedPost.method}</div>
              </div>
            </div>

            {selectedPost.status !== 'published' && (
              <button onClick={() => publishPost(selectedPost.id).then(() => setSelectedId(null))} className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-bold flex flex-col items-center justify-center transition shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                <span className="flex items-center gap-2 text-[15px]"><Play size={18} /> Publish Now (Bypass Schedule)</span>
                <span className="text-[10px] text-gray-400 mt-1 font-bold tracking-widest uppercase">Manual API Trigger</span>
              </button>
            )}
            {selectedPost.status === 'published' && (
              <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center justify-center font-bold border border-green-200 shadow-inner">
                ✅ Published securely to Instagram via Graph API
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
