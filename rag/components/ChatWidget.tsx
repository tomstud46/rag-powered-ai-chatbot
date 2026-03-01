
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, X, Bot, Trash2, Plus, 
  Copy, ThumbsUp, ThumbsDown, Edit3, Download, RefreshCcw,
  Mic, MoreVertical, LayoutGrid, BarChart3, Folder, 
  Scale, Grid3X3, Settings, LogOut, MessageSquare, Check, TrendingUp, Users, Zap, Shield, FileText, Search,
  History, Database, Square, Loader2
} from 'lucide-react';
import { chatWithRAGStream, AudioData } from '../services/geminiService';
import { ChatMessage, ChatSession, User } from '../types';
import { vectorStore } from '../services/vectorStore';

interface ChatWidgetProps {
  user: User;
  sessions: ChatSession[];
  onSessionsChange: (sessions: ChatSession[]) => void;
  onLogout: () => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ user, sessions, onSessionsChange, onLogout }) => {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(sessions[0]?.id || null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [activeSidebarTab, setActiveSidebarTab] = useState('chat');
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const activeSession = useMemo(() => sessions.find(s => s.id === activeSessionId), [sessions, activeSessionId]);
  const messages = activeSession?.messages || [];
  const docs = useMemo(() => vectorStore.getDocuments(), [activeSidebarTab]);

  const groupedSessions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return {
      today: sessions.filter(s => new Date(s.lastUpdatedAt) >= today),
      yesterday: sessions.filter(s => {
        const d = new Date(s.lastUpdatedAt);
        return d >= yesterday && d < today;
      }),
      lastWeek: sessions.filter(s => {
        const d = new Date(s.lastUpdatedAt);
        return d >= sevenDaysAgo && d < yesterday;
      }),
      older: sessions.filter(s => new Date(s.lastUpdatedAt) < sevenDaysAgo)
    };
  }, [sessions]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, streamingText, isLoading, isTyping, activeSidebarTab]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startNewChat = () => {
    const newSession: ChatSession = {
      id: 'session_' + Date.now(),
      userId: user.id,
      title: 'New Conversation',
      messages: [
        { id: 'welcome', role: 'model', text: 'How Can I Help You Today?', timestamp: Date.now() }
      ],
      lastUpdatedAt: Date.now()
    };
    onSessionsChange([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
    setActiveSidebarTab('chat');
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = window.confirm("Delete this conversation?");
    if (confirmed) {
      const filtered = sessions.filter(s => s.id !== id);
      onSessionsChange(filtered);
      if (activeSessionId === id) {
        setActiveSessionId(filtered[0]?.id || null);
      }
    }
  };

  const handleSend = async (audioData?: AudioData) => {
    if ((!input.trim() && !audioData) || isLoading) return;

    let currentSessionId = activeSessionId;
    let updatedSessions = [...sessions];

    if (!currentSessionId) {
      const newSession: ChatSession = {
        id: 'session_' + Date.now(),
        userId: user.id,
        title: input ? (input.length > 30 ? input.substring(0, 30) + '...' : input) : 'Voice Query',
        messages: [
          { id: 'welcome', role: 'model', text: 'How Can I Help You Today?', timestamp: Date.now() }
        ],
        lastUpdatedAt: Date.now()
      };
      updatedSessions = [newSession, ...sessions];
      currentSessionId = newSession.id;
      setActiveSessionId(currentSessionId);
    }

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      text: audioData ? (input ? `[Voice & Text] ${input}` : "[Voice Message]") : input,
      timestamp: Date.now()
    };

    updatedSessions = updatedSessions.map(s => s.id === currentSessionId ? {
      ...s,
      messages: [...s.messages, userMsg],
      lastUpdatedAt: Date.now(),
      title: (s.title === 'New Conversation' || !s.title) ? (input ? (input.length > 30 ? input.substring(0, 30) + '...' : input) : 'Voice Query') : s.title
    } : s);

    onSessionsChange(updatedSessions);
    const textToProcess = input;
    setInput('');
    setIsLoading(true);
    setIsTyping(true);
    setStreamingText('');

    try {
      const currentMessages = updatedSessions.find(s => s.id === currentSessionId)?.messages || [];
      const history = currentMessages
        .slice(0, -1) 
        .map(m => ({ role: m.role, parts: [{ text: m.text }] }));

      let accumulatedText = "";
      
      const { sources } = await chatWithRAGStream(
        textToProcess, 
        history, 
        (chunk) => {
          setIsTyping(false);
          accumulatedText += chunk;
          setStreamingText(accumulatedText);
        },
        audioData
      );
      
      const botMsg: ChatMessage = {
        id: 'bot_' + Date.now(),
        role: 'model',
        text: accumulatedText,
        timestamp: Date.now(),
        sources: sources
      };
      
      onSessionsChange(updatedSessions.map(s => s.id === currentSessionId ? { 
        ...s, 
        messages: [...s.messages, botMsg],
        lastUpdatedAt: Date.now()
      } : s));
      
      setStreamingText('');
    } catch (err) {
      console.error("AI Streaming Error:", err);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      setStreamingText('');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleRecording = async () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          handleSend({ data: base64data, mimeType: mediaRecorder.mimeType });
        };
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone access is required for voice messaging.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const TypingIndicator: React.FC = () => (
    <div className="flex gap-4 items-center animate-pulse py-2">
      <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#0d1a14] border border-slate-200 dark:border-[#4ade80]/20 flex items-center justify-center">
        <Bot size={20} className="text-[#4ade80]" />
      </div>
      <div className="h-12 w-32 bg-slate-100 dark:bg-white/5 rounded-[2rem] relative flex items-center px-6 border border-slate-200 dark:border-transparent">
        <div className="flex gap-1">
          {[1,2,3].map(i => (
            <div key={i} className="w-2 h-2 bg-[#4ade80] rounded-full animate-bounce" style={{ animationDelay: `${i*0.2}s` }}></div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-10 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-2">
        <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">System Status</h2>
        <p className="text-slate-500 font-medium">Global operational overview for your knowledge agents.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={<TrendingUp size={24} />} label="Usage Growth" value="+24%" sub="Since last week" />
        <StatCard icon={<MessageSquare size={24} />} label="Total Messages" value={sessions.reduce((acc, s) => acc + s.messages.length, 0).toString()} sub="All-time sessions" />
        <StatCard icon={<FileText size={24} />} label="Docs Indexed" value={docs.length.toString()} sub="Knowledge Base" />
        <StatCard icon={<Zap size={24} />} label="AI Latency" value="120ms" sub="Global average" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-[#12161c] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white"><History size={20} className="text-[#4ade80]" /> Recent Activity</h3>
          <div className="space-y-4">
            {sessions.slice(0, 4).map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-[#4ade80]/10 text-[#4ade80] rounded-xl"><MessageSquare size={16} /></div>
                  <span className="text-sm font-bold truncate max-w-[150px] text-slate-900 dark:text-white">{s.title}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-bold">{new Date(s.lastUpdatedAt).toLocaleTimeString()}</span>
              </div>
            ))}
            {sessions.length === 0 && <p className="text-center py-10 text-slate-600 uppercase text-[10px] font-black">No Recent History</p>}
          </div>
        </div>
        <div className="bg-white dark:bg-[#12161c] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white"><Shield size={20} className="text-[#4ade80]" /> System Health</h3>
          <div className="flex flex-col items-center justify-center h-48 gap-4">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-[#4ade80]/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-[#4ade80] border-t-transparent animate-spin duration-[3s]"></div>
              <span className="text-2xl font-black text-[#4ade80]">98%</span>
            </div>
            <p className="text-sm text-slate-400 font-medium">All clusters are fully operational.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFolder = () => (
    <div className="relative py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Knowledge Base</h2>
          <p className="text-slate-500">Indexed document management.</p>
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Filter indexed content..."
            className="rounded-xl py-2 pl-12 pr-4 text-sm w-64 outline-none bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-600"
          />
        </div>
      </header>
      <div className="mt-6 rounded-[2rem] overflow-hidden border border-slate-200 dark:border-white/5 bg-white dark:bg-[#12161c]">
        <table className="w-full text-left">
          <thead className="text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-white/5 text-slate-500 border-b border-slate-200 dark:border-white/5">
            <tr>
              <th className="px-8 py-4">Filename</th>
              <th className="px-8 py-4">Status</th>
              <th className="px-8 py-4">Size</th>
              <th className="px-8 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {docs.map(doc => (
              <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-white/5 group transition-colors">
                <td className="px-8 py-5 flex items-center gap-3">
                  <FileText size={18} className="text-[#4ade80]" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{doc.title}</span>
                </td>
                <td className="px-8 py-5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20">
                    Ready
                  </span>
                </td>
                <td className="px-8 py-5 text-sm text-slate-500">{(doc.content.length / 1024).toFixed(1)} KB</td>
                <td className="px-8 py-5 text-right">
                  <button onClick={() => vectorStore.deleteDocument(doc.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-8 py-20 text-center text-slate-500 font-bold uppercase text-[10px] tracking-widest">No Documents Found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderView = () => {
    switch(activeSidebarTab) {
      case 'dashboard': return renderDashboard();
      case 'folder': return renderFolder();
      case 'scale': return renderScale();
      case 'grid': return renderGrid();
      case 'settings': return renderSettings();
      default: return null;
    }
  };

  return (
    <div className="flex h-full w-full bg-slate-50 dark:bg-gradient-to-br dark:from-[#0c0f14] dark:via-[#0a0c10] dark:to-[#0d1117] transition-colors duration-500 overflow-hidden">
      <aside className="w-16 flex flex-col items-center py-6 gap-6 border-r border-slate-200 dark:border-white/5 bg-white dark:bg-black/20 z-10 shrink-0">
        <div className="flex flex-col gap-4">
          <NavIcon icon={<LayoutGrid size={20} />} active={activeSidebarTab === 'dashboard'} onClick={() => setActiveSidebarTab('dashboard')} label="Dashboard" />
          <NavIcon icon={<MessageSquare size={20} />} active={activeSidebarTab === 'chat'} onClick={() => setActiveSidebarTab('chat')} label="AI Chat" />
          <NavIcon icon={<Folder size={20} />} active={activeSidebarTab === 'folder'} onClick={() => setActiveSidebarTab('folder')} label="Knowledge" />
          <NavIcon icon={<Scale size={20} />} active={activeSidebarTab === 'scale'} onClick={() => setActiveSidebarTab('scale')} label="Scaling" />
          <NavIcon icon={<Grid3X3 size={20} />} active={activeSidebarTab === 'grid'} onClick={() => setActiveSidebarTab('grid')} label="Grid" />
        </div>
        <div className="mt-auto flex flex-col gap-4">
          <NavIcon icon={<Settings size={20} />} active={activeSidebarTab === 'settings'} onClick={() => setActiveSidebarTab('settings')} secondary label="Settings" />
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative px-8 pb-8 overflow-hidden">
        {activeSidebarTab === 'chat' ? (
          <>
            <header className="py-6 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-[#4ade80] rounded-full animate-pulse shadow-[0_0_10px_#4ade80]"></div>
                <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 dark:text-white">Neural Terminal</h2>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-2 hover:bg-slate-200 dark:hover:bg-white/5 rounded-full transition-all text-slate-500"><MoreVertical size={20} /></button>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto pr-4 space-y-8 custom-scrollbar pb-10">
              {messages.length === 0 && !isLoading && !isTyping && (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-[#4ade80]/10 border border-[#4ade80]/20 flex items-center justify-center text-[#4ade80] mb-6 animate-bounce duration-[3s]">
                    <Bot size={40} />
                  </div>
                  <p className="text-xl font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Interface Ready</p>
                  <p className="text-sm font-medium mt-2 max-w-xs text-slate-600 dark:text-slate-400">Accessing indexed knowledge clusters via Gemini-Flash.</p>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse animate-in slide-in-from-right-4' : 'flex-row animate-in slide-in-from-left-4'} duration-300`}>
                  <div className="flex-shrink-0">
                    {msg.role === 'model' ? (
                      <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#0d1a14] border border-slate-200 dark:border-[#4ade80]/20 flex items-center justify-center shadow-lg">
                        <Bot size={20} className="text-[#4ade80]" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-lg">
                        <img 
                          src={user.avatar || `https://picsum.photos/seed/${user.id}/40/40`} 
                          className="w-full h-full object-cover" 
                          alt="user" 
                        />
                      </div>
                    )}
                  </div>
                  <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-5 rounded-[2rem] leading-relaxed text-[15px] shadow-lg ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-br from-[#2c4030] to-[#1e2a20] border border-[#4ade80]/20 rounded-tr-none text-white' 
                        : 'bg-white dark:bg-[#12161c] border border-slate-200 dark:border-white/5 rounded-tl-none text-slate-800 dark:text-slate-300'
                    }`}>{msg.text}</div>
                    {msg.role === 'model' && (
                      <div className="flex flex-col gap-3">
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="flex flex-wrap gap-2 px-2">
                            {msg.sources.map((source, i) => (
                              <span key={i} className="text-[10px] font-black uppercase tracking-widest text-[#4ade80] bg-[#4ade80]/10 px-2 py-0.5 rounded border border-[#4ade80]/20 flex items-center gap-1">
                                <Database size={10} /> {source}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-3 px-2 text-slate-400">
                          <ActionButton icon={<Copy size={14} />} onClick={() => handleCopy(msg.text)} />
                          <ActionButton icon={<ThumbsUp size={14} />} />
                          <ActionButton icon={<Download size={14} />} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {streamingText && (
                <div className="flex gap-4 flex-row animate-in slide-in-from-left-4 duration-300">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#0d1a14] border border-slate-200 dark:border-[#4ade80]/20 flex items-center justify-center shadow-lg">
                      <Bot size={20} className="text-[#4ade80]" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 max-w-[80%] items-start">
                    <div className="p-5 rounded-[2rem] leading-relaxed text-[15px] shadow-lg bg-white dark:bg-[#12161c] border border-slate-200 dark:border-white/5 rounded-tl-none text-slate-800 dark:text-slate-300">
                      {streamingText}
                      <span className="inline-block w-2 h-4 bg-[#4ade80] ml-1 animate-pulse"></span>
                    </div>
                  </div>
                </div>
              )}

              {isTyping && <TypingIndicator />}
            </div>

            <div className="mt-auto pt-6 shrink-0">
              <div className="relative bg-white/50 dark:bg-[#12161c]/50 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-4 focus-within:border-[#4ade80]/30 transition-all shadow-xl">
                {isRecording ? (
                  <div className="flex items-center justify-between px-6 py-2 w-full animate-in fade-in duration-300">
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Recording: {formatTime(recordingTime)}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className="w-1 h-4 bg-[#4ade80] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}></div>
                        ))}
                      </div>
                    </div>
                    <button onClick={stopRecording} className="p-3 bg-red-500 text-white rounded-2xl hover:scale-105 transition-all shadow-lg">
                      <Square size={20} />
                    </button>
                  </div>
                ) : (
                  <>
                    <textarea
                      rows={1}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="Query knowledge registry or use voice..."
                      className="w-full bg-transparent px-6 py-2 outline-none resize-none text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-600 font-medium"
                    />
                    <div className="flex items-center justify-between mt-3 px-2">
                      <div className="flex items-center gap-2">
                        <button onClick={toggleRecording} className="p-2.5 bg-[#4ade80]/10 hover:bg-[#4ade80]/20 text-[#4ade80] rounded-full transition-all group">
                          <Mic size={18} className="group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                      <button onClick={() => handleSend()} disabled={!input.trim() || isLoading} className="p-3 bg-[#4ade80] text-black rounded-2xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(74,222,128,0.3)] disabled:opacity-20">
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                      </button>
                    </div>
                  </>
                )}
              </div>
              <p className="text-center text-[8px] text-slate-400 dark:text-slate-700 font-black uppercase tracking-[0.4em] mt-4">Intelligence Link Active • Multimodal Interface</p>
            </div>
          </>
        ) : (
          <div className="h-full overflow-y-auto custom-scrollbar pr-4">{renderView()}</div>
        )}
      </main>

      <aside className="w-[320px] hidden xl:flex flex-col border-l border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0c10]/50 p-6 z-10 shrink-0">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Archives</h3>
          <button onClick={startNewChat} className="p-2 bg-[#4ade80]/10 text-[#4ade80] rounded-xl hover:bg-[#4ade80]/20 transition-all">
             <Plus size={18} />
          </button>
        </div>
        <div className="space-y-6 overflow-y-auto flex-1 custom-scrollbar pr-2">
          <HistoryGroup title="Today" items={groupedSessions.today} activeId={activeSessionId} onClick={(id) => {setActiveSessionId(id); setActiveSidebarTab('chat');}} onDelete={deleteSession} />
          <HistoryGroup title="Earlier" items={[...groupedSessions.yesterday, ...groupedSessions.lastWeek, ...groupedSessions.older]} activeId={activeSessionId} onClick={(id) => {setActiveSessionId(id); setActiveSidebarTab('chat');}} onDelete={deleteSession} />
        </div>
      </aside>
    </div>
  );
};

const NavIcon = ({ icon, active = false, secondary = false, onClick, label }: any) => (
  <button onClick={onClick} title={label} className={`p-3 rounded-xl transition-all relative group ${active ? 'bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20' : secondary ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-500 hover:text-[#4ade80] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>
    {icon}
    {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#4ade80] rounded-r-full"></span>}
  </button>
);

const ActionButton = ({ icon, onClick }: any) => (
  <button onClick={onClick} className="hover:text-[#4ade80] transition-all p-2 bg-slate-100 dark:bg-white/5 rounded-lg active:scale-90">{icon}</button>
);

const HistoryGroup = ({ title, items, activeId, onClick, onDelete }: any) => {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      <h4 className="text-[9px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-widest px-1">{title}</h4>
      <div className="space-y-1.5">
        {items.map((item: any) => (
          <div key={item.id} className="group relative">
            <button onClick={() => onClick(item.id)} className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${activeId === item.id ? 'bg-[#4ade80]/5 border-[#4ade80]/20 text-[#4ade80]' : 'bg-transparent border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
              <MessageSquare size={16} className={activeId === item.id ? 'text-[#4ade80]' : 'text-slate-400 dark:text-slate-700'} />
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-bold truncate block">{item.title}</span>
              </div>
            </button>
            <button onClick={(e) => onDelete(e, item.id)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 dark:text-slate-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, sub }: any) => (
  <div className="bg-white dark:bg-[#12161c] p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 hover:border-[#4ade80]/20 transition-all group shadow-sm">
     <div className="w-12 h-12 bg-slate-100 dark:bg-black/40 rounded-2xl flex items-center justify-center text-[#4ade80] mb-4 group-hover:scale-110 transition-transform">{icon}</div>
     <div className="text-2xl font-black text-slate-900 dark:text-white">{value}</div>
     <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{label}</div>
     <div className="text-[10px] text-slate-400 dark:text-slate-600 font-bold mt-2">{sub}</div>
  </div>
);

const renderScale = () => (
    <div className="space-y-10 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header><h2 className="text-3xl font-black text-slate-900 dark:text-white">Resource Allocation</h2><p className="text-slate-500">Compute and storage bandwidth.</p></header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="bg-white dark:bg-[#12161c] p-10 rounded-[3rem] border border-slate-200 dark:border-white/5 space-y-8 shadow-sm">
           <h3 className="text-xl font-bold flex items-center gap-3 text-slate-900 dark:text-white"><Database className="text-[#4ade80]" /> Vector Storage</h3>
           <div className="space-y-4">
              <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300"><span>Total Capacity</span><span>N/A / 10GB</span></div>
              <div className="h-4 bg-slate-100 dark:bg-black/40 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                 <div className="h-full bg-gradient-to-r from-[#4ade80] to-[#2c4030] rounded-full" style={{ width: `4%` }}></div>
              </div>
           </div>
           <p className="text-xs text-slate-500 font-medium tracking-tight">Enterprise auto-scaling active. Quota expands as knowledge grows.</p>
        </div>
        <div className="bg-white dark:bg-[#12161c] p-10 rounded-[3rem] border border-slate-200 dark:border-white/5 space-y-8 shadow-sm">
           <h3 className="text-xl font-bold flex items-center gap-3 text-slate-900 dark:text-white"><Zap className="text-[#4ade80]" /> API Throughput</h3>
           <div className="flex items-center gap-8 text-center">
              <div className="flex-1 p-6 bg-slate-50 dark:bg-black/20 rounded-3xl border border-slate-200 dark:border-white/5"><div className="text-2xl font-black text-[#4ade80]">99.9%</div><div className="text-[10px] font-black uppercase text-slate-500">Uptime</div></div>
              <div className="flex-1 p-6 bg-slate-50 dark:bg-black/20 rounded-3xl border border-slate-200 dark:border-white/5"><div className="text-2xl font-black text-[#4ade80]">850ms</div><div className="text-[10px] font-black uppercase text-slate-500">P95 Latency</div></div>
           </div>
        </div>
      </div>
    </div>
  );

  const renderGrid = () => (
    <div className="space-y-8 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div><h2 className="text-3xl font-black text-slate-900 dark:text-white">Context Grid</h2><p className="text-slate-500">Visual mapping of knowledge clusters.</p></div>
        <button className="bg-[#4ade80] text-black px-6 py-2.5 rounded-xl text-xs font-black uppercase hover:scale-105 transition-all flex items-center gap-2 shadow-lg"><Plus size={16} /> Cluster</button>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="col-span-full py-32 flex flex-col items-center opacity-30 text-slate-400"><LayoutGrid size={60} /><p className="mt-4 font-bold uppercase tracking-widest text-[10px]">Grid logic initialized</p></div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-3xl mx-auto py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-10"><h2 className="text-3xl font-black text-slate-900 dark:text-white">System Preferences</h2><p className="text-slate-500">Model tuning and platform configuration.</p></header>
      <div className="space-y-6">
        <SettingItem title="Intelligence Profile" description="Currently using Gemini 3.0 Pro for complex reasoning." action={<span className="text-xs font-bold text-[#4ade80] uppercase">Latest</span>} />
        <SettingItem title="Context Window" description="Optimized for 32k token retrieval." action={<button className="text-xs text-slate-400 hover:text-[#4ade80] dark:hover:text-white font-bold underline">Edit</button>} />
      </div>
    </div>
  );

const SettingItem = ({ title, description, action }: any) => (
  <div className="p-8 bg-white dark:bg-[#12161c] border border-slate-200 dark:border-white/5 rounded-[2rem] flex items-center justify-between shadow-sm">
    <div><h4 className="font-bold text-sm text-slate-900 dark:text-white">{title}</h4><p className="text-xs text-slate-500 mt-1">{description}</p></div>
    {action}
  </div>
);
