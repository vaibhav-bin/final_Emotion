import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Clock,
    Languages,
    HelpCircle,
    ShieldCheck,
    AlertTriangle,
    TrendingUp,
    Scale,
    Activity,
    Trash2,
    Volume2
} from 'lucide-react';
import type { CaseAssessment } from '../types';
import { analysisService } from '../services/analysisService';

// Import components
import AudioPlayer from '../components/AudioPlayer';
import ProcessingPipeline from '../components/ProcessingPipeline';
import TranscriptViewer from '../components/TranscriptViewer';
import SpeechAnalysis from '../components/SpeechAnalysis';
import EmotionIndicators from '../components/EmotionIndicators';
import VulnerabilityIndicators from '../components/VulnerabilityIndicators';
import SVIVisualization from '../components/SVIVisualization';
import HumanReview from '../components/HumanReview';

const AnalysisDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [item, setItem] = useState<CaseAssessment | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTime, setActiveTime] = useState(0);
    const [seekTime, setSeekTime] = useState(-1);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const triggerAnalyse = searchParams.get('analyse') === 'true';

    useEffect(() => {
        if (!id) return;

        analysisService.getCaseByIdAsync(id).then((data) => {
            if (!data) {
                // Fallback to synchronous cache
                const cached = analysisService.getCaseById(id);
                setItem(cached);
            } else {
                setItem(data);
            }

            if (triggerAnalyse && data && data.status !== 'COMPLETE') {
                setIsProcessing(true);
            } else {
                setIsProcessing(false);
            }

            setLoading(false);
        }).catch(() => {
            const cached = analysisService.getCaseById(id);
            setItem(cached);
            setLoading(false);
        });
    }, [id, triggerAnalyse]);

    const handlePipelineComplete = () => {
        if (!id || !item) return;
        const updated = analysisService.updateCaseStatus(id, 'COMPLETE');
        if (updated) setItem(updated);
        setIsProcessing(false);
    };

    const handleSelectTime = (seconds: number) => {
        setSeekTime(seconds);
        setTimeout(() => setSeekTime(-1), 100);
    };

    const handleReviewSaved = (updatedCase: CaseAssessment) => {
        setItem(updatedCase);
    };

    const handleDeleteCase = async () => {
        if (!id) return;
        setIsDeleting(true);
        try {
            await analysisService.deleteCase(id);
            navigate('/dashboard');
        } catch (err) {
            console.error('Failed to delete case:', err);
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const parseDurationToSeconds = (durStr: string): number => {
        const parts = durStr.split(':');
        if (parts.length === 2) {
            return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        }
        return 272;
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col justify-center items-center gap-4 text-zinc-900">
                <span className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></span>
                <p className="text-sm font-light text-zinc-500">Loading analysis workspace...</p>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="min-h-[60vh] flex flex-col justify-center items-center gap-4 text-center max-w-md mx-auto text-zinc-900">
                <AlertTriangle size={42} className="text-red-500 stroke-[1.5]" />
                <h3 className="text-lg font-bold text-zinc-800 tracking-tight">Case Assessment Not Found</h3>
                <p className="text-xs text-zinc-400 font-light mt-1.5 leading-relaxed">
                    The requested record was deleted or is inaccessible in the ledger.
                </p>
                <Link
                    to="/dashboard"
                    className="mt-4 text-xs font-semibold text-zinc-900 hover:text-black bg-zinc-100 hover:bg-zinc-200 px-5 py-2.5 rounded-full transition-colors"
                >
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    const durationSec = parseDurationToSeconds(item.duration);

    if (isProcessing) {
        return (
            <div className="min-h-[70vh] flex flex-col justify-center items-center px-4 text-zinc-900">
                <span className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase mb-4">
                    NHAA 14566 TRIAGE PIPELINE
                </span>
                <ProcessingPipeline
                    isStarted={isProcessing}
                    onComplete={handlePipelineComplete}
                />
                <p className="text-[10px] text-zinc-400 mt-6 max-w-xs text-center leading-normal font-light">
                    Parsing acoustic pitch variances, WavLM embeddings and Google MuRIL Indic semantic representations...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in text-zinc-900">

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-zinc-200 shadow-2xl space-y-4 animate-scale-in">
                        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                            <Trash2 size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-zinc-900">Permanently Delete Case {item.id}?</h3>
                            <p className="text-xs text-zinc-500 mt-1 font-light leading-relaxed">
                                This will permanently purge this assessment report and remove the recorded audio file from the SQLite database and storage. This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteCase}
                                disabled={isDeleting}
                                className="px-5 py-2 rounded-full text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm shadow-red-500/20"
                            >
                                {isDeleting ? (
                                    <>
                                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={13} />
                                        <span>Confirm Delete</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Header */}
            <div className="border-b border-zinc-200/80 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1.5">
                    <Link
                        to="/dashboard"
                        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-black transition-colors font-medium mb-1"
                    >
                        <ArrowLeft size={13} />
                        Back to Triage Ledger
                    </Link>
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-display font-medium text-3xl text-black tracking-tight leading-none">
                            Case #{item.id}
                        </h2>

                        {item.operatorReview?.isReviewed ? (
                            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 flex items-center gap-1 leading-none shadow-xs">
                                <ShieldCheck size={12} className="stroke-[2.5]" />
                                Reviewed by Officer ({item.operatorReview.confirmedRisk})
                            </span>
                        ) : (
                            <span className="text-[11px] text-zinc-600 bg-zinc-100 border border-zinc-200 rounded-full px-3 py-1 leading-none font-medium">
                                Verified by AI Engine
                            </span>
                        )}

                        <span className="text-[11px] text-emerald-700 bg-emerald-50/80 border border-emerald-200 rounded-full px-2.5 py-0.5 flex items-center gap-1">
                            <Volume2 size={11} />
                            Audio Preserved
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-zinc-500 leading-none pt-1">
                        <span className="flex items-center gap-1">
                            <Clock size={12} />
                            Length: {item.duration}
                        </span>
                        <span className="flex items-center gap-1">
                            <Languages size={12} />
                            Language: {item.language}
                        </span>
                        <span className="flex items-center gap-1">
                            Screened: {item.time}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {item.status !== 'COMPLETE' && (
                        <button
                            onClick={() => setIsProcessing(true)}
                            className="bg-zinc-900 hover:bg-black text-white text-xs font-semibold py-2.5 px-5 rounded-full shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <TrendingUp size={14} />
                            <span>Process AI Assessment</span>
                        </button>
                    )}

                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="p-2.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-full border border-zinc-200 transition-colors cursor-pointer"
                        title="Permanently remove this record and audio from database"
                        aria-label="Delete Case"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Main Assessment Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* LEFT 7/12 COLUMN: Audio Scrubber, Transcript, Explainability & SOPs */}
                <div className="lg:col-span-7 space-y-6">

                    {/* Audio Player with real replayable audio */}
                    <AudioPlayer
                        waveform={item.speechMetrics.pitchWaveform}
                        durationSec={durationSec}
                        onTimeUpdate={setActiveTime}
                        seekTime={seekTime}
                        audioUrl={item.audioUrl || `/api/cases/${item.id}/audio`}
                    />

                    {/* Transcript Correspondence */}
                    <TranscriptViewer
                        transcript={item.transcript}
                        onSelectTime={handleSelectTime}
                        activeTime={activeTime}
                    />

                    {/* Statutory SOP Recommendations Section */}
                    {item.recommendations && item.recommendations.length > 0 && (
                        <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm select-none">
                            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-5">
                                <div>
                                    <h3 className="font-display font-medium text-base text-zinc-800">
                                        Automated Statutory SOP Interventions
                                    </h3>
                                    <p className="text-xs text-zinc-400 mt-0.5 font-light">
                                        Institutional escalation routed under SC/ST (PoA) Act Rules & NALSA schemes
                                    </p>
                                </div>
                                <Scale size={16} className="text-zinc-400" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {item.recommendations.map((rec, idx) => (
                                    <div
                                        key={idx}
                                        className="p-4 bg-zinc-50/70 hover:bg-zinc-50 border border-zinc-200 rounded-2xl transition-all space-y-2 flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <span className="text-xl">{rec.icon}</span>
                                                <span className="text-[9px] font-mono font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full uppercase">
                                                    {rec.urgency}
                                                </span>
                                            </div>
                                            <h4 className="text-xs font-bold text-zinc-800 leading-tight">
                                                {rec.title}
                                            </h4>
                                            <p className="text-[11px] text-zinc-600 leading-relaxed font-light mt-1">
                                                {rec.action}
                                            </p>
                                        </div>
                                        <div className="pt-2 border-t border-zinc-200/60 text-[10px] font-mono text-zinc-500 font-medium">
                                            📜 {rec.statutory_reference}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Explainability Node Evidence map */}
                    <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm select-none">
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-5">
                            <div>
                                <h3 className="font-display font-medium text-base text-zinc-800">
                                    Why is this assessment elevated?
                                </h3>
                                <p className="text-xs text-zinc-400 mt-0.5 font-light">
                                    Correlating SVI score contributors directly to multimodal evidence nodes
                                </p>
                            </div>
                            <HelpCircle size={15} className="text-zinc-400" />
                        </div>

                        {item.explainability.length === 0 ? (
                            <p className="text-xs text-zinc-400 italic">Standard interaction signals recorded.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {item.explainability.map((exp) => (
                                    <div
                                        key={exp.id}
                                        className="p-4 bg-zinc-50/70 hover:bg-zinc-50 border border-zinc-200 rounded-2xl transition-colors space-y-2"
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-mono font-bold text-zinc-900 bg-zinc-200 px-2 py-0.5 rounded border border-zinc-300">
                                                NODE {exp.id}
                                            </span>
                                            <span className="text-[9px] font-mono text-zinc-500 font-semibold uppercase">
                                                {exp.evidence}
                                            </span>
                                        </div>

                                        <h4 className="text-xs font-semibold text-zinc-800 leading-tight">
                                            {exp.title}
                                        </h4>
                                        <p className="text-[11px] text-zinc-600 leading-relaxed font-light">
                                            {exp.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* RIGHT 5/12 COLUMN: SVI Score, Speech Analytics, Indicators, Review Form */}
                <div className="lg:col-span-5 space-y-6">

                    {/* SVI Visualization */}
                    <SVIVisualization
                        score={item.svi}
                        risk={item.risk}
                        confidence={item.confidence}
                    />

                    {/* Sub-scores Progress Breakdown */}
                    {item.subScores && (
                        <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                                <div>
                                    <h3 className="font-display font-medium text-base text-zinc-800">
                                        Multimodal Sub-Score Weights
                                    </h3>
                                    <p className="text-xs text-zinc-400 mt-0.5 font-light">
                                        Narrative text (65% total influence), vocal emotion, and acoustic biomarkers
                                    </p>
                                </div>
                                <Activity size={16} className="text-zinc-400" />
                            </div>

                            <div className="space-y-3.5 pt-1">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold text-zinc-700">
                                        <span>📝 Text Narrative Threat (55% SVI)</span>
                                        <span className="font-mono text-zinc-900">{item.subScores.linguistic_threat}%</span>
                                    </div>
                                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-zinc-900 rounded-full transition-all duration-700" style={{ width: `${item.subScores.linguistic_threat}%` }}></div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold text-zinc-700">
                                        <span>🎙️ Vocal Emotion Distress (15% SVI)</span>
                                        <span className="font-mono text-zinc-900">{item.subScores.vocal_distress}%</span>
                                    </div>
                                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500 rounded-full transition-all duration-700" style={{ width: `${item.subScores.vocal_distress}%` }}></div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold text-zinc-700">
                                        <span>🔊 Acoustic Prosody Biomarkers (10% SVI)</span>
                                        <span className="font-mono text-zinc-900">{item.subScores.acoustic_panic}%</span>
                                    </div>
                                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-zinc-600 rounded-full transition-all duration-700" style={{ width: `${item.subScores.acoustic_panic}%` }}></div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold text-zinc-700">
                                        <span>⚡ Cross-Attention Synchronization (10% SVI)</span>
                                        <span className="font-mono text-zinc-900">{item.subScores.multimodal_co_occurrence}%</span>
                                    </div>
                                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-teal-600 rounded-full transition-all duration-700" style={{ width: `${item.subScores.multimodal_co_occurrence}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Speech Analytics */}
                    <SpeechAnalysis metrics={item.speechMetrics} />

                    {/* Emotion Indicators */}
                    <EmotionIndicators emotions={item.emotions} />

                    {/* Semantic Vulnerability Indicators */}
                    <VulnerabilityIndicators vulnerabilities={item.vulnerabilities} />

                    {/* Human Review Form */}
                    <HumanReview
                        caseId={item.id}
                        initialRisk={item.risk}
                        onReviewSaved={handleReviewSaved}
                    />

                </div>

            </div>

        </div>
    );
};

export default AnalysisDetail;
