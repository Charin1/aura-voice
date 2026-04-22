import React, { useRef, useState, useEffect } from 'react';
import { 
  Mic, Upload, ChevronRight, RefreshCw, AudioWaveform as WaveformIcon, Activity, Play, Pause, Download
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
  history = []
}) {
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [progress, setProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingReference, setIsPlayingReference] = useState(false);
  const [isPlayingOutput, setIsPlayingOutput] = useState(false);
  const currentAudioRef = useRef(null);

  const togglePlayback = (url, isOutput) => {
    if (!url) return;
    
    // If something is already playing
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      
      // If we clicked the same button that is currently playing, just stop and return
      if ((isOutput && isPlayingOutput) || (!isOutput && isPlayingReference)) {
        setIsPlayingOutput(false);
        setIsPlayingReference(false);
        currentAudioRef.current = null;
        return;
      }
    }

    // Play new audio
    const audio = new Audio(url);
    currentAudioRef.current = audio;
    
    if (isOutput) {
      setIsPlayingOutput(true);
      setIsPlayingReference(false);
      audio.onended = () => setIsPlayingOutput(false);
    } else {
      setIsPlayingReference(true);
      setIsPlayingOutput(false);
      audio.onended = () => setIsPlayingReference(false);
    }
    
    audio.play();
  };

  // Simulate progress when generating
  useEffect(() => {
    let interval;
    if (isGenerating) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(p => {
          if (p >= 95) return 95;
          return p + Math.random() * 5;
        });
      }, 300);
    } else {
      setProgress(100);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

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
    <div className="flex-1 flex flex-col p-12 gap-12 z-10 relative overflow-y-auto no-scrollbar">
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
                    onClick={() => togglePlayback(referenceUrl, false)}
                    className={`w-16 h-16 rounded-full flex items-center justify-center border shadow-[0_0_40px_rgba(34,197,94,0.1)] transition-all hover:scale-105 active:scale-95 ${isPlayingReference ? 'bg-green-500/20 border-green-500/50' : 'bg-green-500/10 border-green-500/20'}`}
                  >
                    {isPlayingReference ? <Pause size={32} className="text-green-400" /> : <Play size={32} className="text-green-400 ml-1" />}
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
             <div className="relative group">
               <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="The silent whispers of the machine..."
                className="w-full min-h-[280px] input-glass leading-relaxed resize-none"
               />
               <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSynthesize}
                disabled={isGenerating || !referenceId || !inputText}
                className={`absolute bottom-6 right-6 flex items-center gap-4 py-4 px-10 rounded-2xl font-black shadow-2xl transition-all ${isGenerating ? 'bg-white/5 text-white/20' : 'btn-primary'}`}
               >
                 {isGenerating ? <Activity size={20} className="animate-spin" /> : <ChevronRight size={20} />}
                 {isGenerating ? 'ORCHESTRATING...' : 'GENERATE VOICE'}
               </motion.button>
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
                      <div className="flex justify-between text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                        <span>Orchestrating...</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-primary to-secondary shadow-[0_0_15px_rgba(58,223,250,0.6)]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="controls"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-8"
                    >
                      <button 
                        onClick={() => togglePlayback(history[0]?.url, true)}
                        disabled={!history[0]}
                        className={`w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] ${!history[0] ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isPlayingOutput ? <Pause size={24} className="text-black" /> : <Play size={24} className="text-black ml-1" />}
                      </button>
                      <a 
                        href={history[0]?.url}
                        download={history[0] ? `aura_${history[0].id}.wav` : ''}
                        className={`p-3 transition-colors ${history[0] ? 'text-white/60 hover:text-white' : 'text-white/20 pointer-events-none'}`}
                      >
                        <Download size={20} />
                      </a>
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
