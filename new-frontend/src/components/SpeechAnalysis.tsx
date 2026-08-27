import React from 'react';
import type { SpeechMetrics } from '../types';
import { Mic } from 'lucide-react';

interface SpeechAnalysisProps {
    metrics: SpeechMetrics;
}

const SpeechAnalysis: React.FC<SpeechAnalysisProps> = ({ metrics }) => {
    // Build coordinates for a smooth SVG pitch curve
    const generateSvgPath = (points: number[]) => {
        if (!points || points.length === 0) return '';
        const width = 280;
        const height = 30;
        const step = width / (points.length - 1);

        return points.map((p, index) => {
            const x = (index * step).toFixed(1);
            // Map score (0-100) to height (0-30). Invert y since SVG (0,0) is top-left
            const y = (height - (p / 100) * height).toFixed(1);
            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
    };

    return (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm shadow-slate-100/30 flex flex-col justify-between h-full select-none">
            <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100/60">
                    <div>
                        <h3 className="font-display font-bold text-base text-slate-800">
                            Speech Analytics
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5 font-light">
                            Real-time acoustics, stress and pitch-tremor evaluation
                        </p>
                    </div>
                    <Mic size={16} className="text-slate-400" />
                </div>

                {/* 2-Column Grid of Speech Metrics */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-6">
                    <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400/90 tracking-wider">Speaking Rate</span>
                        <p className="text-sm font-semibold text-slate-700 mt-1 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${metrics.speakingRate === 'Elevated' ? 'bg-orange-500' : 'bg-emerald-500'}`}></span>
                            {metrics.speakingRate}
                        </p>
                    </div>

                    <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400/90 tracking-wider">Pause Frequency</span>
                        <p className="text-sm font-semibold text-slate-700 mt-1 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${metrics.pauseFrequency === 'High' ? 'bg-orange-500' : 'bg-amber-500'}`}></span>
                            {metrics.pauseFrequency}
                        </p>
                    </div>

                    <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400/90 tracking-wider">Long Hesitancy Pauses</span>
                        <p className="text-sm font-semibold text-slate-700 mt-1">
                            <span className="font-mono font-bold text-slate-800">{metrics.longPauses}</span> instances
                        </p>
                    </div>

                    <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400/90 tracking-wider">Pitch Variation</span>
                        <p className="text-sm font-semibold text-slate-700 mt-1 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            {metrics.pitchVariation}
                        </p>
                    </div>
                </div>

                {/* Custom Visualizations */}
                <div className="space-y-5 border-t border-slate-100 pt-5">

                    {/* Pitch Variation Sparkline */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-medium">
                            <span className="text-slate-500 uppercase tracking-wider">Pitch Frequency Variation</span>
                            <span className="font-mono text-slate-400">ACOUSTIC CURVE</span>
                        </div>

                        <div className="h-10 bg-slate-50 rounded-xl border border-slate-100/50 flex items-center px-4 relative overflow-hidden">
                            <svg className="w-full h-8 overflow-visible" viewBox="0 0 280 30">
                                {/* Horizontal guide line */}
                                <line x1="0" y1="15" x2="280" y2="15" stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="3,3" />

                                {/* Sparkline curve */}
                                <path
                                    d={generateSvgPath(metrics.pitchWaveform)}
                                    fill="none"
                                    stroke="#0d9488"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="transition-all"
                                />
                            </svg>
                        </div>
                    </div>

                    {/* Pause Cadence Sequence */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-medium">
                            <span className="text-slate-500 uppercase tracking-wider">Pause Cadence & gaps</span>
                            <span className="font-mono text-slate-400">{metrics.longPauses} PAUSES</span>
                        </div>

                        {/* Render sequence code: e.g. ● ●    ●     ●●      ● */}
                        <div className="h-8 bg-slate-50 rounded-xl border border-slate-100/50 flex items-center px-4 justify-between gap-1.5 select-none font-mono">
                            {metrics.pauseSequence.map((isPause, idx) => (
                                <span
                                    key={idx}
                                    className={`text-base leading-none transition-all ${isPause ? 'text-teal-600 font-extrabold transform scale-120' : 'text-slate-200'
                                        }`}
                                    title={isPause ? 'Pause recorded' : 'Vocalized'}
                                >
                                    ●
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Speech Stress progress bar */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-medium">
                            <span className="text-slate-500 uppercase tracking-wider">Speech Stress Pressure</span>
                            <span className="font-mono text-teal-700 font-bold">{metrics.speechStressValue}%</span>
                        </div>

                        <div className="relative h-6 bg-slate-100 rounded-xl overflow-hidden border border-slate-200/50 flex items-center">
                            <div
                                className="h-full bg-gradient-to-r from-teal-500 to-teal-600 transition-all duration-1000 ease-out"
                                style={{ width: `${metrics.speechStressValue}%` }}
                            />
                            <span className="absolute right-3 text-[9px] font-bold text-slate-400 font-mono">
                                █████████████░░
                            </span>
                        </div>
                    </div>

                </div>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-6 flex justify-between items-center text-xs text-slate-400 leading-none">
                <span className="font-mono uppercase font-semibold">Primary emotion:</span>
                <span className="font-semibold text-orange-600">{metrics.emotionalSignal}</span>
            </div>
        </div>
    );
};

export default SpeechAnalysis;
