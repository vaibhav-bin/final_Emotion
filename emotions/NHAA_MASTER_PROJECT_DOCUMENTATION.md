# National Helpline Against Atrocities (NHAA 14566)
## AI-Enabled Real-Time Stress & Trauma Assessment Module
**Problem Statement ID:** PS 26093  
**Target Beneficiaries:** Scheduled Castes (SC) & Scheduled Tribes (ST) Victims/Complainants  
**Nodal Authority:** Department of Social Justice and Empowerment (MoSJ&E), Government of India  
**Team:** Verbosity  

---

# PART 1: CURRENT PROGRESS & WORKING IMPLEMENTATION AUDIT

### 1.1 Executive System Overview

```
Victim / Complainant Audio (Voice Call / IVRS / Mic / Web Upload)
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
  [Acoustic Signal Processing]  [Multilingual Speech-to-Text]
    • Librosa Prosody Biomarkers   • Sarvam Saaras v3 STT
    • WavLM Base+ Embeddings (50Hz) • Word-Level Timestamps
    • emotion2vec+ Large SER              │
             │                            ▼
             │                  [Indic NLP & Semantics]
             │                     • Google MuRIL Embeddings (768-dim)
             │                     • SC/ST Atrocity Domain Taxonomy
             │                            │
             └─────────────┬──────────────┘
                           ▼
             [Gated Cross-Attention Fusion Layer]
               • Millisecond Audio-Text Temporal Alignment
               • Pitch/Jitter Spike x Threat Keyword Correlation
                           │
                           ▼
             [Stress Vulnerability Index (SVI) Engine]
               • Continuous 0–100 Mathematical Score
               • Deterministic Safety Overrides (Suicide, Murder Threats)
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
  [3-Class Trauma Softmax]    [Statutory SOP Routing]
    • Low Stress (0-24)         • Police PCR Dispatch & SHO Alert (PoA Act)
    • Acute Stress (25-74)      • Sec 15A Witness Protection & Safe Shelter
    • Deep Trauma (75-100)      • DLSA / NALSA Free Special Public Prosecutor
                                • Tele-MANAS Crisis Psychological First Aid
                                • OSCC Emergency Medico-Legal Care
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
  [SQLite Persistent Database] [Interactive Triage Console]
    • Auto-saved Audit Logs       • SVG Circular SVI Dial
    • REST CRUD API (/api/cases)  • Time-Aligned Word Highlight Player
    • Search & Risk Filters       • Case Registry & Historical Re-player
```

---

### 1.2 Completed Technical Modules

