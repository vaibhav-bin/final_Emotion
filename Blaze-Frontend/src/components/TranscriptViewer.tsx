import React from 'react';
import type { TranscriptItem } from '../types';
import { Play, AlertCircle, Quote } from 'lucide-react';

interface TranscriptViewerProps {
    transcript: TranscriptItem[];
    onSelectTime: (seconds: number) => void;
    activeTime: number; // current time in seconds of AudioPlayer
}

const TranscriptViewer: React.FC<TranscriptViewerProps> = ({ transcript, onSelectTime, activeTime }) => {

    const parseTimestamp = (ts: string): number => {
        const parts = ts.split(':');
        if (parts.length === 2) {
            return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        }
        return 0;
    };

    const getIndicatorColor = (type: string) => {
        switch (type) {
            case 'fear': return 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100/50';
            case 'intimidation': return 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100/50';
            case 'vulnerability': return 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100/50';
            case 'trauma': return 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100/50';
            case 'depression': return 'bg-indigo-50 border-indigo-200 text-indigo-750 hover:bg-indigo-100/50';
            case 'suicide': return 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100/50';
            default: return 'bg-slate-50 border-slate-200 text-slate-700';
        }
    };

    return (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm shadow-slate-100/30 flex flex-col h-[520px] select-none">

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                    <h3 className="font-display font-bold text-base text-slate-800">
                        Interaction Transcript
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-light">
                        AI-annotated narrative highlighting key distress indicators
                    </p>
                </div>
                <span className="text-[10px] font-mono bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-500 font-semibold">
                    SCROLLING CORRESPONDENCE
                </span>
            </div>

            {/* Transcript Scrolling area */}
            <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4">
                {transcript.map((item, idx) => {
                    const itemSeconds = parseTimestamp(item.timestamp);
                    const isActivelyPlaying = activeTime >= itemSeconds &&
                        (idx === transcript.length - 1 || activeTime < parseTimestamp(transcript[idx + 1].timestamp));

                    return (
                        <div
                            key={idx}
                            className={`p-3.5 rounded-xl border transition-all ${isActivelyPlaying
                                ? 'bg-slate-50/70 border-teal-200 shadow-xs'
                                : 'bg-white border-transparent'
                                }`}
                        >
                            {/* Speaker & Timestamp controls */}
                            <div className="flex items-center justify-between mb-1.5">
                                <span className={`text-[11px] uppercase tracking-wider font-semibold font-mono ${item.speaker === 'Caller' ? 'text-slate-500' : 'text-teal-600'
                                    }`}>
                                    {item.speaker}
                                </span>

                                <button
                                    onClick={() => onSelectTime(itemSeconds)}
                                    className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 hover:text-teal-700 transition-colors font-mono cursor-pointer"
                                    aria-label={`Jump audio player to timestamp ${item.timestamp}`}
                                >
                                    <Play size={10} fill="currentColor" />
                                    <span>{item.timestamp}</span>
                                </button>
                            </div>

                            {/* Text Narrative */}
                            <p className={`text-sm leading-relaxed ${item.speaker === 'Caller' ? 'text-slate-800 font-normal font-sans' : 'text-slate-500 font-light'
                                }`}>
                                {item.text}
                            </p>

                            {/* Detected Indicator Badge Link */}
                            {item.indicator && (
                                <div className="mt-3 flex items-center justify-between">
                                    <div className={`tag border inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs leading-none transition-all cursor-pointer ${getIndicatorColor(item.indicator.type)}`}>
                                        <AlertCircle size={12} className="stroke-[2.5]" />
                                        <span className="font-semibold">{item.indicator.label}</span>
                                        <span className="text-[10px] opacity-75">({item.indicator.severity} RISK)</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Info indicator links */}
            <div className="mt-4 border-t border-slate-100 pt-4 flex items-center justify-between text-[11px] text-slate-400 font-light pr-1">
                <span className="flex items-center gap-1">
                    <Quote size={12} />
                    Click timestamps to seek audio playback
                </span>
            </div>

        </div>
    );
};

export default TranscriptViewer;
