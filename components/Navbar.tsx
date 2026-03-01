import React from 'react';
import { Bell, MessageSquare, Sun, Moon, LogOut, LayoutDashboard, Shield } from 'lucide-react';
import { User as UserType } from '../types.ts';
import { PageType } from '../App.tsx';

interface NavbarProps {
  user: UserType | null;
  onLogout: () => void;
  onNavigate: (page: PageType) => void;
  currentPage: PageType;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  user, 
  onLogout, 
  onNavigate, 
  currentPage,
  isDarkMode,
  onToggleDarkMode 
}) => {
  return (
    <nav className={`w-full h-20 fixed top-0 left-0 backdrop-blur-xl border-b flex items-center justify-between px-8 z-[100] shadow-2xl transition-colors duration-500 ${
      isDarkMode ? 'bg-[#0a0c10]/80 border-white/5' : 'bg-white/80 border-slate-200'
    }`}>
      <div 
        className="flex items-center gap-4 cursor-pointer group" 
        onClick={() => onNavigate(user?.role === 'admin' ? 'admin' : 'chat')}
      >
        <div className="w-10 h-10 bg-[#4ade80] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(74,222,128,0.3)] transition-transform group-hover:scale-110">
          <LayoutDashboard size={20} className="text-black" />
        </div>
        <div className="hidden sm:block">
          <h1 className={`text-lg font-black tracking-tight uppercase leading-none transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Neural Hub</h1>
          <p className="text-[9px] text-[#4ade80] font-black uppercase tracking-widest mt-0.5 opacity-60">
            {user?.role === 'admin' ? 'Superuser Protocol' : 'Verified Node'}
          </p>
        </div>
      </div>

      <div className={`flex items-center gap-1 p-1 rounded-2xl border transition-colors ${
        isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'
      }`}>
        <NavButton 
          icon={<MessageSquare size={18} />} 
          label="Interface" 
          active={currentPage === 'chat'} 
          onClick={() => onNavigate('chat')} 
          isDarkMode={isDarkMode}
        />
        {user?.role === 'admin' && (
          <NavButton 
            icon={<Shield size={18} />} 
            label="Command" 
            active={currentPage === 'admin'} 
            onClick={() => onNavigate('admin')} 
            isDarkMode={isDarkMode}
          />
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className={`hidden md:flex items-center gap-2 pr-4 border-r transition-colors ${
          isDarkMode ? 'border-white/10' : 'border-slate-200'
        }`}>
          <button 
            onClick={() => onNavigate('notifications')}
            className={`p-2.5 rounded-xl transition-all relative group border ${
              currentPage === 'notifications' 
                ? 'bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20' 
                : isDarkMode 
                  ? 'bg-white/5 text-slate-500 hover:text-white border-transparent' 
                  : 'bg-slate-100 text-slate-500 hover:text-slate-900 border-transparent'
            }`}
          >
            <Bell size={18} className="group-active:scale-90" />
            <span className={`absolute top-2 right-2 w-2 h-2 bg-[#4ade80] rounded-full border-2 ${isDarkMode ? 'border-[#0a0c10]' : 'border-white'}`}></span>
          </button>
          <button 
            onClick={onToggleDarkMode}
            className={`p-2.5 rounded-xl transition-all border hover:scale-105 ${
              isDarkMode 
                ? 'bg-white/5 text-slate-500 hover:text-white border-transparent hover:bg-white/10' 
                : 'bg-slate-100 text-slate-500 hover:text-slate-900 border-transparent hover:bg-slate-200'
            }`}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div 
            className={`flex items-center p-1.5 rounded-2xl border transition-all cursor-pointer ${
              currentPage === 'account' 
                ? 'bg-[#4ade80]/5 border-[#4ade80]/20' 
                : isDarkMode 
                  ? 'bg-white/5 border-transparent hover:border-white/10' 
                  : 'bg-slate-100 border-transparent hover:border-slate-200'
            }`}
            onClick={() => onNavigate('account')}
          >
            <img 
              src={user?.avatar || `https://picsum.photos/seed/${user?.id || 'default'}/32/32`} 
              className="w-8 h-8 rounded-lg object-cover border border-white/10 shadow-lg" 
              alt="avatar" 
            />
          </div>
          
          <button 
            onClick={onLogout}
            className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all border border-red-500/10 group"
            title="Log out"
          >
            <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </nav>
  );
};

const NavButton = ({ icon, label, active, onClick, isDarkMode }: { icon: any, label: string, active: boolean, onClick: () => void, isDarkMode: boolean }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all border group ${
      active 
        ? 'bg-[#4ade80] text-black border-[#4ade80] shadow-[0_0_15px_rgba(74,222,128,0.2)]' 
        : `bg-transparent border-transparent ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`
    }`}
  >
    <span className="transition-colors">{icon}</span>
    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">{label}</span>
  </button>
);