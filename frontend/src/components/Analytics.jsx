import React from 'react';
import { 
  BarChart3, Activity, Zap, Clock, TrendingUp, ArrowUpRight, User,
  AudioWaveform as Waveform 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Analytics({ stats }) {
  return (
    <div className="flex-1 flex flex-col p-12 gap-12 z-10 relative overflow-y-auto no-scrollbar">
      <header className="space-y-1">
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-black tracking-tighter mb-2 font-headline bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/70"
        >
          Analytics & Telemetry
        </motion.h2>
        <p className="text-white/60 text-[15px] font-normal leading-relaxed max-w-2xl">
          Monitor your studio's inference performance, compute utilization, and voice profile footprint.
        </p>
      </header>

      {/* TOP STATS */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[
          { label: 'Total Clips', value: stats?.library?.total_generations || '0', change: 'Lifetime', icon: BarChart3, color: 'text-primary', glow: 'from-primary/20 to-transparent', barBg: 'bg-primary' },
          { label: 'Voice Profiles', value: stats?.library?.total_voices || '0', change: 'Active', icon: User, color: 'text-secondary', glow: 'from-secondary/20 to-transparent', barBg: 'bg-secondary' },
          { label: 'Active Model', value: (stats?.current_model || 'Idle').toUpperCase(), change: 'Low Latency', icon: Zap, color: 'text-emerald-400', glow: 'from-emerald-500/20 to-transparent', barBg: 'bg-emerald-500' },
          { label: 'Compute Engine', value: (stats?.device || 'CPU').toUpperCase(), change: stats?.mps_available ? 'Accelerated' : 'Standard', icon: Activity, color: 'text-amber-400', glow: 'from-amber-500/20 to-transparent', barBg: 'bg-amber-500' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card !p-8 space-y-4 border-white/5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5),_0_0_1px_rgba(255,255,255,0.1)] transition-all duration-300 relative overflow-hidden group">
            {/* Top Accent line */}
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${stat.barBg} opacity-40 group-hover:opacity-100 transition-opacity duration-300`} />
            
            <div className="flex justify-between items-start">
                <div className={`p-3 bg-white/5 rounded-2xl ${stat.color} bg-opacity-10 shadow-inner`}>
                    <stat.icon size={22} />
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-black ${stat.color}`}>
                    <ArrowUpRight size={12} /> {stat.change}
                </div>
            </div>
            <div>
                <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                <p className="text-3xl font-black font-headline tracking-tighter text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </section>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <section className="lg:col-span-2 glass-card !p-10 space-y-8 min-h-[400px] flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center z-10">
                <div className="space-y-1">
                    <h3 className="text-xl font-bold font-headline text-white">Model Affinity</h3>
                    <p className="text-xs text-white/50 font-semibold">Distribution of generated samples by orchestration engine.</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(186,158,255,0.6)]" />
                        <span className="text-[10px] font-black text-white/60 uppercase tracking-wider">F5 Engine</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(58,223,250,0.6)]" />
                        <span className="text-[10px] font-black text-white/60 uppercase tracking-wider">XTTS-v2</span>
                    </div>
                </div>
            </div>

            {(() => {
                const dist = stats?.library?.model_distribution || { f5: 0, xtts: 0 };
                const maxCount = Math.max(1, dist.f5, dist.xtts);
                const getH = (val) => `${Math.max(8, (val / maxCount) * 100)}%`;
                
                return (
            <div className="flex-1 flex items-end gap-16 pb-4 px-12 md:px-24 min-h-[250px] relative z-10">
                {/* Horizontal Grid lines */}
                <div className="absolute inset-x-0 top-0 bottom-14 flex flex-col justify-between pointer-events-none px-6">
                  <div className="w-full h-px bg-white/5" />
                  <div className="w-full h-px bg-white/5" />
                  <div className="w-full h-px bg-white/5" />
                  <div className="w-full h-px bg-white/5" />
                </div>

                {/* F5 Bar */}
                <div className="flex-1 h-full flex flex-col justify-end items-center gap-4 relative z-10">
                    <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: getH(dist.f5) }}
                        className="w-full max-w-[110px] bg-gradient-to-t from-primary/10 to-primary rounded-t-2xl shadow-[0_0_40px_rgba(186,158,255,0.2)] relative group border border-primary/20"
                    >
                        {/* Peak Indicator Tip */}
                        <div className="absolute -top-1 left-0 right-0 h-1.5 bg-white rounded-full shadow-[0_0_12px_#ba9eff] z-20" />
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-surface border border-white/10 px-3 py-1.5 rounded-xl text-[10px] font-black opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-2xl backdrop-blur-md">
                            {dist.f5} Samples
                        </div>
                    </motion.div>
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">F5 Engine</span>
                </div>
                
                {/* XTTS Bar */}
                <div className="flex-1 h-full flex flex-col justify-end items-center gap-4 relative z-10">
                    <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: getH(dist.xtts) }}
                        className="w-full max-w-[110px] bg-gradient-to-t from-secondary/10 to-secondary rounded-t-2xl shadow-[0_0_40px_rgba(58,223,250,0.2)] relative group border border-secondary/20"
                    >
                        {/* Peak Indicator Tip */}
                        <div className="absolute -top-1 left-0 right-0 h-1.5 bg-white rounded-full shadow-[0_0_12px_#3adffa] z-20" />
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-surface border border-white/10 px-3 py-1.5 rounded-xl text-[10px] font-black opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-2xl backdrop-blur-md">
                            {dist.xtts} Samples
                        </div>
                    </motion.div>
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">XTTS Engine</span>
                </div>
            </div>
                );
            })()}
        </section>

        <section className="lg:col-span-1 glass-card !p-10 space-y-8 flex flex-col justify-between">
            <div className="space-y-6">
                <h3 className="text-xl font-bold font-headline text-white">Hardware Telemetry</h3>
                <div className="space-y-8">
                    {/* MPS ACCEL */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black text-white/50 uppercase tracking-widest">
                            <span>MPS (Apple M4 Acceleration)</span>
                            <span className="text-primary font-mono">{stats?.simulated_hardware?.mps_load || 0}%</span>
                        </div>
                        <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${stats?.simulated_hardware?.mps_load || 0}%` }}
                                className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full relative shadow-[0_0_10px_rgba(186,158,255,0.4)]"
                            >
                                <motion.div 
                                    animate={{ opacity: [0.2, 0.8, 0.2] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="absolute inset-0 bg-white/25 rounded-full"
                                />
                            </motion.div>
                        </div>
                    </div>
                    {/* MEMORY */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black text-white/50 uppercase tracking-widest">
                            <span>Unified Memory Allocation</span>
                            <span className="text-secondary font-mono">{stats?.simulated_hardware?.memory_load || 0}%</span>
                        </div>
                        <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${stats?.simulated_hardware?.memory_load || 0}%` }}
                                className="h-full bg-gradient-to-r from-secondary/60 to-secondary rounded-full relative shadow-[0_0_10px_rgba(58,223,250,0.4)]"
                            >
                                <motion.div 
                                    animate={{ opacity: [0.2, 0.8, 0.2] }}
                                    transition={{ repeat: Infinity, duration: 2.5 }}
                                    className="absolute inset-0 bg-white/25 rounded-full"
                                />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-6 shadow-inner relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 pointer-events-none" />
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(186,158,255,0.3)]">
                    <Waveform size={20} className="text-black" />
                </div>
                <div className="space-y-1 min-w-0">
                    <p className="text-xs font-black text-white uppercase tracking-wider">Inference Stable</p>
                    <p className="text-[10px] text-white/50 font-semibold leading-relaxed">System execution fully optimized for Metal Performance Shaders.</p>
                </div>
            </div>
        </section>
      </div>
    </div>
  );
}
