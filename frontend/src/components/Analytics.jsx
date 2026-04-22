import React from 'react';
import { 
  BarChart3, Activity, Zap, Clock, TrendingUp, ArrowUpRight,
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
          { label: 'Total Tokens', value: '842k', change: '+12%', icon: BarChart3, color: 'text-primary' },
          { label: 'Avg Latency', value: '184ms', change: '-4%', icon: Clock, color: 'text-secondary' },
          { label: 'Memory Peak', value: '4.8GB', change: '+0.2GB', icon: Activity, color: 'text-orange-400' },
          { label: 'Models Active', value: '2', change: 'Stable', icon: Zap, color: 'text-green-400' },
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

      {/* CHARTS SECTION (MOCKED) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <section className="lg:col-span-2 glass-card !p-10 space-y-8 min-h-[400px] flex flex-col">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h3 className="text-xl font-bold font-headline">Token Velocity</h3>
                    <p className="text-sm text-white/30 font-medium">Real-time synthesis throughput over the last 24h.</p>
                </div>
                <button className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
                    Export Data <ArrowUpRight size={12} />
                </button>
            </div>

            <div className="flex-1 flex items-end gap-2 pb-4">
                {[40, 60, 45, 80, 55, 90, 70, 40, 60, 100, 80, 40, 30, 50, 75, 60, 45, 30, 20, 40, 60, 70, 85, 95].map((val, i) => (
                    <motion.div 
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${val}%` }}
                        transition={{ delay: i * 0.02, duration: 0.5 }}
                        className={`flex-1 rounded-t-lg ${i === 23 ? 'bg-primary shadow-[0_0_20px_rgba(186,158,255,0.4)]' : 'bg-white/5 hover:bg-white/10'}`}
                    />
                ))}
            </div>
        </section>

        <section className="lg:col-span-1 glass-card !p-10 space-y-8 flex flex-col justify-between">
            <div className="space-y-6">
                <h3 className="text-xl font-bold font-headline">Hardware Utilization</h3>
                <div className="space-y-6">
                    <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black text-white/40 uppercase tracking-widest">
                            <span>MPS (Apple M4)</span>
                            <span className="text-primary">84%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '84%' }}
                                className="h-full bg-primary"
                            />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black text-white/40 uppercase tracking-widest">
                            <span>Unified Memory</span>
                            <span className="text-secondary">32%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '32%' }}
                                className="h-full bg-secondary"
                            />
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
