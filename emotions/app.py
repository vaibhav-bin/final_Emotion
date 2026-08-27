import logging
from pathlib import Path
import shutil
import subprocess
import uuid
from typing import Any, Dict, List, Optional, Set

from fastapi import FastAPI, UploadFile, File, Request, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

import db
from emotion_model import predict_emotion
from sarvam_stt import transcribe_audio
from speech_prosody import extract_prosody_features
from speech_embeddings import extract_wavlm_embeddings
from muril_analyzer import analyze_transcript_semantics
from multimodal_fusion import align_and_fuse_multimodal
from trauma_classifier import classify_trauma_and_svi
from recommendations import generate_sop_recommendations
from translator import translate_to_english
from llm_reasoner import assess_trauma_nondeterministic

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NHAA_TriageApp")

# ============================================================
# APP INITIALIZATION & WEBSOCKET SYNC
# ============================================================
app = FastAPI(
    title="NHAA Real-Time Stress & Trauma Assessment Module (14566)",
    version="2.2.0",
    description="Multimodal AI-assisted Triage & Vulnerability Assessment for SC/ST Helpline (PS 26093)",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    """Manages real-time WebSockets for multi-device dashboard synchronization."""
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.active_connections.discard(connection)

manager = ConnectionManager()

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

TEMPLATES_DIR = BASE_DIR / "templates"
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

ALLOWED_EXTENSIONS = {
    ".wav", ".mp3", ".m4a", ".mp4", ".webm", ".ogg", ".opus", ".flac",
}


@app.on_event("startup")
async def on_startup():
    """Initialize database tables on server startup."""
    db.init_db()


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
    )


@app.get("/{filename:path}.wav")
async def get_demo_audio(filename: str):
    file_path = BASE_DIR / f"{filename}.wav"
    if file_path.exists():
        return FileResponse(str(file_path), media_type="audio/wav")
    return JSONResponse(status_code=404, content={"error": "File not found"})


@app.get("/health")
async def health():
    return {
        "status": "online",
        "service": "NHAA-14566-Trauma-Assessment-Module",
        "database": "sqlite3 (nhaa_cases.db)",
        "models": {
            "speech_emotion": "emotion2vec/emotion2vec_plus_large",
            "acoustic_foundation": "microsoft/wavlm-base-plus",
            "indic_semantics": "google/muril-base-cased",
            "stt_engine": "Sarvam Saaras v3",
            "fusion_layer": "Gated Cross-Attention (Text-Q, Audio-K/V)",
            "classification_head": "3-Class Trauma Softmax + 0-100 SVI",
        },
    }


# ============================================================
# CASE REGISTRY & DATABASE API ENDPOINTS
# ============================================================

