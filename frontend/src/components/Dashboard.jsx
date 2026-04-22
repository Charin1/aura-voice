import React, { useState, useEffect } from 'react';
import { 
  Zap, Cpu, Clock, Play, ArrowRight, Mic, 
  History, Settings, BarChart3, ChevronRight,
  AudioWaveform as Waveform
} from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const API_BASE = "http://localhost:8000";

export default function Dashboard({ stats, setActiveTab }) {
  const [recentClips, setRecentClips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await axios.get(`${API_BASE}/library`);
        // Get the last 3 generations
        const sorted = (res.data.generations || []).reverse().slice(0, 3);
        setRecentClips(sorted);
      } catch (e) {
        console.error("Failed to fetch recent clips", e);
      } finally {
        setLoading(false);
      }
    };
    fetchRecent();
  }, []);

  return (
    <div className="flex-1 flex flex-col p-12 gap-12 z-10 relative overflow-y-auto no-scrollbar">
      {/* WELCOME HEADER */}
      <header className="flex justify-between items-end">
        <div>
            <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-black tracking-tighter mb-3 font-headline bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50 uppercase"
            >
            Command Center
            </motion.h2>
            <p className="text-white/30 text-lg font-medium max-w-2xl leading-relaxed">
            Welcome back. Your local orchestration environment is <span className="text-green-400/80">Optimal</span>.
            </p>
        </div>
        <div className="flex gap-3">
            <div className="flex items-center gap-3 px-5 py-3 bg-white/5 rounded-2xl border border-white/5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">System Live</span>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* LEFT & CENTER: HERO & RECENT */}
        <div className="lg:col-span-2 space-y-12">
            
            {/* HERO QUICK START */}
            <section 
                onClick={() => setActiveTab('Studio')}
                className="relative group cursor-pointer"
            >
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/40 to-secondary/40 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-40 transition duration-700"></div>
                <div className="relative glass-card !p-12 !rounded-[2.5rem] border-white/5 overflow-hidden flex items-center justify-between">
                    <div className="space-y-6 relative z-10">
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-primary/20 rounded-full border border-primary/20">
                            <Sparkle size={14} className="text-primary" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Ready for Synthesis</span>
                        </div>
                        <h3 className="text-4xl font-black font-headline max-w-md leading-[1.1]">Clone a new voice in seconds.</h3>
                        <p className="text-white/40 text-sm font-medium max-w-sm">Jump straight into the Studio to upload a reference and generate high-fidelity speech.</p>
                        <button className="flex items-center gap-3 text-sm font-black uppercase tracking-widest bg-white text-black px-8 py-4 rounded-2xl hover:scale-105 transition-transform">
                            Open Studio <ArrowRight size={18} />
                        </button>
                    </div>
                    <div className="hidden md:block relative">
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="w-64 h-64 border-2 border-dashed border-white/5 rounded-full flex items-center justify-center"
                        >
                            <div className="w-48 h-48 border border-white/10 rounded-full flex items-center justify-center">
                                <div className="w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                            </div>
                        </motion.div>
                        <Mic size={48} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/20" />
                    </div>
                </div>
            </section>

            {/* RECENT ACTIVITY */}
            <section className="space-y-6">
                <div className="flex justify-between items-center px-2">
                    <h4 className="text-sm font-black uppercase tracking-[0.3em] text-white/30">Recent Generations</h4>
                    <button onClick={() => setActiveTab('Library')} className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1 hover:gap-2 transition-all">
                        View Library <ChevronRight size={14} />
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {loading ? (
                        [1,2,3].map(i => <div key={i} className="h-40 glass-card animate-pulse" />)
                    ) : recentClips.length > 0 ? (
                        recentClips.map((clip, i) => (
                            <motion.div 
                                key={clip.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="glass-card !p-6 space-y-4 hover:border-white/20 transition-colors group"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5">
                                        <Play size={16} className="text-white/40 group-hover:text-primary transition-colors" />
                                    </div>
                                    <span className="text-[9px] font-black text-white/20 uppercase bg-white/5 px-2 py-1 rounded-md">{clip.model_type}</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-white/80 line-clamp-2 italic">"{clip.text}"</p>
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">{new Date(clip.timestamp * 1000).toLocaleDateString()}</p>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-3 glass-card !p-12 text-center border-dashed border-white/5">
                            <History size={32} className="mx-auto mb-4 text-white/10" />
                            <p className="text-sm font-bold text-white/20 uppercase tracking-widest">No recent clips found</p>
                        </div>
                    )}
                </div>
            </section>
        </div>

        {/* RIGHT COLUMN: SYSTEM & QUICK LINKS */}
        <div className="lg:col-span-1 space-y-12">
            
            {/* SYSTEM STATUS */}
            <section className="glass-card !p-8 space-y-8">
                <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase tracking-widest">System Status</h4>
                    <p className="text-[10px] text-white/20 font-bold uppercase">Hardware Telemetry</p>
                </div>
                
                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <Cpu size={20} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Compute Engine</p>
                            <p className="text-sm font-bold">{stats.device?.toUpperCase()} {stats.mps_available ? '(Accelerated)' : ''}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
                            <Zap size={20} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Active Model</p>
                            <p className="text-sm font-bold">{(stats.current_model || 'Idle').toUpperCase()}</p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 space-y-4">
                    <div className="flex justify-between text-[10px] font-black text-white/30 uppercase tracking-widest">
                        <span>Model Readiness</span>
                        <span className="text-green-400">100%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full w-full bg-gradient-to-r from-primary to-secondary" />
                    </div>
                </div>
            </section>

            {/* QUICK NAVIGATION */}
            <section className="grid grid-cols-2 gap-4">
                {[
                    { label: 'Analytics', icon: BarChart3, tab: 'Analytics' },
                    { label: 'Library', icon: History, tab: 'Library' },
                    { label: 'Settings', icon: Settings, tab: 'Settings' },
                    { label: 'Models', icon: Cpu, tab: 'Dashboard' },
                ].map(item => (
                    <button 
                        key={item.label}
                        onClick={() => setActiveTab(item.tab)}
                        className="glass-card !p-6 flex flex-col items-center gap-3 hover:bg-white/5 transition-all group"
                    >
                        <item.icon size={20} className="text-white/20 group-hover:text-white transition-colors" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{item.label}</span>
                    </button>
                ))}
            </section>
        </div>
      </div>
    </div>
  );
}

function Sparkle({ size, className }) {
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <path d="M12 3v3m0 12v3M5.314 5.314l2.122 2.122m8.484 8.484l2.122 2.122M3 12h3m12 0h3M5.314 18.686l2.122-2.122m8.484-8.484l2.122-2.122" />
        </svg>
    );
}
