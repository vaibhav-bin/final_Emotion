import React, { useState, useEffect } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface ProcessingPipelineProps {
    onComplete: () => void;
    isStarted: boolean;
}

const STAGES = [
    'VOICE RECEIVED',
    'LANGUAGE IDENTIFIED',
    'SPEECH TRANSCRIBED',
    'SPEECH PATTERNS ANALYSED',
    'EMOTIONAL INDICATORS ANALYSED',
    'TRAUMA INDICATORS ANALYSED',
    'VULNERABILITY ASSESSED',
    'GENERATING SVI'
];

const ProcessingPipeline: React.FC<ProcessingPipelineProps> = ({ onComplete, isStarted }) => {
    const [currentIdx, setCurrentIdx] = useState(-1);

    useEffect(() => {
        if (!isStarted) return;

        // Start at index 0
        setCurrentIdx(0);
    }, [isStarted]);

    useEffect(() => {
        if (currentIdx === -1) return;

        if (currentIdx < STAGES.length) {
            const timer = setTimeout(() => {
                setCurrentIdx(prev => prev + 1);
            }, 750); // Speed of the automated parser sequence (750ms per stage)

            return () => clearTimeout(timer);
        } else {
            // Completed last stage! Trigger callback
            onComplete();
        }
    }, [currentIdx, onComplete]);

    if (!isStarted) return null;

    return (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm shadow-slate-100/30 max-w-md w-full mx-auto animate-fade-in select-none">
            <div className="flex items-center gap-2.5 mb-6">
                <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
                <h3 className="font-display font-semibold text-slate-800 text-sm">
                    Processing AI Assessment Pipeline
                </h3>
            </div>

            <div className="space-y-4">
                {STAGES.map((stage, index) => {
                    const isDone = index < currentIdx;
                    const isActive = index === currentIdx;
                    const isPending = index > currentIdx;

                    return (
                        <div
                            key={stage}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${isActive
                                ? 'bg-teal-50/40 border-teal-200 text-slate-800 scale-[1.01] shadow-xs'
                                : isDone
                                    ? 'bg-slate-50/50 border-slate-100 text-slate-500'
                                    : 'bg-white border-transparent text-slate-350'
                                }`}
                        >
                            <span className={`text-xs font-mono font-semibold tracking-wider ${isActive ? 'text-teal-700' : ''}`}>
                                {stage}
                            </span>

                            <div className="flex items-center">
                                {isDone && (
                                    <CheckCircle2 size={16} className="text-emerald-500 stroke-[2.5]" />
                                )}
                                {isActive && (
                                    <span className="w-2 h-2 bg-teal-500 rounded-full animate-ping"></span>
                                )}
                                {isPending && (
                                    <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 text-center">
                <p className="text-[10px] text-slate-400 font-mono tracking-wide uppercase">
                    {currentIdx < STAGES.length ? 'Analysing acoustic parameters...' : 'Assessment complete.'}
                </p>
            </div>
        </div>
    );
};

export default ProcessingPipeline;
