import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Activity,
    AlertTriangle,
    Clock,
    ArrowRight,
    TrendingUp,
    Headphones,
    CheckCircle2,
    Plus,
    Trash2,
    ShieldAlert,
    Radio
} from 'lucide-react';
import type { CaseAssessment, RiskCategory } from '../types';
import { analysisService } from '../services/analysisService';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [cases, setCases] = useState<CaseAssessment[]>([]);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedFilter, setSelectedFilter] = useState<'ALL' | RiskCategory>('ALL');

    const loadCases = () => {
        analysisService.fetchCasesAsync().then((data) => {
            setCases(data);
        }).catch(() => {
            setCases(analysisService.getCases());
        });
    };

    useEffect(() => {
        loadCases();
        const unsubscribe = analysisService.subscribeToLiveUpdates((_evt) => {
            loadCases();
        });
        return () => {
            unsubscribe();
        };
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const getRiskBadgeStyles = (risk: RiskCategory) => {
        switch (risk) {
            case 'CRITICAL':
                return 'bg-zinc-900 text-white border-zinc-800 shadow-[0_0_15px_rgba(0,0,0,0.1)] ring-1 ring-inset ring-zinc-700/50';
            case 'HIGH':
                return 'bg-amber-100 text-amber-700 border-amber-200 ring-1 ring-inset ring-amber-300';
            case 'MODERATE':
                return 'bg-zinc-100 text-zinc-600 border-zinc-200';
            case 'LOW':
                return 'bg-lime-200 text-lime-900 border-lime-300';
        }
    };

    const handleDeleteCase = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm(`Permanently delete case ${id} and its recorded audio from the database?`)) {
            setDeletingId(id);
            await analysisService.deleteCase(id);
            setCases((prev) => prev.filter((c) => c.id !== id));
            setDeletingId(null);
        }
    };

    // Triage Priority Ordering: CRITICAL -> HIGH -> MODERATE -> LOW -> Highest SVI
    const prioritizedCases = useMemo(() => {
        const riskWeights: Record<RiskCategory, number> = {
            CRITICAL: 4,
            HIGH: 3,
            MODERATE: 2,
            LOW: 1,
        };

        const sorted = [...cases].sort((a, b) => {
            const weightA = riskWeights[a.risk] || 0;
            const weightB = riskWeights[b.risk] || 0;
            if (weightA !== weightB) {
                return weightB - weightA;
            }
            return (b.svi || 0) - (a.svi || 0);
        });

        if (selectedFilter === 'ALL') {
            return sorted;
        }
        return sorted.filter((c) => c.risk === selectedFilter);
    }, [cases, selectedFilter]);

    // Check for active critical emergency alert
    const activeCriticalCase = useMemo(() => {
        return cases.find(c => c.risk === 'CRITICAL' && !c.operatorReview?.isReviewed);
    }, [cases]);

    const totalAnalyses = cases.length;
    const highRiskCount = cases.filter(c => c.risk === 'HIGH').length;
    const criticalCount = cases.filter(c => c.risk === 'CRITICAL').length;
    const moderateOrLowCount = cases.filter(c => c.risk === 'MODERATE' || c.risk === 'LOW').length;

    return (
        <div className="space-y-8 animate-fade-in text-zinc-900 pb-10">

            {/* Live Critical / High-Risk Alert Banner (P0.3) */}
            {activeCriticalCase && (
                <div className="bg-zinc-900 text-white rounded-3xl p-5 md:p-6 border border-zinc-800 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-scale-in">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div className="flex items-start gap-4 relative z-10">
                        <div className="w-11 h-11 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0">
                            <ShieldAlert size={22} className="animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-bold tracking-widest text-red-400 uppercase bg-red-950/60 border border-red-800/60 px-2 py-0.5 rounded">
                                    CRITICAL TRIAGE ALERT
                                </span>
                                <span className="text-xs text-zinc-400 font-mono">
                                    Case #{activeCriticalCase.id} • SVI {activeCriticalCase.svi}/100
                                </span>
                            </div>
                            <h3 className="text-sm font-bold text-white mt-1">
                                Urgent Victim Protection & Police Escalation Required
                            </h3>
                            <p className="text-xs text-zinc-300 font-light mt-0.5">
                                High acute distress and physical threat signals detected. Immediate human officer review mandatory.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate(`/analysis/${activeCriticalCase.id}`)}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-full text-xs transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                    >
                        <span>Open Critical Case</span>
                        <ArrowRight size={14} />
                    </button>
                </div>
            )}

            {/* Welcome Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 pb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="font-display font-medium text-3xl text-black tracking-tight">
                            {getGreeting()}, Officer.
                        </h2>
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <Radio size={10} className="animate-pulse text-emerald-600" />
                            Live Sync Active
                        </span>
                    </div>
                    <p className="text-zinc-500 text-sm mt-1.5 font-light">
                        National Helpline Against Atrocities (14566) • AI-assisted Triage & Vulnerability Screening Console.
                    </p>
                </div>

                <Link
                    to="/analysis"
                    className="inline-flex items-center gap-2 bg-zinc-900 text-white hover:bg-black font-medium px-5 py-2.5 rounded-full text-sm transition-all shadow-lg shadow-black/10 focus:ring-2 focus:ring-zinc-900 hover:scale-[1.02] cursor-pointer"
                >
                    <Plus size={16} className="stroke-[2.5]" />
                    <span>New Voice Analysis</span>
                </Link>
            </div>

            {/* Metrics Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                <div className="bg-white border text-zinc-900 border-zinc-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between hover:border-zinc-300 transition-colors group">
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600">
                            <Activity size={18} />
                        </div>
                    </div>
                    <div className="mt-6">
                        <h4 className="font-display font-medium text-4xl">{totalAnalyses}</h4>
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-1">Total Screened</p>
                    </div>
                </div>

                <div className="bg-white border text-zinc-900 border-zinc-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between hover:border-zinc-300 transition-colors group">
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                            <AlertTriangle size={18} />
                        </div>
                    </div>
                    <div className="mt-6">
                        <h4 className="font-display font-medium text-4xl">{highRiskCount}</h4>
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-1">High Risk</p>
                    </div>
                </div>

                {/* Dark Tile for Critical Risk */}
                <div className="bg-zinc-900 border-zinc-800 text-white border rounded-3xl p-5 shadow-sm flex flex-col justify-between transition-colors group relative overflow-hidden">
                    <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white border border-white/20">
                            <TrendingUp size={18} />
                        </div>
                    </div>
                    <div className="mt-6 relative z-10">
                        <h4 className="font-display font-medium text-4xl">{criticalCount}</h4>
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mt-1">Critical Priority</p>
                    </div>
                </div>

                {/* Accent Tile for Moderate/Low */}
                <div className="bg-[var(--color-accent-lime)] border border-lime-300 text-lime-950 rounded-3xl p-5 shadow-sm flex flex-col justify-between group">
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-full bg-white/40 flex items-center justify-center text-lime-900 backdrop-blur-sm">
                            <Headphones size={18} />
                        </div>
                    </div>
                    <div className="mt-6">
                        <h4 className="font-display font-medium text-4xl">{moderateOrLowCount}</h4>
                        <p className="text-[10px] font-semibold text-lime-800 uppercase tracking-wider mt-1">Moderate & Low</p>
                    </div>
                </div>

            </div>

            {/* Assessment Pipeline Overview */}
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="font-display font-medium text-lg text-black tracking-wide">
                            Pipeline Architecture
                        </h3>
                    </div>
                    <span className="text-[10px] font-mono bg-zinc-100 border border-zinc-200 text-zinc-600 px-3 py-1.5 rounded-full font-bold uppercase tracking-widest shadow-inner">
                        LIVE DISPATCH
                    </span>
                </div>

                {/* Pipeline Flow Container */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-3 relative px-2 mb-2">
                    <div className="hidden md:flex items-center w-[25%] absolute left-[12.5%] top-[1.25rem] z-0 px-4">
                        <div className="w-full h-[1px] bg-zinc-200"></div>
                    </div>
                    <div className="hidden md:flex items-center w-[25%] absolute left-[37.5%] top-[1.25rem] z-0 px-4">
                        <div className="w-full h-[1px] bg-zinc-300 relative overflow-hidden">
                            <div className="absolute top-0 left-0 h-full w-12 bg-gradient-to-r from-transparent via-[var(--color-accent-lime)] to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center w-[25%] absolute left-[62.5%] top-[1.25rem] z-0 px-4">
                        <div className="w-full h-[1px] bg-zinc-200"></div>
                    </div>

                    {/* Step 1: Received */}
                    <div className="flex flex-col items-center md:items-start group relative z-10 pt-1">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-zinc-200 text-zinc-900 shadow-sm mb-4">
                            <CheckCircle2 size={16} />
                        </div>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-400">Node // 01</span>
                        <span className="font-display font-medium text-black mt-1 text-sm tracking-wide">INGESTION</span>
                        <p className="text-xs text-zinc-500 mt-1 font-light text-center md:text-left leading-relaxed max-w-[90%]">
                            16kHz PCM audio stream.
                        </p>
                    </div>

                    {/* Step 2: Transcribing */}
                    <div className="flex flex-col items-center md:items-start group relative z-10 pt-1">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-zinc-200 text-zinc-900 shadow-sm mb-4">
                            <CheckCircle2 size={16} />
                        </div>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-400">Node // 02</span>
                        <span className="font-display font-medium text-black mt-1 text-sm tracking-wide">SARVAM STT</span>
                        <p className="text-xs text-zinc-500 mt-1 font-light text-center md:text-left leading-relaxed max-w-[90%]">
                            Saaras v3 STT & word timestamps.
                        </p>
                    </div>

                    {/* Step 3: Analysing */}
                    <div className="flex flex-col items-center md:items-start group relative z-10 pt-1">
                        <div className="w-10 h-10 rounded-full bg-[var(--color-accent-lime)] flex items-center justify-center border border-lime-400 text-lime-950 shadow-md shadow-lime-300/30 mb-4 relative">
                            <span className="w-2 h-2 rounded-full bg-black animate-pulse"></span>
                        </div>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-lime-600">Node // 03</span>
                        <span className="font-display font-medium text-black mt-1 text-sm tracking-wide">INDIC REASONER</span>
                        <p className="text-xs text-zinc-500 mt-1 font-light text-center md:text-left leading-relaxed max-w-[90%]">
                            Qwen2.5 & emotion2vec+ SER.
                        </p>
                    </div>

                    {/* Step 4: Assessment Ready */}
                    <div className="flex flex-col items-center md:items-start group relative z-10 pt-1">
                        <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center border border-zinc-200 text-zinc-400 mb-4">
                            <Clock size={16} />
                        </div>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-400">Terminal // 04</span>
                        <span className="font-display font-medium text-zinc-400 mt-1 text-sm tracking-wide">STATUTORY SOP</span>
                        <p className="text-xs text-zinc-400 mt-1 font-light text-center md:text-left leading-relaxed max-w-[90%]">
                            Sec 15A & Rule 12(4) relief.
                        </p>
                    </div>

                </div>
            </div>

            {/* TRIAGE PRIORITY QUEUE (P0.3) */}
            <div className="bg-white border border-zinc-200 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h3 className="font-display font-medium text-lg text-black flex items-center gap-2">
                            <span>Triage Priority Queue</span>
                            <span className="text-xs font-mono font-normal text-zinc-400">({prioritizedCases.length} records)</span>
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5 font-light">
                            Prioritized automatically by Stress Vulnerability Index (SVI) & Risk Classification
                        </p>
                    </div>

                    {/* Triage Filter Tabs */}
                    <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-full border border-zinc-200 text-xs font-mono">
                        {(['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setSelectedFilter(filter)}
                                className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                                    selectedFilter === filter
                                        ? 'bg-white text-zinc-900 shadow-xs font-bold'
                                        : 'text-zinc-500 hover:text-zinc-800'
                                }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                {prioritizedCases.length === 0 ? (
                    <div className="p-20 text-center max-w-sm mx-auto">
                        <Activity className="mx-auto text-zinc-300 stroke-[1.5]" size={36} />
                        <h3 className="text-sm font-medium text-black mt-4">No cases in {selectedFilter} queue</h3>
                        <p className="text-xs text-zinc-400 mt-1">Adjust filters or create a new voice analysis.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 font-bold text-[10px] uppercase tracking-widest">
                                    <th className="py-5 px-8">Case Identifier</th>
                                    <th className="py-5 px-4 text-center">Dialect</th>
                                    <th className="py-5 px-4 font-mono text-center">Duration</th>
                                    <th className="py-5 px-4 text-center">SVI Score</th>
                                    <th className="py-5 px-4 text-center">Priority Tier</th>
                                    <th className="py-5 px-4 text-center">Review Status</th>
                                    <th className="py-5 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {prioritizedCases.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => navigate(`/analysis/${item.id}`)}
                                        className="hover:bg-zinc-50 transition-all cursor-pointer group"
                                    >
                                        <td className="py-5 px-8">
                                            <div className="flex flex-col">
                                                <span className="font-display font-semibold text-black group-hover:text-[var(--color-accent-lime-hover)] transition-colors">
                                                    {item.id}
                                                </span>
                                                <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-500 mt-0.5">{item.time}</span>
                                            </div>
                                        </td>

                                        <td className="py-5 px-4 text-center">
                                            <span className="text-[11px] text-zinc-600 bg-zinc-100 px-2.5 py-1 rounded-full border border-zinc-200">
                                                {item.language}
                                            </span>
                                        </td>

                                        <td className="py-5 px-4 text-zinc-500 font-mono text-xs text-center">
                                            {item.duration}
                                        </td>

                                        <td className="py-5 px-4 text-center">
                                            <div className="inline-flex items-end font-mono">
                                                <span className="text-lg font-bold text-black">{item.status === 'COMPLETE' ? item.svi : '—'}</span>
                                            </div>
                                        </td>

                                        <td className="py-5 px-4 text-center">
                                            <span className={`inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${getRiskBadgeStyles(item.risk)}`}>
                                                {item.risk}
                                            </span>
                                        </td>

                                        <td className="py-5 px-4 text-center">
                                            {item.operatorReview?.isReviewed ? (
                                                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
                                                    REVIEWED
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold">
                                                    PENDING REVIEW
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-5 px-8 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                <button
                                                    onClick={(e) => handleDeleteCase(e, item.id)}
                                                    disabled={deletingId === item.id}
                                                    className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-red-50 text-zinc-400 hover:text-red-600 inline-flex items-center justify-center transition-all cursor-pointer"
                                                    title="Permanently Delete Case"
                                                    aria-label="Delete Record"
                                                >
                                                    <Trash2 size={13} />
                                                </button>

                                                <button
                                                    className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-black text-zinc-600 hover:text-white inline-flex items-center justify-center transition-all group-hover:bg-black group-hover:text-[var(--color-accent-lime)] cursor-pointer"
                                                    aria-label="View Analysis"
                                                >
                                                    <ArrowRight size={14} className="-rotate-45" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Global Keyframes */}
            <style>{`
                @keyframes shimmer {
                    100% {
                        transform: translateX(100%);
                    }
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
