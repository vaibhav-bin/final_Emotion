import logging
import re
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import torch
from transformers import AutoTokenizer, AutoModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MuRILAnalyzer")

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MURIL_MODEL_ID = "google/muril-base-cased"

muril_tokenizer = None
muril_model = None

# ============================================================
# DOMAIN TAXONOMY: SC/ST ATROCITIES, THREATS & TRAUMA KEYWORDS
# (Covers Hindi, Hinglish, Marathi, Tamil/Telugu romanized & English)
# ============================================================
ATROCITY_TAXONOMY = {
    "IMMEDIATE_PHYSICAL_VIOLENCE": {
        "severity": "CRITICAL",
        "weight": 1.0,
        "keywords": [
            "जान से मार", "मार डालेंगे", "काट देंगे", "जिंदा जला", "खून कर",
            "हत्या", "तलवार", "बंदूक", "गोली मार", "कुल्हाड़ी", "मारपीट",
            "डंडों से पीटा", "घेराव", "घर घेर लिया",
            "kill", "murder", "burn alive", "weapon", "shoot", "attack with sword",
            "hang", "maarna", "jaan se maar", "goli maar", "kat dunga", "mob", "encircled"
        ],
    },
    "SEXUAL_VIOLENCE_AND_ASSAULT": {
        "severity": "CRITICAL",
        "weight": 1.0,
        "keywords": [
            "बलात्कार", "गैंगरेप", "छेड़छाड़", "कपड़े फाड़", "इज्जत लूटी",
            "यौन शोषण", "अश्लील हरकत", "rape", "gangrape", "molest", "sexual assault",
            "stripped naked", "izzat loot", "chhedchhad"
        ],
    },
    "SUICIDAL_IDEATION_SELF_HARM": {
        "severity": "CRITICAL",
        "weight": 1.0,
        "keywords": [
            "आत्महत्या", "खुदकुशी", "जहर खा", "जीने की हिम्मत नहीं", "फांसी लगा",
            "मर जाना चाहता", "जान दे दूंगा", "suicide", "kill myself", "end my life",
            "poison", "hang myself", "zeher khaa", "mar jaunga", "kuch nahi bacha"
        ],
    },
    "SOCIAL_BOYCOTT_AND_BLOCKADE": {
        "severity": "HIGH",
        "weight": 0.85,
        "keywords": [
            "हुक्का पानी बंद", "सामाजिक बहिष्कार", "पानी नहीं भरने दे रहे",
            "दुकान से सामान नहीं", "गाँव से निकाल", "बहिष्कार", "कुएं से पानी",
            "रास्ता रोक दिया", "मंदिर में प्रवेश नहीं", "हजामत बंद",
            "social boycott", "denied water", "ostracized", "village boycott",
            "hukka pani band", "paani nahi lene de rahe", "bahishkar", "road blocked"
        ],
    },
    "CASTE_SLURS_AND_HUMILIATION": {
        "severity": "HIGH",
        "weight": 0.80,
        "keywords": [
            "जातिसूचक गाली", "नीच जाति", "चमार", "भंगी", "दलित साला",
            "अछूत", "जूता चटवाया", "मुंह काला", "पेशाब पिलाया", "गला घोंटा",
            "casteist abuse", "caste slur", "untouchable", "forced to crawl",
            "neech jati", "chamar", "bhangi", "achhoot", "caste humiliation"
        ],
    },
    "DISPLACEMENT_AND_PROPERTY_DAMAGE": {
        "severity": "HIGH",
        "weight": 0.75,
        "keywords": [
            "घर जला दिया", "घर तोड़ दिया", "जमीन कब्जा", "बेदखल", "झोपड़ी जलाई",
            "फसल बर्बाद", "बुलडोजर", "सामान फेंक दिया",
            "house burnt", "demolished house", "land grabbed", "forceful eviction",
            "ghar tod diya", "zameen cheen li", "ghar jala diya", "crops burnt"
        ],
    },
    "POLICE_INACTION_AND_OBSTRUCTION": {
        "severity": "HIGH",
        "weight": 0.75,
        "keywords": [
            "थाने में सुनवाई नहीं", "एफआईआर दर्ज नहीं", "पुलिस मदद नहीं कर रही",
            "दरोगा भगा दिया", "धक्के मारकर निकाला", "कोई रिपोर्ट नहीं लिखी",
            "police not taking fir", "refused to register fir", "no police action",
            "thana nahi sun raha", "fir darj nahi"
        ],
    },
    "INTIMIDATION_AND_THREAT": {
        "severity": "MODERATE",
        "weight": 0.65,
        "keywords": [
            "धमकी दी", "केस वापस ले", "गवाही मत दे", "पुलिस में मत जा",
            "परिवार को उठा लेंगे", "बच्चों को नुकसान",
            "threatened", "withdraw case", "witness intimidation", "police complaint threat",
            "dhamki", "case wapas le", "police me mat jao", "threat to children"
        ],
    },
    "SEVERE_PSYCHOLOGICAL_DISTRESS": {
        "severity": "HIGH",
        "weight": 0.70,
        "keywords": [
            "बहुत डरे हुए", "कांप रहे हैं", "रो रहे हैं", "कोई मदद नहीं",
            "बेबस हैं", "जान बचाओ", "हम क्या करें",
            "terrorized", "trembling with fear", "hopeless", "crying non stop",
            "darr lag raha", "kaamp rahe", "madad karo", "bachao", "helpless"
        ],
    },
}


