import React from 'react';
import type { EmotionMetric } from '../types';
import { HeartCrack } from 'lucide-react';

interface EmotionIndicatorsProps {
    emotions: EmotionMetric[];
}

const EmotionIndicators: React.FC<EmotionIndicatorsProps> = ({ emotions }) => {
    const getLevelColor = (level: string) => {
        switch (level) {
            case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-100';
            case 'MEDIUM': return 'text-amber-600 bg-amber-50 border-amber-100';
            case 'LOW': return 'text-slate-500 bg-slate-50 border-slate-100';
            default: return 'text-slate-500';
        }
    };

    return (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm shadow-slate-100/30 flex flex-col justify-between h-full select-none">
            <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100/60">
                    <div>
                        <h3 className="font-display font-bold text-base text-slate-800">
                            Emotional Indicators
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5 font-light">
                            Detected emotional frequencies measured in speech patterns
                        </p>
                    </div>
                    <HeartCrack size={16} className="text-slate-400" />
                </div>

                {/* Emotion Metrics Bars */}
                <div className="space-y-4.5">
                    {emotions.map((emotion) => (
                        <div key={emotion.name} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-slate-700">{emotion.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 text-[9px] font-bold font-mono rounded border ${getLevelColor(emotion.level)}`}>
                                        {emotion.level}
                                    </span>
                                    <span className="font-mono font-bold text-slate-700">{emotion.value}%</span>
                                </div>
                            </div>

                            {/* Progress Slider */}
                            <div className="h-2 w-full bg-slate-50 border border-slate-100/60 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${emotion.name === 'Neutral'
                                        ? 'bg-slate-400'
                                        : emotion.level === 'HIGH'
                                            ? 'bg-orange-500'
                                            : emotion.level === 'MEDIUM'
                                                ? 'bg-amber-400'
                                                : 'bg-teal-500'
                                        }`}
                                    style={{ width: `${emotion.value}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-6 text-[10px] text-slate-400 font-light leading-normal">
                * Wording notice: Indicators are parsed via acoustic models. These are indicators of distress signals, not psychological diagnoses.
            </div>

        </div>
    );
};

export default EmotionIndicators;
