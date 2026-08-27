import logging
import re
from typing import Dict, Any, Optional
import torch

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NHAA_Translator")

# Translation cache
_TRANSLATION_CACHE: Dict[str, str] = {}


def translate_with_llm(text: str, source_lang: Optional[str] = "auto") -> Optional[str]:
    """
    Translates multi-lingual Indian grievances (Tamil, Hindi, Telugu, Malayalam,
    Kannada, Bengali, Marathi, etc.) and code-mixed text into natural English using
    the local Indic LLM.
    """
    try:
        from llm_reasoner import get_llm_model
        model, tokenizer = get_llm_model()
        if model is None or tokenizer is None:
            return None

        clean_text = text.strip()
        system_prompt = (
            "You are an expert polyglot translator for Indian legal and distress grievances.\n"
            "The input may be in Hindi, Tamil, Telugu, Malayalam, Marathi, Bengali, Kannada, or code-mixed with English.\n"
            "Translate the entire grievance narrative faithfully and accurately into clear, formal English.\n"
            "Do NOT leave any Tamil, Hindi, or regional words untranslated.\n"
            "Output ONLY the English translation without any preamble or quotes."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f'Translate this Indian grievance into English:\n"{clean_text}"'}
        ]

        chat_text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer(chat_text, return_tensors="pt").to(model.device)

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=300,
                temperature=0.1,
                top_p=0.9,
                do_sample=False,
            )

        gen_text = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True).strip()
        # Clean quotes or extra formatting if any
        cleaned = re.sub(r'^["\']|["\']$', '', gen_text).strip()
        return cleaned if cleaned else None

    except Exception as exc:
        logger.warning(f"LLM translation failed: {exc}")
        return None


def translate_to_english(text: str, source_lang: Optional[str] = "auto") -> Dict[str, Any]:
    """
    Translates Indic and code-mixed text to English with multi-tier fallbacks.
    """
    if not text or not text.strip():
        return {
            "success": True,
            "original_text": text,
            "translated_text": text,
            "source_lang": source_lang or "en",
            "target_lang": "en",
        }

    clean_text = text.strip()
    cache_key = f"{source_lang}_{clean_text}"
    if cache_key in _TRANSLATION_CACHE:
        return {
            "success": True,
            "original_text": clean_text,
            "translated_text": _TRANSLATION_CACHE[cache_key],
            "source_lang": source_lang or "auto",
            "target_lang": "en",
        }

    # 1. Primary: Local Indic LLM translation (Handles code-mixing & all Indian dialects)
    llm_translated = translate_with_llm(clean_text, source_lang=source_lang)
    if llm_translated:
        _TRANSLATION_CACHE[cache_key] = llm_translated
        return {
            "success": True,
            "original_text": clean_text,
            "translated_text": llm_translated,
            "source_lang": source_lang or "auto",
            "target_lang": "en",
        }

    # 2. Secondary: Deep Translator (Google Translate engine)
    lang_code = source_lang.split("-")[0].lower() if source_lang and "-" in source_lang else (source_lang or "auto")
    try:
        from deep_translator import GoogleTranslator
        translator = GoogleTranslator(source=lang_code if lang_code != "auto" else "auto", target="en")
        translated = translator.translate(clean_text)
        if translated:
            _TRANSLATION_CACHE[cache_key] = translated
            return {
                "success": True,
                "original_text": clean_text,
                "translated_text": translated,
                "source_lang": lang_code,
                "target_lang": "en",
            }
    except Exception as exc:
        logger.warning(f"Secondary translation failed: {exc}")

    # Fallback to original text if both fail
    return {
        "success": False,
        "original_text": clean_text,
        "translated_text": clean_text,
        "source_lang": lang_code,
        "target_lang": "en",
    }