def load_muril_model(model_id: str = MURIL_MODEL_ID):
    """Load Google MuRIL tokenizer and model into GPU memory."""
    global muril_tokenizer, muril_model
    if muril_model is not None:
        return muril_tokenizer, muril_model

    logger.info(f"Loading Google MuRIL Indic model ({model_id}) on {DEVICE}...")
    try:
        muril_tokenizer = AutoTokenizer.from_pretrained(model_id)
        muril_model = AutoModel.from_pretrained(model_id)
        muril_model.to(DEVICE)
        muril_model.eval()
        logger.info("MuRIL Indic model loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load MuRIL model ({model_id}): {e}")
        muril_tokenizer = None
        muril_model = None

    return muril_tokenizer, muril_model


def analyze_transcript_semantics(
    transcript: str,
    language_code: str = "hi-IN",
) -> Dict[str, Any]:
    """
    Extract token representations via Google MuRIL and detect
    caste atrocity, physical violence, social boycott, and trauma indicators from the textual narrative.
    """
    if not transcript or not transcript.strip():
        return {
            "success": True,
            "transcript": "",
            "detected_categories": [],
            "max_severity": "LOW",
            "linguistic_threat_score": 0.0,
            "suicidal_risk_flag": False,
            "immediate_threat_flag": False,
            "detected_indicators": [],
            "token_embeddings": None,
            "hidden_dim": 768,
        }

    text_clean = transcript.strip()
    text_lower = text_clean.lower()

    # ========================================================
    # 1. TAXONOMY KEYWORD MATCHING & SPAN EXTRACTION
    # ========================================================
    detected_categories = []
    detected_indicators = []
    max_severity = "LOW"
    max_weight = 0.0
    suicidal_risk_flag = False
    immediate_threat_flag = False

    severity_rank = {"LOW": 0, "MODERATE": 1, "HIGH": 2, "CRITICAL": 3}

    for cat_name, cat_meta in ATROCITY_TAXONOMY.items():
        matched_kws = []
        for kw in cat_meta["keywords"]:
            if kw.lower() in text_lower:
                matched_kws.append(kw)

        if matched_kws:
            weight = cat_meta["weight"]
            severity = cat_meta["severity"]
            if weight > max_weight:
                max_weight = weight

            if severity_rank[severity] > severity_rank[max_severity]:
                max_severity = severity

            if cat_name == "SUICIDAL_IDEATION_SELF_HARM":
                suicidal_risk_flag = True
            if cat_name in ["IMMEDIATE_PHYSICAL_VIOLENCE", "SEXUAL_VIOLENCE_AND_ASSAULT"]:
                immediate_threat_flag = True

            detected_categories.append({
                "category": cat_name,
                "severity": severity,
                "weight": weight,
                "matched_terms": matched_kws,
            })

            # User-friendly sign description
            readable_name = cat_name.replace("_", " ").title()
            terms_preview = ", ".join(matched_kws[:3])
            detected_indicators.append(f"{readable_name} (Matches: \"{terms_preview}\")")

    # ========================================================
    # 2. GOOGLE MuRIL DEEP INDIC TOKEN EMBEDDINGS
    # ========================================================
    tokenizer, model = load_muril_model()
    token_embeddings = None
    tokens_list = []

    if tokenizer is not None and model is not None:
        try:
            inputs = tokenizer(
                text_clean,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=256,
            )
            input_ids = inputs["input_ids"].to(DEVICE)
            attention_mask = inputs["attention_mask"].to(DEVICE)

            with torch.no_grad():
                outputs = model(input_ids=input_ids, attention_mask=attention_mask)
                # outputs.last_hidden_state: [1, seq_len, 768]
                token_embeddings = outputs.last_hidden_state.squeeze(0).cpu().numpy()

            tokens_list = tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])
        except Exception as e:
            logger.error(f"Error computing MuRIL embeddings: {e}")
            token_embeddings = None

    # ========================================================
    # 3. ENRICHED NARRATIVE THREAT COMPUTATION
    # ========================================================
    base_score = max_weight
    
    # Co-occurrence penalty: compound multiple distinct atrocity aspects (e.g. death threat + boycott + caste slur)
    co_occurrence_boost = min(0.30, len(detected_categories) * 0.10)

    # Narrative length/density nuance: if narrative has 3+ matched triggers, amplify baseline
    if len(detected_categories) >= 3:
        base_score = max(base_score, 0.90)

    linguistic_threat_score = round(min(1.0, base_score + co_occurrence_boost), 3)

    return {
        "success": True,
        "transcript": text_clean,
        "language_code": language_code,
        "detected_categories": detected_categories,
        "max_severity": max_severity,
        "linguistic_threat_score": linguistic_threat_score,
        "suicidal_risk_flag": suicidal_risk_flag,
        "immediate_threat_flag": immediate_threat_flag,
        "detected_indicators": detected_indicators,
        "tokens": tokens_list[:50],  # sample tokens
        "token_embeddings": token_embeddings,  # np.ndarray [seq_len, 768]
        "num_tokens": len(tokens_list),
        "hidden_dim": 768,
    }
