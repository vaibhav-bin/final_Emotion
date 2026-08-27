import React, { useState, useEffect } from 'react';
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
    Trash2
} from 'lucide-react';
import type { CaseAssessment, RiskCategory } from '../types';
import { analysisService } from '../services/analysisService';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [cases, setCases] = useState<CaseAssessment[]>([]);
    const [deletingId, setDeletingId] = useState<string | null>(null);

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

    const totalAnalyses = cases.length;
    const highRiskCount = cases.filter(c => c.risk === 'HIGH').length;
    const criticalCount = cases.filter(c => c.risk === 'CRITICAL').length;
    const moderateOrLowCount = cases.filter(c => c.risk === 'MODERATE' || c.risk === 'LOW').length;

    return (
        <div className="space-y-8 animate-fade-in text-zinc-900">

            {/* Welcome Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 pb-6">
                <div>
                    <h2 className="font-display font-medium text-3xl text-black tracking-tight">
                        {getGreeting()}, Officer.
                    </h2>
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
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mt-1">Critical Risk</p>
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

                    {/* Connectors */}
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
                        <span className="font-display font-medium text-black mt-1 text-sm tracking-wide">RECEIVED</span>
                        <p className="text-xs text-zinc-500 mt-1 font-light text-center md:text-left leading-relaxed max-w-[90%]">
                            Audio stream ingested.
                        </p>
                    </div>

                    {/* Step 2: Transcribing */}
                    <div className="flex flex-col items-center md:items-start group relative z-10 pt-1">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-zinc-200 text-zinc-900 shadow-sm mb-4">
                            <CheckCircle2 size={16} />
                        </div>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-400">Node // 02</span>
                        <span className="font-display font-medium text-black mt-1 text-sm tracking-wide">TRANSCRIBING</span>
                        <p className="text-xs text-zinc-500 mt-1 font-light text-center md:text-left leading-relaxed max-w-[90%]">
                            Sarvam Saaras STT & MuRIL NLP.
                        </p>
                    </div>

                    {/* Step 3: Analysing */}
                    <div className="flex flex-col items-center md:items-start group relative z-10 pt-1">
                        <div className="w-10 h-10 rounded-full bg-[var(--color-accent-lime)] flex items-center justify-center border border-lime-400 text-lime-950 shadow-md shadow-lime-300/30 mb-4 relative">
                            <span className="w-2 h-2 rounded-full bg-black animate-pulse"></span>
                        </div>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-lime-600">Node // 03</span>
                        <span className="font-display font-medium text-black mt-1 text-sm tracking-wide">ANALYSING</span>
                        <p className="text-xs text-zinc-500 mt-1 font-light text-center md:text-left leading-relaxed max-w-[90%]">
                            WavLM & Gated Cross-Attention.
                        </p>
                    </div>

                    {/* Step 4: Assessment Ready */}
                    <div className="flex flex-col items-center md:items-start group relative z-10 pt-1">
                        <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center border border-zinc-200 text-zinc-400 mb-4">
                            <Clock size={16} />
                        </div>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-400">Terminal // 04</span>
                        <span className="font-display font-medium text-zinc-400 mt-1 text-sm tracking-wide">SOP ROUTING</span>
                        <p className="text-xs text-zinc-400 mt-1 font-light text-center md:text-left leading-relaxed max-w-[90%]">
                            Police PCR & Legal Aid.
                        </p>
                    </div>

                </div>
            </div>

            {/* RECENT ANALYSES Ledger Section */}
            <div className="bg-white border border-zinc-200 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h3 className="font-display font-medium text-lg text-black">
                            Case Assessment Ledger & SQLite Registry
                        </h3>
                    </div>
                </div>

                {cases.length === 0 ? (
                    <div className="p-20 text-center max-w-sm mx-auto">
                        <Activity className="mx-auto text-zinc-300 stroke-[1.5]" size={36} />
                        <h3 className="text-sm font-medium text-black mt-4">No cases logged in database</h3>
                        <Link
                            to="/analysis"
                            className="inline-block mt-4 text-xs font-semibold text-zinc-500 hover:text-black"
                        >
                            Open Voice Analysis &rarr;
                        </Link>
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
                                    <th className="py-5 px-4 text-center">Risk Level</th>
                                    <th className="py-5 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {cases.map((item) => (
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
                                            {item.status === 'COMPLETE' ? (
                                                <span className={`inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${getRiskBadgeStyles(item.risk)}`}>
                                                    {item.risk}
                                                </span>
                                            ) : (
                                                <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200 animate-pulse">
                                                    Working
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
