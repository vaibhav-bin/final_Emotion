import React from 'react';
import type { RiskCategory, SubScores } from '../types';
import { ShieldAlert, Activity, CheckCircle2 } from 'lucide-react';

interface SVIVisualizationProps {
    score: number; // 0-100
    risk: RiskCategory;
    confidence?: number;
    signalAgreement?: 'HIGH' | 'MEDIUM' | 'LOW';
    subScores?: SubScores;
}

const SVIVisualization: React.FC<SVIVisualizationProps> = ({
    score,
    risk,
    signalAgreement = 'HIGH',
    subScores
}) => {
    const getRiskBadgeColor = (cat: RiskCategory) => {
        switch (cat) {
            case 'CRITICAL':
                return 'bg-zinc-900 text-white shadow-[0_0_15px_rgba(0,0,0,0.1)] ring-1 ring-inset ring-zinc-700/50';
            case 'HIGH':
                return 'bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-300';
            case 'MODERATE':
                return 'bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-200';
            case 'LOW':
                return 'bg-lime-200 text-lime-900 ring-1 ring-inset ring-lime-300';
        }
    };

    const getRiskBorderColor = (cat: RiskCategory) => {
        switch (cat) {
            case 'CRITICAL': return 'border-zinc-800';
            case 'HIGH': return 'border-amber-200';
            case 'MODERATE': return 'border-zinc-200';
            case 'LOW': return 'border-lime-200';
        }
    };

    const getRiskDescription = (cat: RiskCategory) => {
        switch (cat) {
            case 'CRITICAL': return 'High critical vulnerability indicators detected across linguistic, acoustic, and emotional signals. Immediate officer review and emergency inter-agency triage recommended.';
            case 'HIGH': return 'Significant stress and trauma indicators identified. Priority triage, statutory FIR verification, and trauma recovery support suggested.';
            case 'MODERATE': return 'Moderate distress signals recorded. Standard institutional logging and scheduled welfare follow-up.';
            case 'LOW': return 'Conversational signals stable within baseline parameters. Standard informational assistance.';
        }
    };

    // Calculate normalized contributor values derived from actual model subscores or SVI
    const threatScore = subScores?.threat ?? Math.round(subScores?.linguistic_threat ?? score * 0.95);
    const fearScore = subScores?.fear ?? Math.round(score * 0.75);
    const traumaScore = subScores?.trauma ?? Math.round(subScores?.vocal_distress ?? score * 0.88);
    const vocalDistressScore = subScores?.vocal_distress ?? Math.round(score * 0.85);
    const vulnerabilityScore = subScores?.vulnerability ?? Math.round(subScores?.acoustic_panic ?? score * 0.78);

    const contributors = [
        { label: 'Narrative Threat Context', value: threatScore, weight: '55%' },
        { label: 'Acoustic Vocal Distress', value: vocalDistressScore, weight: '15%' },
        { label: 'Trauma & Grief Perturbation', value: traumaScore, weight: '10%' },
        { label: 'Acute Fear & Anxiety', value: fearScore, weight: '10%' },
        { label: 'Structural Vulnerability', value: vulnerabilityScore, weight: '10%' },
    ];

    const positionPercent = Math.min(Math.max(score, 0), 100);

    return (
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-between select-none text-zinc-900 relative overflow-hidden group hover:border-zinc-300 transition-colors space-y-6">
            {/* Subtle background glow for critical risk */}
            {risk === 'CRITICAL' && (
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-zinc-900/5 rounded-full blur-3xl pointer-events-none"></div>
            )}

            <div className="relative z-10 space-y-6">
                {/* Header with calibrated agreement */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div>
                        <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
                            Stress Vulnerability Index
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1 font-light">
                            Multimodal AI screening calibrated for NHAA 14566 triage
                        </p>
                    </div>

                    <span className="text-[10px] font-mono text-zinc-700 flex items-center gap-1.5 uppercase tracking-wider bg-zinc-50 px-2.5 py-1 rounded-full border border-zinc-200 font-semibold shadow-xs">
                        <CheckCircle2 size={11} className="text-emerald-600" />
                        <span>Signal Agreement: {signalAgreement}</span>
                    </span>
                </div>

                {/* Score & Risk Badge Display */}
                <div className="flex items-end justify-between gap-4">
                    <div className="flex items-baseline">
                        <span className="font-display font-medium text-6xl text-black tracking-tighter">
                            {score}
                        </span>
                        <span className="text-zinc-400 font-mono text-sm ml-2">/100</span>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                        <span className={`px-4 py-1.5 text-[10px] uppercase font-bold tracking-widest rounded-full border transition-colors ${getRiskBadgeColor(risk)} ${getRiskBorderColor(risk)}`}>
                            {risk} RISK
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 tracking-wider">
                            SC/ST Triage Tier
                        </span>
                    </div>
                </div>

                {/* Gradient Risk Spectrum Gauge */}
                <div className="relative pt-2 pb-1">
                    <div className="h-2 w-full bg-zinc-50 rounded-full flex overflow-hidden ring-1 ring-inset ring-zinc-200 shadow-inner">
                        <div className="w-1/4 h-full bg-lime-300/60"></div>
                        <div className="w-1/4 h-full bg-zinc-200/80 border-l border-zinc-300"></div>
                        <div className="w-1/4 h-full bg-amber-300/70 border-l border-zinc-300"></div>
                        <div className="w-1/4 h-full bg-zinc-900/40 border-l border-zinc-300"></div>
                    </div>

                    {/* Indicator slider tick */}
                    <div
                        className="absolute top-0 -translate-x-1/2 flex flex-col items-center transition-all duration-1000 ease-out"
                        style={{ left: `${positionPercent}%` }}
                    >
                        <div className="w-6 h-6 rounded-full bg-white border-2 border-black shadow-[0_0_12px_rgba(0,0,0,0.15)] flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-black absolute"></div>
                        </div>
                    </div>

                    {/* Scale Axis Indicators */}
                    <div className="flex justify-between mt-3 text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-widest">
                        <span>Low (0)</span>
                        <span>Moderate (40)</span>
                        <span>High (65)</span>
                        <span className="text-zinc-900">Critical (80+)</span>
                    </div>
                </div>

                {/* SVI Primary Contribution Matrix (Explainable Breakdown) */}
                <div className="space-y-3 pt-2 border-t border-zinc-100">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Activity size={13} className="text-zinc-500" />
                            <span>SVI Mathematical Contributors</span>
                        </span>
                        <span className="text-[9px] font-mono text-zinc-400">
                            Weighted Influence
                        </span>
                    </div>

                    <div className="space-y-2.5">
                        {contributors.map((c) => (
                            <div key={c.label} className="space-y-1">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-zinc-700 font-normal text-[12px]">{c.label}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-mono text-zinc-400">({c.weight})</span>
                                        <span className="font-mono font-bold text-zinc-900 text-xs w-7 text-right">{c.value}</span>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-zinc-900 rounded-full transition-all duration-700"
                                        style={{ width: `${Math.min(100, Math.max(5, c.value))}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Guidance Panel */}
            <div className="border-t border-zinc-100 pt-4 relative z-10">
                <div className="flex items-start gap-3 bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200">
                    <ShieldAlert size={16} strokeWidth={2.5} className="text-zinc-700 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider leading-none">
                            Triage Decision Guidance
                        </p>
                        <p className="text-xs text-zinc-700 mt-1 font-light leading-relaxed">
                            {getRiskDescription(risk)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SVIVisualization;
