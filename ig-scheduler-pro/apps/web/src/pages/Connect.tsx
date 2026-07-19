import React, { useState, useEffect } from 'react';
import { useAccountStore } from '../stores/accountStore';
import { useToastStore } from '../stores/toastStore';
import { AlertTriangle, Info, Plug, ShieldCheck } from 'lucide-react';

export const Connect: React.FC = () => {
  const { account, fetchAccount, connectAccount, disconnectAccount } = useAccountStore();
  const { toast } = useToastStore();
  
  const [igUserId, setIgUserId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [imgHost, setImgHost] = useState('imgbb');
  const [imgbbKey, setImgbbKey] = useState('');

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await connectAccount({ igUserId, accessToken, imgHost, imgbbKey });
      toast('Successfully connected to Meta API!', 'success');
      setIgUserId('');
      setAccessToken('');
    } catch {
      toast('Failed to connect. Make sure your Token and ID are valid.', 'error');
    }
  };

  const handleTest = async () => {
    if (!igUserId || !accessToken) return toast('Fill out ID and Token first', 'error');
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${igUserId}?fields=name,username&access_token=${accessToken}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      toast(`✅ Valid connection! Found: ${data.username || data.name}`, 'success');
    } catch (e: any) {
      toast(`❌ Test failed: ${e.message}`, 'error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-10 animate-in slide-in-from-bottom-2 duration-300">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Connect IG Account</h1>
        <p className="text-gray-500 font-medium mt-1">Bind your Instagram Business or Creator account via the Meta Graph API.</p>
      </div>

      <div className="bg-orange-50/50 border border-orange-200 rounded-2xl p-6 flex gap-5 text-orange-900 shadow-sm">
        <AlertTriangle className="shrink-0 text-orange-500 mt-1" size={24} />
        <div>
          <h4 className="font-bold mb-2 tracking-wide text-[var(--accent)] text-lg">Prerequisites</h4>
          <p className="font-medium opacity-90 leading-relaxed text-gray-700">You must have an <strong>Instagram Professional Account</strong> (Business or Creator) that is linked to a <strong>Facebook Page</strong>. Personal accounts cannot be automated via the official Meta API.</p>
        </div>
      </div>

      {account ? (
        <div className="bg-white rounded-3xl p-10 shadow-lg shadow-green-500/10 border-2 border-green-100 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(34,160,107,0.3)] border-4 border-white">
            <ShieldCheck size={48} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Account Fully Linked</h2>
          <p className="text-gray-500 font-bold mb-10 bg-gray-50 px-6 py-3 rounded-2xl border-2 border-gray-100 uppercase tracking-widest flex items-center gap-2">Connected as <strong className="text-gray-900 text-lg">@{account.igUsername || account.igUserId}</strong></p>
          <button onClick={() => { if(confirm('Disconnect this account?')) disconnectAccount() }} className="px-8 py-4 bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 font-extrabold rounded-2xl transition shadow-sm hover:shadow-md">
            Disconnect Account
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-md border-2 border-gray-100 overflow-hidden">
          <div className="p-8 md:p-10 bg-gray-50/30 border-b border-gray-100">
            <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-6">Meta API Credentials</h3>
            
            <form onSubmit={handleConnect} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Instagram User ID</label>
                <input required value={igUserId} onChange={e => setIgUserId(e.target.value)} type="text" className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-[var(--accent)] outline-none transition font-extrabold text-gray-900 font-mono text-sm placeholder-gray-300" placeholder="e.g. 17841400000000000" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Long-Lived Access Token</label>
                <input required value={accessToken} onChange={e => setAccessToken(e.target.value)} type="password" className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-[var(--accent)] outline-none transition font-extrabold text-gray-900 font-mono text-sm placeholder-gray-300" placeholder="EAAI..." />
              </div>

              <div className="bg-blue-50/50 p-6 rounded-2xl border-2 border-blue-100 mt-8 pointer-events-none opacity-60 relative overflow-hidden flex gap-4">
                <Info size={24} className="text-blue-500 shrink-0" />
                <div>
                  <h4 className="font-extrabold text-blue-900 mb-1">Image Upload Config</h4>
                  <p className="text-sm font-semibold text-blue-700">Media storage is automatically handled via direct internal S3 bucket pipelines, circumventing ImgBB rates entirely.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <button type="button" onClick={handleTest} className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-extrabold transition text-lg w-full sm:w-auto text-center shadow-sm">
                  Test Token
                </button>
                <button type="submit" className="flex-1 py-4 bg-[var(--accent)] hover:bg-[#d64319] text-white rounded-2xl font-extrabold flex items-center justify-center gap-3 transition hover:-translate-y-1 shadow-lg shadow-orange-500/30 text-lg">
                  <Plug size={20} /> Deploy & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
