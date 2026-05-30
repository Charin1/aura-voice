import React, { useRef, useState, useEffect } from 'react';
import { 
  Mic, Upload, ChevronRight, RefreshCw, AudioWaveform as WaveformIcon, Activity, Play, Pause, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AudioPlayer from './AudioPlayer';

const WaveformVisualizer = ({ isActive }) => {
  const bars = Array.from({ length: 32 });
  return (
    <div className="flex items-center gap-1.5 h-16 justify-center">
      {bars.map((_, i) => (
        <motion.div
          key={i}
          className={`w-1.5 rounded-full ${isActive ? 'bg-gradient-to-t from-primary to-secondary shadow-[0_0_10px_rgba(58,223,250,0.5)]' : 'bg-white/10'}`}
          animate={{
            height: isActive 
              ? ["20%", `${Math.random() * 60 + 40}%`, "20%"] 
              : "20%"
          }}
          transition={{
            duration: isActive ? Math.random() * 0.5 + 0.5 : 2,
            repeat: Infinity,
            delay: i * 0.05,
            ease: "easeInOut"
          }}
          style={{ height: "20%" }}
        />
      ))}
    </div>
  );
};

export default function Studio({ 
  inputText, 
  setInputText, 
  referenceId, 
  setReferenceId, 
  referenceUrl,
  transcript, 
  setTranscript, 
  isGenerating, 
  isUploading, 
  handleFileUpload, 
  handleSynthesize,
  history = [],
  setNowPlaying,
  nowPlaying,
  isGlobalPlaying,
  setIsGlobalPlaying,
  generationProgress = 0,
  generationStatus = '',
  activeModel = 'xtts',
  lastChunkUrl = null
}) {
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);

  // Prosody and speed controls state
  const [speed, setSpeed] = useState(1.0);
  const [temperature, setTemperature] = useState(0.75);
  const [cfgStrength, setCfgStrength] = useState(2.0);

  // Progressive chunk playback state
  const [playlist, setPlaylist] = useState([]);
  const [currentPlayIndex, setCurrentPlayIndex] = useState(-1);
  const audioRef = useRef(null);
  const [isPlayingChunks, setIsPlayingChunks] = useState(false);

  // Cleanup on unmount to prevent leaked playback
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // When synthesis starts, we reset progressive playlist
  useEffect(() => {
    if (isGenerating) {
      setPlaylist([]);
      setCurrentPlayIndex(-1);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlayingChunks(false);
    }
  }, [isGenerating]);

  // When a new chunk url is received
  useEffect(() => {
    if (isGenerating && lastChunkUrl && !playlist.includes(lastChunkUrl)) {
      setPlaylist(prev => [...prev, lastChunkUrl]);
    }
  }, [lastChunkUrl, isGenerating]);

  // Handle playing playlist sequentially
  useEffect(() => {
    if (playlist.length > 0 && currentPlayIndex === -1) {
      setCurrentPlayIndex(0);
    }
  }, [playlist, currentPlayIndex]);

  useEffect(() => {
    if (currentPlayIndex >= 0 && currentPlayIndex < playlist.length) {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.onended = () => {
          setCurrentPlayIndex(prev => prev + 1);
        };
      }
      
      // Pause global player if it is active
      if (isGlobalPlaying && setIsGlobalPlaying) {
        setIsGlobalPlaying(false);
      }

      audioRef.current.src = playlist[currentPlayIndex];
      audioRef.current.play().catch(e => console.error("Playback failed", e));
      setIsPlayingChunks(true);
    } else if (currentPlayIndex >= playlist.length && playlist.length > 0) {
      setIsPlayingChunks(false);
    }
  }, [currentPlayIndex, playlist, isGlobalPlaying, setIsGlobalPlaying]);

  // If global player starts playing, pause progressive chunk playback
  useEffect(() => {
    if (isGlobalPlaying && isPlayingChunks) {
      stopChunkPlayback();
    }
  }, [isGlobalPlaying, isPlayingChunks]);

  const stopChunkPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setCurrentPlayIndex(playlist.length); // mark as finished
    setIsPlayingChunks(false);
  };

  const onSynthesizeClick = () => {
    handleSynthesize(speed, temperature, cfgStrength);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
          handleFileUpload({ target: { files: [audioFile] } });
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Could not access microphone. Please check your permissions.");
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col px-12 pt-12 pb-56 gap-12 z-10 relative overflow-y-auto no-scrollbar">
      <header className="flex justify-between items-start">
        <div>
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-black tracking-tighter mb-3 font-headline bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50"
          >
            Voice Studio
          </motion.h2>
          <p className="text-white/30 text-lg font-medium max-w-md leading-relaxed">
            Craft the <span className="text-primary/60 italic">ethereal echo</span> of any voice with machine precision.
          </p>
        </div>
        <button 
          onClick={() => { setReferenceId(null); setTranscript(''); setInputText(''); }}
          title="Clear session"
          className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all hover:scale-110 active:scale-95 group"
        >
          <RefreshCw size={22} className="text-white/30 group-hover:text-white/70 transition-colors" />
        </button>
      </header>

      <section className="space-y-12 max-w-5xl">
        {/* UPLOAD / RECORD */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative glass-card !p-12 border-dashed border-2 border-white/5 flex flex-col items-center justify-center min-h-[280px] text-center gap-6">
            {referenceId ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full space-y-6"
              >
                <div className="flex flex-col items-center gap-4">
                  <button 
                    onClick={() => {
                      if (nowPlaying?.id === 'reference') {
                        setIsGlobalPlaying(!isGlobalPlaying);
                      } else {
                        setNowPlaying({
                          url: referenceUrl,
                          id: 'reference',
                          title: "Reference Capture",
                          subtext: transcript
                        });
                        setIsGlobalPlaying(true);
                      }
                    }}
                    className={`w-16 h-16 rounded-full flex items-center justify-center border shadow-[0_0_40px_rgba(34,197,94,0.1)] transition-all hover:scale-105 active:scale-95 ${nowPlaying?.id === 'reference' ? 'bg-green-500/20 border-green-500/50' : 'bg-green-500/10 border-green-500/20'}`}
                  >
                    {nowPlaying?.id === 'reference' && isGlobalPlaying ? <Pause size={32} className="text-green-400" /> : <Play size={32} className="text-green-400 ml-1" />}
                  </button>
                  <div className="space-y-1">
                    <p className="text-xl font-bold font-headline">Reference Captured</p>
                    <p className="text-sm text-white/30 italic max-w-lg mx-auto">"{transcript}"</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setReferenceId(null); setTranscript(''); }}
                  className="text-xs font-bold text-primary hover:text-primary/60 transition-colors uppercase tracking-widest"
                >
                  Replace Reference
                </button>
              </motion.div>
            ) : (
              <>
                <div className="flex gap-8">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center border border-white/5 hover:border-primary/30 hover:bg-white/10 cursor-pointer group transition-all duration-500"
                  >
                    <Upload size={32} className="text-primary/60 group-hover:text-primary group-hover:scale-110 transition-all" />
                  </div>
                  <div 
                    onClick={toggleRecording}
                    className={`w-20 h-20 rounded-3xl flex items-center justify-center border cursor-pointer transition-all duration-500 ${isRecording ? 'bg-red-500/20 border-red-500/50 animate-pulse' : 'bg-white/5 border-white/5 hover:border-secondary/30 hover:bg-white/10 group'}`}
                  >
                    <Mic size={32} className={isRecording ? 'text-red-500' : 'text-secondary/60 group-hover:text-secondary group-hover:scale-110 transition-all'} />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold font-headline text-white/80">{isRecording ? "Recording..." : "Upload or Record"}</p>
                  <p className="text-sm text-white/20 font-medium">Capture 6-10 seconds of clear vocal resonance</p>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={handleFileUpload} />
              </>
            )}
            {isUploading && <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center rounded-2xl gap-4">
              <Activity size={48} className="animate-spin text-primary" />
              <p className="text-sm font-bold tracking-widest text-primary/80 uppercase">Analyzing...</p>
            </div>}
          </div>
        </div>

        {/* TEXT INPUT AND SYNTHESIS PROGRESS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
             <div className="flex justify-between items-end px-2">
               <label className="text-xs font-black text-white/20 uppercase tracking-[0.3em]">Synthesis Engine</label>
               <span className="text-[10px] font-bold text-white/10 uppercase tracking-widest">{inputText.length} / 1000 Tokens</span>
             </div>
             
             {/* Slider Controls */}
             <div className="flex flex-col sm:flex-row gap-6 bg-white/5 p-5 rounded-2xl border border-white/5 shadow-inner">
               <div className="flex-1 space-y-3">
                 <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest">
                   <span>Speed ({speed}x)</span>
                 </div>
                 <input 
                   type="range" 
                   min="0.5" 
                   max="2.0" 
                   step="0.1" 
                   value={speed} 
                   onChange={(e) => setSpeed(parseFloat(e.target.value))}
                   className="w-full accent-primary bg-white/10 rounded-lg appearance-none h-1 cursor-pointer"
                 />
               </div>
               
               {activeModel === 'xtts' ? (
                 <div className="flex-1 space-y-3">
                   <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest">
                     <span>Temperature ({temperature})</span>
                   </div>
                   <input 
                     type="range" 
                     min="0.1" 
                     max="1.2" 
                     step="0.05" 
                     value={temperature} 
                     onChange={(e) => setTemperature(parseFloat(e.target.value))}
                     className="w-full accent-secondary bg-white/10 rounded-lg appearance-none h-1 cursor-pointer"
                   />
                 </div>
               ) : (
                 <div className="flex-1 space-y-3">
                   <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest">
                     <span>Guidance Scale ({cfgStrength})</span>
                   </div>
                   <input 
                     type="range" 
                     min="1.0" 
                     max="4.0" 
                     step="0.1" 
                     value={cfgStrength} 
                     onChange={(e) => setCfgStrength(parseFloat(e.target.value))}
                     className="w-full accent-secondary bg-white/10 rounded-lg appearance-none h-1 cursor-pointer"
                   />
                 </div>
               )}
             </div>

              <div className="flex flex-col gap-4">
                <textarea 
                 value={inputText}
                 onChange={(e) => setInputText(e.target.value)}
                 placeholder="The silent whispers of the machine..."
                 className="w-full min-h-[280px] input-glass leading-relaxed resize-none"
                />
                <div className="flex justify-end">
                  <motion.button 
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   onClick={onSynthesizeClick}
                   disabled={isGenerating || !referenceId || !inputText}
                   className={`flex items-center gap-4 py-4 px-10 rounded-2xl font-black shadow-2xl transition-all ${isGenerating ? 'bg-white/5 text-white/20' : 'btn-primary'}`}
                  >
                    {isGenerating ? <Activity size={20} className="animate-spin" /> : <ChevronRight size={20} />}
                    {isGenerating ? 'ORCHESTRATING...' : 'GENERATE VOICE'}
                  </motion.button>
                </div>
              </div>
          </div>

          {/* REAL-TIME AUDIO PLAYER & WAVEFORM */}
          <div className="space-y-6 flex flex-col">
            <div className="flex justify-between items-end px-2">
               <label className="text-xs font-black text-white/20 uppercase tracking-[0.3em]">Output Monitor</label>
               <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">{isGenerating ? "ACTIVE" : "STANDBY"}</span>
            </div>
            
            <div className="glass-card flex-1 border border-white/5 flex flex-col justify-center gap-10 p-10 relative overflow-hidden">
              {/* Animated Waveform Visualizer */}
              <div className="relative z-10 w-full flex flex-col items-center gap-8">
                <WaveformVisualizer isActive={isGenerating} />
                
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div 
                      key="progress"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="w-full space-y-3"
                    >
                      <div className="flex justify-between text-[10px] font-black text-primary uppercase tracking-[0.2em] gap-4 items-center">
                        <span className="truncate max-w-[65%]">{generationStatus || 'Orchestrating...'}</span>
                        {isPlayingChunks && (
                          <button 
                            onClick={stopChunkPlayback}
                            className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-black rounded-lg hover:bg-red-500/20 transition-all uppercase tracking-widest shrink-0"
                          >
                            Mute Playback
                          </button>
                        )}
                        <span className="shrink-0">{Math.round(generationProgress)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-primary to-secondary shadow-[0_0_15px_rgba(58,223,250,0.6)]"
                          style={{ width: `${generationProgress}%` }}
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="controls"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="w-full"
                    >
                      {history[0] ? (
                        <div className="flex flex-col items-center gap-6 w-full py-6">
                          <button 
                            onClick={() => {
                              const id = `gen_${history[0].id}`;
                              if (nowPlaying?.id === id) {
                                setIsGlobalPlaying(!isGlobalPlaying);
                              } else {
                                setNowPlaying({
                                  url: history[0].url,
                                  id: id,
                                  title: "Synthesis Result",
                                  subtext: history[0].text
                                });
                                setIsGlobalPlaying(true);
                              }
                            }}
                            className={`w-20 h-20 rounded-3xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] group ${nowPlaying?.id === `gen_${history[0].id}` ? 'bg-primary text-white shadow-[0_0_40px_rgba(186,158,255,0.4)]' : 'bg-white text-black'}`}
                          >
                            {nowPlaying?.id === `gen_${history[0].id}` && isGlobalPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
                          </button>
                          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Click to preview master</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4 text-white/10 py-10">
                          <WaveformIcon size={48} strokeWidth={1} />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em]">Awaiting Synthesis</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Decorative Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
