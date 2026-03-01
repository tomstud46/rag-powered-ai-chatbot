import React, { useState } from 'react';
import { Bot, Mail, Lock, User as UserIcon, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { User } from '../types.ts';
import { apiService } from '../services/apiService.ts';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

interface AuthPageProps {
  onLogin: (user: User) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let user: User;
      if (isLogin) {
        user = await apiService.login(email, password);
      } else {
        user = await apiService.register(username, email, password);
      }
      setSuccess("Success. Link established.");
      setTimeout(() => onLogin(user), 800);
    } catch (err: any) {
      setError(err.message || "Auth failed.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return;
    setLoading(true);
    try {
      const user = await apiService.googleLogin(credentialResponse.credential);
      onLogin(user);
    } catch (err) {
      setError("Google link failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#12161c] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
        <div className="bg-[#4ade80] p-10 text-black text-center">
          <div className="bg-black/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md shadow-lg">
            <Bot size={40} />
          </div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Neural Hub</h2>
          <p className="text-black/60 text-[10px] font-black uppercase tracking-widest mt-2">Identity Matrix Verification</p>
        </div>

        <div className="p-10 space-y-6">
          {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-2xl flex items-center gap-3"><AlertCircle size={18} />{error}</div>}
          {success && <div className="p-4 bg-[#4ade80]/10 border border-[#4ade80]/20 text-[#4ade80] text-xs font-bold rounded-2xl flex items-center gap-3"><CheckCircle2 size={18} />{success}</div>}

          <div className="w-full flex justify-center"><GoogleLogin onSuccess={handleGoogleLogin} /></div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Identity Label" className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/5 text-white rounded-2xl focus:border-[#4ade80]/40 outline-none" />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Comm Address" className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/5 text-white rounded-2xl focus:border-[#4ade80]/40 outline-none" />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Passphrase" className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/5 text-white rounded-2xl focus:border-[#4ade80]/40 outline-none" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-[#4ade80] text-black py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-[#4ade80]/10 active:scale-95 disabled:opacity-50 transition-all">
              {loading ? <Loader2 className="animate-spin" size={24} /> : <>{isLogin ? 'Establish Link' : 'Initialize Node'} <ArrowRight size={22} /></>}
            </button>
          </form>
          <p className="text-center text-xs text-slate-500 font-bold">{isLogin ? "No identity?" : "Already verified?"} <button onClick={() => setIsLogin(!isLogin)} className="text-[#4ade80] font-black uppercase hover:underline">{isLogin ? 'Register' : 'Login'}</button></p>
        </div>
      </div>
    </div>
  );
};