import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { 
  Play, Pause, Volume2, VolumeX, FastForward, 
  RotateCcw, X, Music, Download 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GlobalPlayer = ({ clip, onClear, isPlaying, setIsPlaying }) => {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4];

  useEffect(() => {
    if (!containerRef.current || !clip) return;

    const timer = setTimeout(() => {
      wavesurferRef.current = WaveSurfer.create({
        container: containerRef.current,
        waveColor: 'rgba(186, 158, 255, 0.1)',
        progressColor: '#3adffa',
        cursorColor: '#ba9eff',
        barWidth: 2,
        barGap: 3,
        barRadius: 2,
        height: 32,
        normalize: true,
        responsive: true,
        hideScrollbar: true,
      });

      wavesurferRef.current.load(clip.url);

      wavesurferRef.current.on('ready', () => {
        setDuration(wavesurferRef.current.getDuration());
        wavesurferRef.current.play();
      });

      wavesurferRef.current.on('play', () => setIsPlaying(true));
      wavesurferRef.current.on('pause', () => setIsPlaying(false));
      wavesurferRef.current.on('finish', () => setIsPlaying(false));
      wavesurferRef.current.on('audioprocess', () => {
        setCurrentTime(wavesurferRef.current.getCurrentTime());
      });
    }, 150);

    return () => {
      clearTimeout(timer);
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [clip?.url]);

  useEffect(() => {
    if (wavesurferRef.current) {
      if (isPlaying && !wavesurferRef.current.isPlaying()) {
        wavesurferRef.current.play();
      } else if (!isPlaying && wavesurferRef.current.isPlaying()) {
        wavesurferRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!clip) return null;

  return (
    <motion.div
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      exit={{ y: 80 }}
      className="absolute bottom-0 left-0 w-full z-[100] bg-black/60 backdrop-blur-3xl border-t border-white/5"
    >
      <div className="max-w-[1600px] mx-auto h-20 px-6 flex items-center justify-between gap-8">
        
        {/* LEFT: INFO */}
        <div className="flex items-center gap-4 min-w-0 w-72 shrink-0">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shrink-0 shadow-[0_0_20px_rgba(186,158,255,0.1)]">
            <Music size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] truncate">{clip.title || 'Playing'}</h4>
            <p className="text-[10px] font-bold text-white/20 truncate uppercase tracking-widest mt-1">{clip.subtext || 'Audio Stream'}</p>
          </div>
        </div>

        {/* CENTER: TRANSPORT & WAVEFORM */}
        <div className="flex-1 flex items-center gap-8 min-w-0">
          <button
            onClick={togglePlay}
            className="w-12 h-12 bg-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shrink-0 group"
          >
            {isPlaying ? (
              <Pause size={20} className="text-black fill-black" />
            ) : (
              <Play size={20} className="text-black fill-black ml-1" />
            )}
          </button>

          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <div className="flex justify-between text-[9px] font-black text-white/10 uppercase tracking-[0.3em]">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div ref={containerRef} className="w-full h-8 opacity-60 hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* RIGHT: CONTROLS */}
        <div className="flex items-center gap-6 shrink-0">
          <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/5 relative">
            <button
              onMouseEnter={() => setShowSpeedMenu(true)}
              onMouseLeave={() => setShowSpeedMenu(false)}
              className="px-4 py-2 text-[10px] font-black text-white/70 hover:text-white transition-all flex items-center gap-2"
            >
              <FastForward size={14} className="text-primary" />
              {playbackRate}x
              
              <AnimatePresence>
                {showSpeedMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-2 bg-[#1a1a1c] border border-white/10 rounded-2xl p-2 min-w-[120px] shadow-2xl backdrop-blur-xl z-[110] grid grid-cols-2 gap-1"
                  >
                    <div className="col-span-2 px-2 py-1 mb-1 border-b border-white/5">
                      <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Playback Speed</span>
                    </div>
                    {speedOptions.map(rate => (
                      <button
                        key={rate}
                        onClick={() => {
                          setPlaybackRate(rate);
                          setShowSpeedMenu(false);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all text-left hover:bg-primary/20 ${playbackRate === rate ? 'bg-primary text-white' : 'text-white/40 hover:text-white'}`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
            <div className="w-px h-4 bg-white/10" />
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 text-white/40 hover:text-white transition-all ml-1"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>

          <a 
            href={clip.url} 
            download="aura_audio.wav"
            className="p-3 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-white/5"
          >
            <Download size={18} />
          </a>

          <button
            onClick={onClear}
            className="p-2 text-white/10 hover:text-red-400 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

      </div>
    </motion.div>
  );
};

export default GlobalPlayer;
