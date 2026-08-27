import React from 'react';
import type { RiskCategory } from '../types';
import { ShieldAlert, Info } from 'lucide-react';

interface SVIVisualizationProps {
    score: number; // 0-100
    risk: RiskCategory;
    confidence: number; // percentage
}

const SVIVisualization: React.FC<SVIVisualizationProps> = ({ score, risk, confidence }) => {
    const getRiskColor = (cat: RiskCategory) => {
        switch (cat) {
            case 'CRITICAL': return 'bg-zinc-900 text-white shadow-[0_0_15px_rgba(0,0,0,0.1)] ring-1 ring-inset ring-zinc-700/50';
            case 'HIGH': return 'bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-300';
            case 'MODERATE': return 'bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-200';
            case 'LOW': return 'bg-lime-200 text-lime-900 ring-1 ring-inset ring-lime-300';
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
            case 'CRITICAL': return 'High critical vulnerability indicators detected. Human intervention recommended immediately.';
            case 'HIGH': return 'Significant trauma and distress indicators detected. Elevated priority triage suggested.';
            case 'MODERATE': return 'Moderate symptoms identified. Monitor case details and schedule call follow-up.';
            case 'LOW': return 'Conversational signals stable. Standard low-priority dispatch.';
        }
    };

    // Determine tick positioning percentage on the gauge axis
    const positionPercent = Math.min(Math.max(score, 0), 100);

    return (
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-between h-full select-none text-zinc-900 relative overflow-hidden group hover:border-zinc-300 transition-colors">
            {/* Subtle background glow for critical risk */}
            {risk === 'CRITICAL' && (
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-zinc-900/5 rounded-full blur-3xl pointer-events-none"></div>
            )}

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
                        Stress Index
                    </h3>
                    <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5 uppercase tracking-wider bg-zinc-50 px-2 py-1 rounded-full border border-zinc-200">
                        <Info size={11} className="text-zinc-400" />
                        AI Telemetry
                    </span>
                </div>

                {/* Score & Risk Badge Display */}
                <div className="flex items-end justify-between gap-4 mt-2">
                    <div className="flex items-baseline">
                        <span className="font-display font-medium text-6xl text-black tracking-tighter">
                            {score}
                        </span>
                        <span className="text-zinc-400 font-mono text-sm ml-2">/100</span>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <span className={`px-4 py-1.5 text-[10px] uppercase font-bold tracking-widest rounded-full border transition-colors ${getRiskColor(risk)} ${getRiskBorderColor(risk)}`}>
                            {risk}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 uppercase tracking-widest bg-zinc-50 px-2.5 py-1 rounded border border-zinc-200">
                            <span>Conf</span>
                            <span className="font-bold text-black">{confidence}%</span>
                        </div>
                    </div>
                </div>

                {/* Gradient Risk Spectrum Gauge */}
                <div className="relative mt-12 mb-8">
                    {/* Progress bar line */}
                    <div className="h-2 w-full bg-zinc-50 rounded-full flex overflow-hidden ring-1 ring-inset ring-zinc-200 shadow-inner">
                        <div className="w-1/4 h-full bg-lime-300/50"></div>
                        <div className="w-1/4 h-full bg-zinc-200/80 border-l border-zinc-300"></div>
                        <div className="w-1/4 h-full bg-amber-300/60 border-l border-zinc-300"></div>
                        <div className="w-1/4 h-full bg-zinc-800/20 border-l border-zinc-300"></div>
                    </div>

                    {/* Indicator slider tick */}
                    <div
                        className="absolute -top-2 -translate-x-1/2 flex flex-col items-center transition-all duration-1000 ease-out"
                        style={{ left: `${positionPercent}%` }}
                    >
                        <div className="w-6 h-6 rounded-full bg-white border-2 border-black shadow-[0_0_12px_rgba(0,0,0,0.1)] flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-black absolute"></div>
                        </div>
                    </div>

                    {/* Scale Axis Indicators */}
                    <div className="flex justify-between mt-4 text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-widest">
                        <span>L (0)</span>
                        <span>M (25)</span>
                        <span>H (50)</span>
                        <span className="text-zinc-900">C (75+)</span>
                    </div>
                </div>
            </div>

            {/* Description Panel & Warning Banner */}
            <div className="border-t border-zinc-100 pt-6 mt-4 space-y-4 relative z-10">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-zinc-50 text-black rounded-xl shrink-0 shadow-inner border border-zinc-200">
                        <ShieldAlert size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
                            Guidance Outcome
                        </p>
                        <p className="text-xs text-zinc-600 mt-2 font-medium leading-relaxed">
                            {getRiskDescription(risk)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SVIVisualization;
