import React from 'react';
import { 
  Library as LibraryIcon, Play, Pause, Download, Search, Filter, MoreVertical,
  AudioWaveform as Waveform, History, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_BASE = "http://localhost:8000";


export default function Library({ history }) {
  const [clips, setClips] = React.useState([]);
  const [playingId, setPlayingId] = React.useState(null);
  const audioRef = React.useRef(null);

  const handlePlay = (id, url) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(url);
      audioRef.current.play();
      setPlayingId(id);
      audioRef.current.onended = () => setPlayingId(null);
    }
  };

  React.useEffect(() => {
    const fetchClips = async () => {
      try {
        const res = await axios.get(`${API_BASE}/library`);
        setClips(res.data);
      } catch (err) {
        console.error("Failed to fetch library clips", err);
      }
    };
    fetchClips();
  }, []);

  const allClips = [...clips.map(c => ({
    id: c.id,
    text: c.filename,
    url: `${API_BASE}${c.url}`,
    timestamp: new Date(c.created_at * 1000).toLocaleString(),
    model: 'UNKNOWN'
  })), ...history];
  return (
    <div className="flex-1 flex flex-col p-12 gap-12 z-10 relative overflow-y-auto no-scrollbar">
      <header className="flex justify-between items-end">
        <div>
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-black tracking-tighter mb-3 font-headline bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50"
          >
            Voice Library
          </motion.h2>
          <p className="text-white/30 text-lg font-medium max-w-2xl leading-relaxed">
            Access, manage, and deploy your high-fidelity voice models across projects.
          </p>
        </div>
      </header>



      {/* RECENT CLIPS */}
      <section className="space-y-8">
        <div className="flex items-center gap-3">
            <History size={20} className="text-primary/60" />
            <h3 className="font-bold tracking-tight uppercase text-sm">Recent Orchestrations</h3>
            <div className="h-[1px] flex-1 bg-white/5 ml-4"></div>
        </div>

        <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
                {allClips.length > 0 ? allClips.map((clip) => (
                    <motion.div 
                        key={clip.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="glass-card !p-6 flex flex-col md:flex-row items-center gap-8 border-white/5 hover:border-primary/20 group"
                    >
                        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 group-hover:bg-primary/10 transition-all shrink-0">
                            <Play size={20} className="text-white/20 group-hover:text-primary transition-all ml-1" />
                        </div>
                        <div className="flex-1 space-y-1 overflow-hidden">
                            <div className="flex items-center gap-3 mb-1">
                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black rounded-full border border-primary/20">{clip.model.toUpperCase()}</span>
                                <span className="text-[10px] font-bold text-white/10 uppercase tracking-widest">{clip.timestamp}</span>
                            </div>
                            <p className="text-sm text-white/70 font-medium truncate italic">"{clip.text}"</p>
                        </div>
                        <div className="flex items-center gap-6 shrink-0">
                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.2em]">Duration</span>
                                <span className="text-xs font-bold text-white/40">4.2s</span>
                            </div>
                            <div className="w-[1px] h-8 bg-white/5 hidden md:block"></div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handlePlay(clip.id, clip.url)} 
                                    className="p-3 hover:bg-white/10 rounded-xl transition-all"
                                >
                                    {playingId === clip.id ? <Pause size={18} className="text-primary" /> : <Play size={18} className="text-white/40" />}
                                </button>
                                <a href={clip.url} download={`aura_${clip.id}.wav`} className="p-3 hover:bg-white/10 rounded-xl transition-all"><Download size={18} className="text-white/40" /></a>
                            </div>
                        </div>
                    </motion.div>
                )) : (
                    <div className="h-64 flex flex-col items-center justify-center text-center opacity-10">
                        <Waveform size={64} className="mb-4" />
                        <p className="text-xs font-bold tracking-[0.2em] uppercase">No Clips Found</p>
                    </div>
                )}
            </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
