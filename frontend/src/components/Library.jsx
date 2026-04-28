import React from 'react';
import { 
  Library as LibraryIcon, Play, Pause, Download, Trash2,
  AudioWaveform as Waveform, User, ChevronRight, MessageSquare, Mic2,
  Sparkles, RefreshCw, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import AudioPlayer from './AudioPlayer';

const API_BASE = "http://localhost:8000";

export default function Library({ 
  setReferenceId, 
  setTranscript, 
  setReferenceUrl, 
  onGoToStudio, 
  setNowPlaying, 
  nowPlaying, 
  isGlobalPlaying, 
  setIsGlobalPlaying 
}) {
  const [profiles, setProfiles] = React.useState([]);
  const [selectedProfileId, setSelectedProfileId] = React.useState(null);
  const [reprocessingId, setReprocessingId] = React.useState(null);

  const fetchProfiles = async () => {
    try {
      const res = await axios.get(`${API_BASE}/library`);
      setProfiles(res.data);
      if (res.data.length > 0 && !selectedProfileId) {
        setSelectedProfileId(res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch library profiles", err);
    }
  };

  React.useEffect(() => {
    fetchProfiles();
  }, []);

  const handlePlay = (id, url, title, subtext) => {
    if (nowPlaying?.id === id) {
      setIsGlobalPlaying(!isGlobalPlaying);
    } else {
      setNowPlaying({ url, id, title, subtext });
      setIsGlobalPlaying(true);
    }
  };

  const deleteProfile = async (e, refId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this voice profile and ALL its generated clips? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE}/library/profile/${refId}`);
      if (selectedProfileId === refId) setSelectedProfileId(null);
      await fetchProfiles();
    } catch (err) {
      console.error('Failed to delete profile', err);
    }
  };

  const deleteGeneration = async (e, genId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this generated clip? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE}/library/generation/${genId}`);
      await fetchProfiles();
    } catch (err) {
      console.error('Failed to delete generation', err);
    }
  };

  const reprocessReference = async (e, refId) => {
    e.stopPropagation();
    setReprocessingId(refId);
    try {
      await axios.post(`${API_BASE}/reprocess-reference/${refId}`);
      await fetchProfiles();
    } catch (err) {
      console.error('Failed to reprocess reference', err);
      alert('Reprocessing failed. Check backend logs for details.');
    } finally {
      setReprocessingId(null);
    }
  };

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  return (
    <div className="flex-1 flex flex-col p-12 gap-12 z-10 relative overflow-hidden h-full">
      <header className="flex justify-between items-end shrink-0">
        <div>
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-black tracking-tighter mb-3 font-headline bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50"
          >
            Voice Hub
          </motion.h2>
          <p className="text-white/30 text-lg font-medium max-w-2xl leading-relaxed">
            Manage your distinct voice profiles and explore their generated orchestrations.
          </p>
        </div>
      </header>

      <div className="flex-1 flex gap-8 min-h-0">
        {/* LEFT PANE: VOICE PROFILES */}
        <div className="w-1/3 flex flex-col gap-4 border-r border-white/5 pr-8 overflow-y-auto no-scrollbar pb-12">
          <h3 className="font-bold tracking-tight uppercase text-sm text-primary/80 mb-2 flex items-center gap-2">
            <User size={18} /> Voice Profiles
          </h3>
          
          <AnimatePresence>
            {profiles.length > 0 ? profiles.map((profile) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedProfileId(profile.id)}
                className={`p-6 rounded-3xl border transition-all cursor-pointer group ${selectedProfileId === profile.id ? 'bg-white/10 border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)]' : 'bg-white/5 border-white/5 hover:bg-white/[0.07] hover:border-white/10'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {profile.url ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handlePlay(`ref_${profile.id}`, API_BASE + profile.url, "Reference Audio", profile.transcript); }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${nowPlaying?.id === `ref_${profile.id}` ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-white/10 text-white/40 hover:text-white/80 hover:bg-white/20'}`}
                      >
                        {nowPlaying?.id === `ref_${profile.id}` && isGlobalPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                      </button>
                    ) : (
                      <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-white/30 uppercase tracking-[0.15em]">
                        Legacy
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-white/30 uppercase tracking-widest">{new Date(profile.timestamp * 1000).toLocaleDateString()}</p>
                      <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em]">{profile.generations.length} Generations</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => deleteProfile(e, profile.id)}
                    className="p-2 rounded-xl text-white/10 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Alignment badge row */}
                <div className="flex items-center gap-2 mb-3">
                  {profile.alignment_available ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                      <CheckCircle2 size={10} /> Aligned
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400/70 text-[9px] font-black uppercase tracking-widest">
                      Legacy
                    </span>
                  )}
                  {profile.chunk_count > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30 text-[9px] font-black uppercase tracking-widest">
                      {profile.chunk_count} chunk{profile.chunk_count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <p className="text-sm font-medium text-white/80 line-clamp-2 italic leading-relaxed mb-4">
                  "{profile.transcript || 'Unknown Reference'}"
                </p>

                <div className="flex gap-2">
                  {profile.url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReferenceId(profile.id);
                        setTranscript(profile.transcript || '');
                        setReferenceUrl(null);
                        onGoToStudio();
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
                    >
                      <Mic2 size={14} /> Use in Studio
                    </button>
                  )}
                  {!profile.alignment_available && profile.url && (
                    <button
                      onClick={(e) => reprocessReference(e, profile.id)}
                      disabled={reprocessingId === profile.id}
                      title="Re-run WhisperX forced alignment on this reference"
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400/80 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-wait"
                    >
                      <RefreshCw size={12} className={reprocessingId === profile.id ? 'animate-spin' : ''} />
                      {reprocessingId === profile.id ? 'Aligning…' : 'Re-process'}
                    </button>
                  )}
                </div>
              </motion.div>
            )) : (
              <div className="h-48 flex flex-col items-center justify-center text-center opacity-30 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                <User size={32} className="mb-2" />
                <p className="text-xs font-bold tracking-widest uppercase">No Profiles Yet</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT PANE: GENERATIONS */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto no-scrollbar pl-4 pb-12">
          <h3 className="font-bold tracking-tight uppercase text-sm text-secondary/80 mb-2 flex items-center gap-2">
            <MessageSquare size={18} /> Generated Samples
          </h3>

          <div className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
              {selectedProfile ? (
                selectedProfile.generations.length > 0 ? (
                  selectedProfile.generations.map((gen) => (
                    <motion.div 
                      key={gen.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="glass-card !p-6 flex flex-col border-white/5 hover:border-secondary/20 group"
                    >
                      <div className="flex flex-col md:flex-row items-center gap-8 w-full">
                        <div className="flex items-center gap-8 flex-1 w-full">
                          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 group-hover:bg-secondary/10 transition-all shrink-0">
                            <Waveform size={20} className="text-white/20 group-hover:text-secondary transition-all" />
                          </div>
                          <div className="flex-1 space-y-2 overflow-hidden w-full">
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-[8px] font-black rounded-full border border-secondary/20">{gen.model_type.toUpperCase()}</span>
                              {gen.used_aligned_chunk && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] font-black rounded-full border border-emerald-500/20">
                                  <Sparkles size={8} /> Aligned
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{new Date(gen.timestamp * 1000).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-white/90 font-medium leading-relaxed">"{gen.text}"</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="w-[1px] h-8 bg-white/5 hidden md:block"></div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handlePlay(`gen_${gen.id}`, API_BASE + gen.url, "Generation", gen.text)} 
                              className={`p-3 rounded-xl transition-all ${nowPlaying?.id === `gen_${gen.id}` ? 'bg-primary/20 text-primary' : 'hover:bg-white/10 text-white/40'}`}
                            >
                              {nowPlaying?.id === `gen_${gen.id}` && isGlobalPlaying ? <Pause size={18} /> : <Play size={18} />}
                            </button>
                            <a href={API_BASE + gen.url} download={`aura_${gen.id}.wav`} className="p-3 hover:bg-white/10 rounded-xl transition-all">
                              <Download size={18} className="text-white/40" />
                            </a>
                            <button 
                              onClick={(e) => deleteGeneration(e, gen.id)}
                              className="p-3 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center opacity-30 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                    <Waveform size={48} className="mb-4" />
                    <p className="text-xs font-bold tracking-widest uppercase">No Generations Found</p>
                  </div>
                )
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center opacity-10">
                  <LibraryIcon size={64} className="mb-4" />
                  <p className="text-xs font-bold tracking-[0.2em] uppercase">Select a Profile</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
