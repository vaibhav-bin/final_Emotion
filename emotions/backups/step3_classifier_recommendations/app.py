from pathlib import Path
import shutil
import subprocess
import uuid
from sarvam_stt import transcribe_audio

from fastapi import FastAPI, UploadFile, File, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from emotion_model import predict_emotion


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="NHAA Speech Emotion Assessment",
    version="0.1.0",
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

TEMPLATES_DIR = BASE_DIR / "templates"

templates = Jinja2Templates(
    directory=str(TEMPLATES_DIR)
)


# ============================================================
# ALLOWED FILE TYPES
# ============================================================

ALLOWED_EXTENSIONS = {
    ".wav",
    ".mp3",
    ".m4a",
    ".mp4",
    ".webm",
    ".ogg",
    ".opus",
    ".flac",
}


# ============================================================
# HOME PAGE
# ============================================================

@app.get(
    "/",
    response_class=HTMLResponse,
)
async def home(request: Request):

    return templates.TemplateResponse(
        request=request,
        name="index.html",
    )


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
async def health():

    return {
        "status": "running",
        "service": "speech-emotion-assessment",
        "model": (
            "emotion2vec/emotion2vec_plus_large"
            " (fallback: Whisper-Large-v3-SER)"
        ),
    }


# ============================================================
# ANALYZE AUDIO
# ============================================================

@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
):

    # --------------------------------------------------------
    # Validate filename
    # --------------------------------------------------------

    if not file.filename:

        return {
            "success": False,
            "error": "No file selected.",
        }


    extension = Path(
        file.filename
    ).suffix.lower()


    # --------------------------------------------------------
    # Validate extension
    # --------------------------------------------------------

    if extension not in ALLOWED_EXTENSIONS:

        return {
            "success": False,
            "error": (
                "Unsupported file type. "
                "Please upload WAV, MP3, M4A or MP4."
            ),
        }


    # --------------------------------------------------------
    # Save file
    # --------------------------------------------------------

    file_id = uuid.uuid4().hex

    original_path = (
        UPLOAD_DIR
        / f"{file_id}{extension}"
    )

    try:

        with open(
            original_path,
            "wb",
        ) as buffer:

            shutil.copyfileobj(
                file.file,
                buffer,
            )

    except Exception as exc:

        return {
            "success": False,
            "error": (
                f"Could not save file: {exc}"
            ),
        }


    # --------------------------------------------------------
    # Determine analysis file
    # --------------------------------------------------------

    analysis_path = original_path


    # --------------------------------------------------------
    # Convert to 16kHz Mono WAV (Standard for emotion2vec+ & STT)
    # --------------------------------------------------------

    wav_path = UPLOAD_DIR / f"{file_id}_16k.wav"

    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(original_path),
                "-vn",
                "-ac",
                "1",
                "-ar",
                "16000",
                str(wav_path),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        analysis_path = wav_path

    except FileNotFoundError:
        # If ffmpeg is not present, use original path
        analysis_path = original_path

    except subprocess.CalledProcessError as err:
        # If ffmpeg failed, try original path
        print(f"FFmpeg conversion warning: {err}, falling back to original path")
        analysis_path = original_path


    # ========================================================
    # 1. EMOTION AI
    # ========================================================

    try:

        emotion_results = predict_emotion(
            str(analysis_path)
        )

        emotion_results.sort(
            key=lambda x: x["score"],
            reverse=True,
        )

    except Exception as exc:

        return {
            "success": False,
            "error": (
                f"Emotion analysis failed: {exc}"
            ),
        }


    # ========================================================
    # 2. SARVAM STT
    # ========================================================

    try:

        stt_result = transcribe_audio(
            str(analysis_path),
            language_code="unknown",
            mode="codemix",
        )

    except Exception as exc:

        return {
            "success": False,
            "error": (
                f"Sarvam STT failed: {exc}"
            ),
        }


    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "success": True,

        "filename":
            file.filename,

        "emotion": {

            "predicted":
                emotion_results[0]["emotion"],

            "confidence":
                emotion_results[0]["score"],

            "scores":
                emotion_results,
        },

        "transcription": {

            "text":
                stt_result["transcript"],

            "language":
                stt_result["language_code"],

            "request_id":
                stt_result["request_id"],
        },
    }