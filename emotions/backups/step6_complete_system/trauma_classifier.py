import logging
from typing import Any, Dict, List, Optional
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TraumaClassifier")

# Class Labels
CLASSES = {
    0: "Class 0: Low Stress / Normal Grievance",
    1: "Class 1: Acute Stress / Heightened Anxiety",
    2: "Class 2: Deep Trauma / Structural Fear & Danger",
}

CLASS_SHORT_NAMES = {
    0: "LOW_STRESS",
    1: "ACUTE_STRESS",
    2: "DEEP_TRAUMA",
}


def classify_trauma_and_svi(
    prosody_data: Dict[str, Any],
    semantics_data: Dict[str, Any],
    emotion_scores: List[Dict[str, Any]],
    fusion_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Compute 3-Class Trauma probabilities, continuous SVI (0-100),
    Risk Category (Low/Moderate/High/Critical), and explainable sign provenance.
    """
    # ========================================================
    # 1. EXTRACT MULTIMODAL FEATURE SIGNALS
    # ========================================================
    # Linguistic Threat (0.0 - 1.0)
    ling_score = float(semantics_data.get("linguistic_threat_score", 0.0))
    suicidal_flag = bool(semantics_data.get("suicidal_risk_flag", False))
    immediate_threat_flag = bool(semantics_data.get("immediate_threat_flag", False))
    max_severity = str(semantics_data.get("max_severity", "LOW"))

    # Acoustic Panic Index (0.0 - 1.0)
    acoustic_score = float(prosody_data.get("acoustic_panic_index", 0.0))
    jitter_pct = float(prosody_data.get("perturbation", {}).get("jitter_percentage", 0.0))
    shimmer_pct = float(prosody_data.get("perturbation", {}).get("shimmer_percentage", 0.0))
    pitch_jumps = int(prosody_data.get("pitch", {}).get("pitch_jumps_count", 0))
    longest_pause = float(prosody_data.get("pauses", {}).get("longest_pause_sec", 0.0))

    # Emotion AI Distribution
    emotion_dict = {item.get("emotion", "").lower(): float(item.get("score", 0.0)) for item in emotion_scores}
    fear_prob = emotion_dict.get("fearful", 0.0)
    sad_prob = emotion_dict.get("sad", 0.0)
    angry_prob = emotion_dict.get("angry", 0.0)
    neutral_prob = emotion_dict.get("neutral", 0.0)

    # Distress emotion aggregate
    vocal_distress_score = min(1.0, fear_prob * 1.0 + sad_prob * 0.70 + angry_prob * 0.50)

    # Multimodal Co-occurrence Signals
    co_occur_signals = fusion_data.get("co_occurrence_signals", [])
    co_occur_boost = min(0.20, len(co_occur_signals) * 0.08)

    # ========================================================
    # 2. SVI CONTINUOUS SCORE CALCULATION (0 - 100)
    # ========================================================
    # Weights:
    # 35% Linguistic Atrocity Threat
    # 25% Vocal Emotion AI (Fear/Sad)
    # 20% Acoustic Biomarkers (Jitter/Shimmer/Pitch/Pauses)
    # 10% Co-occurrence alignment
    # 10% Structural Atrocity severity baseline
    base_svi = (
        0.35 * ling_score
        + 0.25 * vocal_distress_score
        + 0.20 * acoustic_score
        + 0.10 * co_occur_boost
        + 0.10 * (0.85 if max_severity in ["HIGH", "CRITICAL"] else 0.15)
    ) * 100.0

    raw_svi = round(float(np.clip(base_svi, 0.0, 100.0)), 1)
    final_svi = raw_svi
    safety_overrides_applied = []

    # ========================================================
    # 3. DETERMINISTIC SAFETY OVERRIDES
    # ========================================================
    if suicidal_flag:
        final_svi = max(final_svi, 92.0)
        safety_overrides_applied.append("CRITICAL: Suicidal Ideation / Extreme Hopelessness Detected -> SVI forced to >= 92")

    if immediate_threat_flag:
        final_svi = max(final_svi, 82.0)
        safety_overrides_applied.append("CRITICAL: Imminent Physical Violence / Weapon Threat -> SVI forced to >= 82")

    if max_severity == "HIGH" and final_svi < 55.0:
        final_svi = 55.0
        safety_overrides_applied.append("HIGH: Atrocity / Social Boycott Pattern Detected -> SVI forced to >= 55")

    final_svi = round(min(100.0, final_svi), 1)

    # ========================================================
    # 4. 3-CLASS TRAUMA SOFTMAX PROBABILITIES
    # ========================================================
    # Class 0: Low Stress
    # Class 1: Acute Stress
    # Class 2: Deep Trauma
    if final_svi >= 70.0:
        p2 = min(0.96, 0.65 + (final_svi - 70.0) / 100.0)
        p1 = (1.0 - p2) * 0.80
        p0 = 1.0 - p2 - p1
        predicted_class_idx = 2
    elif final_svi >= 40.0:
        p1 = min(0.85, 0.55 + (final_svi - 40.0) / 100.0)
        p2 = (1.0 - p1) * (final_svi / 80.0)
        p0 = 1.0 - p1 - p2
        predicted_class_idx = 1
    else:
        p0 = min(0.95, 0.65 + (40.0 - final_svi) / 100.0)
        p1 = (1.0 - p0) * 0.85
        p2 = 1.0 - p0 - p1
        predicted_class_idx = 0

    class_probabilities = [
        {"class_id": 0, "name": CLASSES[0], "short_name": CLASS_SHORT_NAMES[0], "probability": round(float(p0), 4)},
        {"class_id": 1, "name": CLASSES[1], "short_name": CLASS_SHORT_NAMES[1], "probability": round(float(p1), 4)},
        {"class_id": 2, "name": CLASSES[2], "short_name": CLASS_SHORT_NAMES[2], "probability": round(float(p2), 4)},
    ]

    # ========================================================
    # 5. RISK BAND CATEGORIZATION
    # ========================================================
    if final_svi >= 75.0:
        risk_category = "CRITICAL"
        risk_color = "#dc2626"
    elif final_svi >= 50.0:
        risk_category = "HIGH"
        risk_color = "#ea580c"
    elif final_svi >= 25.0:
        risk_category = "MODERATE"
        risk_color = "#d97706"
    else:
        risk_category = "LOW"
        risk_color = "#16a34a"

    # ========================================================
    # 6. EXPLAINABLE DETECTED SIGNS WITH PROVENANCE
    # ========================================================
    all_detected_signs = []

    # Semantic signs
    for ind in semantics_data.get("detected_indicators", []):
        all_detected_signs.append({
            "source": "Linguistic Semantics (MuRIL)",
            "sign": ind,
            "type": "nlp",
        })

    # Emotion signs
    if fear_prob >= 0.35:
        all_detected_signs.append({
            "source": "Speech Emotion AI (emotion2vec+)",
            "sign": f"Dominant Vocal Fear ({(fear_prob*100):.1f}% confidence)",
            "type": "emotion",
        })
    if sad_prob >= 0.30:
        all_detected_signs.append({
            "source": "Speech Emotion AI (emotion2vec+)",
            "sign": f"Vocal Sadness / Despair ({(sad_prob*100):.1f}% confidence)",
            "type": "emotion",
        })

    # Acoustic signs
    for sign in prosody_data.get("acoustic_distress_signs", []):
        all_detected_signs.append({
            "source": "Acoustic Prosody (Librosa)",
            "sign": sign,
            "type": "acoustic",
        })

    # Co-occurrence signs
    for co in co_occur_signals:
        all_detected_signs.append({
            "source": "Multimodal Cross-Attention Alignment",
            "sign": f"\"{co['word']}\" at {co['timestamp']} — {co['evidence']}",
            "type": "fusion",
        })

    return {
        "success": True,
        "svi_score": final_svi,
        "raw_svi": raw_svi,
        "risk_category": risk_category,
        "risk_color": risk_color,
        "predicted_class": {
            "class_id": predicted_class_idx,
            "label": CLASSES[predicted_class_idx],
            "short_name": CLASS_SHORT_NAMES[predicted_class_idx],
        },
        "class_probabilities": class_probabilities,
        "safety_overrides": safety_overrides_applied,
        "detected_signs": all_detected_signs,
        "sub_scores": {
            "linguistic_threat": round(ling_score * 100, 1),
            "vocal_distress": round(vocal_distress_score * 100, 1),
            "acoustic_panic": round(acoustic_score * 100, 1),
            "multimodal_co_occurrence": round(co_occur_boost * 500, 1),
        },
    }
