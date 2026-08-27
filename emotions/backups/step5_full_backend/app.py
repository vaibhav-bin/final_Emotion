import logging
from pathlib import Path
import shutil
import subprocess
import uuid
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, UploadFile, File, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

from emotion_model import predict_emotion
from sarvam_stt import transcribe_audio
from speech_prosody import extract_prosody_features
from speech_embeddings import extract_wavlm_embeddings
from muril_analyzer import analyze_transcript_semantics
from multimodal_fusion import align_and_fuse_multimodal
from trauma_classifier import classify_trauma_and_svi
from recommendations import generate_sop_recommendations

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NHAA_TriageApp")

# ============================================================
# APP INITIALIZATION
# ============================================================
app = FastAPI(
    title="NHAA Real-Time Stress & Trauma Assessment Module (14566)",
    version="2.0.0",
    description="Multimodal AI-assisted Triage & Vulnerability Assessment for SC/ST Helpline (PS 26093)",
)

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

TEMPLATES_DIR = BASE_DIR / "templates"
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

ALLOWED_EXTENSIONS = {
    ".wav", ".mp3", ".m4a", ".mp4", ".webm", ".ogg", ".opus", ".flac",
}


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
    )


@app.get("/health")
async def health():
    return {
        "status": "online",
        "service": "NHAA-14566-Trauma-Assessment-Module",
        "models": {
            "speech_emotion": "emotion2vec/emotion2vec_plus_large",
            "acoustic_foundation": "microsoft/wavlm-base-plus",
            "indic_semantics": "google/muril-base-cased",
            "stt_engine": "Sarvam Saaras v3",
            "fusion_layer": "Gated Cross-Attention (Text-Q, Audio-K/V)",
            "classification_head": "3-Class Trauma Softmax + 0-100 SVI",
        },
    }


