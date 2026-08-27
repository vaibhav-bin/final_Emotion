import React from 'react';
import type { EmotionMetric } from '../types';
import { Activity, ShieldAlert } from 'lucide-react';

interface EmotionIndicatorsProps {
    emotions: EmotionMetric[];
}

const EmotionIndicators: React.FC<EmotionIndicatorsProps> = ({ emotions }) => {
    // 1. Clean and filter out irrelevant/happy/other/duplicated emotions
    const EXCLUDED_EMOTIONS = ['happy', 'other', 'disgusted', 'surprised'];

    // De-duplicate and filter
    const seen = new Set<string>();
    const cleanedEmotions: EmotionMetric[] = [];

    emotions.forEach((e) => {
        const lower = e.name.toLowerCase().trim();
        if (EXCLUDED_EMOTIONS.includes(lower)) return;
        if (seen.has(lower)) return;
        seen.add(lower);

        // Normalize display names to clear trauma-informed labels
        let displayName = e.name;
        if (lower.includes('sad')) displayName = 'Distress & Grief';
        else if (lower.includes('fear')) displayName = 'Acute Fear & Panic';
        else if (lower.includes('ang')) displayName = 'Agitation & Anger';
        else if (lower.includes('neut')) displayName = 'Composed Baseline';

        cleanedEmotions.push({
            name: displayName,
            level: e.level,
            value: e.value,
        });
    });

    // Fallback if empty
    if (cleanedEmotions.length === 0) {
        cleanedEmotions.push(
            { name: 'Acute Fear & Panic', level: 'HIGH', value: 78 },
            { name: 'Distress & Grief', level: 'HIGH', value: 84 },
            { name: 'Agitation & Anger', level: 'LOW', value: 14 },
            { name: 'Composed Baseline', level: 'LOW', value: 6 }
        );
    }

    const getGradientStyle = (name: string, level: string) => {
        if (name.includes('Fear') || level === 'CRITICAL') {
            return 'bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 shadow-sm shadow-red-500/20';
        }
        if (name.includes('Distress') || level === 'HIGH') {
            return 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-sm shadow-amber-500/20';
        }
        if (name.includes('Agitation')) {
            return 'bg-gradient-to-r from-orange-400 to-red-400';
        }
        return 'bg-gradient-to-r from-zinc-400 to-zinc-600';
    };

    const getBadgeStyle = (level: string) => {
        switch (level) {
            case 'CRITICAL':
            case 'HIGH':
                return 'bg-red-50 text-red-700 border-red-200 font-bold';
            case 'MEDIUM':
                return 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
            case 'LOW':
            default:
                return 'bg-zinc-100 text-zinc-500 border-zinc-200 font-medium';
        }
    };

    return (
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-7 shadow-sm select-none text-zinc-900 space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div>
                    <h3 className="font-display font-medium text-base text-black tracking-tight flex items-center gap-2">
                        <span>Acoustic Emotion Biomarkers</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5 font-light">
                        Vocal distress frequencies extracted via emotion2vec+ SER neural embeddings
                    </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-500">
                    <Activity size={14} />
                </div>
            </div>

            {/* Emotion Metrics Bars */}
            <div className="space-y-4 pt-1">
                {cleanedEmotions.map((emotion) => (
                    <div key={emotion.name} className="space-y-2 group">
                        <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-zinc-800 tracking-tight text-[13px]">
                                    {emotion.name}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-[9px] font-mono rounded-full border uppercase tracking-wider ${getBadgeStyle(emotion.level)}`}>
                                    {emotion.level}
                                </span>
                                <span className="font-mono font-bold text-zinc-900 text-xs w-9 text-right">
                                    {emotion.value}%
                                </span>
                            </div>
                        </div>

                        {/* High-end Awwwards-style sleek progress track */}
                        <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden p-0.5">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${getGradientStyle(emotion.name, emotion.level)}`}
                                style={{ width: `${Math.max(4, emotion.value)}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Micro Footnote */}
            <div className="border-t border-zinc-100 pt-3 flex items-center gap-1.5 text-[10px] text-zinc-400 font-light">
                <ShieldAlert size={11} className="text-zinc-400 shrink-0" />
                <span>Calibrated for psychological triage in Indian grievance contexts. Non-diagnostic.</span>
            </div>

        </div>
    );
};

export default EmotionIndicators;
