import React from 'react';
import { 
  Library as LibraryIcon, Play, Pause, Download, Trash2,
  AudioWaveform as Waveform, User, ChevronRight, MessageSquare, Mic2,
  Sparkles, RefreshCw, CheckCircle2, Search, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import AudioPlayer from './AudioPlayer';

const API_BASE = "http://localhost:8000";

const SyncedText = ({ text, isPlaying, currentTime, duration, className }) => {
  const containerRef = React.useRef(null);
  const wordRefs = React.useRef([]);
  
  const words = React.useMemo(() => text ? text.trim().split(/\s+/) : [], [text]);
  const progress = duration > 0 ? currentTime / duration : 0;
  const activeWordIndex = words.length > 0 ? Math.min(words.length - 1, Math.floor(progress * words.length)) : -1;

  React.useEffect(() => {
    wordRefs.current = [];
  }, [text]);

  React.useEffect(() => {
    if (isPlaying && activeWordIndex >= 0 && wordRefs.current[activeWordIndex] && containerRef.current) {
      const activeWordEl = wordRefs.current[activeWordIndex];
      const container = containerRef.current;
      
      const containerHeight = container.clientHeight;
      const containerScrollTop = container.scrollTop;
      const wordOffsetTop = activeWordEl.offsetTop;
      const wordHeight = activeWordEl.clientHeight;
      
      // Scroll into view only when active word moves past top/bottom boundaries
      if (wordOffsetTop + wordHeight > containerScrollTop + containerHeight - 8) {
        container.scrollTo({
          top: wordOffsetTop - containerHeight + wordHeight + 12,
          behavior: 'smooth'
        });
      } else if (wordOffsetTop < containerScrollTop + 8) {
        container.scrollTo({
          top: Math.max(0, wordOffsetTop - 12),
          behavior: 'smooth'
        });
      }
    }
  }, [activeWordIndex, isPlaying]);

  return (
    <div ref={containerRef} className={className}>
      {isPlaying ? (
        words.map((word, idx) => {
          const isActive = idx === activeWordIndex;
          return (
            <span
              key={idx}
              ref={el => wordRefs.current[idx] = el}
              className={`inline-block transition-all duration-300 origin-center ${
                isActive 
                  ? 'text-primary font-black scale-105 drop-shadow-[0_0_10px_rgba(58,223,250,0.5)] mx-0.5' 
                  : idx < activeWordIndex
                    ? 'text-white/60 font-semibold'
                    : 'text-white/20'
              }`}
              style={{ marginRight: '0.35em' }}
            >
              {word}
            </span>
          );
        })
      ) : (
        text ? `"${text}"` : '""'
      )}
    </div>
  );
};

export default function Library({ 
  setReferenceId, 
  setTranscript, 
  setReferenceUrl, 
  onGoToStudio, 
  setNowPlaying, 
  nowPlaying, 
  isGlobalPlaying, 
  setIsGlobalPlaying,
  currentTime = 0,
  duration = 0
}) {
  const [profiles, setProfiles] = React.useState([]);
  const [selectedProfileId, setSelectedProfileId] = React.useState(null);
  const [reprocessingId, setReprocessingId] = React.useState(null);

  // Search & Tagging states
  const [searchTerm, setSearchTerm] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('All');
  const [editingProfileId, setEditingProfileId] = React.useState(null);
  const [editTags, setEditTags] = React.useState('');
  const [editCategory, setEditCategory] = React.useState('General');

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

  const startEditing = (e, profile) => {
    e.stopPropagation();
    setEditingProfileId(profile.id);
    setEditCategory(profile.category || 'General');
    setEditTags(profile.tags ? profile.tags.join(', ') : '');
  };

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = 
      (profile.transcript && profile.transcript.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (profile.tags && profile.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
      
    const matchesCategory = 
      categoryFilter === 'All' || 
      (profile.category || 'General') === categoryFilter;
      
    return matchesSearch && matchesCategory;
  });

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
        <div className="w-1/3 flex flex-col gap-4 border-r border-white/5 pr-8 overflow-y-auto no-scrollbar pb-56">
          <h3 className="font-bold tracking-tight uppercase text-sm text-primary/80 mb-1 flex items-center gap-2">
            <User size={18} /> Voice Profiles
          </h3>

          {/* Search and Category Filters */}
          <div className="space-y-4 mb-4">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-4 text-white/40" />
              <input 
                type="text"
                placeholder="Search by transcript or tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/5 focus:bg-white/10 focus:border-primary/50 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-white/45 transition-all outline-none"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 p-1 rounded-md text-white/40 hover:text-white hover:bg-white/5 transition-all"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            
            <div className="space-y-2">
              <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em] pl-1">Category filter</span>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 pr-1">
                {['All', 'General', 'Narrator', 'Assistant', 'Podcast', 'Custom'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all duration-300 shrink-0 ${
                      categoryFilter === cat
                        ? 'bg-primary/20 text-primary border-primary/40 shadow-[0_0_15px_rgba(186,158,255,0.15)]'
                        : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <AnimatePresence>
            {filteredProfiles.length > 0 ? filteredProfiles.map((profile) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ y: -2 }}
                onClick={() => setSelectedProfileId(profile.id)}
                className={`p-6 rounded-3xl border transition-all cursor-pointer group ${selectedProfileId === profile.id ? 'bg-white/10 border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.5),_0_0_1px_rgba(186,158,255,0.2)]' : 'bg-white/5 border-white/5 hover:bg-white/[0.08] hover:border-white/10 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {profile.url ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handlePlay(`ref_${profile.id}`, API_BASE + profile.url, "Reference Audio", profile.transcript); }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${nowPlaying?.id === `ref_${profile.id}` ? 'bg-primary/20 text-primary border border-primary/45' : 'bg-white/10 text-white/50 hover:text-white hover:bg-white/20'}`}
                      >
                        {nowPlaying?.id === `ref_${profile.id}` && isGlobalPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                      </button>
                    ) : (
                      <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-white/40 uppercase tracking-[0.15em]">
                        Legacy
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-white/60 uppercase tracking-widest">{new Date(profile.timestamp * 1000).toLocaleDateString()}</p>
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-0.5">{profile.generations.length} Generations</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => startEditing(e, profile)}
                      className="px-2.5 py-1.5 bg-white/5 border border-white/5 hover:bg-primary/20 hover:border-primary/30 rounded-xl text-white/50 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest"
                      title="Edit metadata"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={(e) => deleteProfile(e, profile.id)}
                      className="p-2 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Categories & Tags Display */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="px-2 py-0.5 rounded-full bg-secondary/15 border border-secondary/30 text-secondary text-[8px] font-black uppercase tracking-widest">
                    {profile.category || 'General'}
                  </span>
                  {profile.tags && profile.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-primary hover:border-primary/25 transition-all text-[8px] font-bold uppercase tracking-wider">
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Alignment badge row */}
                <div className="flex items-center gap-2 mb-3">
                  {profile.alignment_available ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[8px] font-black uppercase tracking-widest shadow-sm">
                      <CheckCircle2 size={9} /> Aligned
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[8px] font-black uppercase tracking-widest shadow-sm">
                      Legacy
                    </span>
                  )}
                  {profile.chunk_count > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-[8px] font-black uppercase tracking-widest">
                      {profile.chunk_count} chunk{profile.chunk_count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Metadata Editor form */}
                {editingProfileId === profile.id ? (
                  <div className="bg-black/20 p-4 rounded-2xl border border-white/5 mb-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-white/30 uppercase tracking-widest">Category</label>
                      <select 
                        value={editCategory} 
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                      >
                        <option value="General">General</option>
                        <option value="Narrator">Narrator</option>
                        <option value="Assistant">Assistant</option>
                        <option value="Podcast">Podcast</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-white/30 uppercase tracking-widest">Tags (comma-separated)</label>
                      <input 
                        type="text" 
                        value={editTags} 
                        onChange={(e) => setEditTags(e.target.value)}
                        placeholder="energetic, calm, formal"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    
                    <div className="flex gap-2 pt-1">
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);
                          try {
                            await axios.put(`${API_BASE}/library/profile/${profile.id}/metadata`, {
                              tags: tagsArray,
                              category: editCategory
                            });
                            setEditingProfileId(null);
                            await fetchProfiles();
                          } catch (err) {
                            console.error(err);
                            alert("Failed to update metadata");
                          }
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/30 transition-all"
                      >
                        Save
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingProfileId(null); }}
                        className="flex-1 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                <SyncedText 
                  text={profile.transcript} 
                  isPlaying={nowPlaying?.id === `ref_${profile.id}` && isGlobalPlaying} 
                  currentTime={currentTime} 
                  duration={duration} 
                  className="max-h-20 overflow-y-auto custom-scrollbar text-sm font-medium text-white/80 italic leading-relaxed mb-4 pr-1 py-2"
                />

                <div className="flex gap-2">
                  {profile.url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReferenceId(profile.id);
                        setTranscript(profile.transcript || '');
                        setReferenceUrl(API_BASE + profile.url);
                        onGoToStudio();
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/15 border border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/25 hover:shadow-[0_0_15px_rgba(186,158,255,0.25)] transition-all"
                    >
                      <Mic2 size={14} /> Use in Studio
                    </button>
                  )}
                  {!profile.alignment_available && profile.url && (
                    <button
                      onClick={(e) => reprocessReference(e, profile.id)}
                      disabled={reprocessingId === profile.id}
                      title="Re-run WhisperX forced alignment on this reference"
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-400 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-wait"
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
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto no-scrollbar pl-4 pb-56">
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
                            <div className="flex items-center gap-2 flex-wrap">
                              {gen.model_type === 'xtts' ? (
                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black rounded-full border border-primary/20 shadow-sm">XTTS-v2</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-secondary/15 text-secondary text-[8px] font-black rounded-full border border-secondary/35 shadow-sm">F5-MLX</span>
                              )}
                              
                              {gen.speed && (
                                <span className="px-2 py-0.5 bg-white/5 text-white/70 text-[8px] font-black rounded-full border border-white/10">{gen.speed}x Speed</span>
                              )}
                              {gen.model_type === 'xtts' && gen.temperature && (
                                <span className="px-2 py-0.5 bg-white/5 text-white/70 text-[8px] font-black rounded-full border border-white/10">Temp: {gen.temperature}</span>
                              )}
                              {gen.model_type === 'f5' && gen.cfg_strength && (
                                <span className="px-2 py-0.5 bg-white/5 text-white/70 text-[8px] font-black rounded-full border border-white/10">CFG: {gen.cfg_strength}</span>
                              )}
                              {gen.used_aligned_chunk && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] font-black rounded-full border border-emerald-500/25">
                                  <Sparkles size={8} /> Aligned
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{new Date(gen.timestamp * 1000).toLocaleString()}</span>
                            </div>
                            <SyncedText 
                              text={gen.text} 
                              isPlaying={nowPlaying?.id === `gen_${gen.id}` && isGlobalPlaying} 
                              currentTime={currentTime} 
                              duration={duration} 
                              className="max-h-32 overflow-y-auto custom-scrollbar text-sm text-white/90 font-medium leading-relaxed pr-2 py-2"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="w-[1px] h-8 bg-white/5 hidden md:block"></div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handlePlay(`gen_${gen.id}`, API_BASE + gen.url, "Generation", gen.text)} 
                              className={`p-3 rounded-xl transition-all ${nowPlaying?.id === `gen_${gen.id}` ? 'bg-primary/20 text-primary' : 'hover:bg-white/10 text-white/50'}`}
                            >
                              {nowPlaying?.id === `gen_${gen.id}` && isGlobalPlaying ? <Pause size={18} /> : <Play size={18} />}
                            </button>
                            <a href={API_BASE + gen.url} download={`aura_${gen.id}.wav`} className="p-3 hover:bg-white/10 rounded-xl transition-all">
                              <Download size={18} className="text-white/50 hover:text-white" />
                            </a>
                            <button 
                              onClick={(e) => deleteGeneration(e, gen.id)}
                              className="p-3 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
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
