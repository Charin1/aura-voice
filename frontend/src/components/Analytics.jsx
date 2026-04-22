import React from 'react';
import { 
  BarChart3, Activity, Zap, Clock, TrendingUp, ArrowUpRight, User,
  AudioWaveform as Waveform 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Analytics({ stats }) {
  return (
    <div className="flex-1 flex flex-col p-12 gap-12 z-10 relative overflow-y-auto no-scrollbar">
      <header>
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-black tracking-tighter mb-3 font-headline bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50"
        >
          Analytics & Usage
        </motion.h2>
        <p className="text-white/30 text-lg font-medium max-w-2xl leading-relaxed">
          Monitor your studio's performance, resource consumption, and orchestration history.
        </p>
      </header>

      {/* TOP STATS */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[
          { label: 'Total Clips', value: stats?.library?.total_generations || '0', change: 'Lifetime', icon: BarChart3, color: 'text-primary' },
          { label: 'Voice Profiles', value: stats?.library?.total_voices || '0', change: 'Active', icon: User, color: 'text-secondary' },
          { label: 'Active Model', value: (stats?.current_model || 'Idle').toUpperCase(), change: 'Low Latency', icon: Zap, color: 'text-green-400' },
          { label: 'Compute Engine', value: (stats?.device || 'CPU').toUpperCase(), change: stats?.mps_available ? 'Accelerated' : 'Standard', icon: Activity, color: 'text-orange-400' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card !p-8 space-y-4 border-white/5">
            <div className="flex justify-between items-start">
                <div className={`p-3 bg-white/5 rounded-2xl ${stat.color} bg-opacity-10`}>
                    <stat.icon size={24} />
                </div>
                <div className="flex items-center gap-1 text-[10px] font-black text-green-400">
                    <TrendingUp size={12} /> {stat.change}
                </div>
            </div>
            <div>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                <p className="text-3xl font-black font-headline tracking-tighter">{stat.value}</p>
            </div>
          </div>
        ))}
      </section>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <section className="lg:col-span-2 glass-card !p-10 space-y-8 min-h-[400px] flex flex-col">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h3 className="text-xl font-bold font-headline">Model Affinity</h3>
                    <p className="text-sm text-white/30 font-medium">Distribution of generated samples by orchestration engine.</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-[10px] font-bold text-white/40 uppercase">F5-TTS</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-secondary" />
                        <span className="text-[10px] font-bold text-white/40 uppercase">XTTS-v2</span>
                    </div>
                </div>
            </div>

            {(() => {
                const dist = stats?.library?.model_distribution || { f5: 0, xtts: 0 };
                const maxCount = Math.max(1, dist.f5, dist.xtts);
                const getH = (val) => `${Math.max(5, (val / maxCount) * 100)}%`;
                
                return (
            <div className="flex-1 flex items-end gap-12 pb-4 px-20 min-h-[250px]">
                {/* F5 Bar */}
                <div className="flex-1 h-full flex flex-col justify-end items-center gap-4">
                    <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: getH(dist.f5) }}
                        className="w-full max-w-[120px] bg-gradient-to-t from-primary/20 to-primary rounded-t-2xl shadow-[0_0_40px_rgba(186,158,255,0.25)] relative group"
                    >
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white/10 px-3 py-1 rounded-lg text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/5 backdrop-blur-md">
                            {dist.f5} Samples
                        </div>
                    </motion.div>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">F5 Engine</span>
                </div>
                
                {/* XTTS Bar */}
                <div className="flex-1 h-full flex flex-col justify-end items-center gap-4">
                    <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: getH(dist.xtts) }}
                        className="w-full max-w-[120px] bg-gradient-to-t from-secondary/20 to-secondary rounded-t-2xl shadow-[0_0_40px_rgba(0,240,255,0.25)] relative group"
                    >
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white/10 px-3 py-1 rounded-lg text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/5 backdrop-blur-md">
                            {dist.xtts} Samples
                        </div>
                    </motion.div>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">XTTS Engine</span>
                </div>
            </div>
                );
            })()}
        </section>

        <section className="lg:col-span-1 glass-card !p-10 space-y-8 flex flex-col justify-between">
            <div className="space-y-6">
                <h3 className="text-xl font-bold font-headline">Hardware Utilization</h3>
                <div className="space-y-8">
                    <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black text-white/40 uppercase tracking-widest">
                            <span>MPS (Apple M4)</span>
                            <span className="text-primary">{stats?.simulated_hardware?.mps_load || 0}%</span>
                        </div>
                        <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${stats?.simulated_hardware?.mps_load || 0}%` }}
                                className="h-full bg-gradient-to-r from-primary/50 to-primary rounded-full relative"
                            >
                                <motion.div 
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="absolute inset-0 bg-white/20"
                                />
                            </motion.div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black text-white/40 uppercase tracking-widest">
                            <span>Unified Memory</span>
                            <span className="text-secondary">{stats?.simulated_hardware?.memory_load || 0}%</span>
                        </div>
                        <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${stats?.simulated_hardware?.memory_load || 0}%` }}
                                className="h-full bg-gradient-to-r from-secondary/50 to-secondary rounded-full relative"
                            >
                                <motion.div 
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{ repeat: Infinity, duration: 2.5 }}
                                    className="absolute inset-0 bg-white/20"
                                />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shrink-0">
                    <Waveform size={20} className="text-black" />
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-bold">Inference Engine Stable</p>
                    <p className="text-[10px] text-white/20 font-medium">Model orchestration optimized for Metal Performance Shaders.</p>
                </div>
            </div>
        </section>
      </div>
    </div>
  );
}
