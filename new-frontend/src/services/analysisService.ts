import type {
    CaseAssessment,
    RiskCategory,
    AssessmentStatus,
    TranscriptItem,
    SpeechMetrics,
    EmotionMetric,
    VulnerabilityMetric,
    ExplainabilityPoint,
    StatutoryRecommendation,
    SubScores,
    ActionLogItem
} from '../types';

const API_BASE_URL = ''; // Relative path leverages Vite proxy or direct same-origin
const STORAGE_PREFIX = 'nhaa_case_';
const QUEUE_KEY = 'nhaa_active_cases';

// Transform backend JSON response from /analyze or /api/cases/:id into frontend CaseAssessment
export function transformBackendReportToCase(data: any, customId?: string): CaseAssessment {
    const caseId = data.case_id || customId || `NHAA-${Math.floor(1000 + Math.random() * 9000)}`;
    const durationSec = Math.round(data.prosody?.duration_sec || 272);
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    const durationStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const sviScore = Math.round(data.svi?.score ?? 50);
    const riskCat = (data.svi?.risk_category as RiskCategory) || (sviScore >= 75 ? 'CRITICAL' : sviScore >= 50 ? 'HIGH' : sviScore >= 25 ? 'MODERATE' : 'LOW');
    const confidencePct = Math.round((data.emotion?.confidence ?? 0.88) * 100);

    // 1. Map Prosody -> SpeechMetrics
    const pitchTimeSeries: number[] = data.prosody?.time_series?.f0_hz || [];
    let waveformPoints: number[] = [];
    if (pitchTimeSeries.length > 0) {
        const minPitch = Math.min(...pitchTimeSeries.filter(p => p > 0)) || 100;
        const maxPitch = Math.max(...pitchTimeSeries) || 400;
        const range = Math.max(maxPitch - minPitch, 1);
        // Sample down to ~30 points
        const step = Math.max(1, Math.floor(pitchTimeSeries.length / 30));
        for (let i = 0; i < pitchTimeSeries.length; i += step) {
            const val = pitchTimeSeries[i];
            waveformPoints.push(val > 0 ? Math.round(((val - minPitch) / range) * 80 + 15) : 10);
        }
    }
    if (waveformPoints.length === 0) {
        waveformPoints = [30, 45, 12, 85, 90, 15, 60, 75, 45, 20, 80, 70, 15, 88, 92, 10, 5, 40, 85, 95, 25, 65, 78, 40, 12, 75, 80, 18, 90, 85, 15];
    }

    const pauseCount = data.prosody?.pauses?.pause_count ?? 5;
    const speechStressVal = Math.round(data.svi?.sub_scores?.acoustic_panic ?? data.svi?.score ?? 70);

    const speechMetrics: SpeechMetrics = {
        speakingRate: (data.prosody?.pauses?.speech_ratio ?? 0.8) < 0.65 ? 'Elevated' : 'Normal',
        pauseFrequency: pauseCount > 6 ? 'High' : (pauseCount > 2 ? 'Medium' : 'Low'),
        longPauses: pauseCount,
        pitchVariation: (data.prosody?.pitch?.pitch_jumps_count ?? 0) > 4 ? 'High' : 'Medium',
        voiceEnergy: (data.svi?.sub_scores?.vocal_distress ?? 0) > 60 ? 'High' : 'Medium',
        speechStress: sviScore > 65 ? 'High' : (sviScore > 35 ? 'Medium' : 'Low'),
        speechStressValue: speechStressVal,
        emotionalSignal: `${data.emotion?.predicted || 'Distress'} / Anxiety`,
        pitchWaveform: waveformPoints,
        pauseSequence: Array.from({ length: 25 }, (_, idx) => (idx % 4 === 0 && idx < pauseCount * 4)),
    };

    // 2. Map Emotion AI
    const rawEmotions: Array<{ emotion: string; score: number }> = data.emotion?.scores || [];
    const emotions: EmotionMetric[] = rawEmotions.length > 0
        ? rawEmotions.map(e => ({
            name: e.emotion,
            level: e.score > 0.6 ? 'HIGH' : (e.score > 0.25 ? 'MEDIUM' : 'LOW'),
            value: Math.round(e.score * 100),
        }))
        : [
            { name: 'Fear', level: sviScore > 60 ? 'HIGH' : 'MEDIUM', value: Math.min(95, Math.round(sviScore * 1.1)) },
            { name: 'Distress', level: sviScore > 50 ? 'HIGH' : 'MEDIUM', value: Math.round(sviScore * 0.95) },
            { name: 'Sadness', level: 'MEDIUM', value: 65 },
            { name: 'Anger', level: 'LOW', value: 20 },
            { name: 'Neutral', level: 'LOW', value: 8 },
        ];

    // 3. Map Vulnerabilities
    const lingScore = data.svi?.sub_scores?.linguistic_threat ?? 70;
    const vocalScore = data.svi?.sub_scores?.vocal_distress ?? 60;
    const vulnerabilities: VulnerabilityMetric[] = [
        { label: 'Severe Trauma', key: 'severe-trauma', severity: sviScore > 75 ? 'HIGH' : (sviScore > 45 ? 'MEDIUM' : 'LOW'), confidence: Math.round(sviScore) },
        { label: 'Fear & Panic', key: 'fear', severity: vocalScore > 60 ? 'HIGH' : 'MEDIUM', confidence: Math.round(vocalScore) },
        { label: 'Depression Indicators', key: 'depression', severity: 'MEDIUM', confidence: Math.round(sviScore * 0.75) },
        { label: 'Suicidal Ideation Indicators', key: 'suicidal-ideation', severity: data.detected_signs?.some((s: any) => s.sign?.toLowerCase().includes('suicid')) ? 'HIGH' : 'LOW', confidence: data.detected_signs?.some((s: any) => s.sign?.toLowerCase().includes('suicid')) ? 92 : 12 },
        { label: 'Intimidation & Caste Threats', key: 'intimidation', severity: lingScore > 60 ? 'HIGH' : 'MEDIUM', confidence: Math.round(lingScore) },
        { label: 'Social Isolation / Boycott', key: 'social-isolation', severity: data.detected_signs?.some((s: any) => s.sign?.toLowerCase().includes('boycott')) ? 'HIGH' : 'MEDIUM', confidence: Math.round(lingScore * 0.85) },
        { label: 'Extreme Vulnerability', key: 'extreme-vulnerability', severity: riskCat === 'CRITICAL' ? 'HIGH' : (riskCat === 'HIGH' ? 'MEDIUM' : 'LOW'), confidence: Math.round(sviScore * 0.92) },
    ];

    // 4. Map Transcript & Word Highlights
    const transcriptText: string = data.transcription?.text || 'Recorded grievance audio received.';
    const translatedText: string = data.transcription?.translated_text || '';
    const alignedWords: any[] = data.transcription?.aligned_words || [];
    let transcript: TranscriptItem[] = [];

    if (transcriptText) {
        const sentences = transcriptText.split(/[,।.]/).filter(s => s.trim().length > 0);
        transcript = sentences.map((st, i) => {
            const tsSec = Math.round(i * 4.5);
            const m = Math.floor(tsSec / 60);
            const s = tsSec % 60;
            const timeTag = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            
            const hasThreat = alignedWords.some(w => w.is_threat_word && st.includes(w.word)) ||
                st.includes('मार') || st.includes('धमकी') || st.includes('बहिष्कार') || st.includes('kill') || st.includes('threat') || st.includes('डर');

            return {
                timestamp: timeTag,
                speaker: 'Caller',
                text: st.trim(),
                indicator: hasThreat ? {
                    type: st.includes('मार') || st.includes('kill') ? 'intimidation' : (st.includes('बहिष्कार') ? 'isolation' : 'fear'),
                    label: st.includes('मार') ? 'Imminent Violence / Threat' : (st.includes('बहिष्कार') ? 'Social Boycott Indicator' : 'Acute Distress Signal'),
                    severity: 'HIGH',
                } : undefined,
            };
        });
    }

    if (transcript.length === 0) {
        transcript = [
            { timestamp: '00:02', speaker: 'Caller', text: transcriptText, indicator: { type: 'trauma', label: 'Grievance Narrative', severity: 'HIGH' } },
        ];
    }

    // 4b. Map English Translated Transcript
    let translatedTranscript: TranscriptItem[] = [];
    if (translatedText) {
        const transSentences = translatedText.split(/[,।.]/).filter(s => s.trim().length > 0);
        translatedTranscript = transSentences.map((st, i) => {
            const origItem = transcript[i] || transcript[0];
            return {
                timestamp: origItem?.timestamp || '00:02',
                speaker: origItem?.speaker || 'Caller',
                text: st.trim(),
                indicator: origItem?.indicator,
            };
        });
    }

    if (translatedTranscript.length === 0 && transcript.length > 0) {
        translatedTranscript = transcript;
    }

    // 5. Map Explainability Points
    const explainability: ExplainabilityPoint[] = [];
    const detectedSigns: any[] = data.detected_signs || [];
    detectedSigns.forEach((sign, idx) => {
        explainability.push({
            id: String(idx + 1).padStart(2, '0'),
            title: sign.source || 'AI Biomarker Evidence',
            description: sign.sign || 'Elevated distress feature identified.',
            evidence: sign.type === 'nlp' ? 'MuRIL Indic Semantics' : (sign.type === 'acoustic' ? 'Librosa Prosody' : 'emotion2vec+ SER'),
        });
    });

    const overrides: string[] = data.svi?.safety_overrides || [];
    overrides.forEach((ov, idx) => {
        explainability.unshift({
            id: `S${idx + 1}`,
            title: 'Mandatory Statutory Safety Override',
            description: ov,
            evidence: 'Safety Constraint Layer',
        });
    });

    if (explainability.length === 0) {
        explainability.push({
            id: '01',
            title: 'Multimodal Screening Assessment',
            description: `Composite SVI computed at ${sviScore}/100 across linguistic, vocal, and acoustic indicators.`,
            evidence: 'Multimodal Fusion Head',
        });
    }

    // 6. Map Recommendations & Subscores
    const recommendations: StatutoryRecommendation[] = (data.recommendations || []).map((r: any) => ({
        icon: r.icon || '📌',
        title: r.title || 'Statutory Action',
        urgency: r.urgency || 'Standard Protocol',
        action: r.action || '',
        statutory_reference: r.statutory_reference || 'SC/ST (PoA) Act Rules',
    }));

    const subScores: SubScores = {
        linguistic_threat: data.svi?.sub_scores?.linguistic_threat ?? 0,
        vocal_distress: data.svi?.sub_scores?.vocal_distress ?? 0,
        acoustic_panic: data.svi?.sub_scores?.acoustic_panic ?? 0,
        multimodal_co_occurrence: data.svi?.sub_scores?.multimodal_co_occurrence ?? 0,
    };

    const audioUrl = data.audio_url || `/api/cases/${caseId}/audio`;

    return {
        id: caseId,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: data.transcription?.language || 'Hindi (hi-IN)',
        duration: durationStr,
        svi: sviScore,
        risk: riskCat,
        status: 'COMPLETE',
        confidence: confidencePct,
        speechMetrics,
        emotions,
        vulnerabilities,
        transcript,
        translatedTranscript,
        translatedText,
        explainability,
        subScores,
        safetyOverrides: overrides,
        recommendations,
        adminBrief: data.admin_executive_brief || '',
        primaryAction: data.primary_action || '',
        urgencyLevel: data.urgency_level || 'STANDARD',
        audioUrl,
        rawReport: data,
    };
}

