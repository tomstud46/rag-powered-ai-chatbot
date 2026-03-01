import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, Bot, Trash2, Plus, 
  Copy, ThumbsUp, Download,
  Mic, MoreVertical, LayoutGrid, Folder, 
  Scale, Grid3X3, Settings, MessageSquare, Database, Square, Loader2
} from 'lucide-react';
import { chatWithRAGStream, AudioData } from '../services/geminiService.ts';
import { ChatMessage, ChatSession, User } from '../types.ts';
import { vectorStore } from '../services/vectorStore.ts';

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
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const activeSession = useMemo(() => sessions.find(s => s.id === activeSessionId), [sessions, activeSessionId]);
  const messages = activeSession?.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, streamingText, isLoading, isTyping]);

  const handleSend = async (audioData?: AudioData) => {
    if ((!input.trim() && !audioData) || isLoading) return;

    let currentSessionId = activeSessionId;
    let updatedSessions = [...sessions];

    if (!currentSessionId) {
      const newSession: ChatSession = {
        id: 'session_' + Date.now(),
        userId: user.id,
        title: input ? (input.length > 30 ? input.substring(0, 30) + '...' : input) : 'Voice Query',
        messages: [{ id: 'welcome', role: 'model', text: 'How Can I Help You Today?', timestamp: Date.now() }],
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
      title: s.title === 'New Conversation' ? (input ? (input.length > 30 ? input.substring(0, 30) + '...' : input) : 'Voice Query') : s.title
    } : s);

    onSessionsChange(updatedSessions);
    const textToProcess = input;
    setInput('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const currentMessages = updatedSessions.find(s => s.id === currentSessionId)?.messages || [];
      const history = currentMessages.slice(0, -1).map(m => ({ role: m.role, parts: [{ text: m.text }] }));

      let accumulatedText = "";
      const { sources } = await chatWithRAGStream(textToProcess, history, (chunk) => {
        setIsTyping(false);
        accumulatedText += chunk;
        setStreamingText(accumulatedText);
      }, audioData);
      
      const botMsg: ChatMessage = {
        id: 'bot_' + Date.now(),
        role: 'model',
        text: accumulatedText,
        timestamp: Date.now(),
        sources
      };
      
      onSessionsChange(updatedSessions.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, botMsg], lastUpdatedAt: Date.now() } : s));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      setStreamingText('');
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          handleSend({ data: base64data, mimeType: mediaRecorder.mimeType });
        };
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    }
  };

  return (
    <div className="flex h-full w-full bg-slate-50 dark:bg-[#0a0c10] overflow-hidden">
      <aside className="w-16 flex flex-col items-center py-6 gap-6 border-r border-slate-200 dark:border-white/5 bg-white dark:bg-black/20 shrink-0">
        <NavIcon icon={<LayoutGrid size={20} />} active={activeSidebarTab === 'dashboard'} onClick={() => setActiveSidebarTab('dashboard')} />
        <NavIcon icon={<MessageSquare size={20} />} active={activeSidebarTab === 'chat'} onClick={() => setActiveSidebarTab('chat')} />
        <NavIcon icon={<Folder size={20} />} active={activeSidebarTab === 'folder'} onClick={() => setActiveSidebarTab('folder')} />
        <NavIcon icon={<Scale size={20} />} active={activeSidebarTab === 'scale'} onClick={() => setActiveSidebarTab('scale')} />
        <NavIcon icon={<Settings size={20} />} active={activeSidebarTab === 'settings'} onClick={() => setActiveSidebarTab('settings')} />
      </aside>

      <main className="flex-1 flex flex-col relative px-8 pb-8 overflow-hidden">
        <header className="py-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-[#4ade80] rounded-full animate-pulse shadow-[0_0_10px_#4ade80]"></div>
            <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 dark:text-white">Neural Terminal</h2>
          </div>
          <button className="p-2 text-slate-500"><MoreVertical size={20} /></button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto pr-4 space-y-8 custom-scrollbar pb-10">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#0d1a14] flex items-center justify-center border border-slate-200 dark:border-[#4ade80]/20 shadow-lg">
                {msg.role === 'model' ? <Bot size={20} className="text-[#4ade80]" /> : <img src={user.avatar || `https://picsum.photos/seed/${user.id}/40/40`} className="w-full h-full object-cover rounded-2xl" />}
              </div>
              <div className={`p-5 rounded-[2rem] max-w-[80%] ${msg.role === 'user' ? 'bg-[#2c4030] text-white rounded-tr-none' : 'bg-white dark:bg-[#12161c] text-slate-800 dark:text-slate-300 rounded-tl-none shadow-lg border border-slate-200 dark:border-white/5'}`}>
                {msg.text}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {msg.sources.map((s, i) => <span key={i} className="text-[10px] uppercase font-black text-[#4ade80] bg-[#4ade80]/10 px-2 py-0.5 rounded border border-[#4ade80]/20 flex items-center gap-1"><Database size={10} />{s}</span>)}
                  </div>
                )}
              </div>
            </div>
          ))}
          {streamingText && (
            <div className="flex gap-4 flex-row">
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#0d1a14] flex items-center justify-center border border-[#4ade80]/20 shadow-lg"><Bot size={20} className="text-[#4ade80]" /></div>
              <div className="p-5 rounded-[2rem] max-w-[80%] bg-white dark:bg-[#12161c] text-slate-800 dark:text-slate-300 rounded-tl-none shadow-lg border border-white/5">
                {streamingText}<span className="inline-block w-2 h-4 bg-[#4ade80] ml-1 animate-pulse"></span>
              </div>
            </div>
          )}
          {isTyping && <div className="animate-pulse text-[#4ade80] text-xs font-black uppercase tracking-widest px-14">System Processing...</div>}
        </div>

        <div className="mt-auto pt-6 shrink-0">
          <div className="relative bg-white/50 dark:bg-[#12161c]/50 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-4 shadow-xl flex items-center gap-4">
            {isRecording ? (
              <div className="flex-1 flex justify-between items-center px-4">
                <span className="text-red-500 font-black uppercase text-xs animate-pulse">Recording: {recordingTime}s</span>
                <button onClick={toggleRecording} className="p-3 bg-red-500 text-white rounded-2xl"><Square size={20} /></button>
              </div>
            ) : (
              <>
                <textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Query registry..." className="flex-1 bg-transparent px-4 py-2 outline-none text-slate-900 dark:text-white" />
                <button onClick={toggleRecording} className="p-2.5 text-[#4ade80]"><Mic size={18} /></button>
                <button onClick={() => handleSend()} disabled={!input.trim() || isLoading} className="p-3 bg-[#4ade80] text-black rounded-2xl shadow-lg disabled:opacity-20">
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const NavIcon = ({ icon, active, onClick }: any) => (
  <button onClick={onClick} className={`p-3 rounded-xl transition-all ${active ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'text-slate-500 hover:text-white'}`}>{icon}</button>
);