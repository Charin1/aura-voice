import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Library as LibraryIcon, 
  LayoutDashboard, FlaskConical, Activity,
  Volume2, LogOut
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import Dashboard from './components/Dashboard';
import Studio from './components/Studio';
import Library from './components/Library';
import Settings from './components/Settings';
import Analytics from './components/Analytics';

const API_BASE = "http://localhost:8000";

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [activeModel, setActiveModel] = useState('xtts');
  const [inputText, setInputText] = useState('');
  const [referenceId, setReferenceId] = useState(null);
  const [referenceUrl, setReferenceUrl] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ device: 'CPU', current_model: 'None', mps_available: false });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API_BASE}/stats`);
        setStats(res.data);
      } catch (err) { console.error("Failed to fetch stats", err); }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    // Create local URL for playback
    const url = URL.createObjectURL(file);
    setReferenceUrl(url);

    try {
      const res = await axios.post(`${API_BASE}/upload-reference`, formData);
      setReferenceId(res.data.id);
      setTranscript(res.data.transcript);
    } catch (err) {
      alert("Failed to upload reference audio");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSynthesize = async () => {
    if (!inputText || !referenceId) return;

    setIsGenerating(true);
    const formData = new FormData();
    formData.append('text', inputText);
    formData.append('model_type', activeModel);
    formData.append('reference_id', referenceId);

    try {
      const res = await axios.post(`${API_BASE}/synthesize`, formData, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const newClip = {
        id: Date.now(),
        text: inputText.substring(0, 50) + "...",
        url: url,
        timestamp: new Date().toLocaleTimeString(),
        model: activeModel
      };
      setHistory([newClip, ...history]);
    } catch (err) {
      alert("Synthesis failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard' },
    { icon: FlaskConical, label: 'Studio' },
    { icon: LibraryIcon, label: 'Library' },
    { icon: Activity, label: 'Analytics' },
    { icon: SettingsIcon, label: 'Settings' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <Dashboard stats={stats} />;
      case 'Studio':
        return (
            <Studio 
              inputText={inputText}
              setInputText={setInputText}
              referenceId={referenceId}
              setReferenceId={setReferenceId}
              referenceUrl={referenceUrl}
              setReferenceUrl={setReferenceUrl}
              transcript={transcript}
              setTranscript={setTranscript}
              isGenerating={isGenerating}
              isUploading={isUploading}
              handleFileUpload={handleFileUpload}
              handleSynthesize={handleSynthesize}
              history={history}
            />
        );
      case 'Library':
        return <Library history={history} />;
      case 'Analytics':
        return <Analytics stats={stats} />;
      case 'Settings':
        return <Settings stats={stats} />;
      default:
        return <Dashboard stats={stats} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface text-white/90 font-sans selection:bg-primary/30">
      <div className="aurora" />
      <div className="aura-bg" />
      
      {/* SIDEBAR */}
      <aside className="w-72 glass flex flex-col p-8 z-20">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-10 h-10 bg-gradient-to-tr from-primary to-secondary rounded-xl shadow-[0_0_20px_rgba(186,158,255,0.3)] flex items-center justify-center">
            <Volume2 size={24} className="text-black" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight font-headline italic">AURA</h1>
        </div>

        <nav className="flex-1 space-y-3">
          {navItems.map((item) => (
            <button 
              key={item.label} 
              onClick={() => setActiveTab(item.label)}
              className={`flex items-center gap-4 w-full px-5 py-3 rounded-2xl transition-all duration-300 ${activeTab === item.label ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:bg-white/5 hover:text-white/70'}`}
            >
              <item.icon size={20} />
              <span className="text-sm font-semibold tracking-wide">{item.label}</span>
            </button>
          ))}
          

        </nav>

        {/* MODEL SELECTOR (ONLY SHOW IN STUDIO) */}
        {activeTab === 'Studio' && (
            <div className="mt-auto pt-8 border-t border-white/5">
                <div className="bg-black/30 rounded-3xl p-5 space-y-5">
                    <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Engine</span>
                    <div className={`px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest ${stats.mps_available ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                        {stats.mps_available ? 'MPS ACTIVE' : 'CPU MODE'}
                    </div>
                    </div>
                    
                    <div className="flex bg-black/40 p-1.5 rounded-2xl relative">
                    <motion.div 
                        layoutId="modelToggle"
                        className="absolute inset-y-1.5 bg-white/5 rounded-xl shadow-inner border border-white/5"
                        initial={false}
                        animate={{ x: activeModel === 'xtts' ? 0 : '100%' }}
                        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                        style={{ width: 'calc(50% - 6px)' }}
                    />
                    <button onClick={() => setActiveModel('xtts')} className={`relative z-10 flex-1 py-2 text-xs font-bold transition-colors ${activeModel === 'xtts' ? 'text-white' : 'text-white/20'}`}>XTTS-v2</button>
                    <button onClick={() => setActiveModel('f5')} className={`relative z-10 flex-1 py-2 text-xs font-bold transition-colors ${activeModel === 'f5' ? 'text-white' : 'text-white/20'}`}>F5-MLX</button>
                    </div>

                    <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-medium uppercase tracking-wider">
                        <span className="text-white/20">Unified Memory</span>
                        <span className="text-white/40">4.2GB / 16GB</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '26%' }}
                        className="h-full bg-gradient-to-r from-primary to-secondary shadow-[0_0_10px_rgba(186,158,255,0.5)]" 
                        />
                    </div>
                    </div>
                </div>
            </div>
        )}

        <div className={`mt-auto ${activeTab === 'Studio' ? 'pt-6' : 'pt-0'}`}>
             <button className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl text-red-500/40 hover:bg-red-500/10 hover:text-red-500 transition-all">
                <LogOut size={20} />
                <span className="text-sm font-bold tracking-tight uppercase">Sign Out</span>
             </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col overflow-hidden"
            >
                {renderContent()}
            </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
