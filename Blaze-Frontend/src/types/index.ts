export type RiskCategory = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type AssessmentStatus =
    | 'RECEIVED'
    | 'TRANSCRIBING'
    | 'ANALYSING'
    | 'ASSESSMENT_READY'
    | 'COMPLETE';

export interface TranscriptItem {
    timestamp: string;
    speaker: 'Caller' | 'Operator';
    text: string;
    indicator?: {
        type: 'fear' | 'intimidation' | 'vulnerability' | 'depression' | 'suicide' | 'isolation' | 'trauma';
        label: string;
        severity: 'LOW' | 'MEDIUM' | 'HIGH';
    };
}

export interface SpeechMetrics {
    speakingRate: 'Normal' | 'Elevated' | 'Slurred' | 'Fast';
    pauseFrequency: 'Low' | 'Medium' | 'High';
    longPauses: number;
    pitchVariation: 'Low' | 'Medium' | 'High';
    voiceEnergy: 'Low' | 'Medium' | 'High';
    speechStress: 'Low' | 'Medium' | 'High';
    emotionalSignal: string;
    pitchWaveform: number[]; // relative wave coordinates
    pauseSequence: boolean[]; // true = pause, false = talk
    speechStressValue: number; // 0-100
}

export interface VulnerabilityMetric {
    label: string;
    key: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    confidence: number; // percentage
}

export interface EmotionMetric {
    name: string;
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    value: number; // percentage
}

export interface ExplainabilityPoint {
    id: string;
    title: string;
    description: string;
    evidence: string;
}

export interface StatutoryRecommendation {
    icon: string;
    title: string;
    urgency: string;
    action: string;
    statutory_reference: string;
}

export interface SubScores {
    linguistic_threat: number;
    vocal_distress: number;
    acoustic_panic: number;
    multimodal_co_occurrence: number;
}

export interface CaseAssessment {
    id: string;
    time: string;
    language: string;
    duration: string;
    svi: number; // 0-100
    risk: RiskCategory;
    status: AssessmentStatus;
    confidence: number; // percentage
    speechMetrics: SpeechMetrics;
    emotions: EmotionMetric[];
    vulnerabilities: VulnerabilityMetric[];
    transcript: TranscriptItem[];
    explainability: ExplainabilityPoint[];
    subScores?: SubScores;
    safetyOverrides?: string[];
    recommendations?: StatutoryRecommendation[];
    adminBrief?: string;
    primaryAction?: string;
    urgencyLevel?: string;
    audioUrl?: string;
    rawReport?: any;
    operatorReview?: {
        isReviewed: boolean;
        confirmedRisk?: RiskCategory;
        flagged: boolean;
        notes: string;
        reviewedBy?: string;
        reviewedAt?: string;
    };
}

export interface Operator {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
}

export interface AuthState {
    isAuthenticated: boolean;
    operator: Operator | null;
}