@app.get("/api/cases")
async def get_cases_endpoint(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    risk_filter: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """Query past assessment cases from SQLite database."""
    return db.list_cases(
        limit=limit,
        offset=offset,
        risk_filter=risk_filter,
        search_query=search,
    )


@app.get("/api/cases/{case_id}")
async def get_case_detail_endpoint(case_id: str):
    """Retrieve full analysis report JSON for a past case."""
    case = db.get_case(case_id)
    if not case:
        return JSONResponse(status_code=404, content={"success": False, "error": f"Case '{case_id}' not found."})
    return case


@app.patch("/api/cases/{case_id}/status")
async def patch_case_status_endpoint(case_id: str, request: Request):
    """Update administrative status and officer notes for a case."""
@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time live synchronization across devices."""
    await manager.connect(websocket)
    try:
        while True:
            # Keep-alive heartbeat listener
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


@app.post("/api/translate")
async def translate_endpoint(request: Request):
    """Translate Indic languages (Hindi, Tamil, etc.) to English."""
    try:
        body = await request.json()
    except Exception:
        body = {}

    text = body.get("text", "")
    source_lang = body.get("source_lang", "auto")
    result = translate_to_english(text, source_lang=source_lang)
    return result


@app.patch("/api/cases/{case_id}/status")
async def patch_case_status_endpoint(case_id: str, request: Request):
    """Update administrative status and officer notes for a case."""
    try:
        body = await request.json()
    except Exception:
        body = {}

    status = body.get("status", "PENDING_REVIEW")
    notes = body.get("officer_notes")

    updated = db.update_case_status(case_id, status=status, officer_notes=notes)
    if not updated:
        return JSONResponse(status_code=404, content={"success": False, "error": f"Case '{case_id}' not found."})

    # Broadcast update event to all connected devices
    await manager.broadcast({
        "event": "CASE_UPDATED",
        "case_id": case_id,
        "status": status,
        "officer_notes": notes,
    })

    return {"success": True, "case_id": case_id, "status": status, "officer_notes": notes}


@app.delete("/api/cases/{case_id}")
async def delete_case_endpoint(case_id: str):
    """Delete a case record and its audio from the database permanently."""
    deleted = db.delete_case(case_id)
    if not deleted:
        return JSONResponse(status_code=404, content={"success": False, "error": f"Case '{case_id}' not found."})

    # Broadcast delete event to all connected devices
    await manager.broadcast({
        "event": "CASE_DELETED",
        "case_id": case_id,
    })

    return {"success": True, "case_id": case_id, "deleted": True}


@app.get("/api/cases/{case_id}/audio")
async def get_case_audio_endpoint(case_id: str):
    """Serve the persisted audio recording for replaying in frontend."""
    case = db.get_case(case_id)
    if not case:
        return JSONResponse(status_code=404, content={"success": False, "error": f"Case '{case_id}' not found."})
    
    # 1. Check audio_path stored in database
    audio_path = case.get("audio_path")
    if audio_path and Path(audio_path).exists():
        return FileResponse(str(audio_path), media_type="audio/wav")
    
    # 2. Check standard case_id.wav in UPLOAD_DIR
    target_wav = UPLOAD_DIR / f"{case_id}.wav"
    if target_wav.exists():
        return FileResponse(str(target_wav), media_type="audio/wav")
    
    # 3. Check original filename in case report if it corresponds to a preset audio
    filename = case.get("report", {}).get("filename", "")
    if filename:
        preset_file = BASE_DIR / filename
        if preset_file.exists():
            return FileResponse(str(preset_file), media_type="audio/wav")
        preset_upload = UPLOAD_DIR / filename
        if preset_upload.exists():
            return FileResponse(str(preset_upload), media_type="audio/wav")

    return JSONResponse(status_code=404, content={"success": False, "error": f"Audio file for case '{case_id}' not found on server."})


# ============================================================
# MULTIMODAL INFERENCE & AUDIT LOGGING
# ============================================================

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
        stt_result = transcribe_audio(
            audio_str_path,
            language_code="unknown",
            mode="codemix",
            original_filename=file.filename,
        )
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
    # 10. Non-Deterministic Generative Context & Statutory SOP Engine
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

    # Execute Phase 2 Non-Deterministic Generative Reasoner
    llm_reasoning = None
    try:
        llm_reasoning = assess_trauma_nondeterministic(
            transcript_text=transcript_text,
            language_code=detected_lang,
            prosody_summary=prosody_data,
            emotion_summary=emotion_results,
        )
    except Exception as llm_exc:
        logger.warning(f"LLM reasoner notice: {llm_exc}")

    # Determine final blended SVI & Risk
    if llm_reasoning and "svi_score" in llm_reasoning:
        llm_svi = float(llm_reasoning["svi_score"])
        # Blend: 70% Generative Context Reasoner + 30% Multimodal Acoustic/SER SVI
        final_svi = round(0.70 * llm_svi + 0.30 * classification_result["svi_score"], 1)
        final_risk = llm_reasoning.get("risk_category", classification_result["risk_category"])
        if final_svi >= 80:
            final_risk = "CRITICAL"
        elif final_svi >= 65:
            final_risk = "HIGH"
        elif final_svi >= 40:
            final_risk = "MODERATE"
        else:
            final_risk = "LOW"

        final_recommendations = llm_reasoning.get("statutory_recommendations") or sop_data.get("recommendations", [])
        final_admin_brief = llm_reasoning.get("officer_brief") or sop_data.get("admin_executive_brief", "")
        final_primary_action = llm_reasoning.get("primary_action") or sop_data.get("primary_action", "")
        final_urgency = llm_reasoning.get("urgency_level") or sop_data.get("urgency_level", "STANDARD")
        
        # Merge explainability nodes
        llm_nodes = llm_reasoning.get("explainability_nodes", [])
        formatted_llm_nodes = [
            {"source": n.get("title", "Cognitive Reasoning Node"), "sign": n.get("description", ""), "type": "llm_reasoner"}
            for n in llm_nodes
        ]
        final_detected_signs = formatted_llm_nodes + classification_result.get("detected_signs", [])
    else:
        final_svi = classification_result["svi_score"]
        final_risk = classification_result["risk_category"]
        final_recommendations = sop_data.get("recommendations", [])
        final_admin_brief = sop_data.get("admin_executive_brief", "")
        final_primary_action = sop_data.get("primary_action", "")
        final_urgency = sop_data.get("urgency_level", "STANDARD")
        final_detected_signs = classification_result.get("detected_signs", [])

    # --------------------------------------------------------
    # 11. Cleanup temporary raw file (Ephemeral Privacy Policy)
    # --------------------------------------------------------
    try:
        if original_path.exists() and original_path != analysis_path:
            original_path.unlink()
    except Exception:
        pass

    # --------------------------------------------------------
    # 12. Assemble Full Response Payload & Persist to Database
    # --------------------------------------------------------
    case_id = f"NHAA-{uuid.uuid4().hex[:6].upper()}"
    saved_audio_path = UPLOAD_DIR / f"{case_id}.wav"
    try:
        if Path(analysis_path).exists():
            shutil.copyfile(str(analysis_path), str(saved_audio_path))
    except Exception as copy_err:
        logger.warning(f"Could not persist audio file for case {case_id}: {copy_err}")
        saved_audio_path = Path(analysis_path)

    risk_colors = {
        "CRITICAL": "#18181b",
        "HIGH": "#dc2626",
        "MODERATE": "#d97706",
        "LOW": "#16a34a",
    }

    response_payload = {
        "success": True,
        "filename": file.filename,
        "case_id": case_id,
        "audio_url": f"/api/cases/{case_id}/audio",
        
        # Core Triage Outputs
        "svi": {
            "score": final_svi,
            "raw_score": final_svi,
            "risk_category": final_risk,
            "risk_color": risk_colors.get(final_risk, "#d97706"),
            "sub_scores": classification_result.get("sub_scores", {}),
            "safety_overrides": classification_result.get("safety_overrides", []),
            "reasoning_mode": "NON_DETERMINISTIC_INDIC_LLM" if llm_reasoning else "MULTIMODAL_HEURISTIC",
        },
        "classification": {
            "predicted_class": classification_result["predicted_class"],
            "probabilities": classification_result.get("class_probabilities", []),
        },

        # Explainability & Provenance
        "detected_signs": final_detected_signs,
        "recommendations": final_recommendations,
        "admin_executive_brief": final_admin_brief,
        "urgency_level": final_urgency,
        "primary_action": final_primary_action,

        # Multimodal Component Data
        "transcription": {
            "text": transcript_text,
            "translated_text": translate_to_english(transcript_text, source_lang=detected_lang).get("translated_text", transcript_text),
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

    # Persist in SQLite database with audio_path
    try:
        db.save_case(response_payload, audio_path=str(saved_audio_path))
    except Exception as db_exc:
        logger.error(f"Failed to auto-save case {response_payload['case_id']} to database: {db_exc}")

    # Real-time WebSocket multi-device sync
    try:
        await manager.broadcast({
            "event": "CASE_CREATED",
            "case_id": case_id,
            "risk_category": response_payload["svi"]["risk_category"],
            "svi_score": response_payload["svi"]["score"],
            "language": detected_lang,
            "time": "Just now",
            "filename": file.filename,
            "case": response_payload,
        })
    except Exception as ws_err:
        logger.warning(f"WebSocket broadcast error: {ws_err}")

    return response_payload