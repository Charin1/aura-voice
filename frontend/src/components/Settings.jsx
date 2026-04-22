import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, Server, 
  Trash2, Save
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Settings({ stats }) {
  const [activeSetting, setActiveSetting] = useState('Backend Engine');

  const navItems = [
    { icon: Server, label: 'Backend Engine' },
  ];

  return (
    <div className="flex-1 flex flex-col p-12 gap-12 z-10 relative overflow-y-auto no-scrollbar">
      <header>
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-black tracking-tighter mb-3 font-headline bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50"
        >
          Studio Settings
        </motion.h2>
        <p className="text-white/30 text-lg font-medium max-w-2xl leading-relaxed">
          Configure your local synthesis environment and API preferences.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* LEFT COLUMN - NAV */}
        <div className="lg:col-span-1 space-y-4">
            {navItems.map(item => (
                <button 
                  key={item.label} 
                  onClick={() => setActiveSetting(item.label)}
                  className={`flex items-center gap-4 w-full px-6 py-4 rounded-2xl transition-all ${activeSetting === item.label ? 'bg-white/10 text-white border border-white/10' : 'text-white/30 hover:bg-white/5 hover:text-white/50'}`}
                >
                    <item.icon size={20} />
                    <span className="text-sm font-bold tracking-tight">{item.label}</span>
                </button>
            ))}
        </div>

        {/* MAIN PANEL */}
        <div className="lg:col-span-2 space-y-12">
          {activeSetting === 'Backend Engine' && (
            <section className="glass-card !p-10 space-y-8">
                <div className="space-y-2">
                    <h3 className="text-xl font-bold font-headline">Synthesis Configuration</h3>
                    <p className="text-sm text-white/30 font-medium">Control how Aura interacts with your local ML hardware.</p>
                </div>

                <div className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">API Base Endpoint</label>
                        <input 
                            type="text" 
                            defaultValue="http://localhost:8000"
                            className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-4 text-sm font-mono text-primary focus:outline-none focus:border-primary/30 transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Compute Device</label>
                            <div className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-4 text-sm font-bold text-white/60">
                                {stats.device}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Hardware Accel</label>
                            <div className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-4 text-sm font-bold text-green-400">
                                {stats.mps_available ? 'MPS (Metal) Active' : 'CPU Only'}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5">
                        <div className="space-y-1">
                            <p className="text-sm font-bold">Auto-Clear Cache</p>
                            <p className="text-[10px] text-white/20 font-medium">Empty MPS cache after every orchestration</p>
                        </div>
                        <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                            <div className="absolute right-1 top-1 w-4 h-4 bg-black rounded-full"></div>
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
