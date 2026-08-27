import logging
import torch
from funasr import AutoModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("EmotionModel")

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
logger.info(f"Using device for Emotion AI: {DEVICE}")
if torch.cuda.is_available():
    logger.info(f"GPU: {torch.cuda.get_device_name(0)}")

# ============================================================
# PRIMARY: emotion2vec+ large
# ============================================================
PRIMARY_MODEL_ID = "emotion2vec/emotion2vec_plus_large"
logger.info(f"Loading primary emotion model: {PRIMARY_MODEL_ID}...")

try:
    e2v_model = AutoModel(
        model=PRIMARY_MODEL_ID,
        hub="hf",
        device=DEVICE,
        disable_update=True,
    )
    logger.info("Primary emotion model (emotion2vec_plus_large) loaded successfully.")
except Exception as e:
    logger.error(f"Failed to load primary emotion model: {e}")
    e2v_model = None

# ============================================================
# BACKUP: Whisper-Large-v3 Emotion (lazy-loaded fallback)
# ============================================================
BACKUP_MODEL_ID = "firdhokk/speech-emotion-recognition-with-openai-whisper-large-v3"
whisper_pipeline = None

def get_whisper_backup_pipeline():
    global whisper_pipeline
    if whisper_pipeline is None:
        logger.info(f"Loading backup Whisper emotion model: {BACKUP_MODEL_ID}...")
        from transformers import pipeline
        whisper_pipeline = pipeline(
            "audio-classification",
            model=BACKUP_MODEL_ID,
            device=0 if torch.cuda.is_available() else -1,
        )
        logger.info("Backup Whisper emotion model loaded.")
    return whisper_pipeline

# ============================================================
# LABEL NORMALIZATION
# ============================================================
LABEL_MAP = {
    "生气/angry": "Angry",
    "厌恶/disgusted": "Disgusted",
    "恐惧/fearful": "Fearful",
    "开心/happy": "Happy",
    "中立/neutral": "Neutral",
    "其他/other": "Other",
    "难过/sad": "Sad",
    "吃惊/surprised": "Surprised",
    "<unk>": "Neutral",
    "angry": "Angry",
    "disgusted": "Disgusted",
    "fearful": "Fearful",
    "happy": "Happy",
    "neutral": "Neutral",
    "sad": "Sad",
    "surprised": "Surprised",
}

def normalize_label(label: str) -> str:
    if label in LABEL_MAP:
        return LABEL_MAP[label]
    cleaned = label.split("/")[-1].strip().lower()
    return LABEL_MAP.get(cleaned, cleaned.capitalize())

# ============================================================
# PREDICT FUNCTION
# ============================================================
def predict_emotion(audio_path: str, prefer_primary: bool = True):
    """
    Predict speech emotions using emotion2vec_plus_large as primary,
    with automatic fallback to Whisper-Large-v3 emotion model.
    """
    if prefer_primary and e2v_model is not None:
        try:
            res = e2v_model.generate(
                audio_path,
                granularity="utterance",
                extract_embedding=False,
            )
            if res and len(res) > 0:
                item = res[0]
                labels = item.get("labels", [])
                scores = item.get("scores", [])
                
                parsed = [
                    {
                        "emotion": normalize_label(lbl),
                        "score": float(score),
                    }
                    for lbl, score in zip(labels, scores)
                ]
                parsed.sort(key=lambda x: x["score"], reverse=True)
                return parsed
        except Exception as exc:
            logger.warning(f"emotion2vec+ inference failed on {audio_path}, falling back to Whisper: {exc}")

    # Fallback to Whisper model
    backup = get_whisper_backup_pipeline()
    results = backup(audio_path)
    parsed = [
        {
            "emotion": normalize_label(item["label"]),
            "score": float(item["score"]),
        }
        for item in results
    ]
    parsed.sort(key=lambda x: x["score"], reverse=True)
    return parsed