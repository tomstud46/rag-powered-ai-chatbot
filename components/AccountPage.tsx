import React, { useState, useRef } from 'react';
import { User as UserIcon, Mail, Shield, ShieldCheck, Globe, Cpu, Check, X, Loader2, Camera, Palette, Sun, Moon } from 'lucide-react';
import { User } from '../types.ts';
import { apiService } from '../services/apiService.ts';
import { ThemeMode } from '../App.tsx';

interface AccountPageProps {
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
  userTheme: ThemeMode;
  adminTheme: ThemeMode;
  setUserTheme: (theme: ThemeMode) => void;
  setAdminTheme: (theme: ThemeMode) => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({ 
  user, onLogout, onUpdateUser, userTheme, adminTheme, setUserTheme, setAdminTheme
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ username: user.username, email: user.email, avatar: user.avatar || '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updatedUser = await apiService.updateUserProfile(user.id, formData);
      onUpdateUser(updatedUser);
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      <header className="flex flex-col gap-2">
        <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">Profile Matrix</h2>
        <p className="text-slate-500 font-medium">Verified Identity Management</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-[#12161c] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-10 flex flex-col items-center text-center shadow-xl">
          <div className="relative mb-8 cursor-pointer" onClick={() => isEditing && fileInputRef.current?.click()}>
            <img src={formData.avatar || user.avatar || `https://picsum.photos/seed/${user.id}/128/128`} className="w-32 h-32 rounded-[2.5rem] border-2 border-[#4ade80] shadow-lg object-cover" />
            {isEditing && <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-[2.5rem]"><Camera size={24} className="text-white" /></div>}
            <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => setFormData(p => ({ ...p, avatar: reader.result as string }));
                reader.readAsDataURL(file);
              }
            }} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">{isEditing ? formData.username : user.username}</h3>
          <p className="text-[#4ade80] font-black uppercase text-[10px] tracking-widest mt-2">{user.role}</p>
          <div className="w-full mt-10 space-y-3">
            {isEditing ? (
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={isLoading} className="flex-1 py-4 bg-[#4ade80] text-black rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg">{isLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save</button>
                <button onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-white/5 text-slate-400 rounded-2xl font-black uppercase text-[10px] border border-white/5"><X size={16} /></button>
              </div>
            ) : <button onClick={() => setIsEditing(true)} className="w-full py-4 bg-[#4ade80] text-black rounded-2xl font-black uppercase text-[10px] shadow-lg">Edit Matrix</button>}
            <button onClick={onLogout} className="w-full py-4 text-red-500 font-black uppercase text-[10px] border border-red-500/10 rounded-2xl">Log Out</button>
          </div>
        </div>

        <div className="md:col-span-2 space-y-8">
           <div className="bg-white dark:bg-[#12161c] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-10 shadow-xl space-y-6">
              <h4 className="text-xl font-bold flex items-center gap-3 text-slate-900 dark:text-white"><Shield size={22} className="text-[#4ade80]" /> Technical Parameters</h4>
              <InfoRow icon={<UserIcon size={18} />} label="Label" value={isEditing ? <input className="bg-black/20 border border-white/5 rounded-lg px-2 text-white outline-none" value={formData.username} onChange={e => setFormData(p => ({ ...p, username: e.target.value }))} /> : user.username} />
              <InfoRow icon={<Mail size={18} />} label="Address" value={user.email} />
              <InfoRow icon={<Globe size={18} />} label="Provider" value={user.provider.toUpperCase()} />
              <InfoRow icon={<Cpu size={18} />} label="Protocol" value={user.role === 'admin' ? 'Superuser' : 'User'} />
           </div>

           <div className="bg-white dark:bg-[#12161c] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-10 shadow-xl space-y-8">
              <h4 className="text-xl font-bold flex items-center gap-3 text-slate-900 dark:text-white"><Palette size={22} className="text-[#4ade80]" /> Core UI Config</h4>
              <div className="flex justify-between items-center bg-black/20 p-6 rounded-3xl border border-white/5">
                <div><h5 className="font-bold text-white">Interface Theme</h5><p className="text-xs text-slate-500">Global visual style.</p></div>
                <ThemeToggle value={userTheme} onChange={setUserTheme} />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const ThemeToggle = ({ value, onChange }: any) => (
  <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
    <button onClick={() => onChange('light')} className={`px-4 py-2 rounded-xl flex items-center gap-2 ${value === 'light' ? 'bg-[#4ade80] text-black shadow-lg' : 'text-slate-500'}`}><Sun size={14} /><span className="text-[10px] font-black uppercase">Light</span></button>
    <button onClick={() => onChange('dark')} className={`px-4 py-2 rounded-xl flex items-center gap-2 ${value === 'dark' ? 'bg-[#4ade80] text-black shadow-lg' : 'text-slate-500'}`}><Moon size={14} /><span className="text-[10px] font-black uppercase">Dark</span></button>
  </div>
);

const InfoRow = ({ icon, label, value }: any) => (
  <div className="flex items-center justify-between py-4 border-b border-white/5 last:border-0 min-h-[64px]">
    <div className="flex items-center gap-4"><div className="p-2.5 bg-black/40 text-[#4ade80] rounded-xl border border-white/5">{icon}</div><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{label}</span></div>
    <div className="text-sm font-bold text-slate-300">{value}</div>
  </div>
);