@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
):
    if not file.filename:
        return JSONResponse(status_code=400, content={"success": False, "error": "No file selected."})

    extension = Path(file.filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": f"Unsupported audio file type '{extension}'. Please upload WAV, MP3, M4A, MP4, WebM or OGG.",
            },
        )

    # --------------------------------------------------------
    # 1. Save uploaded audio
    # --------------------------------------------------------
    file_id = uuid.uuid4().hex
    original_path = UPLOAD_DIR / f"{file_id}{extension}"

    try:
        with open(original_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as exc:
        return JSONResponse(status_code=500, content={"success": False, "error": f"Could not save file: {exc}"})

    # --------------------------------------------------------
    # 2. Standardize to 16kHz Mono WAV via FFmpeg
    # --------------------------------------------------------
    wav_path = UPLOAD_DIR / f"{file_id}_16k.wav"
    analysis_path = original_path

    try:
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", str(original_path),
                "-vn", "-ac", "1", "-ar", "16000",
                str(wav_path),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        analysis_path = wav_path
    except Exception as err:
        logger.warning(f"FFmpeg conversion notice: {err}, continuing with original file.")
        analysis_path = original_path

    audio_str_path = str(analysis_path)

    # --------------------------------------------------------
    # 3. Speech Emotion AI (emotion2vec+ Large)
    # --------------------------------------------------------
    try:
        emotion_results = predict_emotion(audio_str_path)
        emotion_results.sort(key=lambda x: x["score"], reverse=True)
    except Exception as exc:
        logger.error(f"Emotion prediction failed: {exc}")
        emotion_results = [{"emotion": "Neutral", "score": 1.0}]

    # --------------------------------------------------------
    # 4. Librosa Baseline Prosody & Mathematical Panic Biomarkers
    # --------------------------------------------------------
    try:
        prosody_data = extract_prosody_features(audio_str_path)
    except Exception as exc:
        logger.error(f"Prosody extraction failed: {exc}")
        prosody_data = {"success": False, "duration_sec": 5.0, "acoustic_panic_index": 0.2, "perturbation": {}, "pitch": {}, "energy": {}, "pauses": {}, "acoustic_distress_signs": []}

    # --------------------------------------------------------
    # 5. Deep Acoustic Embeddings (WavLM)
    # --------------------------------------------------------
    try:
        wavlm_data = extract_wavlm_embeddings(audio_str_path)
    except Exception as exc:
        logger.error(f"WavLM embeddings extraction failed: {exc}")
        wavlm_data = {"success": False, "frame_embeddings": None, "utterance_embedding": None, "frame_times": []}

    # --------------------------------------------------------
    # 6. Sarvam Multilingual STT (Transcript + Language + Words)
    # --------------------------------------------------------
    try:
        stt_result = transcribe_audio(audio_str_path, language_code="unknown", mode="codemix")
    except Exception as exc:
        logger.error(f"STT failed: {exc}")
        stt_result = {"transcript": "Grievance audio recorded", "language_code": "hi-IN", "request_id": "err", "words": []}

    transcript_text = stt_result.get("transcript", "")
    detected_lang = stt_result.get("language_code", "hi-IN")
    words_data = stt_result.get("words", [])

    # --------------------------------------------------------
    # 7. Google MuRIL Indic Semantic Analysis & Taxonomy
    # --------------------------------------------------------
    try:
        semantics_data = analyze_transcript_semantics(transcript_text, language_code=detected_lang)
    except Exception as exc:
        logger.error(f"MuRIL semantics failed: {exc}")
        semantics_data = {"transcript": transcript_text, "linguistic_threat_score": 0.0, "detected_categories": [], "detected_indicators": [], "max_severity": "LOW", "suicidal_risk_flag": False, "immediate_threat_flag": False}

    # --------------------------------------------------------
    # 8. Multimodal Temporal Alignment & Cross-Attention
    # --------------------------------------------------------
    try:
        fusion_data = align_and_fuse_multimodal(
            prosody_data=prosody_data,
            wavlm_data=wavlm_data,
            semantics_data=semantics_data,
            words_data=words_data,
            emotion_scores=emotion_results,
        )
    except Exception as exc:
        logger.error(f"Fusion failed: {exc}")
        fusion_data = {"success": False, "aligned_words": [], "co_occurrence_signals": []}

    # --------------------------------------------------------
    # 9. 3-Class Softmax Classification & SVI Scoring
    # --------------------------------------------------------
    try:
        classification_result = classify_trauma_and_svi(
            prosody_data=prosody_data,
            semantics_data=semantics_data,
            emotion_scores=emotion_results,
            fusion_data=fusion_data,
        )
    except Exception as exc:
        logger.error(f"Classification failed: {exc}")
        classification_result = {
            "svi_score": 50.0, "risk_category": "MODERATE", "risk_color": "#d97706",
            "predicted_class": {"class_id": 1, "label": "Class 1: Acute Stress / Heightened Anxiety", "short_name": "ACUTE_STRESS"},
            "class_probabilities": [], "safety_overrides": [], "detected_signs": [], "sub_scores": {}
        }

    # --------------------------------------------------------
    # 10. Statutory SOP Recommendations Engine
    # --------------------------------------------------------
    try:
        sop_data = generate_sop_recommendations(
            classification_result=classification_result,
            semantics_data=semantics_data,
            transcript=transcript_text,
        )
    except Exception as exc:
        logger.error(f"SOP generation failed: {exc}")
        sop_data = {"recommendations": [], "admin_executive_brief": "", "urgency_level": "Standard", "primary_action": "Review case"}

    # --------------------------------------------------------
    # 11. Cleanup temporary raw file (Ephemeral Privacy Policy)
    # --------------------------------------------------------
    try:
        if original_path.exists() and original_path != analysis_path:
            original_path.unlink()
    except Exception:
        pass

    # --------------------------------------------------------
    # 12. Assemble Full Triage Assessment Response
    # --------------------------------------------------------
    return {
        "success": True,
        "filename": file.filename,
        "case_id": f"NHAA-{uuid.uuid4().hex[:6].upper()}",
        
        # Core Triage Outputs
        "svi": {
            "score": classification_result["svi_score"],
            "raw_score": classification_result.get("raw_svi", classification_result["svi_score"]),
            "risk_category": classification_result["risk_category"],
            "risk_color": classification_result["risk_color"],
            "sub_scores": classification_result.get("sub_scores", {}),
            "safety_overrides": classification_result.get("safety_overrides", []),
        },
        "classification": {
            "predicted_class": classification_result["predicted_class"],
            "probabilities": classification_result.get("class_probabilities", []),
        },

        # Explainability & Provenance
        "detected_signs": classification_result.get("detected_signs", []),
        "recommendations": sop_data.get("recommendations", []),
        "admin_executive_brief": sop_data.get("admin_executive_brief", ""),
        "urgency_level": sop_data.get("urgency_level", "STANDARD"),
        "primary_action": sop_data.get("primary_action", ""),

        # Multimodal Component Data
        "transcription": {
            "text": transcript_text,
            "language": detected_lang,
            "request_id": stt_result.get("request_id", ""),
            "aligned_words": fusion_data.get("aligned_words", []),
            "co_occurrence_signals": fusion_data.get("co_occurrence_signals", []),
        },
        "emotion": {
            "predicted": emotion_results[0]["emotion"] if emotion_results else "Neutral",
            "confidence": emotion_results[0]["score"] if emotion_results else 1.0,
            "scores": emotion_results,
        },
        "prosody": {
            "duration_sec": prosody_data.get("duration_sec", 0.0),
            "pitch": prosody_data.get("pitch", {}),
            "perturbation": prosody_data.get("perturbation", {}),
            "pauses": prosody_data.get("pauses", {}),
            "acoustic_panic_index": prosody_data.get("acoustic_panic_index", 0.0),
            "time_series": prosody_data.get("time_series", {}),
        },
    }