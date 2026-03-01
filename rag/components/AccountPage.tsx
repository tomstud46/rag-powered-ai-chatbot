
import React, { useState, useRef } from 'react';
import { User as UserIcon, Mail, Shield, ShieldCheck, Globe, Cpu, LogOut, Check, X, Loader2, Camera, Palette, Sun, Moon } from 'lucide-react';
import { User } from '../types';
import { apiService } from '../services/apiService';
import { ThemeMode } from '../App';

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
  user, 
  onLogout, 
  onUpdateUser,
  userTheme,
  adminTheme,
  setUserTheme,
  setAdminTheme
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: user.username,
    email: user.email,
    avatar: user.avatar || '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updatedUser = await apiService.updateUserProfile(user.id, formData);
      onUpdateUser(updatedUser);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ 
      username: user.username, 
      email: user.email, 
      avatar: user.avatar || '' 
    });
    setIsEditing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    if (isEditing) fileInputRef.current?.click();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      <header className="flex flex-col gap-2">
        <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Profile Identity</h2>
        <p className="text-slate-500 font-medium">Manage your personal profile and interface preferences.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1 bg-white dark:bg-[#12161c] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-10 flex flex-col items-center text-center shadow-xl group hover:border-[#4ade80]/20 transition-all h-fit">
          <div className="relative mb-8">
            <div 
              onClick={triggerFileInput}
              className={`w-32 h-32 rounded-[2.5rem] overflow-hidden border-2 border-[#4ade80] shadow-[0_0_30px_rgba(74,222,128,0.2)] transition-all duration-500 relative group/avatar ${isEditing ? 'cursor-pointer hover:brightness-75' : ''}`}
            >
              <img 
                src={formData.avatar || user.avatar || `https://picsum.photos/seed/${user.id}/128/128`} 
                className="w-full h-full object-cover" 
                alt="avatar" 
              />
              {isEditing && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity bg-black/40">
                  <Camera size={24} className="text-white" />
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            <div className="absolute -bottom-2 -right-2 bg-[#4ade80] text-black p-2 rounded-xl shadow-lg ring-4 ring-white dark:ring-[#12161c]">
              <ShieldCheck size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white truncate w-full px-2">
            {isEditing ? formData.username : user.username}
          </h3>
          <p className="text-[#4ade80] font-black uppercase text-[10px] tracking-[0.25em] mt-2">Verified {user.role}</p>
          
          <div className="w-full mt-10 space-y-3">
             {!isEditing ? (
               <button onClick={() => setIsEditing(true)} className="w-full py-4 bg-[#4ade80] text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#4ade80]/10">Edit Profile</button>
             ) : (
               <div className="flex gap-2">
                 <button onClick={handleSave} disabled={isLoading} className="flex-1 py-4 bg-[#4ade80] text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2">
                   {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save
                 </button>
                 <button onClick={handleCancel} disabled={isLoading} className="flex-1 py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/5 flex items-center justify-center gap-2">
                   <X size={16} /> Cancel
                 </button>
               </div>
             )}
             <button onClick={onLogout} className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-500/20 transition-all border border-red-500/10">Log Out</button>
          </div>
        </div>

        {/* Detailed Info & Preferences */}
        <div className="md:col-span-2 space-y-8">
           <div className="bg-white dark:bg-[#12161c] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-10 shadow-xl">
              <h4 className="text-xl font-bold mb-8 flex items-center gap-3 text-slate-900 dark:text-white">
                <Shield size={22} className="text-[#4ade80]" /> Personal Matrix
              </h4>
              <div className="space-y-6">
                <InfoRow 
                  icon={<UserIcon size={18} />} 
                  label="Full Identity" 
                  value={isEditing ? (
                    <input className="bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-lg px-3 py-1 outline-none focus:border-[#4ade80]/50 transition-all text-sm w-full max-w-[200px]" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                  ) : user.username} 
                />
                <InfoRow 
                  icon={<Mail size={18} />} 
                  label="Communication" 
                  value={isEditing ? (
                    <input className="bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-lg px-3 py-1 outline-none focus:border-[#4ade80]/50 transition-all text-sm w-full max-w-[200px]" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  ) : user.email} 
                />
                <InfoRow icon={<Globe size={18} />} label="Source Provider" value={user.provider.toUpperCase()} />
                <InfoRow icon={<Cpu size={18} />} label="System Access" value={user.role === 'admin' ? 'Superuser' : 'Standard'} valueClass="text-[#4ade80]" />
              </div>
           </div>

           {/* Theme Selection - The core "separate configuration" feature */}
           <div className="bg-white dark:bg-[#12161c] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-10 shadow-xl">
              <h4 className="text-xl font-bold mb-8 flex items-center gap-3 text-slate-900 dark:text-white">
                <Palette size={22} className="text-[#4ade80]" /> Interface Preferences
              </h4>
              <div className="space-y-8">
                <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-black/20 rounded-3xl border border-slate-100 dark:border-white/5">
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white">Chat Interface Theme</h5>
                    <p className="text-xs text-slate-500">Configure visual style for the AI chatbot view.</p>
                  </div>
                  <ThemeToggle value={userTheme} onChange={setUserTheme} />
                </div>

                {user.role === 'admin' && (
                  <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-black/20 rounded-3xl border border-slate-100 dark:border-white/5">
                    <div>
                      <h5 className="font-bold text-slate-900 dark:text-white">Admin Command Center Theme</h5>
                      <p className="text-xs text-slate-500">Configure visual style for administrative tools.</p>
                    </div>
                    <ThemeToggle value={adminTheme} onChange={setAdminTheme} />
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const ThemeToggle = ({ value, onChange }: { value: ThemeMode, onChange: (t: ThemeMode) => void }) => (
  <div className="flex bg-white dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10">
    <button onClick={() => onChange('light')} className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${value === 'light' ? 'bg-[#4ade80] text-black shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
      <Sun size={14} /> <span className="text-[10px] font-black uppercase tracking-widest">Light</span>
    </button>
    <button onClick={() => onChange('dark')} className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${value === 'dark' ? 'bg-[#4ade80] text-black shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
      <Moon size={14} /> <span className="text-[10px] font-black uppercase tracking-widest">Dark</span>
    </button>
  </div>
);

const InfoRow = ({ icon, label, value, valueClass = "text-slate-600 dark:text-slate-300" }: any) => (
  <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-white/5 last:border-0 min-h-[64px]">
    <div className="flex items-center gap-4">
      <div className="p-2.5 bg-slate-100 dark:bg-black/40 text-[#4ade80] rounded-xl border border-slate-200 dark:border-white/5">{icon}</div>
      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{label}</span>
    </div>
    <div className={`text-sm font-bold flex justify-end transition-all ${valueClass}`}>{value}</div>
  </div>
);
