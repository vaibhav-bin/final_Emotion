import React, { useState } from 'react';
import type { RiskCategory, CaseAssessment, AssessmentStatus, ActionLogItem } from '../types';
import { ShieldCheck, Flag, UserCheck, History } from 'lucide-react';
import { analysisService } from '../services/analysisService';

interface HumanReviewProps {
    caseId: string;
    initialRisk: RiskCategory;
    actionLog?: ActionLogItem[];
    onReviewSaved: (updatedCase: CaseAssessment) => void;
}

const HumanReview: React.FC<HumanReviewProps> = ({
    caseId,
    initialRisk,
    actionLog = [],
    onReviewSaved
}) => {
    const [confirmedRisk, setConfirmedRisk] = useState<RiskCategory>(initialRisk);
    const [status, setStatus] = useState<AssessmentStatus>('UNDER_REVIEW');
    const [flagged, setFlagged] = useState(false);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        setTimeout(() => {
            const updated = analysisService.saveOperatorReview(
                caseId,
                notes,
                flagged,
                confirmedRisk,
                status,
                'Authorized Triage Officer'
            );
            setSaving(false);
            setSavedSuccess(true);

            if (updated) {
                onReviewSaved(updated);
            }

            setTimeout(() => {
                setSavedSuccess(false);
            }, 3500);
        }, 500);
    };

    const riskCategories: RiskCategory[] = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

    const displayLogs = actionLog.length > 0 ? actionLog : [
        { timestamp: 'Just now', action: 'AI Assessment Generated', actor: 'Sahaaya Multimodal AI Head', details: `Initial SVI Risk: ${initialRisk}` }
    ];

    return (
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-sm select-none text-zinc-900 space-y-6">

            {/* Header with clear Human Governance notice */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 gap-2">
                <div>
                    <h3 className="font-display font-medium text-lg text-black flex items-center gap-2">
                        <UserCheck size={18} className="text-zinc-800" />
                        <span>Human Officer Review & Action Console</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5 font-light">
                        Authorized officer validation, statutory escalation, and case audit tracking
                    </p>
                </div>

                <span className="text-[10px] font-mono text-zinc-600 bg-zinc-100 border border-zinc-200 px-3 py-1 rounded-full font-semibold uppercase tracking-wider">
                    HUMAN-IN-THE-LOOP MANDATE
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Left: Action Form (7/12) */}
                <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-5">

                    {/* Step 1: Risk Confirmation */}
                    <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                            1. Confirm or Override Risk Classification
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {riskCategories.map((risk) => {
                                const isActive = confirmedRisk === risk;
                                return (
                                    <button
                                        type="button"
                                        key={risk}
                                        onClick={() => setConfirmedRisk(risk)}
                                        className={`py-2.5 px-2 rounded-2xl text-xs font-mono font-bold border text-center transition-all cursor-pointer ${
                                            isActive
                                                ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm ring-1 ring-zinc-800'
                                                : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                                        }`}
                                    >
                                        {risk}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Step 2: Action Lifecycle Status */}
                    <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                            2. Triage Lifecycle Action
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                            <button
                                type="button"
                                onClick={() => setStatus('UNDER_REVIEW')}
                                className={`p-2.5 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                                    status === 'UNDER_REVIEW'
                                        ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs'
                                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                                }`}
                            >
                                <span className="block font-bold">Under Review</span>
                                <span className="text-[10px] text-zinc-400 font-light">Active investigation</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setStatus('ESCALATED_POLICE')}
                                className={`p-2.5 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                                    status === 'ESCALATED_POLICE'
                                        ? 'bg-red-50 border-red-300 text-red-900 shadow-xs'
                                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                                }`}
                            >
                                <span className="block font-bold text-red-700">Escalate to Police</span>
                                <span className="text-[10px] text-red-500 font-light">Sec 15A & SP alert</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setStatus('RESOLVED')}
                                className={`p-2.5 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                                    status === 'RESOLVED'
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
                                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                                }`}
                            >
                                <span className="block font-bold text-emerald-800">Mark Resolved</span>
                                <span className="text-[10px] text-zinc-400 font-light">Close ticket</span>
                            </button>
                        </div>
                    </div>

                    {/* Step 3: Flag Toggle */}
                    <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 p-3.5 rounded-2xl">
                        <div>
                            <p className="text-xs font-semibold text-zinc-800">Flag for Senior Reviewer Escort</p>
                            <p className="text-[11px] text-zinc-400 font-light mt-0.5">
                                Route high-complexity grievance to District Supervisor queue
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFlagged(!flagged)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                                flagged
                                    ? 'bg-red-50 border-red-200 text-red-600 shadow-xs'
                                    : 'bg-white border-zinc-200 text-zinc-400 hover:bg-zinc-100'
                            }`}
                            aria-label="Toggle senior flag"
                        >
                            <Flag size={14} className={flagged ? 'fill-red-600' : ''} />
                        </button>
                    </div>

                    {/* Step 4: Notes */}
                    <div className="space-y-1.5">
                        <label htmlFor="notes" className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                            3. Officer Operational Notes & Directives
                        </label>
                        <textarea
                            id="notes"
                            name="notes"
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Record administrative observations, FIR compliance notes, or rationale for overriding AI triage tier..."
                            className="block w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-800 text-xs placeholder-zinc-400 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all outline-none resize-none"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-full transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-zinc-900/10 active:scale-98"
                        >
                            {saving ? (
                                <>
                                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    <span>Saving Audit Decision...</span>
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={15} />
                                    <span>Record Officer Decision</span>
                                </>
                            )}
                        </button>

                        {savedSuccess && (
                            <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-3.5 py-1 text-xs font-semibold animate-fade-in flex items-center gap-1.5">
                                ✓ Decision recorded in immutable case ledger
                            </span>
                        )}
                    </div>
                </form>

                {/* Right: Officer Activity & Audit Log (5/12) */}
                <div className="lg:col-span-5 bg-zinc-50/80 border border-zinc-200 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                        <span className="text-xs font-bold text-zinc-800 uppercase font-mono flex items-center gap-1.5">
                            <History size={13} className="text-zinc-600" />
                            <span>Case Activity & Audit Trail</span>
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">
                            {displayLogs.length} Events
                        </span>
                    </div>

                    <div className="space-y-3 pt-1 max-h-[300px] overflow-y-auto pr-1">
                        {displayLogs.map((log, idx) => (
                            <div key={idx} className="text-xs space-y-1 relative pl-4 border-l-2 border-zinc-300">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-zinc-900">{log.action}</span>
                                    <span className="text-[10px] font-mono text-zinc-400">{log.timestamp}</span>
                                </div>
                                <p className="text-[11px] text-zinc-500 font-light">{log.actor}</p>
                                {log.details && (
                                    <p className="text-[11px] text-zinc-700 bg-white p-2 rounded-lg border border-zinc-200 mt-1 font-light">
                                        "{log.details}"
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

            </div>

        </div>
    );
};

export default HumanReview;
