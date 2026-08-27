import json
from pathlib import Path
from emotion_model import predict_emotion
from sarvam_stt import transcribe_audio
from speech_prosody import extract_prosody_features
from speech_embeddings import extract_wavlm_embeddings
from muril_analyzer import analyze_transcript_semantics
from multimodal_fusion import align_and_fuse_multimodal
from trauma_classifier import classify_trauma_and_svi
from recommendations import generate_sop_recommendations

def test_full_pipeline(audio_file: str):
    print(f"\n=======================================================")
    print(f"TESTING FULL MULTIMODAL PIPELINE ON: {audio_file}")
    print(f"=======================================================")

    # 1. Prosody
    prosody = extract_prosody_features(audio_file)
    print(f"[1] Prosody: Duration {prosody['duration_sec']}s, F0: {prosody['pitch']['mean_f0_hz']}Hz, Jitter: {prosody['perturbation']['jitter_percentage']}%, Acoustic Panic Index: {prosody['acoustic_panic_index']}")

    # 2. WavLM
    wavlm = extract_wavlm_embeddings(audio_file)
    print(f"[2] WavLM: Num frames {wavlm['num_frames']}, Hidden dim: {wavlm.get('hidden_dim')}")

    # 3. Emotion AI
    emotions = predict_emotion(audio_file)
    print(f"[3] Emotion: Top={emotions[0]['emotion']} ({emotions[0]['score']*100:.1f}%)")

    # 4. Sarvam STT
    stt = transcribe_audio(audio_file)
    print(f"[4] STT ({stt['language_code']}): \"{stt['transcript']}\"")

    # 5. MuRIL Semantics
    semantics = analyze_transcript_semantics(stt['transcript'], stt['language_code'])
    print(f"[5] MuRIL: Threat Score {semantics['linguistic_threat_score']}, Max Severity: {semantics['max_severity']}, Indicators: {len(semantics['detected_indicators'])}")

    # 6. Fusion
    fusion = align_and_fuse_multimodal(prosody, wavlm, semantics, stt.get('words'), emotions)
    print(f"[6] Fusion: Aligned {fusion['num_aligned_words']} words, Co-occurrences: {len(fusion['co_occurrence_signals'])}")

    # 7. 3-Class Softmax & SVI
    classification = classify_trauma_and_svi(prosody, semantics, emotions, fusion)
    print(f"[7] SVI: {classification['svi_score']}/100 | Risk: {classification['risk_category']} | Predicted: {classification['predicted_class']['label']}")
    print(f"    Sub-scores: {classification['sub_scores']}")
    print(f"    Safety Overrides: {classification['safety_overrides']}")

    # 8. Recommendations
    rec = generate_sop_recommendations(classification, semantics, stt['transcript'])
    print(f"[8] Recommendations ({rec['total_recommendations']}): Primary Action: {rec['primary_action']}")
    for r in rec['recommendations'][:2]:
        print(f"    • [{r['icon']} {r['service_domain']}] {r['title']} ({r['urgency']})")
    print(f"    Admin Brief: {rec['admin_executive_brief']}")

if __name__ == "__main__":
    for test_audio in ["violent.wav", "0.wav"]:
        test_full_pipeline(test_audio)
