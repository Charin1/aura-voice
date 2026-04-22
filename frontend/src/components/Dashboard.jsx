import React from 'react';
import { 
  Zap, Cpu, Globe, FastForward, Sparkles, AudioWaveform as Waveform, Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

const models = [
  {
    id: 'xtts',
    name: 'XTTS-v2',
    description: 'Open-source champion for zero-shot cloning across 16 languages. High stability, moderate resource requirements.',
    tags: ['Multilingual', 'Stable', 'Zero-shot'],
    active: true
  },
  {
    id: 'f5',
    name: 'F5-TTS',
    description: 'Cutting-edge flow matching architecture offering extreme naturalness and rhythmic cadence. Highly responsive.',
    tags: ['Natural', 'Flow-Matching', 'Responsive'],
    active: false
  },
  {
    id: 'styletts2',
    name: 'StyleTTS 2',
    description: 'Utilizes style diffusion and adversarial training for highly expressive, human-level text-to-speech synthesis.',
    tags: ['Expressive', 'Diffusion', 'Human-level'],
    active: false
  }
];

export default function Dashboard({ stats }) {
  return (
    <div className="flex-1 flex flex-col p-12 gap-12 z-10 relative overflow-y-auto no-scrollbar">
      <header>
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-black tracking-tighter mb-3 font-headline bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50"
        >
          Model Hub
        </motion.h2>
        <p className="text-white/30 text-lg font-medium max-w-2xl leading-relaxed">
          Discover, deploy, and benchmark state-of-the-art voice generation architectures engineered for production scale.
        </p>
      </header>

      {/* FEATURED MODEL */}
      <section className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative glass-card !p-12 !rounded-[2rem] border-primary/10 overflow-hidden">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px]"></div>
          <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 space-y-8">
              <div className="flex items-center gap-4">
                <div className="px-4 py-1.5 bg-primary/20 border border-primary/30 rounded-full text-[10px] font-black text-primary tracking-widest uppercase">Flagship</div>
                <div className="flex items-center gap-2 text-white/40 text-xs font-bold uppercase tracking-wider">
                  <Cpu size={14} /> {stats.device}
                </div>
              </div>
              <h3 className="text-4xl font-black font-headline">Aura-X Prime</h3>
              <p className="text-white/50 text-lg leading-relaxed">
                Our flagship multimodal architecture. Delivers zero-shot voice cloning with unparalleled emotional resonance and latency under 200ms. Perfect for interactive AI agents.
              </p>
              <div className="flex gap-4">
                <button className="btn-primary flex items-center gap-3">
                  <Zap size={18} />
                  <span>Deploy Model</span>
                </button>
                <button className="btn-glass">Documentation</button>
              </div>
            </div>
            <div className="w-full md:w-72 aspect-square glass flex items-center justify-center !rounded-3xl border-white/10 relative overflow-hidden">
                <Waveform className="text-primary w-32 h-32 opacity-20 absolute" />
                <motion.div 
                    animate={{ 
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="w-40 h-40 bg-gradient-to-tr from-primary to-secondary rounded-full blur-3xl"
                />
                <Sparkles className="text-white relative z-10" size={48} />
            </div>
          </div>
        </div>
      </section>

      {/* MODEL GRID */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {models.map((model) => (
          <motion.div 
            key={model.id}
            whileHover={{ y: -10 }}
            className="glass-card !p-8 space-y-6 group cursor-pointer border-white/5 hover:border-primary/20"
          >
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all">
                <Cpu size={24} className="text-white/40 group-hover:text-primary transition-all" />
              </div>
              {model.active && <div className="px-2 py-0.5 bg-green-500/10 text-green-400 text-[8px] font-black tracking-widest rounded-full border border-green-500/20">ACTIVE</div>}
            </div>
            <div className="space-y-3">
              <h4 className="text-xl font-bold font-headline">{model.name}</h4>
              <p className="text-sm text-white/30 leading-relaxed min-h-[60px] line-clamp-3">
                {model.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
              {model.tags.map(tag => (
                <span key={tag} className="text-[9px] font-bold text-white/20 uppercase tracking-wider">{tag}</span>
              ))}
            </div>
          </motion.div>
        ))}
      </section>

      {/* STATS OVERVIEW */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {[
          { label: 'Latency', value: '< 200ms', icon: FastForward, color: 'text-blue-400' },
          { label: 'Available Regions', value: 'Global', icon: Globe, color: 'text-green-400' },
          { label: 'Optimization', value: stats.mps_available ? 'MPS' : 'CPU', icon: Zap, color: 'text-primary' },
          { label: 'Uptime', value: '99.9%', icon: Activity, color: 'text-orange-400' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card !p-6 flex items-center gap-4 border-white/5">
            <div className={`p-3 bg-white/5 rounded-xl ${stat.color} bg-opacity-10`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">{stat.label}</p>
              <p className="text-lg font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
