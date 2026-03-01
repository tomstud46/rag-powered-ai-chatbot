
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AdminPanel } from './components/AdminPanel';
import { ChatWidget } from './components/ChatWidget';
import { AuthPage } from './components/AuthPage';
import { AccountPage } from './components/AccountPage';
import { NotificationPage } from './components/NotificationPage';
import { User, ChatSession } from './types';
import { apiService } from './services/apiService';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AlertCircle } from 'lucide-react';

export type PageType = 'chat' | 'knowledge' | 'account' | 'notifications' | 'admin';
export type ThemeMode = 'dark' | 'light';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<PageType>('chat');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [accessError, setAccessError] = useState<string | null>(null);

  // Independent theme states
  const [userTheme, setUserTheme] = useState<ThemeMode>(() => 
    (localStorage.getItem('theme_user') as ThemeMode) || 'dark'
  );
  const [adminTheme, setAdminTheme] = useState<ThemeMode>(() => 
    (localStorage.getItem('theme_admin') as ThemeMode) || 'dark'
  );

  // Determine if current view is an admin context
  const isAdminView = currentPage === 'admin' || currentPage === 'knowledge';
  const currentActiveTheme = isAdminView ? adminTheme : userTheme;

  // Apply dark mode class based on active context theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (currentActiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [currentActiveTheme, currentPage]);

  // Persistence hooks
  useEffect(() => {
    localStorage.setItem('theme_user', userTheme);
  }, [userTheme]);

  useEffect(() => {
    localStorage.setItem('theme_admin', adminTheme);
  }, [adminTheme]);

  // Initialize current user & sessions
  useEffect(() => {
    const initApp = async () => {
      const currentUser = await apiService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        if (currentUser.role === 'admin') setCurrentPage('admin');
        else setCurrentPage('chat');

        const savedSessions = localStorage.getItem(`chat_sessions_${currentUser.id}`);
        if (savedSessions) setSessions(JSON.parse(savedSessions));
      }
      setIsAuthLoading(false);
    };
    initApp();
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    if (newUser.role === 'admin') setCurrentPage('admin');
    else setCurrentPage('chat');
    
    const savedSessions = localStorage.getItem(`chat_sessions_${newUser.id}`);
    setSessions(savedSessions ? JSON.parse(savedSessions) : []);
  };

  const handleUpdateUser = (updatedUser: User) => setUser(updatedUser);

  const handleLogout = async () => {
    await apiService.logout();
    setUser(null);
    setCurrentPage('chat');
    setSessions([]);
  };

  const navigate = (page: PageType) => {
    if (!user) return;
    if ((page === 'admin' || page === 'knowledge') && user.role !== 'admin') {
      setAccessError("Restricted Access: Admin privileges required.");
      setTimeout(() => setAccessError(null), 3000);
      return;
    }
    setAccessError(null);
    setCurrentPage(page);
  };

  const handleToggleActiveTheme = () => {
    if (isAdminView) {
      setAdminTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    } else {
      setUserTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    }
  };

  const saveSessions = (updatedSessions: ChatSession[]) => {
    if (!user) return;
    setSessions(updatedSessions);
    localStorage.setItem(`chat_sessions_${user.id}`, JSON.stringify(updatedSessions));
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0c10]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-[#4ade80] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-black text-[#4ade80] uppercase tracking-[0.5em] animate-pulse">Initializing System</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <GoogleOAuthProvider clientId={(import.meta as any).env.VITE_GOOGLE_CLIENT_ID}>
        <AuthPage onLogin={handleLogin} />
      </GoogleOAuthProvider>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 overflow-hidden flex flex-col ${currentActiveTheme === 'dark' ? 'bg-[#0a0c10]' : 'bg-slate-50'}`}>
      <Navbar
        user={user}
        onLogout={handleLogout}
        onNavigate={navigate}
        currentPage={currentPage}
        isDarkMode={currentActiveTheme === 'dark'}
        onToggleDarkMode={handleToggleActiveTheme}
      />

      {accessError && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4">
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-xl shadow-2xl">
            <AlertCircle size={20} />
            <span className="text-xs font-black uppercase tracking-widest">{accessError}</span>
          </div>
        </div>
      )}

      <main className="flex-1 relative h-[calc(100vh-80px)] mt-20 overflow-hidden">
        <PageWrapper active={currentPage === 'chat'}>
          <ChatWidget user={user} sessions={sessions} onSessionsChange={saveSessions} onLogout={handleLogout} />
        </PageWrapper>

        <PageWrapper active={currentPage === 'admin' || currentPage === 'knowledge'}>
          <div className="h-full overflow-y-auto custom-scrollbar p-10">
            <AdminPanel user={user} />
          </div>
        </PageWrapper>

        <PageWrapper active={currentPage === 'account'}>
          <div className="h-full overflow-y-auto custom-scrollbar p-10">
            <AccountPage 
              user={user} 
              onLogout={handleLogout} 
              onUpdateUser={handleUpdateUser}
              userTheme={userTheme}
              adminTheme={adminTheme}
              setUserTheme={setUserTheme}
              setAdminTheme={setAdminTheme}
            />
          </div>
        </PageWrapper>

        <PageWrapper active={currentPage === 'notifications'}>
          <div className="h-full overflow-y-auto custom-scrollbar p-10">
            <NotificationPage />
          </div>
        </PageWrapper>
      </main>
    </div>
  );
};

const PageWrapper: React.FC<{ active: boolean; children: React.ReactNode }> = ({ active, children }) => (
  <div className={`absolute inset-0 transition-all duration-500 ease-in-out transform ${
    active ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto z-10' : 'opacity-0 translate-y-8 scale-95 pointer-events-none z-0'
  }`}>
    {children}
  </div>
);

export default App;
