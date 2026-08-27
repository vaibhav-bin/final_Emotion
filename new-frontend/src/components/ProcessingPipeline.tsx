import React, { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';

interface ProcessingPipelineProps {
    onComplete: () => void;
    isStarted: boolean;
}

const STAGES = [
    { label: 'AUDIO NORMALIZATION (16kHz PCM)', model: 'FFmpeg Core' },
    { label: 'SPEECH RECOGNITION & DIALECT', model: 'Sarvam Saaras v3' },
    { label: 'ACOUSTIC PROSODY & JITTER', model: 'Librosa & SciPy' },
    { label: 'SPEECH EMOTION EMBEDDINGS', model: 'emotion2vec+ Large' },
    { label: 'COGNITIVE FORENSIC REASONING', model: 'Local Qwen2.5 Indic LLM' },
    { label: 'STATUTORY SOP SYNTHESIS', model: 'SC/ST PoA Sec 15A / Rule 12(4)' },
    { label: 'MULTIMODAL SVI FUSION HEAD', model: 'Composite Calibration' }
];

const ProcessingPipeline: React.FC<ProcessingPipelineProps> = ({ onComplete, isStarted }) => {
    const [currentIdx, setCurrentIdx] = useState(-1);

    useEffect(() => {
        if (!isStarted) return;
        setCurrentIdx(0);
    }, [isStarted]);

    useEffect(() => {
        if (currentIdx === -1) return;

        if (currentIdx < STAGES.length) {
            const timer = setTimeout(() => {
                setCurrentIdx(prev => prev + 1);
            }, 600); // 600ms per stage

            return () => clearTimeout(timer);
        } else {
            onComplete();
        }
    }, [currentIdx, onComplete]);

    if (!isStarted) return null;

    return (
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-7 shadow-xl max-w-md w-full mx-auto animate-scale-in select-none text-zinc-900 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-zinc-900 animate-spin" />
                    <h3 className="font-display font-medium text-black text-sm">
                        Executing Multimodal Triage Pipeline
                    </h3>
                </div>
                <span className="text-[9px] font-mono font-bold bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
                    STAGE {Math.min(currentIdx + 1, STAGES.length)}/{STAGES.length}
                </span>
            </div>

            <div className="space-y-2.5">
                {STAGES.map((stage, index) => {
                    const isDone = index < currentIdx;
                    const isActive = index === currentIdx;
                    const isPending = index > currentIdx;

                    return (
                        <div
                            key={stage.label}
                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 ${
                                isActive
                                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm scale-[1.01]'
                                    : isDone
                                        ? 'bg-zinc-50 border-zinc-200 text-zinc-700'
                                        : 'bg-white border-transparent text-zinc-400'
                            }`}
                        >
                            <div className="space-y-0.5">
                                <span className={`text-[11px] font-mono font-bold block tracking-tight ${
                                    isActive ? 'text-white' : isDone ? 'text-zinc-900' : 'text-zinc-400'
                                }`}>
                                    {stage.label}
                                </span>
                                <span className={`text-[10px] font-mono ${
                                    isActive ? 'text-zinc-300' : 'text-zinc-400'
                                }`}>
                                    {stage.model}
                                </span>
                            </div>

                            <div className="flex items-center">
                                {isDone && (
                                    <CheckCircle2 size={16} className="text-emerald-600 stroke-[2.5]" />
                                )}
                                {isActive && (
                                    <span className="w-2.5 h-2.5 bg-[var(--color-accent-lime)] rounded-full animate-pulse"></span>
                                )}
                                {isPending && (
                                    <span className="w-1.5 h-1.5 bg-zinc-200 rounded-full"></span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="pt-2 text-center border-t border-zinc-100 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 font-light">
                <Sparkles size={12} className="text-zinc-500" />
                <span>
                    {currentIdx < STAGES.length
                        ? 'Synthesizing acoustic, emotion, and cognitive telemetry...'
                        : 'Assessment successfully finalized.'}
                </span>
            </div>
        </div>
    );
};

export default ProcessingPipeline;
