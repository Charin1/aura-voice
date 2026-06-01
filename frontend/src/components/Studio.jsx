import React, { useRef, useState, useEffect } from 'react';
import { 
  Mic, Upload, ChevronRight, RefreshCw, AudioWaveform as WaveformIcon, Activity, Play, Pause, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

const MarkdownPreview = ({ text }) => {
  const parseMarkdown = (markdownText) => {
    if (!markdownText) return [];
    
    // Split into paragraphs/blocks by double newlines
    const blocks = markdownText.split(/\n\n+/);
    
    return blocks.map((block, index) => {
      const trimmedBlock = block.trim();
      
      // Horizontal Rule
      if (trimmedBlock === '---' || trimmedBlock === '***' || trimmedBlock === '___') {
        return <hr key={index} className="border-white/10 my-6" />;
      }
      
      // Headers
      if (trimmedBlock.startsWith('# ')) {
        return (
          <h1 key={index} className="text-3xl font-black font-headline text-white mt-6 mb-3 tracking-tight border-b border-white/5 pb-2">
            {renderInline(trimmedBlock.substring(2))}
          </h1>
        );
      }
      if (trimmedBlock.startsWith('## ')) {
        return (
          <h2 key={index} className="text-2xl font-black font-headline text-white mt-5 mb-2.5 tracking-tight">
            {renderInline(trimmedBlock.substring(3))}
          </h2>
        );
      }
      if (trimmedBlock.startsWith('### ')) {
        return (
          <h3 key={index} className="text-xl font-bold font-headline text-white mt-4 mb-2">
            {renderInline(trimmedBlock.substring(4))}
          </h3>
        );
      }
      
      // Blockquote
      if (trimmedBlock.startsWith('>')) {
        const quoteText = trimmedBlock.split('\n').map(line => {
          const l = line.trim();
          return l.startsWith('>') ? l.substring(1).trim() : l;
        }).join('\n');
        
        return (
          <blockquote key={index} className="border-l-4 border-primary/50 bg-white/5 px-4 py-3 rounded-r-xl italic my-4 text-white/80">
            {renderInline(quoteText)}
          </blockquote>
        );
      }
      
      // List (unordered)
      if (trimmedBlock.startsWith('- ') || trimmedBlock.startsWith('* ')) {
        const items = trimmedBlock.split('\n').map(line => {
          const l = line.trim();
          if (l.startsWith('- ')) return l.substring(2);
          if (l.startsWith('* ')) return l.substring(2);
          return l;
        });
        return (
          <ul key={index} className="list-disc pl-6 space-y-1.5 my-3 text-white/80 text-sm">
            {items.map((item, idx) => (
              <li key={idx}>{renderInline(item)}</li>
            ))}
          </ul>
        );
      }

      // List (ordered)
      if (/^\d+\.\s/.test(trimmedBlock)) {
        const items = trimmedBlock.split('\n').map(line => {
          const l = line.trim();
          const match = l.match(/^\d+\.\s(.*)/);
          return match ? match[1] : l;
        });
        return (
          <ol key={index} className="list-decimal pl-6 space-y-1.5 my-3 text-white/80 text-sm">
            {items.map((item, idx) => (
              <li key={idx}>{renderInline(item)}</li>
            ))}
          </ol>
        );
      }
      
      // Regular paragraph
      const lines = trimmedBlock.split('\n');
      return (
        <p key={index} className="text-sm font-medium text-white/70 leading-relaxed mb-4">
          {lines.map((line, lineIdx) => (
            <React.Fragment key={lineIdx}>
              {renderInline(line)}
              {lineIdx < lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );
    });
  };

  const renderInline = (inputText) => {
    let html = inputText;
    
    // Simple HTML escaping to avoid rendering raw HTML tags
    html = html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Replace Bold: **text** or __text__
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Replace Italic: *text* or _text_
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    // Replace Inline Code: `text`
    html = html.replace(/`(.*?)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded font-mono text-xs text-primary">$1</code>');

    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return <div className="space-y-4">{parseMarkdown(text)}</div>;
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
  const [editorMode, setEditorMode] = useState('write');

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

  // Range slider dynamic percentage calculator for custom active track gradients
  const speedPercent = ((speed - 0.5) / 1.5) * 100;
  const tempPercent = ((temperature - 0.1) / 1.1) * 100;
  const cfgPercent = ((cfgStrength - 1.0) / 3.0) * 100;

  return (
    <div className="flex-1 flex flex-col px-12 pt-12 pb-56 gap-12 z-10 relative overflow-y-auto no-scrollbar">
      <header className="flex justify-between items-start">
        <div className="space-y-1">
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-black tracking-tighter mb-2 font-headline bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/70"
          >
            Voice Studio
          </motion.h2>
          <p className="text-white/60 text-[15px] font-normal leading-relaxed max-w-md">
            Craft the <span className="text-primary font-black italic">ethereal echo</span> of any voice with machine precision.
          </p>
        </div>
        <button 
          onClick={() => { setReferenceId(null); setTranscript(''); setInputText(''); }}
          title="Clear session"
          className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 hover:border-white/15 transition-all hover:scale-105 active:scale-95 group shadow-lg"
        >
          <RefreshCw size={20} className="text-white/60 group-hover:text-white transition-colors" />
        </button>
      </header>

      <section className="space-y-12 max-w-5xl">
        {/* UPLOAD / RECORD */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-[32px] blur-xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative glass-card !p-12 border-dashed border-2 border-white/15 hover:border-primary/30 flex flex-col items-center justify-center min-h-[280px] text-center gap-6 transition-all duration-300">
            {referenceId ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-xl bg-black/40 border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 shadow-2xl relative overflow-hidden"
              >
                {/* Ambient glow inside card */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
                
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
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all hover:scale-105 active:scale-95 shrink-0 ${nowPlaying?.id === 'reference' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'}`}
                >
                  {nowPlaying?.id === 'reference' && isGlobalPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                </button>
                
                <div className="flex-1 text-left space-y-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black uppercase tracking-wider text-white">Captured Reference</p>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                      <Sparkles size={8} /> Active
                    </span>
                  </div>
                  <p className="text-xs text-white/50 font-medium font-mono uppercase tracking-widest">ID: {referenceId.substring(0, 8)}...</p>
                  <div className="max-h-16 overflow-y-auto custom-scrollbar pr-1 py-1">
                    <p className="text-xs text-white/70 italic leading-relaxed">"{transcript}"</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => { setReferenceId(null); setTranscript(''); }}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 hover:border-red-500/30 transition-all shrink-0 sm:self-start sm:ml-auto"
                >
                  Replace
                </button>
              </motion.div>
            ) : (
              <>
                <div className="flex gap-8">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center border border-white/5 hover:border-primary/40 hover:bg-primary/5 cursor-pointer group transition-all duration-500 shadow-md hover:shadow-[0_0_20px_rgba(186,158,255,0.15)]"
                  >
                    <Upload size={28} className="text-white/60 group-hover:text-primary group-hover:scale-105 transition-all" />
                  </div>
                  <div 
                    onClick={toggleRecording}
                    className={`w-20 h-20 rounded-3xl flex items-center justify-center border cursor-pointer transition-all duration-500 shadow-md ${isRecording ? 'bg-red-500/20 border-red-500/50 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'bg-white/5 border-white/5 hover:border-secondary/40 hover:bg-secondary/5 group'}`}
                  >
                    <Mic size={28} className={isRecording ? 'text-red-500' : 'text-white/60 group-hover:text-secondary group-hover:scale-105 transition-all'} />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-bold font-headline text-white/90">{isRecording ? "Recording Audio..." : "Upload or Record Reference"}</p>
                  <p className="text-xs text-white/50 font-semibold max-w-sm mx-auto leading-relaxed">Provide 6-10 seconds of clear vocal resonance. F5-TTS works best with 8-15s, XTTS with 6-10s.</p>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={handleFileUpload} />
              </>
            )}
            {isUploading && <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center rounded-2xl gap-4 z-20">
              <Activity size={40} className="animate-spin text-primary" />
              <p className="text-xs font-black tracking-[0.25em] text-primary/95 uppercase">Analyzing Voice Alignment...</p>
            </div>}
          </div>
        </div>

        {/* TEXT INPUT AND SYNTHESIS PROGRESS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
             <div className="flex justify-between items-end px-2">
               <label className="text-xs font-extrabold text-white/60 uppercase tracking-[0.2em]">Synthesis parameters</label>
               <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{inputText.length} / 1000 Tokens</span>
             </div>
             
             {/* Slider Controls */}
             <div className="flex flex-col sm:flex-row gap-6 bg-white/5 p-5 rounded-2xl border border-white/5 shadow-inner">
               {/* Speed Control */}
               <div className="flex-1 space-y-3">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/50">
                   <span>Speed</span>
                   <span className="px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-black shadow-sm">{speed.toFixed(1)}x</span>
                 </div>
                 <input 
                   type="range" 
                   min="0.5" 
                   max="2.0" 
                   step="0.1" 
                   value={speed} 
                   onChange={(e) => setSpeed(parseFloat(e.target.value))}
                   className="w-full cursor-pointer"
                   style={{
                     background: `linear-gradient(to right, #ba9eff 0%, #ba9eff ${speedPercent}%, rgba(255, 255, 255, 0.08) ${speedPercent}%, rgba(255, 255, 255, 0.08) 100%)`
                   }}
                 />
                 <p className="text-[10px] text-white/40 italic leading-snug">Tempo: controls speed of synthesis.</p>
               </div>
               
               {activeModel === 'xtts' ? (
                 /* Temperature Control for XTTS */
                 <div className="flex-1 space-y-3">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/50">
                     <span>Temperature</span>
                     <span className="px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-black shadow-sm">{temperature.toFixed(2)}</span>
                   </div>
                   <input 
                     type="range" 
                     min="0.1" 
                     max="1.2" 
                     step="0.05" 
                     value={temperature} 
                     onChange={(e) => setTemperature(parseFloat(e.target.value))}
                     className="w-full cursor-pointer"
                     style={{
                       background: `linear-gradient(to right, #ba9eff 0%, #ba9eff ${tempPercent}%, rgba(255, 255, 255, 0.08) ${tempPercent}%, rgba(255, 255, 255, 0.08) 100%)`
                     }}
                   />
                   <p className="text-[10px] text-white/40 italic leading-snug">Creativity: controls variation and expressiveness.</p>
                 </div>
               ) : (
                 /* Guidance Control for F5 */
                 <div className="flex-1 space-y-3">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/50">
                     <span>Guidance Scale</span>
                     <span className="px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-black shadow-sm">{cfgStrength.toFixed(1)}</span>
                   </div>
                   <input 
                     type="range" 
                     min="1.0" 
                     max="4.0" 
                     step="0.1" 
                     value={cfgStrength} 
                     onChange={(e) => setCfgStrength(parseFloat(e.target.value))}
                     className="w-full cursor-pointer"
                     style={{
                       background: `linear-gradient(to right, #ba9eff 0%, #ba9eff ${cfgPercent}%, rgba(255, 255, 255, 0.08) ${cfgPercent}%, rgba(255, 255, 255, 0.08) 100%)`
                     }}
                   />
                   <p className="text-[10px] text-white/40 italic leading-snug">Adherence: controls prompt alignment vs variation.</p>
                 </div>
               )}
             </div>

              <div className="flex flex-col gap-4">
                 <div className="flex justify-between items-center px-1">
                   <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                     <button 
                       onClick={() => setEditorMode('write')}
                       className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${editorMode === 'write' ? 'bg-primary/20 text-primary border border-primary/20' : 'text-white/40 hover:text-white/70'}`}
                     >
                       Write
                     </button>
                     <button 
                       onClick={() => setEditorMode('preview')}
                       className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${editorMode === 'preview' ? 'bg-primary/20 text-primary border border-primary/20' : 'text-white/40 hover:text-white/70'}`}
                     >
                       Preview
                     </button>
                   </div>
                 </div>

                 {editorMode === 'write' ? (
                   <textarea 
                     value={inputText}
                     onChange={(e) => setInputText(e.target.value)}
                     placeholder="Enter the text for synthesis here... (Markdown supported)"
                     className="w-full min-h-[280px] input-glass leading-relaxed resize-none border border-white/5 focus:border-primary/30 transition-all duration-300 placeholder:text-white/40"
                   />
                 ) : (
                   <div className="w-full min-h-[280px] max-h-[400px] overflow-y-auto custom-scrollbar input-glass leading-relaxed border border-white/5 pr-2 select-text">
                     {inputText ? (
                       <MarkdownPreview text={inputText} />
                     ) : (
                       <span className="text-white/20 italic text-sm">Nothing to preview. Go to 'Write' tab to add your script.</span>
                     )}
                   </div>
                 )}
                <div className="flex justify-end">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onSynthesizeClick}
                    disabled={isGenerating || !referenceId || !inputText}
                    className={`flex items-center gap-4 py-4 px-10 rounded-2xl font-black shadow-2xl transition-all ${isGenerating ? 'bg-white/5 text-white/20 border border-white/5 cursor-wait' : 'btn-primary'}`}
                  >
                    {isGenerating ? <Activity size={20} className="animate-spin text-white/40" /> : <ChevronRight size={20} />}
                    {isGenerating ? 'ORCHESTRATING...' : 'GENERATE VOICE'}
                  </motion.button>
                </div>
              </div>
          </div>

          {/* REAL-TIME AUDIO PLAYER & WAVEFORM */}
          <div className="space-y-6 flex flex-col">
            <div className="flex justify-between items-end px-2">
               <label className="text-xs font-extrabold text-white/60 uppercase tracking-[0.2em]">Output Monitor</label>
               <span className="text-[10px] font-black text-secondary uppercase tracking-widest">{isGenerating ? "ACTIVE" : "STANDBY"}</span>
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
                      className="w-full space-y-4"
                    >
                      <div className="flex justify-between text-[10px] font-black text-primary uppercase tracking-[0.2em] gap-4 items-center">
                        <span className="truncate max-w-[65%] text-white/80">{generationStatus || 'Orchestrating...'}</span>
                        {isPlayingChunks && (
                          <button 
                            onClick={stopChunkPlayback}
                            className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-black rounded-lg hover:bg-red-500/20 transition-all uppercase tracking-widest shrink-0"
                          >
                            Mute Playback
                          </button>
                        )}
                        <span className="shrink-0 font-mono">{Math.round(generationProgress)}%</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full shadow-[0_0_15px_rgba(58,223,250,0.6)] animate-pulse-slow"
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
                            className={`w-20 h-20 rounded-3xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.05)] group ${nowPlaying?.id === `gen_${history[0].id}` ? 'bg-primary text-white shadow-[0_0_45px_rgba(186,158,255,0.4)]' : 'bg-white text-black'}`}
                          >
                            {nowPlaying?.id === `gen_${history[0].id}` && isGlobalPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
                          </button>
                          <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Click to preview master output</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4 text-white/40 py-10">
                          <WaveformIcon size={44} strokeWidth={1.5} className="text-white/30" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Awaiting Synthesis</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Decorative Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