export const analysisService = {
    // Synchronous memory/localStorage cache
    getCases(): CaseAssessment[] {
        const storedIds: string[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        const cases: CaseAssessment[] = [];

        for (const id of storedIds) {
            const raw = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
            if (raw) {
                try {
                    cases.push(JSON.parse(raw));
                } catch {
                    // Ignore corrupted entry
                }
            }
        }

        return cases;
    },

    // Async fetch from FastAPI backend SQLite DB (/api/cases)
    async fetchCasesAsync(limit: number = 50, riskFilter?: string, search?: string): Promise<CaseAssessment[]> {
        try {
            const params = new URLSearchParams();
            params.append('limit', String(limit));
            if (riskFilter && riskFilter !== 'ALL') params.append('risk_filter', riskFilter);
            if (search && search.trim()) params.append('search', search.trim());

            const res = await fetch(`${API_BASE_URL}/api/cases?${params.toString()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            const parsedCases: CaseAssessment[] = [];
            const idsToStore: string[] = [];

            for (const c of (data.cases || [])) {
                // If case has full report stored
                let assessment: CaseAssessment;
                if (c.report) {
                    assessment = transformBackendReportToCase(c.report, c.case_id);
                } else {
                    assessment = {
                        id: c.case_id,
                        time: c.created_at ? c.created_at.substring(11, 16) : 'Recent',
                        language: c.language || 'hi-IN',
                        duration: '04:30',
                        svi: Math.round(c.svi_score || 50),
                        risk: c.risk_category || 'MODERATE',
                        status: c.status === 'COMPLETE' ? 'COMPLETE' : 'COMPLETE',
                        confidence: Math.round((c.emotion_confidence || 0.88) * 100),
                        speechMetrics: {
                            speakingRate: 'Normal',
                            pauseFrequency: 'Medium',
                            longPauses: 3,
                            pitchVariation: 'Medium',
                            voiceEnergy: 'Medium',
                            speechStress: 'Medium',
                            emotionalSignal: c.dominant_emotion || 'Distress',
                            pitchWaveform: [30, 45, 60, 75, 80, 45, 60, 85, 90, 40, 30],
                            pauseSequence: [false, false, true, false, false, true],
                            speechStressValue: Math.round(c.svi_score || 50),
                        },
                        emotions: [
                            { name: c.dominant_emotion || 'Distress', level: 'HIGH', value: Math.round((c.emotion_confidence || 0.85) * 100) },
                        ],
                        vulnerabilities: [
                            { label: 'Assessed Grievance', key: 'grievance', severity: c.risk_category || 'MODERATE', confidence: Math.round(c.svi_score || 50) }
                        ],
                        transcript: [
                            { timestamp: '00:02', speaker: 'Caller', text: c.transcript || 'Audio Grievance' }
                        ],
                        explainability: [],
                    };
                }

                // Update local storage
                localStorage.setItem(`${STORAGE_PREFIX}${assessment.id}`, JSON.stringify(assessment));
                idsToStore.push(assessment.id);
                parsedCases.push(assessment);
            }

            if (idsToStore.length > 0) {
                localStorage.setItem(QUEUE_KEY, JSON.stringify(idsToStore));
            }

            return parsedCases;
        } catch (err) {
            console.warn('Backend fetch failed, using local cache:', err);
            return this.getCases();
        }
    },

    getCaseById(id: string): CaseAssessment | null {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
        if (raw) {
            try {
                return JSON.parse(raw);
            } catch {
                return null;
            }
        }
        return null;
    },

    async getCaseByIdAsync(id: string): Promise<CaseAssessment | null> {
        try {
            const res = await fetch(`${API_BASE_URL}/api/cases/${id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.report) {
                    const assessment = transformBackendReportToCase(data.report, id);
                    localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(assessment));
                    return assessment;
                }
            }
        } catch (err) {
            console.warn(`Could not fetch case ${id} from API:`, err);
        }
        return this.getCaseById(id);
    },

    // Send actual audio file/blob to FastAPI backend /analyze
    async analyzeAudioFile(file: File | Blob, filename: string): Promise<CaseAssessment> {
        const formData = new FormData();
        const uploadFile = file instanceof File ? file : new File([file], filename, { type: file.type || 'audio/wav' });
        formData.append('file', uploadFile);

        const response = await fetch(`${API_BASE_URL}/analyze`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Assessment failed with HTTP ${response.status}`);
        }

        const data = await response.json();
        const assessment = transformBackendReportToCase(data);

        // Save in local storage & queue
        localStorage.setItem(`${STORAGE_PREFIX}${assessment.id}`, JSON.stringify(assessment));
        const storedIds: string[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        if (!storedIds.includes(assessment.id)) {
            localStorage.setItem(QUEUE_KEY, JSON.stringify([assessment.id, ...storedIds]));
        }

        return assessment;
    },

    // Synchronous fallback / initial placeholder creation
    createCaseFromAudio(filename: string, durationSec: number = 272, language: string = 'Hindi'): CaseAssessment {
        const caseId = `NHAA-${Math.floor(1000 + Math.random() * 9000)}`;
        const mins = Math.floor(durationSec / 60);
        const secs = durationSec % 60;
        const durationStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        const newCase: CaseAssessment = {
            id: caseId,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            language,
            duration: durationStr,
            svi: 0,
            risk: 'LOW',
            status: 'RECEIVED',
            confidence: 0,
            speechMetrics: {
                speakingRate: 'Normal',
                pauseFrequency: 'Low',
                longPauses: 0,
                pitchVariation: 'Low',
                voiceEnergy: 'Low',
                speechStress: 'Low',
                speechStressValue: 0,
                emotionalSignal: 'Awaiting Analysis',
                pitchWaveform: [20, 25, 20, 30, 25, 20, 25, 30, 20, 25, 20],
                pauseSequence: [false, false, false, false, false],
            },
            emotions: [
                { name: 'Neutral', level: 'HIGH', value: 100 },
            ],
            vulnerabilities: [],
            transcript: [
                { timestamp: '00:02', speaker: 'Caller', text: `Uploaded audio: ${filename}` },
            ],
            explainability: [],
        };

        localStorage.setItem(`${STORAGE_PREFIX}${caseId}`, JSON.stringify(newCase));
        const ids: string[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        localStorage.setItem(QUEUE_KEY, JSON.stringify([newCase.id, ...ids]));

        return newCase;
    },

    updateCaseStatus(id: string, status: AssessmentStatus, dataOverrides?: Partial<CaseAssessment>): CaseAssessment | null {
        const item = this.getCaseById(id);
        if (!item) return null;

        const updated = {
            ...item,
            status,
            ...dataOverrides,
        };

        localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(updated));

        // Background sync to backend
        fetch(`${API_BASE_URL}/api/cases/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        }).catch(() => {});

        return updated;
    },

    saveOperatorReview(
        id: string,
        notes: string,
        flagged: boolean,
        confirmedRisk?: RiskCategory,
        newStatus: AssessmentStatus = 'COMPLETE',
        reviewerName: string = 'Authorized Triage Officer'
    ): CaseAssessment | null {
        const item = this.getCaseById(id);
        if (!item) return null;

        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const existingLogs = item.actionLog || [
            { timestamp: item.time, action: 'AI Assessment Generated', actor: 'Sahaaya Multimodal AI Head', details: `Initial SVI: ${item.svi}/100 (${item.risk} Risk)` }
        ];

        const newLogEntries: ActionLogItem[] = [
            { timestamp: nowTime, action: `Risk Confirmed as ${confirmedRisk || item.risk}`, actor: reviewerName },
        ];

        if (flagged) {
            newLogEntries.push({ timestamp: nowTime, action: 'Flagged for Senior Supervisor Escort', actor: reviewerName, details: 'Urgent supervision requested' });
        }
        if (notes && notes.trim()) {
            newLogEntries.push({ timestamp: nowTime, action: 'Officer Review Note Appended', actor: reviewerName, details: notes.trim() });
        }
        if (newStatus === 'ESCALATED_POLICE') {
            newLogEntries.push({ timestamp: nowTime, action: 'Case Escalated to District Police & DLSA', actor: reviewerName, details: 'Section 15A Protection protocol triggered' });
        }

        const updated: CaseAssessment = {
            ...item,
            status: newStatus,
            actionLog: [...existingLogs, ...newLogEntries],
            operatorReview: {
                isReviewed: true,
                confirmedRisk: confirmedRisk || item.risk,
                flagged,
                notes,
                reviewedBy: reviewerName,
                reviewedAt: nowTime,
                status: newStatus,
            },
        };

        localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(updated));

        // Sync with backend API
        fetch(`${API_BASE_URL}/api/cases/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: newStatus,
                officer_notes: notes,
            }),
        }).catch(() => {});

        return updated;
    },

    async deleteCase(id: string): Promise<boolean> {
        try {
            await fetch(`${API_BASE_URL}/api/cases/${id}`, {
                method: 'DELETE',
            });
        } catch (err) {
            console.warn(`Backend delete failed for case ${id}:`, err);
        }

        // Clean from local storage cache
        localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
        const ids: string[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        const updatedIds = ids.filter((item) => item !== id);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(updatedIds));

        return true;
    },

    async translateText(text: string, sourceLang: string = 'auto'): Promise<string> {
        try {
            const res = await fetch(`${API_BASE_URL}/api/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, source_lang: sourceLang }),
            });
            if (res.ok) {
                const data = await res.json();
                return data.translated_text || text;
            }
        } catch (e) {
            console.warn('Translation API error:', e);
        }
        return text;
    },

    subscribeToLiveUpdates(callback: (event: any) => void): () => void {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/ws`;
        let ws: WebSocket | null = null;
        let isClosed = false;

        const connect = () => {
            if (isClosed) return;
            try {
                ws = new WebSocket(wsUrl);
                ws.onmessage = (msg) => {
                    try {
                        const data = JSON.parse(msg.data);
                        callback(data);
                    } catch (e) {
                        console.error('WS parse error:', e);
                    }
                };
                ws.onclose = () => {
                    if (!isClosed) setTimeout(connect, 3000);
                };
                ws.onerror = () => {
                    if (ws) ws.close();
                };
            } catch (err) {
                console.warn('WebSocket connect error, falling back to polling:', err);
            }
        };

        connect();

        // Background polling fallback every 4 seconds
        const pollTimer = setInterval(() => {
            this.fetchCasesAsync().then((cases) => {
                callback({ event: 'POLL_SYNC', cases });
            }).catch(() => {});
        }, 4000);

        return () => {
            isClosed = true;
            clearInterval(pollTimer);
            if (ws) ws.close();
        };
    },
};
