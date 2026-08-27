import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Play, AlertTriangle, ShieldCheck, Mic, Square, Sparkles } from 'lucide-react';
import type { CaseAssessment } from '../types';
import { analysisService } from '../services/analysisService';

const VoiceAnalysis: React.FC = () => {
    const navigate = useNavigate();
    const [cases, setCases] = useState<CaseAssessment[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgressText, setUploadProgressText] = useState('Connecting Audio Pipeline...');
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Live Recording states
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        analysisService.fetchCasesAsync().then((fetched) => {
            setCases(fetched);
        }).catch(() => {
            setCases(analysisService.getCases());
        });

        const unsubscribe = analysisService.subscribeToLiveUpdates((_evt) => {
            analysisService.fetchCasesAsync().then((fetched) => {
                setCases(fetched);
            });
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const handleSelectCase = (caseId: string) => {
        navigate(`/analysis/${caseId}`);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processRealAudioUpload(files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            processRealAudioUpload(files[0]);
        }
    };

    // Live backend AI analysis execution
    const processRealAudioUpload = async (file: File | Blob, customName?: string) => {
        const filename = customName || (file instanceof File ? file.name : `recording_${Date.now()}.webm`);
        setUploading(true);
        setErrorMessage(null);
        setUploadSuccess(null);
        setUploadProgressText('Extracting Acoustic Biomarkers & Indic Semantics...');

        try {
            const assessment = await analysisService.analyzeAudioFile(file, filename);
            setUploadSuccess(`"${filename}" analyzed successfully as Case ${assessment.id}`);
            setUploading(false);

            setCases(analysisService.getCases());

            setTimeout(() => {
                navigate(`/analysis/${assessment.id}`);
            }, 700);
        } catch (err: any) {
            console.error('Audio assessment error:', err);
            setErrorMessage(err.message || 'Analysis failed. Please ensure the backend is running.');
            setUploading(false);
        }
    };

    // Preset Demo Scenario Loader
    const loadPresetDemo = async (audioFilename: string, caseTitle: string) => {
        setUploading(true);
        setErrorMessage(null);
        setUploadProgressText(`Loading Demo: ${caseTitle}...`);

        try {
            const response = await fetch(`/${audioFilename}`);
            const blob = await response.blob();
            const file = new File([blob], audioFilename, { type: 'audio/wav' });
            await processRealAudioUpload(file, audioFilename);
        } catch {
            const dummyBlob = new Blob(['sample audio data'], { type: 'audio/wav' });
            await processRealAudioUpload(dummyBlob, audioFilename);
        }
    };

    // Live Mic Recording
    const startLiveRecording = async () => {
        setErrorMessage(null);
        audioChunksRef.current = [];
        setRecordingTime(0);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const recordedBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
                stream.getTracks().forEach((t) => t.stop());
                processRealAudioUpload(recordedBlob, `live_mic_${Date.now()}.webm`);
            };

            mediaRecorder.start(200);
            setIsRecording(true);

            timerIntervalRef.current = window.setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.warn('Microphone error:', err);
            setErrorMessage('Microphone access denied. Please grant audio permissions.');
        }
    };

    const stopLiveRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }
        setIsRecording(false);
    };

    const formatTimer = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    return (
        <div className="space-y-8 animate-fade-in text-zinc-900 pb-12">

            {/* Page Header */}
            <div className="border-b border-zinc-200/80 pb-6">
                <h2 className="font-display font-medium text-3xl text-black tracking-tight">
                    Voice Analysis Portal
                </h2>
                <p className="text-zinc-500 text-sm mt-1.5 font-light">
                    Ingest helpline call audio, live stream microphone, or launch standardized SC/ST atrocity scenario benchmarks.
                </p>
            </div>

            {/* Error banner if any */}
            {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center justify-between">
                    <span>⚠️ {errorMessage}</span>
                    <button onClick={() => setErrorMessage(null)} className="font-bold ml-4">✕</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN: Upload & Mic Panels */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Upload Box */}
                    <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-7 shadow-sm">
                        <h3 className="font-display font-medium text-base text-zinc-800 mb-4">
                            Ingest Audio Call Recording
                        </h3>

                        {uploading ? (
                            <div className="border-2 border-dashed border-zinc-300 bg-zinc-50/50 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4">
                                <span className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></span>
                                <div>
                                    <p className="text-sm font-semibold text-zinc-800">{uploadProgressText}</p>
                                    <p className="text-xs text-zinc-400 mt-1 font-light">
                                        Running Sarvam Saaras STT, emotion2vec+ SER & Local Indic LLM Reasoner...
                                    </p>
                                </div>
                            </div>
                        ) : uploadSuccess ? (
                            <div className="border-2 border-dashed border-emerald-200 bg-emerald-50/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-zinc-800">Upload Secured</p>
                                    <p className="text-xs text-emerald-700 mt-1 font-mono">{uploadSuccess}</p>
                                </div>
                                <p className="text-[10px] text-zinc-400 mt-2">Redirecting to Live Triage Dashboard...</p>
                            </div>
                        ) : (
                            <label
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group relative ${dragOver
                                    ? 'border-zinc-900 bg-zinc-100/50 scale-[0.99]'
                                    : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/50 hover:bg-zinc-50'
                                    }`}
                            >
                                <input
                                    type="file"
                                    accept="audio/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                />
                                <div className="w-12 h-12 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:text-black group-hover:scale-105 transition-all shadow-sm">
                                    <Upload size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-zinc-800">
                                        Drag and drop helpline audio recordings here
                                    </p>
                                    <p className="text-xs text-zinc-400 mt-1 font-light">
                                        Supports MP3, WAV, M4A, WebM audio up to 50MB
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="mt-2 text-xs font-semibold px-5 py-2 bg-white border border-zinc-200 rounded-full text-zinc-700 shadow-xs hover:border-zinc-400 transition-colors"
                                >
                                    Browse Files
                                </button>
                            </label>
                        )}

                        {/* Live Mic Recording Widget */}
                        <div className="mt-6 border-t border-zinc-100 pt-6 flex items-center justify-between bg-zinc-50/70 p-4 rounded-2xl border border-zinc-200">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-zinc-900'}`}>
                                    <Mic size={18} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                                        {isRecording ? `Recording Live... (${formatTimer(recordingTime)})` : 'Live Microphone Capture'}
                                    </h4>
                                    <p className="text-[11px] text-zinc-500 font-light">
                                        Speak in Hindi, Tamil, English, or mixed dialects for immediate triage
                                    </p>
                                </div>
                            </div>

                            {isRecording ? (
                                <button
                                    onClick={stopLiveRecording}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold transition-all cursor-pointer shadow-sm shadow-red-500/20"
                                >
                                    <Square size={13} fill="currentColor" />
                                    <span>Stop & Analyze</span>
                                </button>
                            ) : (
                                <button
                                    onClick={startLiveRecording}
                                    disabled={uploading}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-black text-white rounded-full text-xs font-medium transition-all cursor-pointer shadow-sm"
                                >
                                    <Mic size={13} />
                                    <span>Start Live Recording</span>
                                </button>
                            )}
                        </div>

                        {/* Disclaimer info */}
                        <div className="mt-4 flex items-start gap-2.5 bg-zinc-50 border border-zinc-200 rounded-2xl p-3.5 text-xs text-zinc-500 leading-normal font-light">
                            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                            <p>
                                Statutory Compliance: Voice analysis adheres to Section 15A victim protection guidelines. Recorded audio is stored securely in SQLite and can be permanently deleted at any time.
                            </p>
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN: 4-Tier Benchmark Scenarios */}
                <div className="space-y-6">
                    <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-4">
                        <div className="pb-2 border-b border-zinc-100">
                            <h3 className="font-display font-medium text-base text-zinc-900 flex items-center gap-2">
                                <Sparkles size={16} className="text-zinc-700" />
                                <span>Benchmark Triage Scenarios</span>
                            </h3>
                            <p className="text-xs text-zinc-400 font-light mt-0.5">
                                Launch standardized roleplay benchmarks across the 4 risk tiers
                            </p>
                        </div>

                        <div className="space-y-3">
                            {/* Tier 1: Critical Risk */}
                            <div className="border border-red-200 bg-red-50/30 rounded-2xl p-4 hover:border-red-400 transition-all flex flex-col justify-between space-y-3">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-red-950 text-xs">
                                            🚨 Tier 1: Mob Encirclement & Threat
                                        </span>
                                        <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold">
                                            CRITICAL
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-600 mt-2 italic line-clamp-2 border-l-2 border-red-500 pl-2">
                                        "गाँव के दबंगों ने हमारे घर को घेर लिया है और जान से मारने की धमकी दे रहे हैं..."
                                    </p>
                                </div>
                                <div className="flex items-center justify-between border-t border-red-100 pt-2.5">
                                    <span className="text-[10px] font-mono text-zinc-400">Hindi • SVI ~87</span>
                                    <button
                                        onClick={() => loadPresetDemo('demo_critical.wav', 'Mob Encirclement & Threat')}
                                        disabled={uploading}
                                        className="text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                                    >
                                        <Play size={10} fill="currentColor" />
                                        <span>Test Critical</span>
                                    </button>
                                </div>
                            </div>

                            {/* Tier 2: High Risk */}
                            <div className="border border-amber-200 bg-amber-50/30 rounded-2xl p-4 hover:border-amber-400 transition-all flex flex-col justify-between space-y-3">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-amber-950 text-xs">
                                            ⚠️ Tier 2: Social Boycott & Blockade
                                        </span>
                                        <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                                            HIGH
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-600 mt-2 italic line-clamp-2 border-l-2 border-amber-500 pl-2">
                                        "हमारा हुक्का पानी बंद कर दिया है और सामाजिक बहिष्कार किया है..."
                                    </p>
                                </div>
                                <div className="flex items-center justify-between border-t border-amber-100 pt-2.5">
                                    <span className="text-[10px] font-mono text-zinc-400">Hindi • SVI ~72</span>
                                    <button
                                        onClick={() => loadPresetDemo('demo_high.wav', 'Social Boycott & Blockade')}
                                        disabled={uploading}
                                        className="text-[11px] font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                        <Play size={10} fill="currentColor" />
                                        <span>Test High</span>
                                    </button>
                                </div>
                            </div>

                            {/* Tier 3: Moderate Risk */}
                            <div className="border border-zinc-200 bg-zinc-50/50 rounded-2xl p-4 hover:border-zinc-300 transition-all flex flex-col justify-between space-y-3">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-zinc-900 text-xs">
                                            🟡 Tier 3: Public Well Water Denial
                                        </span>
                                        <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700 font-bold">
                                            MODERATE
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-600 mt-2 italic line-clamp-2 border-l-2 border-zinc-400 pl-2">
                                        "सार्वजनिक कुएं से पानी भरने नहीं दे रहे हैं और जातिसूचक गालियां दी हैं..."
                                    </p>
                                </div>
                                <div className="flex items-center justify-between border-t border-zinc-200/60 pt-2.5">
                                    <span className="text-[10px] font-mono text-zinc-400">Hindi • SVI ~54</span>
                                    <button
                                        onClick={() => loadPresetDemo('demo_moderate.wav', 'Public Well Water Denial')}
                                        disabled={uploading}
                                        className="text-[11px] font-semibold text-zinc-900 bg-zinc-200 hover:bg-zinc-300 px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                        <Play size={10} fill="currentColor" />
                                        <span>Test Moderate</span>
                                    </button>
                                </div>
                            </div>

                            {/* Tier 4: Low Risk */}
                            <div className="border border-lime-200 bg-lime-50/30 rounded-2xl p-4 hover:border-lime-400 transition-all flex flex-col justify-between space-y-3">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-lime-950 text-xs">
                                            🟢 Tier 4: Routine Portal Query
                                        </span>
                                        <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-full bg-lime-200 text-lime-800 font-bold">
                                            LOW
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-600 mt-2 italic line-clamp-2 border-l-2 border-lime-500 pl-2">
                                        "नमस्ते, मुझे अनुसूचित जाति छात्रवृत्ति और पोर्टल शिकायत की स्थिति जाननी है..."
                                    </p>
                                </div>
                                <div className="flex items-center justify-between border-t border-lime-100 pt-2.5">
                                    <span className="text-[10px] font-mono text-zinc-400">Hindi • SVI ~22</span>
                                    <button
                                        onClick={() => loadPresetDemo('demo_low.wav', 'Routine Portal Inquiry')}
                                        disabled={uploading}
                                        className="text-[11px] font-semibold text-lime-950 bg-lime-200 hover:bg-lime-300 px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                        <Play size={10} fill="currentColor" />
                                        <span>Test Low</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {cases.length > 0 && (
                        <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
                            <h3 className="font-display font-medium text-base text-zinc-800 mb-3">
                                Recent Helpline Cases
                            </h3>
                            <div className="space-y-2">
                                {cases.slice(0, 4).map((c) => (
                                    <div
                                        key={c.id}
                                        onClick={() => handleSelectCase(c.id)}
                                        className="p-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-2xl cursor-pointer flex items-center justify-between transition-all"
                                    >
                                        <div>
                                            <span className="font-semibold text-xs text-black block">{c.id}</span>
                                            <span className="text-[10px] text-zinc-500">{c.time} • {c.language}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-mono font-bold text-black">{c.svi}/100</span>
                                            <span className="text-[9px] font-bold block uppercase text-zinc-500">{c.risk}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </div>

        </div>
    );
};

export default VoiceAnalysis;
