import logging
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import torch
import librosa
from transformers import AutoFeatureExtractor, WavLMModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SpeechEmbeddings")

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

WAVLM_MODEL_ID = "microsoft/wavlm-base-plus"
feature_extractor = None
wavlm_model = None


def load_wavlm_model(model_id: str = WAVLM_MODEL_ID):
    global feature_extractor, wavlm_model
    if wavlm_model is not None:
        return feature_extractor, wavlm_model

    logger.info(f"Loading WavLM feature extractor & model from {model_id} on {DEVICE}...")
    try:
        feature_extractor = AutoFeatureExtractor.from_pretrained(model_id)
        wavlm_model = WavLMModel.from_pretrained(model_id)
        wavlm_model.to(DEVICE)
        wavlm_model.eval()
        logger.info(f"WavLM model loaded successfully on {DEVICE}.")
    except Exception as e:
        logger.error(f"Failed to load WavLM model ({model_id}): {e}")
        wavlm_model = None
        feature_extractor = None

    return feature_extractor, wavlm_model


def extract_wavlm_embeddings(
    audio_path: str,
    target_sr: int = 16000,
) -> Dict[str, Any]:
    """
    Extract frame-level (50Hz / 20ms) and utterance-level acoustic embeddings
    using WavLM, capturing paralinguistic distress, gasps, and vocal tremors.
    """
    try:
        y, sr = librosa.load(audio_path, sr=target_sr, mono=True)
    except Exception as e:
        logger.error(f"Error loading audio for WavLM {audio_path}: {e}")
        return {
            "success": False,
            "error": str(e),
            "frame_embeddings": None,
            "utterance_embedding": None,
            "num_frames": 0,
            "frame_times": [],
        }

    duration_sec = float(len(y) / sr)
    if duration_sec < 0.1:
        return {
            "success": False,
            "error": "Audio clip too short",
            "frame_embeddings": None,
            "utterance_embedding": None,
            "num_frames": 0,
            "frame_times": [],
        }

    feat_extractor, model = load_wavlm_model()
    if model is None:
        # Fallback dummy representation if model download is offline
        num_frames = max(1, int(duration_sec * 50))
        dummy_frames = np.zeros((num_frames, 768), dtype=np.float32)
        frame_times = [round(i * 0.02, 3) for i in range(num_frames)]
        return {
            "success": True,
            "fallback": True,
            "frame_embeddings": dummy_frames,
            "utterance_embedding": np.zeros(768, dtype=np.float32),
            "num_frames": num_frames,
            "frame_times": frame_times,
            "hidden_dim": 768,
        }

    try:
        inputs = feat_extractor(
            y,
            sampling_rate=16000,
            return_tensors="pt",
            padding=True,
        )
        input_values = inputs.input_values.to(DEVICE)

        with torch.no_grad():
            outputs = model(input_values)
            # outputs.last_hidden_state: [batch_size, sequence_length, hidden_dim]
            hidden_states = outputs.last_hidden_state.squeeze(0).cpu().numpy()

        num_frames = hidden_states.shape[0]
        hidden_dim = hidden_states.shape[1]
        
        # Frame timestamps (approx 20ms / 50Hz stride)
        frame_times = [round(i * (duration_sec / max(1, num_frames)), 3) for i in range(num_frames)]
        utterance_vec = np.mean(hidden_states, axis=0)

        return {
            "success": True,
            "frame_embeddings": hidden_states,  # np.ndarray [num_frames, hidden_dim]
            "utterance_embedding": utterance_vec,  # np.ndarray [hidden_dim]
            "num_frames": num_frames,
            "hidden_dim": hidden_dim,
            "frame_times": frame_times,
            "duration_sec": round(duration_sec, 2),
        }

    except Exception as e:
        logger.error(f"Error extracting WavLM embeddings: {e}")
        return {
            "success": False,
            "error": str(e),
            "frame_embeddings": None,
            "utterance_embedding": None,
            "num_frames": 0,
            "frame_times": [],
        }
