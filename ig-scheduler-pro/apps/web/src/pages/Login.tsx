import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Camera } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore(s => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4 font-sans">
      <div className="bg-white rounded-[24px] shadow-xl w-full max-w-md p-8 sm:p-10 border border-gray-100">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[var(--ig-grad)] flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
            <Camera size={36} />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-center text-gray-900 mb-2 tracking-tight">Welcome Back</h1>
        <p className="text-center font-medium text-gray-500 mb-8">Sign in to manage your IG queue</p>
        
        {error && <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-6 text-sm font-bold flex items-center gap-2">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Email address</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition font-medium text-gray-900 placeholder-gray-400"
              placeholder="creator@example.com" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition font-medium text-gray-900 placeholder-gray-400"
              placeholder="••••••••" />
          </div>
          <button type="submit" className="w-full py-4 px-4 bg-[var(--accent)] hover:bg-[#d64319] text-white rounded-xl font-bold tracking-wide transition-all shadow-md mt-4 hover:shadow-xl hover:-translate-y-0.5">
            Sign In
          </button>
        </form>
        <p className="mt-8 text-center text-sm font-medium text-gray-600">
          Don't have an account? <Link to="/register" className="text-[var(--accent)] font-bold hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
};
