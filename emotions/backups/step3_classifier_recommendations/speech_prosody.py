import logging
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import librosa
import soundfile as sf

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SpeechProsody")


def extract_prosody_features(
    audio_path: str,
    target_sr: int = 16000,
    frame_length: int = 2048,
    hop_length: int = 512,
) -> Dict[str, Any]:
    """
    Extract baseline prosody, pitch dynamics, jitter, shimmer, 
    energy fluctuations, and vocal distress biomarkers from raw audio.
    """
    try:
        y, sr = librosa.load(audio_path, sr=target_sr, mono=True)
    except Exception as e:
        logger.error(f"Error loading audio for prosody analysis {audio_path}: {e}")
        return _get_default_prosody_dict(error=str(e))

    duration_sec = float(librosa.get_duration(y=y, sr=sr))
    if duration_sec < 0.1:
        return _get_default_prosody_dict(error="Audio too short for prosody extraction")

    # ========================================================
    # 1. FUNDAMENTAL FREQUENCY (F0 / Pitch) via PYIN
    # ========================================================
    fmin = librosa.note_to_hz("C2")  # ~65 Hz
    fmax = librosa.note_to_hz("C7")  # ~2093 Hz

    try:
        f0, voiced_flag, voiced_probs = librosa.pyin(
            y,
            fmin=fmin,
            fmax=fmax,
            sr=sr,
            frame_length=frame_length,
            hop_length=hop_length,
        )
    except Exception as e:
        logger.warning(f"pyin failed on {audio_path}: {e}, falling back to yin")
        try:
            f0 = librosa.yin(y, fmin=fmin, fmax=fmax, sr=sr, frame_length=frame_length, hop_length=hop_length)
            voiced_flag = ~np.isnan(f0)
            voiced_probs = voiced_flag.astype(float)
        except Exception:
            f0 = np.array([np.nan])
            voiced_flag = np.array([False])
            voiced_probs = np.array([0.0])

    voiced_f0 = f0[voiced_flag & ~np.isnan(f0)] if voiced_flag is not None else np.array([])

    if len(voiced_f0) > 0:
        mean_f0 = float(np.mean(voiced_f0))
        std_f0 = float(np.std(voiced_f0))
        min_f0 = float(np.min(voiced_f0))
        max_f0 = float(np.max(voiced_f0))
        pitch_range_hz = float(max_f0 - min_f0)
        
        # Calculate sudden pitch jumps (> 35 Hz between consecutive voiced frames)
        f0_diffs = np.abs(np.diff(voiced_f0))
        pitch_jumps_count = int(np.sum(f0_diffs > 35.0))
        pitch_instability = float(std_f0 / (mean_f0 + 1e-6))
    else:
        mean_f0 = 0.0
        std_f0 = 0.0
        min_f0 = 0.0
        max_f0 = 0.0
        pitch_range_hz = 0.0
        pitch_jumps_count = 0
        pitch_instability = 0.0

    # ========================================================
    # 2. RMS ENERGY & DYNAMICS
    # ========================================================
    rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
    mean_rms = float(np.mean(rms)) if len(rms) > 0 else 0.0
    std_rms = float(np.std(rms)) if len(rms) > 0 else 0.0
    max_rms = float(np.max(rms)) if len(rms) > 0 else 0.0
    
    # Energy spikes (> 2 standard deviations above mean)
    rms_spikes_count = int(np.sum(rms > (mean_rms + 2.0 * std_rms))) if std_rms > 0 else 0
    # Breathless drops (< 0.25 of mean rms during voiced segments)
    energy_drops_count = int(np.sum(rms < (0.25 * mean_rms))) if mean_rms > 0 else 0

    # ========================================================
    # 3. JITTER & SHIMMER (Voice cracks, trembling, sobbing)
    # ========================================================
    jitter_local, shimmer_local = _calculate_jitter_shimmer(voiced_f0, y, sr, hop_length)

    # ========================================================
    # 4. SPECTRAL BIOMARKERS (Gasps, breathiness, friction)
    # ========================================================
    spec_flat = librosa.feature.spectral_flatness(y=y, hop_length=hop_length)[0]
    mean_spectral_flatness = float(np.mean(spec_flat)) if len(spec_flat) > 0 else 0.0

    zcr = librosa.feature.zero_crossing_rate(y=y, hop_length=hop_length)[0]
    mean_zcr = float(np.mean(zcr)) if len(zcr) > 0 else 0.0

    # ========================================================
    # 5. VOICE ACTIVITY & PAUSE ANOMALIES
    # ========================================================
    pause_info = _extract_pause_metrics(rms, sr, hop_length, duration_sec)

    # ========================================================
    # 6. COMPOSITE ACOUSTIC PANIC / DISTRESS SCORE (0.0 - 1.0)
    # ========================================================
    jitter_score = min(1.0, jitter_local / 0.04)
    shimmer_score = min(1.0, shimmer_local / 0.08)
    pitch_instab_score = min(1.0, pitch_instability / 0.40)
    pause_anomaly_score = min(1.0, pause_info["longest_pause_sec"] / 4.5)

    acoustic_panic_index = float(
        0.30 * jitter_score
        + 0.25 * shimmer_score
        + 0.25 * pitch_instab_score
        + 0.20 * pause_anomaly_score
    )
    acoustic_panic_index = float(np.clip(acoustic_panic_index, 0.0, 1.0))

    # Detected acoustic signs
    detected_signs = []
    if jitter_local > 0.022:
        detected_signs.append(f"Elevated Vocal Jitter ({(jitter_local*100):.1f}%) — voice trembling/crying")
    if shimmer_local > 0.055:
        detected_signs.append(f"Elevated Vocal Shimmer ({(shimmer_local*100):.1f}%) — voice cracks/sobbing breath")
    if pitch_jumps_count >= 3:
        detected_signs.append(f"Frequent Erratic Pitch Jumps ({pitch_jumps_count} bursts) — acute vocal panic")
    if pause_info["longest_pause_sec"] >= 3.0:
        detected_signs.append(f"Prolonged Speech Freezing ({pause_info['longest_pause_sec']:.1f}s pause) — trauma block")
    if mean_spectral_flatness > 0.08:
        detected_signs.append("Acoustic Breathlessness / Gasping Indicator")

    # Time-series frame times (seconds)
    time_frames = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length).tolist()

    return {
        "success": True,
        "duration_sec": round(duration_sec, 2),
        "pitch": {
            "mean_f0_hz": round(mean_f0, 1),
            "std_f0_hz": round(std_f0, 1),
            "min_f0_hz": round(min_f0, 1),
            "max_f0_hz": round(max_f0, 1),
            "pitch_range_hz": round(pitch_range_hz, 1),
            "pitch_jumps_count": pitch_jumps_count,
            "pitch_instability_ratio": round(pitch_instability, 3),
        },
        "energy": {
            "mean_rms": round(mean_rms, 4),
            "std_rms": round(std_rms, 4),
            "max_rms": round(max_rms, 4),
            "rms_spikes_count": rms_spikes_count,
            "energy_drops_count": energy_drops_count,
        },
        "perturbation": {
            "jitter_local": round(jitter_local, 4),
            "shimmer_local": round(shimmer_local, 4),
            "jitter_percentage": round(jitter_local * 100, 2),
            "shimmer_percentage": round(shimmer_local * 100, 2),
        },
        "spectral": {
            "spectral_flatness": round(mean_spectral_flatness, 4),
            "zero_crossing_rate": round(mean_zcr, 4),
        },
        "pauses": pause_info,
        "acoustic_panic_index": round(acoustic_panic_index, 3),
        "acoustic_distress_signs": detected_signs,
        "time_series": {
            "times": [round(t, 2) for t in time_frames[:150]],
            "rms": [round(float(v), 4) for v in rms[:150]],
            "f0": [round(float(v), 1) if not np.isnan(v) else 0.0 for v in f0[:150]],
        },
    }


