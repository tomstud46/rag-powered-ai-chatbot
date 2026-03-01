import React, { useState } from 'react';
import { Bell, Zap, Info, CheckCircle2, AlertCircle, Clock, Trash2, Shield } from 'lucide-react';
import { SystemNotification } from '../types.ts';

export const NotificationPage: React.FC = () => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([
    { id: 1, type: 'info', title: 'System Heartbeat', message: 'Operational status 100% via Gemini-Flash-002.', time: 'Just now', read: false },
    { id: 2, type: 'success', title: 'Context Vectorized', message: 'Registry updated with 12 new knowledge nodes.', time: '2 hours ago', read: false },
    { id: 3, type: 'zap', title: 'Optimized Link', message: 'Latency reduced to 80ms for neural queries.', time: '5 hours ago', read: true },
    { id: 4, type: 'shield', title: 'Access Verified', message: 'Identity check successful for session #772.', time: '1 day ago', read: true },
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      <header className="flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">Telemetry Logs</h2>
          <p className="text-slate-500 font-medium">Real-time system event monitoring.</p>
        </div>
        <button onClick={() => setNotifications(n => n.map(x => ({ ...x, read: true })))} className="text-[10px] font-black uppercase text-slate-500 hover:text-[#4ade80] transition-all flex items-center gap-2"><CheckCircle2 size={16} /> Acknowledge All</button>
      </header>

      <div className="space-y-4">
        {notifications.map((n) => (
          <div key={n.id} className={`bg-white dark:bg-[#12161c] border rounded-[2rem] p-6 flex items-start gap-6 transition-all group relative shadow-sm ${n.read ? 'border-white/5 opacity-60' : 'border-[#4ade80]/20 border-l-4 border-l-[#4ade80]'}`}>
            <div className={`p-4 rounded-2xl flex-shrink-0 ${n.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : n.type === 'alert' ? 'bg-amber-500/10 text-amber-500' : 'bg-[#4ade80]/10 text-[#4ade80]'}`}>
              {n.type === 'success' ? <CheckCircle2 size={24} /> : n.type === 'alert' ? <AlertCircle size={24} /> : n.type === 'shield' ? <Shield size={24} /> : <Info size={24} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-3">{n.title}{!n.read && <span className="w-2 h-2 bg-[#4ade80] rounded-full animate-pulse"></span>}</h4>
                <div className="text-slate-400 font-bold text-[10px] uppercase flex items-center gap-1"><Clock size={12} /> {n.time}</div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{n.message}</p>
            </div>
            <button onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-all"><Trash2 size={18} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};