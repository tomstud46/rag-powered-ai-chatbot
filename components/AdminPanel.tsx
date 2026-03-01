import React, { useState, useEffect } from 'react';
import { 
  Plus, Database, Trash2, Shield, Users, Search, 
  ShieldCheck, UserPlus, Ban, CheckCircle2, Loader2, FileText 
} from 'lucide-react';
import { vectorStore } from '../services/vectorStore.ts';
import { KnowledgeDocument, User } from '../types.ts';
import { getEmbedding } from '../services/geminiService.ts';
import { apiService } from '../services/apiService.ts';

interface AdminPanelProps {
  user: User;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ user: currentUser }) => {
  const [activeTab, setActiveTab] = useState<'knowledge' | 'users'>('users');
  const [docs, setDocs] = useState<KnowledgeDocument[]>(vectorStore.getDocuments());
  const [users, setUsers] = useState<User[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      const allUsers = await apiService.getAllUsers();
      setUsers(allUsers);
    };
    if (activeTab === 'users') fetchUsers();
  }, [activeTab]);

  const handleAddKnowledge = async () => {
    if (!newTitle || !newContent) return;
    setIsProcessing(true);
    try {
      const embedding = await getEmbedding(newContent);
      const newDoc: KnowledgeDocument = {
        id: 'doc_' + Date.now().toString(),
        title: newTitle,
        content: newContent,
        embedding,
        createdAt: Date.now(),
      };
      vectorStore.addDocument(newDoc);
      setDocs(vectorStore.getDocuments());
      setIsAdding(false);
      setNewTitle('');
      setNewContent('');
    } catch (error) {
      alert("Failed to process knowledge.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePromote = async (userId: string) => {
    if (userId === currentUser.id) return alert("You cannot demote yourself.");
    try {
      const updated = await apiService.promoteUser(userId);
      setUsers(users.map(u => u.id === userId ? updated : u));
    } catch (err) {
      alert("Role update failed.");
    }
  };

  const handleToggleStatus = async (userId: string) => {
    if (userId === currentUser.id) return alert("You cannot block yourself.");
    try {
      const updated = await apiService.toggleUserStatus(userId);
      setUsers(users.map(u => u.id === userId ? updated : u));
    } catch (err) {
      alert("Status update failed.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser.id) return alert("You cannot delete yourself.");
    if (!confirm("Are you sure? All user records will be purged.")) return;
    try {
      await apiService.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      alert("Deletion failed.");
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-12">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="text-[#4ade80]" size={32} />
            <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Command Center</h1>
          </div>
          <p className="text-slate-500 font-medium">Node Authorization & Knowledge Registry</p>
        </div>
        
        <div className="bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl flex border border-slate-200 dark:border-white/5">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-[#4ade80] text-black shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <Users size={14} /> Node Registry
          </button>
          <button 
            onClick={() => setActiveTab('knowledge')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'knowledge' ? 'bg-[#4ade80] text-black shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <Database size={14} /> Knowledge
          </button>
        </div>
      </header>

      {activeTab === 'users' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center bg-white dark:bg-[#12161c] p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
              <input 
                type="text"
                placeholder="Search registered nodes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:border-[#4ade80]/40 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredUsers.map(u => (
              <div key={u.id} className="bg-white dark:bg-[#12161c] p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-all flex items-center justify-between group shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <img 
                      src={u.avatar || `https://picsum.photos/seed/${u.id}/64/64`} 
                      className={`w-14 h-14 rounded-2xl object-cover border-2 shadow-lg ${u.status === 'blocked' ? 'grayscale border-red-500/50' : 'border-[#4ade80]/50'}`} 
                      alt="avatar" 
                    />
                    <div className={`absolute -bottom-1 -right-1 p-1 rounded-lg border-2 border-white dark:border-[#12161c] ${u.role === 'admin' ? 'bg-amber-500' : 'bg-[#4ade80]'}`}>
                      {u.role === 'admin' ? <ShieldCheck size={12} className="text-white" /> : <UserPlus size={12} className="text-black" />}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-slate-900 dark:text-white text-lg">{u.username}</h4>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${u.role === 'admin' ? 'bg-amber-500/10 text-amber-500' : 'bg-[#4ade80]/10 text-[#4ade80]'}`}>
                        {u.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handlePromote(u.id)} className="p-3 hover:bg-amber-500/20 text-slate-400 hover:text-amber-500 rounded-xl transition-all"><Shield size={18} /></button>
                  <button onClick={() => handleToggleStatus(u.id)} className={`p-3 rounded-xl transition-all ${u.status === 'blocked' ? 'text-[#4ade80] hover:bg-[#4ade80]/20' : 'text-red-500 hover:bg-red-500/20'}`}>{u.status === 'blocked' ? <CheckCircle2 size={18} /> : <Ban size={18} />}</button>
                  <button onClick={() => handleDeleteUser(u.id)} className="p-3 hover:bg-red-500 text-slate-400 hover:text-white rounded-xl transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex justify-between items-center mb-8">
             <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">Registry Archives</h3>
             <button onClick={() => setIsAdding(true)} className="bg-[#4ade80] text-black px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-lg"><Plus size={18} /> Manual Entry</button>
           </div>
           
           {isAdding && (
             <div className="bg-white dark:bg-[#12161c] p-8 rounded-[2.5rem] border border-[#4ade80]/20 mb-8 animate-in slide-in-from-top-4 shadow-xl">
                <input type="text" placeholder="Registry Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl p-4 text-slate-900 dark:text-white mb-4 outline-none focus:border-[#4ade80]/40 transition-all" />
                <textarea rows={6} placeholder="Knowledge parameters..." value={newContent} onChange={(e) => setNewContent(e.target.value)} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl p-4 text-slate-900 dark:text-white mb-6 outline-none focus:border-[#4ade80]/40 transition-all resize-none" />
                <div className="flex justify-end gap-3">
                  <button onClick={() => setIsAdding(false)} className="px-6 py-3 text-slate-500 font-bold uppercase text-[10px] tracking-widest">Abort</button>
                  <button onClick={handleAddKnowledge} disabled={isProcessing} className="bg-[#4ade80] text-black px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2">{isProcessing ? <Loader2 size={18} className="animate-spin" /> : "Commit Index"}</button>
                </div>
             </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {docs.map(doc => (
               <div key={doc.id} className="bg-white dark:bg-[#12161c] p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 hover:border-[#4ade80]/20 transition-all shadow-sm">
                  <h4 className="text-slate-900 dark:text-white font-bold mb-3 truncate">{doc.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-3 mb-6 leading-relaxed">{doc.content}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-[#4ade80] bg-[#4ade80]/10 px-2 py-1 rounded">VECTOR INDEXED</span>
                    <button onClick={() => {vectorStore.deleteDocument(doc.id); setDocs(vectorStore.getDocuments());}} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
};