def _calculate_jitter_shimmer(
    voiced_f0: np.ndarray, y: np.ndarray, sr: int, hop_length: int
) -> Tuple[float, float]:
    """Calculate cycle-to-cycle local jitter and local shimmer."""
    if len(voiced_f0) < 4:
        return 0.008, 0.025

    periods = 1.0 / np.clip(voiced_f0, 50.0, 1000.0)
    period_diffs = np.abs(np.diff(periods))
    mean_period = np.mean(periods)
    jitter_local = float(np.mean(period_diffs) / (mean_period + 1e-8))

    frame_peaks = []
    frame_len = hop_length * 2
    for i in range(0, len(y) - frame_len, hop_length):
        chunk = y[i : i + frame_len]
        peak = np.max(np.abs(chunk))
        if peak > 0.01:
            frame_peaks.append(peak)

    if len(frame_peaks) >= 4:
        peaks = np.array(frame_peaks)
        peak_diffs = np.abs(np.diff(peaks))
        mean_peak = np.mean(peaks)
        shimmer_local = float(np.mean(peak_diffs) / (mean_peak + 1e-8))
    else:
        shimmer_local = 0.03

    return float(np.clip(jitter_local, 0.0, 0.20)), float(np.clip(shimmer_local, 0.0, 0.30))


