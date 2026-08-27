import json
import logging
import re
from typing import Any, Dict, List, Optional
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NHAA_LLM_Reasoner")

_MODEL = None
_TOKENIZER = None
MODEL_ID = "Qwen/Qwen2.5-1.5B-Instruct"


def get_llm_model():
    """Lazy-load the local LLM model and tokenizer onto GPU."""
    global _MODEL, _TOKENIZER
    if _MODEL is not None and _TOKENIZER is not None:
        return _MODEL, _TOKENIZER

    try:
        logger.info(f"Loading local Indic LLM Reasoner ({MODEL_ID}) on GPU...")
        _TOKENIZER = AutoTokenizer.from_pretrained(MODEL_ID)
        
        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if torch.cuda.is_available() else torch.float32

        _MODEL = AutoModelForCausalLM.from_pretrained(
            MODEL_ID,
            dtype=dtype,
            device_map="auto" if torch.cuda.is_available() else None,
        )
        logger.info(f"Local LLM Reasoner ({MODEL_ID}) initialized successfully on {device}.")
        return _MODEL, _TOKENIZER
    except Exception as exc:
        logger.error(f"Failed to load local LLM model {MODEL_ID}: {exc}")
        return None, None


SYSTEM_PROMPT = """You are the Lead Forensic Psychologist & Statutory Legal Triage Officer for the National Helpline Against Atrocities (14566) under the Ministry of Social Justice and Empowerment, Government of India.
Your mission is to perform non-deterministic, deep contextual analysis of victim grievances under the Scheduled Castes and the Scheduled Tribes (Prevention of Atrocities) Act, 1989 and its Rules.

Do NOT rely on keyword matching. Analyze the whole situational context, implicit power imbalances, social boycott, physical peril, emotional trauma, and structural vulnerability.

You MUST respond strictly with a valid, parseable JSON object matching this exact schema:
{
  "contextual_narrative": "Detailed 2-3 sentence synthesis of what the victim is experiencing",
  "svi_score": 85.0,
  "risk_category": "CRITICAL" or "HIGH" or "MODERATE" or "LOW",
  "urgency_level": "CRITICAL EMERGENCY (< 15 MINS)" or "HIGH PRIORITY (< 2 HOURS)" or "STANDARD (< 24 HOURS)",
  "primary_action": "Single crisp statutory imperative for the dispatch officer",
  "officer_brief": "Executive administrative summary explaining the emergency, power dynamic, and statutory context",
  "detected_atrocities": ["Atrocity dimension 1", "Atrocity dimension 2"],
  "explainability_nodes": [
    {
      "id": "01",
      "title": "Contextual Evidence Title",
      "description": "Specific finding from caller narrative or vocal cues",
      "evidence": "Cognitive Context Head"
    }
  ],
  "statutory_recommendations": [
    {
      "icon": "🚔" or "⚖️" or "🏥" or "🛡️" or "📌",
      "title": "Statutory Action Title",
      "urgency": "Immediate Protocol" or "Within 2 Hours" or "Statutory Filing",
      "action": "Concrete operational instruction for helpline officer",
      "statutory_reference": "Section 15A / Rule 12(4) / Section 3(1) of SC/ST (PoA) Act"
    }
  ]
}
"""


def assess_trauma_nondeterministic(
    transcript_text: str,
    language_code: str = "hi-IN",
    prosody_summary: Optional[Dict[str, Any]] = None,
    emotion_summary: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Evaluates grievance severity and generates context-aware SOP recommendations
    using local generative LLM inference without keyword matching.
    """
    model, tokenizer = get_llm_model()

    if model is None or tokenizer is None:
        logger.warning("LLM model not available, returning None for fallback handling.")
        return None

    prosody = prosody_summary or {}
    emotions = emotion_summary or []
    top_emotion = emotions[0]["emotion"] if emotions else "Unknown"
    top_emotion_score = round(emotions[0]["score"] * 100, 1) if emotions else 0

    user_content = f"""Evaluate this helpline interaction:

--- CALLER GRIEVANCE TRANSCRIPT ---
Language: {language_code}
Transcript: "{transcript_text}"

--- MULTIMODAL ACOUSTIC BIOMARKERS ---
- Dominant Vocal Emotion: {top_emotion} ({top_emotion_score}% confidence)
- Pitch Drift / Perturbation (Jitter): {prosody.get('perturbation', {}).get('jitter_percent', 'Normal')}%
- Amplitude Perturbation (Shimmer): {prosody.get('perturbation', {}).get('shimmer_percent', 'Normal')}%
- Hesitation / Trauma Pauses: {prosody.get('pauses', {}).get('pause_count', 0)} detected (Acoustic Hesitancy Index: {prosody.get('acoustic_panic_index', 0.0)}/100)

Perform deep contextual triage, calculate SVI score (0-100), assign statutory interventions under SC/ST (PoA) Act, and output ONLY valid JSON.
"""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

    try:
        chat_text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer(chat_text, return_tensors="pt").to(model.device)

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=650,
                temperature=0.2,  # Low temperature for deterministic adherence to JSON schema
                top_p=0.9,
                do_sample=True,
            )

        gen_text = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)

        # Parse JSON from LLM response
        json_match = re.search(r"\{[\s\S]*\}", gen_text)
        if json_match:
            parsed = json.loads(json_match.group(0))
            logger.info("Successfully generated non-deterministic LLM assessment.")
            return parsed
        else:
            logger.warning(f"Could not extract JSON from LLM generation: {gen_text[:200]}")
            return None

    except Exception as exc:
        logger.error(f"Non-deterministic LLM assessment error: {exc}")
        return None
