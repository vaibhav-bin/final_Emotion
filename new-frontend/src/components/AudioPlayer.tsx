import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Music } from 'lucide-react';
import Waveform from './Waveform';

interface AudioPlayerProps {
    waveform: number[];
    durationSec: number; // Duration of case call in seconds
    onTimeUpdate: (time: number) => void;
    seekTime: number; // Prop to force seeking from outside (e.g. clicking transcript)
    audioUrl?: string; // Real audio stream URL
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ waveform, durationSec, onTimeUpdate, seekTime, audioUrl }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [actualDuration, setActualDuration] = useState(durationSec);
    const [speed, setSpeed] = useState(1);
    const [muted, setMuted] = useState(false);
    const [hasAudioSource, setHasAudioSource] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        if (audioUrl) {
            setHasAudioSource(true);
        }
    }, [audioUrl]);

    // Sync with external seek request (e.g. clicking transcript timestamp)
    useEffect(() => {
        if (seekTime >= 0) {
            setCurrentTime(seekTime);
            onTimeUpdate(seekTime);
            if (audioRef.current && hasAudioSource) {
                audioRef.current.currentTime = seekTime;
            }
        }
    }, [seekTime, onTimeUpdate, hasAudioSource]);

    // Handle HTML5 Audio element setup
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            const cur = Math.round(audio.currentTime);
            setCurrentTime(cur);
            onTimeUpdate(cur);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            onTimeUpdate(0);
        };

        const handleLoadedMetadata = () => {
            if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
                setActualDuration(Math.round(audio.duration));
            }
            setHasAudioSource(true);
        };

        const handleError = () => {
            // If real audio fails or is missing, fall back to timer simulation seamlessly
            console.warn('Audio stream not reachable, falling back to simulated playback.');
            setHasAudioSource(false);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('error', handleError);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('error', handleError);
        };
    }, [onTimeUpdate]);

    // Fallback simulation timer when real audio isn't available
    useEffect(() => {
        if (isPlaying && !hasAudioSource) {
            const intervalMs = 1000 / speed;
            timerRef.current = window.setInterval(() => {
                setCurrentTime((prev) => {
                    if (prev >= actualDuration) {
                        setIsPlaying(false);
                        if (timerRef.current) clearInterval(timerRef.current);
                        return actualDuration;
                    }
                    const next = prev + 1;
                    onTimeUpdate(next);
                    return next;
                });
            }, intervalMs);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPlaying, hasAudioSource, actualDuration, speed, onTimeUpdate]);

    const togglePlay = () => {
        if (audioRef.current && hasAudioSource) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play().then(() => {
                    setIsPlaying(true);
                }).catch((err) => {
                    console.warn('Audio play prevented or missing:', err);
                    setHasAudioSource(false);
                    setIsPlaying(true);
                });
            }
        } else {
            setIsPlaying(!isPlaying);
        }
    };

    const handleReset = () => {
        if (audioRef.current && hasAudioSource) {
            audioRef.current.currentTime = 0;
            audioRef.current.pause();
        }
        setCurrentTime(0);
        onTimeUpdate(0);
        setIsPlaying(false);
    };

    const handleSeek = (time: number) => {
        const rounded = Math.round(time);
        if (audioRef.current && hasAudioSource) {
            audioRef.current.currentTime = rounded;
        }
        setCurrentTime(rounded);
        onTimeUpdate(rounded);
    };

    const handleSpeedChange = (val: number) => {
        setSpeed(val);
        if (audioRef.current) {
            audioRef.current.playbackRate = val;
        }
    };

    const toggleMute = () => {
        const next = !muted;
        setMuted(next);
        if (audioRef.current) {
            audioRef.current.muted = next;
        }
    };

    return (
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-4">
            {/* Hidden HTML5 Audio Element */}
            {audioUrl && (
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    preload="auto"
                />
            )}

            {/* Waveform Player component */}
            <Waveform
                waveform={waveform}
                currentTime={currentTime}
                duration={actualDuration || durationSec}
                onSeek={handleSeek}
            />

            {/* Scrubber Controls */}
            <div className="flex items-center justify-between border-t border-zinc-100 pt-4 gap-4 flex-wrap sm:flex-nowrap">
                {/* Play/Pause controls */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={togglePlay}
                        className="w-10 h-10 rounded-full bg-zinc-900 hover:bg-black active:scale-95 text-white flex items-center justify-center transition-all shadow-md cursor-pointer"
                        aria-label={isPlaying ? 'Pause call playback' : 'Play call playback'}
                    >
                        {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="ml-0.5" />}
                    </button>

                    <button
                        onClick={handleReset}
                        className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
                        aria-label="Restart call audio"
                    >
                        <RotateCcw size={14} />
                    </button>

                    {hasAudioSource && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <Music size={10} />
                            HD Audio Link
                        </span>
                    )}
                </div>

                {/* Speed & Volume Adjustment Controls */}
                <div className="flex items-center gap-4">
                    {/* Audio volume mute togglers */}
                    <button
                        onClick={toggleMute}
                        className="p-1 px-2.5 text-xs text-zinc-600 rounded-full hover:bg-zinc-100 flex items-center gap-1.5 transition-colors border border-zinc-200 cursor-pointer"
                        aria-label={muted ? 'Unmute' : 'Mute'}
                    >
                        {muted ? <VolumeX size={14} className="text-red-500" /> : <Volume2 size={14} />}
                        <span className="hidden sm:inline font-mono text-[10px]">
                            {muted ? 'MUTED' : 'AUDIO ON'}
                        </span>
                    </button>

                    {/* Speed settings */}
                    <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-100 border border-zinc-200 p-0.5 rounded-full">
                        {[1, 1.5, 2].map((val) => (
                            <button
                                key={val}
                                onClick={() => handleSpeedChange(val)}
                                className={`px-2.5 py-0.5 rounded-full font-semibold font-mono text-[10px] transition-colors cursor-pointer ${speed === val
                                    ? 'bg-white text-black shadow-xs font-bold'
                                    : 'hover:text-zinc-700 text-zinc-500'
                                    }`}
                            >
                                {val}x
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AudioPlayer;