def _extract_pause_metrics(
    rms: np.ndarray, sr: int, hop_length: int, duration_sec: float
) -> Dict[str, Any]:
    """Extract pause count, pause durations, and speech-to-silence ratio."""
    if len(rms) == 0:
        return {
            "pause_count": 0,
            "longest_pause_sec": 0.0,
            "total_silence_sec": 0.0,
            "speech_ratio": 1.0,
        }

    silence_thresh = max(0.005, 0.12 * float(np.mean(rms)))
    is_silent = rms < silence_thresh
    frame_dur = hop_length / sr

    pause_durations = []
    current_pause_frames = 0

    for silent in is_silent:
        if silent:
            current_pause_frames += 1
        else:
            if current_pause_frames * frame_dur >= 0.30:
                pause_durations.append(current_pause_frames * frame_dur)
            current_pause_frames = 0

    if current_pause_frames * frame_dur >= 0.30:
        pause_durations.append(current_pause_frames * frame_dur)

    pause_count = len(pause_durations)
    longest_pause = float(max(pause_durations)) if pause_durations else 0.0
    total_silence = float(sum(pause_durations)) if pause_durations else 0.0
    speech_ratio = max(0.0, min(1.0, (duration_sec - total_silence) / (duration_sec + 1e-6)))

    return {
        "pause_count": pause_count,
        "longest_pause_sec": round(longest_pause, 2),
        "total_silence_sec": round(total_silence, 2),
        "speech_ratio": round(speech_ratio, 2),
    }


def _get_default_prosody_dict(error: Optional[str] = None) -> Dict[str, Any]:
    return {
        "success": False,
        "error": error or "Unknown prosody extraction error",
        "duration_sec": 0.0,
        "pitch": {
            "mean_f0_hz": 0.0,
            "std_f0_hz": 0.0,
            "min_f0_hz": 0.0,
            "max_f0_hz": 0.0,
            "pitch_range_hz": 0.0,
            "pitch_jumps_count": 0,
            "pitch_instability_ratio": 0.0,
        },
        "energy": {
            "mean_rms": 0.0,
            "std_rms": 0.0,
            "max_rms": 0.0,
            "rms_spikes_count": 0,
            "energy_drops_count": 0,
        },
        "perturbation": {
            "jitter_local": 0.0,
            "shimmer_local": 0.0,
            "jitter_percentage": 0.0,
            "shimmer_percentage": 0.0,
        },
        "spectral": {
            "spectral_flatness": 0.0,
            "zero_crossing_rate": 0.0,
        },
        "pauses": {
            "pause_count": 0,
            "longest_pause_sec": 0.0,
            "total_silence_sec": 0.0,
            "speech_ratio": 1.0,
        },
        "acoustic_panic_index": 0.0,
        "acoustic_distress_signs": [],
        "time_series": {"times": [], "rms": [], "f0": []},
    }
