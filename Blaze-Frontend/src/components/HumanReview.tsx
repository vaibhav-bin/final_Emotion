import React, { useState } from 'react';
import type { RiskCategory, CaseAssessment } from '../types';
import { ShieldCheck, Flag, CheckSquare } from 'lucide-react';
import { analysisService } from '../services/analysisService';

interface HumanReviewProps {
    caseId: string;
    initialRisk: RiskCategory;
    onReviewSaved: (updatedCase: CaseAssessment) => void;
}

const HumanReview: React.FC<HumanReviewProps> = ({ caseId, initialRisk, onReviewSaved }) => {
    const [confirmedRisk, setConfirmedRisk] = useState<RiskCategory>(initialRisk);
    const [flagged, setFlagged] = useState(false);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        // Simulate API save latency
        setTimeout(() => {
            const updated = analysisService.saveOperatorReview(caseId, notes, flagged, confirmedRisk);
            setSaving(false);
            setSavedSuccess(true);

            if (updated) {
                onReviewSaved(updated);
            }

            // Reset toast success message
            setTimeout(() => {
                setSavedSuccess(false);
            }, 3000);
        }, 700);
    };

    const riskCategories: RiskCategory[] = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

    return (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm shadow-slate-100/30 flex flex-col justify-between h-full select-none">
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100/60">
                    <div>
                        <h3 className="font-display font-bold text-base text-slate-800">
                            Human Review Console
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5 font-light">
                            Review triage parameters and mark assessed records complete
                        </p>
                    </div>
                    <CheckSquare size={16} className="text-slate-400" />
                </div>

                {/* Risk Classification selector */}
                <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Confirm Risk Category
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {riskCategories.map((risk) => {
                            const isActive = confirmedRisk === risk;
                            return (
                                <button
                                    type="button"
                                    key={risk}
                                    onClick={() => setConfirmedRisk(risk)}
                                    className={`py-2 px-1 rounded-xl text-[10px] font-mono font-bold border text-center transition-all cursor-pointer ${isActive
                                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                                        : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                                        }`}
                                >
                                    {risk}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Flag Checkbox toggle */}
                <div className="flex items-center justify-between bg-slate-50/55 border border-slate-100 p-3.5 rounded-xl">
                    <div>
                        <p className="text-xs font-semibold text-slate-700">Flag for Senior Reviewer</p>
                        <p className="text-[10px] text-slate-400 font-light mt-0.5">Escalate this interaction to supervisor queue</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFlagged(!flagged)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${flagged
                            ? 'bg-red-50 border-red-200 text-red-600 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                            }`}
                        aria-label="Toggle flag state for supervisor escort"
                    >
                        <Flag size={14} className={flagged ? 'fill-red-600' : ''} />
                    </button>
                </div>

                {/* Operational notes input */}
                <div className="space-y-1.5">
                    <label htmlFor="notes" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Operator Review Notes
                    </label>
                    <div className="relative">
                        <textarea
                            id="notes"
                            name="notes"
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Enter context, follow-up recommendations, or explanation for deviation from AI triage score..."
                            className="block w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs placeholder-slate-400 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all outline-none resize-none font-sans"
                        />
                    </div>
                </div>

                {/* Action Button & Toast inside layout */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-500 text-white font-medium rounded-xl text-sm transition-all focus:outline-none flex items-center justify-center gap-2 cursor-pointer hover:shadow-md hover:shadow-teal-550/10 active:scale-[0.98]"
                    >
                        {saving ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                <span>Saving Assessment...</span>
                            </>
                        ) : (
                            <>
                                <ShieldCheck size={15} />
                                <span>Mark Assessment Reviewed</span>
                            </>
                        )}
                    </button>

                    {savedSuccess && (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-xs font-semibold animate-fade-in flex items-center gap-1">
                            ✓ Review Saved Successfully
                        </span>
                    )}
                </div>
            </form>
        </div>
    );
};

export default HumanReview;
