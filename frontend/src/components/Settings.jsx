import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, Server, 
  Trash2, Save
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Settings({ stats }) {
  const [activeSetting, setActiveSetting] = useState('Backend Engine');
  const [autoClearCache, setAutoClearCache] = useState(true);

  const navItems = [
    { icon: Server, label: 'Backend Engine' },
  ];

  return (
    <div className="flex-1 flex flex-col p-12 gap-12 z-10 relative overflow-y-auto no-scrollbar">
      <header className="space-y-1">
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-black tracking-tighter mb-2 font-headline bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/70"
        >
          Studio Settings
        </motion.h2>
        <p className="text-white/60 text-[15px] font-normal leading-relaxed max-w-2xl">
          Configure your local synthesis environment, cache memory policies, and API endpoints.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* LEFT COLUMN - NAV */}
        <div className="lg:col-span-1 space-y-4">
            {navItems.map(item => (
                <button 
                  key={item.label} 
                  onClick={() => setActiveSetting(item.label)}
                  className={`flex items-center gap-4 w-full px-6 py-4 rounded-2xl transition-all border ${activeSetting === item.label ? 'bg-white/10 text-white border-white/10 shadow-lg' : 'text-white/40 border-transparent hover:bg-white/5 hover:text-white/70'}`}
                >
                    <item.icon size={20} className={activeSetting === item.label ? 'text-primary' : 'text-white/40'} />
                    <span className="text-sm font-bold tracking-tight">{item.label}</span>
                </button>
            ))}
        </div>

        {/* MAIN PANEL */}
        <div className="lg:col-span-2 space-y-12">
          {activeSetting === 'Backend Engine' && (
            <section className="glass-card !p-10 space-y-8">
                <div className="space-y-2">
                    <h3 className="text-xl font-bold font-headline text-white">Synthesis Configuration</h3>
                    <p className="text-xs text-white/50 font-semibold">Control how Aura interacts with your local ML hardware.</p>
                </div>

                <div className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] pl-1">API Base Endpoint</label>
                        <input 
                            type="text" 
                            defaultValue="http://localhost:8000"
                            className="w-full bg-black/40 border border-white/10 focus:border-primary/50 focus:bg-black/60 rounded-xl px-5 py-4 text-sm font-mono text-primary focus:outline-none transition-all duration-300 shadow-inner focus:shadow-[0_0_15px_rgba(186,158,255,0.15)]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] pl-1">Compute Device</label>
                            <div className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm font-bold text-white/70 shadow-inner">
                                {stats.device}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] pl-1">Hardware Accel</label>
                            <div className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm font-bold text-green-400 shadow-inner">
                                {stats.mps_available ? 'MPS (Metal) Active' : 'CPU Only'}
                            </div>
                        </div>
                    </div>

                    <div 
                      onClick={() => setAutoClearCache(!autoClearCache)}
                      className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.07] hover:border-white/10 cursor-pointer transition-all duration-300 shadow-sm"
                    >
                        <div className="space-y-1 min-w-0 pr-4">
                            <p className="text-sm font-black text-white">Auto-Clear Cache</p>
                            <p className="text-[10px] text-white/50 font-semibold leading-relaxed">Empty MPS cache after every synthesis run to optimize unified memory footprint.</p>
                        </div>
                        
                        <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 relative shrink-0 ${autoClearCache ? 'bg-primary shadow-[0_0_12px_rgba(186,158,255,0.4)]' : 'bg-white/10'}`}>
                            <motion.div 
                                layout
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                className="w-4 h-4 bg-black rounded-full shadow-md"
                                style={{ 
                                  position: 'absolute',
                                  left: autoClearCache ? 'auto' : '4px',
                                  right: autoClearCache ? '4px' : 'auto'
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex justify-between items-center">
                    <button className="flex items-center gap-2 text-red-500/60 hover:text-red-500 transition-colors text-xs font-bold uppercase tracking-widest">
                        <Trash2 size={16} /> Reset to Defaults
                    </button>
                    <button className="btn-primary flex items-center gap-2 !py-2.5">
                        <Save size={16} /> Save Changes
                    </button>
                </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
