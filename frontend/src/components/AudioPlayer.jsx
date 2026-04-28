import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, FastForward, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AudioPlayer = ({ url, onDownload }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Reset state when URL changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [url]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
  };

  return (
    <div className="w-full space-y-6">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Seek Bar */}
      <div className="space-y-2">
        <div className="relative h-2 group">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full appearance-none bg-white/5 rounded-full cursor-pointer z-20 outline-none
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                       [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,255,255,0.5)]
                       [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
          />
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-secondary rounded-full pointer-events-none z-10 shadow-[0_0_15px_rgba(186,158,255,0.4)]"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={togglePlay}
            className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] group"
          >
            {isPlaying ? (
              <Pause size={24} className="text-black fill-black" />
            ) : (
              <Play size={24} className="text-black fill-black ml-1" />
            )}
          </button>

          <button
            onClick={() => { audioRef.current.currentTime = 0; }}
            className="p-2 text-white/40 hover:text-white transition-colors"
            title="Restart"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Speed Control */}
          <button
            onClick={cyclePlaybackRate}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all group"
          >
            <FastForward size={16} className="text-primary/60 group-hover:text-primary" />
            <span className="text-[11px] font-black text-white/70">{playbackRate}x</span>
          </button>

          {/* Volume Control */}
          <div 
            className="relative"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all text-white/60 hover:text-white"
            >
              {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            
            <AnimatePresence>
              {showVolumeSlider && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-surface-highest/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-3 shadow-2xl z-50"
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-24 h-1 appearance-none bg-white/10 rounded-full cursor-pointer outline-none
                               [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                               [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full"
                  />
                  <span className="text-[10px] font-bold text-white/40 w-8">{Math.round(volume * 100)}%</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
