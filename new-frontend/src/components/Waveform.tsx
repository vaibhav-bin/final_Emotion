import React, { useRef } from 'react';
import type { MouseEvent } from 'react';

interface WaveformProps {
    waveform: number[];
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
}

const Waveform: React.FC<WaveformProps> = ({ waveform, currentTime, duration, onSeek }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    const handleClick = (e: MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current || duration === 0) return;

        const rect = containerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;

        const ratio = clickX / width;
        const seekTime = ratio * duration;

        onSeek(seekTime);
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return '00:00';
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-3 select-none w-full">
            {/* Waveform Visualization Bars */}
            <div
                ref={containerRef}
                onClick={handleClick}
                className="h-20 flex items-end justify-between gap-[3px] cursor-pointer group/wave relative py-2"
                role="slider"
                aria-label="Audio timeline track scrubber"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={currentTime}
            >
                {/* Hover Highlight Layer */}
                <div className="absolute inset-y-0 left-0 bg-black/5 group-hover/wave:block hidden pointer-events-none transition-all rounded-xl" />

                {waveform.map((height, index) => {
                    const barPercent = (index / waveform.length) * 100;
                    const isPlayed = barPercent <= progressPercent;

                    return (
                        <div
                            key={index}
                            className={`w-full rounded-sm transition-all duration-300 ${isPlayed
                                ? 'bg-zinc-900 group-hover/wave:bg-black shadow-[0_0_8px_rgba(0,0,0,0.1)]'
                                : 'bg-zinc-200'
                                }`}
                            style={{
                                height: `${Math.max(height, 8)}%`,
                                // Scale highlight on played bars when hovered
                                transform: isPlayed ? 'scaleY(1.1)' : 'none',
                            }}
                        />
                    );
                })}
            </div>

            {/* Scrubber Navigation details */}
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 font-semibold px-1 tracking-widest uppercase">
                <span className="text-black">{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
            </div>
        </div>
    );
};

export default Waveform;
