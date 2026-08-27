import logging
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MultimodalFusion")

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


class GatedCrossAttentionBlock(nn.Module):
    """
    Lightweight Gated Cross-Attention Layer fusing Text (MuRIL) & Time-Aligned Audio (WavLM).
    Q = Text, K, V = Audio
    """
    def __init__(self, d_model: int = 768, num_heads: int = 4):
        super().__init__()
        self.d_model = d_model
        self.num_heads = num_heads
        self.cross_attn = nn.MultiheadAttention(
            embed_dim=d_model,
            num_heads=num_heads,
            batch_first=True,
        )
        self.norm_text = nn.LayerNorm(d_model)
        self.norm_audio = nn.LayerNorm(d_model)
        
        # Gating Multimodal Unit
        self.gate = nn.Sequential(
            nn.Linear(d_model * 2, d_model),
            nn.Sigmoid(),
        )
        self.output_proj = nn.Linear(d_model, d_model)

    def forward(
        self,
        text_emb: torch.Tensor,
        audio_emb: torch.Tensor,
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        text_emb: [batch_size, seq_len, d_model]
        audio_emb: [batch_size, seq_len, d_model]
        returns: (fused_emb, attn_weights)
        """
        q = self.norm_text(text_emb)
        k = self.norm_audio(audio_emb)
        v = k

        attn_out, attn_weights = self.cross_attn(q, k, v)
        
        # Gating
        concat = torch.cat([text_emb, attn_out], dim=-1)
        g = self.gate(concat)
        fused = g * text_emb + (1.0 - g) * attn_out
        fused = self.output_proj(fused)

        return fused, attn_weights


# Initialize module once
fusion_module = GatedCrossAttentionBlock(d_model=768, num_heads=4).to(DEVICE)
fusion_module.eval()


def align_and_fuse_multimodal(
    prosody_data: Dict[str, Any],
    wavlm_data: Dict[str, Any],
    semantics_data: Dict[str, Any],
    words_data: Optional[List[Dict[str, Any]]] = None,
    emotion_scores: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Align audio frames with text tokens chronologically and fuse representations
    using Gated Cross-Attention and co-occurrence evidence extraction.
    """
    transcript = semantics_data.get("transcript", "")
    duration_sec = prosody_data.get("duration_sec", 0.0)
    token_embeddings = semantics_data.get("token_embeddings")
    frame_embeddings = wavlm_data.get("frame_embeddings")
    frame_times = wavlm_data.get("frame_times", [])

    words = transcript.split()
    num_words = len(words)

    if num_words == 0 or duration_sec <= 0.0:
        return _empty_fusion_result()

    # ========================================================
    # 1. TEMPORAL ALIGNMENT: WORD TO AUDIO SLICES
    # ========================================================
    # Generate word time-slices (from Sarvam word timestamps or uniform segmentation)
    word_alignment = []
    avg_word_dur = duration_sec / max(1, num_words)

    for idx, w in enumerate(words):
        if words_data and idx < len(words_data) and "start_time" in words_data[idx]:
            w_start = float(words_data[idx].get("start_time", idx * avg_word_dur))
            w_end = float(words_data[idx].get("end_time", (idx + 1) * avg_word_dur))
        else:
            w_start = round(idx * avg_word_dur, 2)
            w_end = round((idx + 1) * avg_word_dur, 2)

        word_alignment.append({
            "word": w,
            "start_time": w_start,
            "end_time": w_end,
            "duration": round(w_end - w_start, 2),
        })

    # ========================================================
    # 2. MATCH AUDIO METRICS (PITCH/RMS/WAVLM) PER WORD
    # ========================================================
    time_series = prosody_data.get("time_series", {})
    ts_times = np.array(time_series.get("times", []))
    ts_f0 = np.array(time_series.get("f0", []))
    ts_rms = np.array(time_series.get("rms", []))

    aligned_word_features = []
    aligned_audio_vectors = []

    for w_info in word_alignment:
        w_start, w_end = w_info["start_time"], w_info["end_time"]
        
        # Audio frame indices in WavLM
        if frame_times and frame_embeddings is not None and len(frame_times) == len(frame_embeddings):
            frame_indices = [i for i, t in enumerate(frame_times) if w_start <= t <= w_end]
            if frame_indices:
                w_audio_vec = np.mean(frame_embeddings[frame_indices], axis=0)
            else:
                w_audio_vec = wavlm_data.get("utterance_embedding", np.zeros(768, dtype=np.float32))
        else:
            w_audio_vec = np.zeros(768, dtype=np.float32)

        aligned_audio_vectors.append(w_audio_vec)

        # Prosody inside word window
        if len(ts_times) > 0:
            mask = (ts_times >= w_start) & (ts_times <= w_end)
            w_f0 = float(np.mean(ts_f0[mask])) if np.any(mask) and np.max(ts_f0[mask]) > 0 else 0.0
            w_rms = float(np.mean(ts_rms[mask])) if np.any(mask) else 0.0
        else:
            w_f0 = 0.0
            w_rms = 0.0

        # Check if word is part of high-severity atrocity keyword
        is_threat_word = any(
            w.lower() in cat["matched_terms"]
            for cat in semantics_data.get("detected_categories", [])
            for term in cat.get("matched_terms", [])
            if w.lower() in term
        )

        aligned_word_features.append({
            "word": w_info["word"],
            "start_time": w_info["start_time"],
            "end_time": w_info["end_time"],
            "local_f0_hz": round(w_f0, 1),
            "local_rms": round(w_rms, 4),
            "is_threat_word": is_threat_word,
        })

    # ========================================================
    # 3. GATED CROSS-ATTENTION FORWARD PASS
    # ========================================================
    aligned_audio_mat = np.array(aligned_audio_vectors, dtype=np.float32)  # [N_words, 768]
    
    if token_embeddings is not None and token_embeddings.shape[0] > 0:
        # Interpolate/pool token embeddings to word dimension
        N_tokens = token_embeddings.shape[0]
        if N_tokens == num_words:
            aligned_text_mat = token_embeddings
        else:
            # Average pool or interpolate
            indices = np.linspace(0, N_tokens - 1, num_words).astype(int)
            aligned_text_mat = token_embeddings[indices]
    else:
        aligned_text_mat = np.zeros((num_words, 768), dtype=np.float32)

    try:
        t_tensor = torch.tensor(aligned_text_mat, dtype=torch.float32).unsqueeze(0).to(DEVICE)
        a_tensor = torch.tensor(aligned_audio_mat, dtype=torch.float32).unsqueeze(0).to(DEVICE)

        with torch.no_grad():
            fused_tensor, attn_weights = fusion_module(t_tensor, a_tensor)
            # attn_weights: [batch_size, num_heads, seq_len, seq_len] or [batch_size, seq_len, seq_len]
            attn_weights_np = attn_weights.squeeze(0).cpu().numpy()
            if attn_weights_np.ndim == 3:
                attn_weights_np = np.mean(attn_weights_np, axis=0)

        # Word-level cross-attention salience (how much acoustic distress focuses on this word)
        word_salience = np.diagonal(attn_weights_np).tolist() if attn_weights_np.shape[0] == num_words else [1.0 / num_words] * num_words
    except Exception as e:
        logger.error(f"Cross-attention execution fallback: {e}")
        word_salience = [1.0 / max(1, num_words)] * num_words

    # Attach salience to words
    for idx, feat in enumerate(aligned_word_features):
        salience_val = float(word_salience[idx]) if idx < len(word_salience) else 0.0
        feat["cross_attention_weight"] = round(salience_val, 4)

    # ========================================================
    # 4. CO-OCCURRENCE EVIDENCE EXTRACTION
    # ========================================================
    # Correlate: High Vocal Panic + Threat Keyword
    co_occurrence_signals = []
    mean_rms_all = prosody_data["energy"]["mean_rms"]
    
    for feat in aligned_word_features:
        if feat["is_threat_word"]:
            reason = f"Atrocity marker \"{feat['word']}\" at {feat['start_time']}s"
            if feat["local_f0_hz"] > 250.0:
                reason += f" coincides with elevated pitch spike ({feat['local_f0_hz']} Hz)"
            if feat["local_rms"] > 1.4 * mean_rms_all and mean_rms_all > 0:
                reason += " & high emotional vocal energy"
            co_occurrence_signals.append({
                "word": feat["word"],
                "timestamp": f"{feat['start_time']}s - {feat['end_time']}s",
                "evidence": reason,
                "attention_weight": feat["cross_attention_weight"],
            })

    return {
        "success": True,
        "num_aligned_words": num_words,
        "aligned_words": aligned_word_features,
        "co_occurrence_signals": co_occurrence_signals,
        "cross_attention_active": True,
    }


def _empty_fusion_result() -> Dict[str, Any]:
    return {
        "success": False,
        "num_aligned_words": 0,
        "aligned_words": [],
        "co_occurrence_signals": [],
        "cross_attention_active": False,
    }