| Module Name | File Location | Core AI / Tech Stack | What It Does |
| :--- | :--- | :--- | :--- |
| **Speech Prosody Engine** | [`speech_prosody.py`](file:///teamspace/studios/this_studio/emotions/speech_prosody.py) | `librosa`, `scipy.signal`, `numpy` | Extracts Fundamental Frequency ($F_0$), pitch jumps, RMS energy surges, Local Jitter $\%$ (vocal cord tremor/crying), Local Shimmer $\%$ (sobbing breath), and trauma freeze duration ($T_{\text{pause}}$). |
| **Deep Acoustic Embeddings** | [`speech_embeddings.py`](file:///teamspace/studios/this_studio/emotions/speech_embeddings.py) | `microsoft/wavlm-base-plus` (PyTorch GPU) | Generates 768-dim frame-level acoustic embeddings at $50\text{Hz}$ ($20\text{ms}$ stride) to capture non-verbal vocal gasps, trembling, and phase breaks. |
| **Speech Emotion Recognition** | [`emotion_model.py`](file:///teamspace/studios/this_studio/emotions/emotion_model.py) | `emotion2vec/emotion2vec_plus_large` + Whisper Fallback | Utterance-level emotion probabilities (Fearful, Sad, Angry, Neutral, Surprised, Disgusted). |
| **Multilingual STT** | [`sarvam_stt.py`](file:///teamspace/studios/this_studio/emotions/sarvam_stt.py) | Sarvam Saaras v3 + Offline Resilient Engine | Transcribes Indic and code-mixed speech with auto-language detection and word-level timestamp boundaries. |
| **Indic Semantic Intelligence** | [`muril_analyzer.py`](file:///teamspace/studios/this_studio/emotions/muril_analyzer.py) | `google/muril-base-cased` (Transformers GPU) | 768-dim contextual token embeddings for 17 Indian languages + Atrocity taxonomy detecting physical violence, caste slurs, social boycotts, eviction, and suicidal ideation. |
| **Multimodal Fusion Layer** | [`multimodal_fusion.py`](file:///teamspace/studios/this_studio/emotions/multimodal_fusion.py) | Gated Cross-Attention ($Q=\text{Text}, K/V=\text{Audio}$) | Joins text tokens and acoustic frames chronologically; computes cross-attention salience weights when pitch spikes coincide with threat words. |
| **Diagnostic SVI & Safety Head** | [`trauma_classifier.py`](file:///teamspace/studios/this_studio/emotions/trauma_classifier.py) | Softmax Classification + SVI Engine | Generates continuous SVI ($0-100$), sub-scores, and enforces non-negotiable safety floors for suicide and weapon threats. |
| **Statutory SOP Router** | [`recommendations.py`](file:///teamspace/studios/this_studio/emotions/recommendations.py) | Statutory Rule Matrix | Maps risk levels to actionable procedures under the SC/ST (Prevention of Atrocities) Act 1989, NALSA Schemes, and Tele-MANAS protocols. |
| **Persistent Database Layer** | [`db.py`](file:///teamspace/studios/this_studio/emotions/db.py) | SQLite3 (`nhaa_cases.db`) | Automatically persists all assessments; provides indexed CRUD and search endpoints. |
| **Web API & Orchestration** | [`app.py`](file:///teamspace/studios/this_studio/emotions/app.py) | `FastAPI`, `Uvicorn` | Exposes `/analyze`, `/api/cases`, `/api/cases/{case_id}`, `/health`, and demo audio routes. |
| **Triage Console UI** | [`templates/index.html`](file:///teamspace/studios/this_studio/emotions/templates/index.html) | Vanilla CSS & Modern JS (Glassmorphism) | Live SVI gauge, word timeline highlighting, acoustic biomarker tiles, SOP action cards, and Case Registry history table. |

---

### 1.3 Mathematical Formulation of the Stress Vulnerability Index (SVI)

$$\text{Raw SVI} = \Big(0.55 \cdot S_{\text{ling}} + 0.10 \cdot S_{\text{base}} + 0.15 \cdot S_{\text{vocal}} + 0.10 \cdot S_{\text{acoustic}} + 0.10 \cdot S_{\text{fusion}}\Big) \times 100$$

**Narrative-Centric Weight Distribution (Total Narrative Influence = 65%):**
*   **$S_{\text{ling}} \in [0.0, 1.0]$ ($55\%$ Weight)**: Google MuRIL deep Indic semantic threat score across statutory SC/ST Atrocity categories (violence, slurs, social boycott, eviction, police obstruction).
*   **$S_{\text{base}} \in \{0.15, 0.85\}$ ($10\%$ Weight)**: Statutory crime severity baseline derived from narrative crime categorization ($0.85$ for high/critical atrocities, $0.15$ for routine queries).
*   **$S_{\text{vocal}} \in [0.0, 1.0]$ ($15\%$ Weight)**: Speech Emotion AI distress aggregate $= \min(1.0, 1.0 \times P_{\text{Fear}} + 0.70 \times P_{\text{Sad}} + 0.50 \times P_{\text{Angry}})$.
*   **$S_{\text{acoustic}} \in [0.0, 1.0]$ ($10\%$ Weight)**: Librosa acoustic panic biomarkers $= 0.30 \cdot \frac{J}{0.04} + 0.25 \cdot \frac{S}{0.08} + 0.25 \cdot \frac{\sigma_{F0}/\mu_{F0}}{0.40} + 0.20 \cdot \frac{T_{\text{pause}}}{4.5\text{s}}$.
*   **$S_{\text{fusion}} \in [0.0, 0.20]$ ($10\%$ Weight)**: Gated Cross-Attention temporal alignment confirming pitch/jitter surges during threat tokens.

**Deterministic Safety Overrides (Life-Safety Guardrails):**
$$\text{Final SVI} = \begin{cases} 
\max(\text{Raw SVI}, 92.0) & \text{if Suicidal Ideation Detected} \\
\max(\text{Raw SVI}, 82.0) & \text{if Imminent Physical / Weapon Threat Detected} \\
\max(\text{Raw SVI}, 55.0) & \text{if Social Boycott / Caste Atrocity Detected} \\
\text{Raw SVI} & \text{otherwise}
\end{cases}$$

---

### 1.4 Multi-Stakeholder Impact Matrix

| Stakeholder | Pain Point in Current 14566 System | Solution Provided by Our AI Module |
| :--- | :--- | :--- |
| **Scheduled Caste & Tribe Victims** | Reluctance/fear to recount traumatic events repeatedly; subtle intimidation ignored. | Immediate objective identification of trauma & vocal distress, triggering fast-track emergency protection. |
| **Helpline 14566 Call Operators** | High call volume, subjective assessment bias, risk of missing silent/freezing shock. | Real-time SVI score, explainable evidence breakdown, and instant SOP prompt guidance. |
| **District Administration & SP/SHO** | Delayed FIR registration and delayed deployment of security/shelter. | Automated PCR dispatch alert and Section 15A Witness Protection activation within minutes. |
| **DLSA / NALSA Legal Aid** | Victims unaware of free legal representation rights under SC/ST Act. | Automated assignment of Free Special Public Prosecutor within 24 hours of contact. |
| **Tele-MANAS & Mental Health Counsellors** | Lack of prior psychological assessment before consultation. | Pre-consultation acoustic trauma profile (pitch tremor, sobbing index, freeze duration). |

---

# PART 2: THE UNIVERSAL MASTER BLUEPRINT (Overnight & Tomorrow Goal)

If we push tonight and tomorrow morning, here is the exact feature expansion that transforms this working MVP into an undisputed winner:

```
[CURRENT MVP: Audio Ingestion -> SVI -> DB -> Triage UI]
                             │
                             ▼  (OVERNIGHT LEVEL-UPS)
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Real-Time Streaming WebSocket Audio Visualizer (Live Rolling SVI Graph) │
│ 2. Automated PII Redaction & Legal Evidence Anonymizer Engine               │
│ 3. Tamper-Evident SC/ST PoA Judicial Triage Dossier (PDF Export + QR Code) │
│ 4. 14566 IVRS / Telephony Gateway Adapter Simulation (Live Call Console)    │
│ 5. Multi-Dialect Robustness Benchmarking Matrix (Bhojpuri, Gondi, Santhali) │
│ 6. Officer Active-Learning SVI Calibration & Feedback Loop                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.1 Feature 1: Real-Time Streaming WebSocket & Live SVI Cardiograph
*   **What It Does:** Instead of waiting for a file upload to finish, the 14566 call operator sees a **live cardiograph of SVI and vocal anxiety updating second-by-second** as the victim speaks.
*   **Implementation:**
    *   FastAPI WebSocket endpoint: `/ws/live-stream`.
    *   Client sends $250\text{ms}$ audio chunks via Web Audio API `AudioWorklet`.
    *   Backend runs rolling pitch/energy and updates an animated Canvas chart in real time.

---

### 2.2 Feature 2: Automated PII Masking & Privacy Shield (`pii_masker.py`)
*   **What It Does:** Complies with strict statutory privacy guidelines under the Digital Personal Data Protection (DPDP) Act 2023.
*   **Implementation:**
    *   Detects and redacts Aadhaar numbers, 10-digit mobile numbers, exact victim names, and village addresses into `[REDACTED_AADHAAR]`, `[REDACTED_PHONE]`.
    *   Provides a toggle in the UI: **"Original Transcript (Authorized Officer Only)"** vs **"Anonymized Judicial Audit View"**.

---

### 2.3 Feature 3: Official SC/ST PoA Triage Dossier PDF Export (`pdf_exporter.py`)
*   **What It Does:** Generates a formal, printable, signed **NHAA First-Contact Assessment Dossier** formatted for the District Magistrate, Superintendent of Police, and Special SC/ST Court Judge.
*   **Implementation:**
    *   Uses `reportlab` or styled HTML-to-PDF.
    *   Includes Case ID, timestamp, acoustic spectrograph snippet, highlighted threat transcript, SVI sub-scores, statutory citations (Sec 4, Sec 15A), and a verifiable digital verification hash / QR code.

---

### 2.4 Feature 4: 14566 Telephony & IVRS Gateway Simulator (`telephony_simulator.py`)
*   **What It Does:** Demonstrates how government telephony switches (Asterisk / FreePBX / SIP Trunk) stream raw phone audio directly into the AI assessment service during a real 14566 call.
*   **Implementation:**
    *   Simulated incoming call button in UI: **"📞 Simulate Incoming 14566 Emergency Call"**.
    *   Plays live streaming audio with real-time operator HUD.

---

### 2.5 Feature 5: Multi-Dialect & Regional Accent Robustness Matrix
*   **What It Does:** Proves to the judges that the model handles non-standard Hindi, Hinglish, Marathi, Tamil, Telugu, Bhojpuri, and tribal dialects without regional bias.
*   **Implementation:**
    *   Add a test suite in UI with 6 distinct regional accent samples showing consistent SVI detection.

---

# PART 3: HACKATHON PRESENTATION & LEVEL-UP STRATEGY

### 3.1 The 3-Minute Winning Pitch Structure

1.  **The Hook (0:00 - 0:45)**:
    > *"When a victim of a caste atrocity or mob violence calls the 14566 helpline, they are often in acute shock, terrified, or freezing up. Words alone don't convey the danger—a voice crack or sudden silence during a death threat is a critical distress signal. Today, there is zero standardized AI triage at the first point of contact."*
2.  **The Core Innovation (0:45 - 1:45)**:
    > *"We built the first multimodal trauma assessment module combining **Librosa mathematical prosody** (pitch tremor & sobbing breath), **WavLM deep acoustic embeddings**, and **Google MuRIL Indic semantic representations** through **Gatd Cross-Attention**. It doesn't just listen to words—it correlates acoustic panic spikes with discriminatory threats to calculate an explainable Stress Vulnerability Index (SVI 0–100)."*
3.  **The Live Demo (1:45 - 2:30)**:
    > *Trigger Case 1 (Mob Violence & Death Threat) live on the dashboard $\to$ Show SVI 82/100 $\to$ Show why the safety override triggered $\to$ Show automated statutory SOP routing to Police PCR and Section 15A Witness Protection.*
4.  **Institutional Impact & Compliance (2:30 - 3:00)**:
    > *"All data is persisted in a secure database registry, with automated PII redaction, human-in-the-loop validation, and full alignment with the SC/ST (PoA) Act rules and NALSA schemes."*

---

### 3.2 Key Competitive Differentiators

*   **Not a generic LLM wrapper:** Uses dedicated speech foundation models (`emotion2vec+`, `WavLM Base+`, `MuRIL`, `pyin`) running on GPU.
*   **Legally Grounded:** Recommendations map directly to statutory clauses under the **SC/ST (PoA) Act 1989 and Annexure-I relief rules**.
*   **Safety Guaranteed:** Deterministic safety override floors prevent machine learning under-scoring on life-critical suicide and violence signals.
*   **100% Explainable:** Every score has provenance badges showing whether the evidence came from vocal acoustics, linguistic semantics, or temporal co-occurrence.
