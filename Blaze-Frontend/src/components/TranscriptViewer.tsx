import React, { useState } from 'react';
import type { TranscriptItem } from '../types';
import { Play, AlertCircle, Quote, Languages, RefreshCw } from 'lucide-react';

interface TranscriptViewerProps {
    transcript: TranscriptItem[];
    translatedTranscript?: TranscriptItem[];
    language?: string;
    onSelectTime: (seconds: number) => void;
    activeTime: number; // current time in seconds of AudioPlayer
}

const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
    transcript,
    translatedTranscript,
    language = 'Hindi',
    onSelectTime,
    activeTime
}) => {
    const [showEnglish, setShowEnglish] = useState(false);

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

    const isNonEnglish = language && !language.toLowerCase().includes('english') && !language.toLowerCase().startsWith('en');
    const hasTranslation = translatedTranscript && translatedTranscript.length > 0;
    const currentList = (showEnglish && hasTranslation) ? translatedTranscript : transcript;

    return (
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col h-[520px] select-none text-zinc-900">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 gap-3">
                <div>
                    <h3 className="font-display font-medium text-base text-black">
                        Interaction Transcript
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5 font-light">
                        {showEnglish ? 'Showing in-place English translation' : 'AI-annotated narrative highlighting key distress indicators'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Translate In-Place Toggle Button */}
                    {isNonEnglish && (
                        <button
                            onClick={() => setShowEnglish(!showEnglish)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                                showEnglish
                                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                            }`}
                            title="Toggle in-place English translation"
                        >
                            {showEnglish ? (
                                <>
                                    <RefreshCw size={11} className="rotate-45" />
                                    <span>Show Original ({language.split(' ')[0]})</span>
                                </>
                            ) : (
                                <>
                                    <Languages size={12} />
                                    <span>Translate to English</span>
                                </>
                            )}
                        </button>
                    )}

                    <span className="text-[10px] font-mono bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-full text-zinc-600 font-semibold uppercase tracking-wider">
                        {showEnglish ? 'EN TRANSLATED' : (language.toUpperCase())}
                    </span>
                </div>
            </div>

            {/* Transcript Scrolling area */}
            <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4">
                {currentList.map((item, idx) => {
                    const itemSeconds = parseTimestamp(item.timestamp);
                    const isActivelyPlaying = activeTime >= itemSeconds &&
                        (idx === currentList.length - 1 || activeTime < parseTimestamp(currentList[idx + 1].timestamp));

                    return (
                        <div
                            key={idx}
                            className={`p-4 rounded-2xl border transition-all ${isActivelyPlaying
                                ? 'bg-zinc-50 border-zinc-300 shadow-xs ring-1 ring-zinc-200'
                                : 'bg-white border-zinc-100 hover:border-zinc-200'
                                }`}
                        >
                            {/* Speaker & Timestamp controls */}
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-[11px] uppercase tracking-wider font-semibold font-mono ${
                                    item.speaker === 'Caller' ? 'text-zinc-500' : 'text-teal-700'
                                }`}>
                                    {item.speaker} {showEnglish && <span className="text-[9px] text-zinc-400 lowercase">(translated)</span>}
                                </span>

                                <button
                                    onClick={() => onSelectTime(itemSeconds)}
                                    className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 hover:text-black transition-colors font-mono cursor-pointer bg-zinc-50 hover:bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200"
                                    aria-label={`Jump audio player to timestamp ${item.timestamp}`}
                                >
                                    <Play size={9} fill="currentColor" />
                                    <span>{item.timestamp}</span>
                                </button>
                            </div>

                            {/* Text Narrative */}
                            <p className="text-sm leading-relaxed text-zinc-800 font-normal">
                                {item.text}
                            </p>

                            {/* Detected Indicator Badge */}
                            {item.indicator && (
                                <div className="mt-3 flex items-center justify-between">
                                    <div className={`tag border inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs leading-none transition-all ${getIndicatorColor(item.indicator.type)}`}>
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
            <div className="mt-4 border-t border-zinc-100 pt-4 flex items-center justify-between text-[11px] text-zinc-400 font-light pr-1">
                <span className="flex items-center gap-1">
                    <Quote size={12} />
                    Click timestamps to seek audio playback in real-time
                </span>
                {isNonEnglish && (
                    <span className="text-[10px] text-zinc-400 font-mono">
                        Multi-dialect Indic NMT Active
                    </span>
                )}
            </div>

        </div>
    );
};

export default TranscriptViewer;
