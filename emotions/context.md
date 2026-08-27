# Team Verbosity — PS 26093 Project Context

## 1. Project Identity

- **Problem Statement ID:** 26093
- **Problem Statement Title:** AI-Based Real-Time Stress and Trauma Assessment Module for Victims/Complainants Accessing NHAA (14566) and Integrated Portal
- **Team Name:** Verbosity
- **Hackathon constraint:** 24-hour hackathon; therefore the solution is being developed as a focused proof-of-concept rather than a production NHAA deployment.

---

## 2. What We Are Building

We are building an **AI-assisted multimodal victim vulnerability screening and triage module** for the NHAA ecosystem.

The core idea is:

```text
Victim / Complainant Audio or Text
            ↓
     AI Signal Extraction
            ↓
   Multimodal Feature Fusion
            ↓
 Stress Vulnerability Index (SVI)
            ↓
 Low / Moderate / High / Critical
            ↓
   Explainable Admin Alert
            ↓
 Human Review + Support Routing
```

The system is **not intended to diagnose PTSD, depression, suicidal disorder, or any other clinical condition**. It is an AI-assisted screening and prioritization layer. Critical/high-risk signals must lead to human review and official intervention procedures.

---

## 3. MVP Definition — What We Are Actually Building for the Hackathon

The MVP is intentionally narrow.

### Current minimum viable flow

```text
Admin / Demo User
      ↓
Upload short victim voice recording (.wav / .mp4 / supported audio)
      ↓
FastAPI application
      ↓
Speech Emotion AI + Sarvam STT
      ↓
Emotion + Transcript + Language
      ↓
Additional speech/NLP features
      ↓
SVI calculation
      ↓
Risk classification
      ↓
Detected signs / explanation
      ↓
Admin critical alert
```

The **first complete demonstration goal** is:

> Upload a short audio recording → process it → generate an explainable SVI → show risk level and detected signs to an administrator.

We are deliberately **not** making direct 14566 telecom integration a dependency for the prototype.

14566 should be represented as a **future secure adapter/integration point** in the architecture.

---

## 4. Why We Chose This MVP

Direct 14566 integration is difficult within a 24-hour hackathon because it would require access to government telecom/IVR infrastructure, authorization, APIs, security controls and production data.

Therefore the prototype uses:

- Browser/web upload as the main input.
- Optional mobile/portal input as future channels.
- 14566 / IVRS as a future secure adapter.

This allows the team to prove the core AI innovation without depending on external government infrastructure.

---

# 5. Current Architecture

```text
                         AUDIO
                           │
               ┌───────────┴───────────┐
               │                       │
               ▼                       ▼
       SARVAM SAARAS STT          SPEECH EMOTION AI
               │                       │
               ▼                       ▼
        Transcript + Language      Emotion Scores
               │                       │
               ▼                       │
        Multilingual NLP               │
               │                       │
       Fear / Threat / Trauma         │
       / Intimidation / etc.          │
               │                       │
               └──────────┬────────────┘
                          ▼
                    Speech Features
                  Pitch / Pauses / Rate
                    Energy / Acoustic
                          │
                          ▼
                  Multimodal Feature
                       Fusion
                          │
                          ▼
                      SVI Engine
                          │
                          ▼
                 Risk Classification
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
            LOW        MODERATE       HIGH
                                      │
                                      ▼
                                   CRITICAL
                                      │
                                      ▼
                              Safety / Rules
                                      │
                                      ▼
                                 Admin Alert
                                      │
                                      ▼
                              Human-in-the-Loop
```

---

# 6. Current Technology Architecture

## Frontend

Currently a simple HTML/JavaScript interface is being served by FastAPI.

Current first UI goals:

- File upload
- Analyze button
- Loading state
- Dominant emotion
- Emotion distribution
- Detected language
- Transcript
- Error handling

Future frontend:

- Proper victim-facing interface
- Admin dashboard
- Case list
- SVI gauge
- Critical alerts
- Detected signs
- Recommendations
- Human override/review
- Case history

## Backend

The backend is running in the Lightning Studio for now because the local machine is weak.

Current stack:

- Python
- FastAPI
- Uvicorn
- HTML/JavaScript frontend served by FastAPI
- Local file upload storage during prototype

Planned backend responsibilities:

- Receive/upload audio
- Validate format
- Convert MP4 audio to WAV using FFmpeg
- Call AI services
- Aggregate outputs
- Calculate SVI
- Apply safety rules
- Return structured JSON
- Store assessment/case data later

## AI / ML

### 1. Speech Emotion Recognition

- Hugging Face model:
  `firdhokk/speech-emotion-recognition-with-openai-whisper-large-v3`
- Already tested successfully on several audio files.
- Runs on the Lightning GPU.
- Outputs emotion probabilities such as Fearful, Sad, Angry, Neutral, etc.

### 2. Speech-to-Text

- Decision made to use **Sarvam Saaras v3** instead of Whisper for STT.
- Reason: better alignment with the Indian-language requirement and code-mixed speech use case.
- Intended outputs:
  - transcript
  - detected language
  - request ID
- Planned mode for prototype: `codemix` with `language_code="unknown"`.

### 3. Speech Analytics (not completed yet)

Planned:

- Voice activity detection
- Pause count and duration
- Pitch variation
- Energy
- Speech rate
- Acoustic features such as MFCC/spectral features

### 4. NLP / Threat Analysis (not completed yet)

Planned:

- Fear
- Threat
- Intimidation
- Trauma-related distress language
- Social isolation
- Hopelessness / depressive-language indicators
- Self-harm / suicidal-ideation language indicators
- Context and vulnerability extraction

### 5. SVI Engine (not completed yet)

Planned to fuse:

- emotion
- text/NLP signals
- speech behaviour
- case context
- safety overrides

---

# 7. What Has Been Successfully Completed

## ✅ 1. Problem decomposition

The PS was converted into concrete technical layers rather than treating “trauma assessment” as one monolithic AI model.

## ✅ 2. MVP scope was frozen

Current MVP:

> audio upload → AI analysis → SVI → admin alert

## ✅ 3. Direct 14566 integration removed as a hard dependency

The production architecture still supports it through a future adapter, but the prototype is independent of telecom infrastructure.

## ✅ 4. Lightning AI environment established

The team is using Lightning as the main AI execution environment because the local laptop is not suitable for the large model.

## ✅ 5. Hugging Face speech-emotion model working

The selected speech-emotion model was downloaded and tested successfully on Lightning GPU with multiple audio files.

This is the most important AI milestone completed so far.

## ✅ 6. FastAPI web application is running on Lightning

Port 8000 has been exposed successfully.

The public endpoint was reached successfully and initially returned the FastAPI health JSON.

## ✅ 7. HTML page integration started

The FastAPI root route was changed from a JSON health response toward serving `templates/index.html` through Jinja2.

## ✅ 8. Sarvam STT selected

Whisper has been intentionally replaced as the STT component with Sarvam Saaras v3.

The intended flow is now:

```text
Audio
 ↓
Sarvam STT
 ↓
Transcript + Language
```

while the Hugging Face model separately performs:

```text
Audio
 ↓
Speech Emotion
```

---

# 8. Current Development State — Important

At the moment, the project is **not yet a complete MVP**.

The current status is approximately:

```text
Problem definition                  ✅
MVP definition                      ✅
Architecture                        ✅
Lightning environment              ✅
Emotion model                       ✅ WORKING
Audio → emotion CLI test            ✅ WORKING
FastAPI server                       ✅ WORKING
Public port 8000                    ✅ WORKING
Basic upload webpage                🟡 INTEGRATING
Sarvam STT selection                ✅
Sarvam STT integration              🟡 NEXT
Transcript display                  🟡 NEXT
Speech analytics                    ❌
NLP threat detection                ❌
SVI engine                          ❌
Risk classification                 ❌
Recommendation engine               ❌
Admin critical alert                ❌
Case management                     ❌
Multilingual validation              ❌
Privacy hardening                   ❌
```

The team should not claim that all PS requirements are already implemented.

---

# 9. Immediate Next Steps

## Step 1 — Finish Sarvam STT

Create and test:

```text
sarvam_stt.py
```

Expected standalone result:

```json
{
  "transcript": "...",
  "language_code": "hi-IN",
  "request_id": "..."
}
```

Test with:

- English
- Hindi
- Hindi-English code-mix

Do this **before** adding NLP.

---

## Step 2 — Integrate Emotion + Sarvam into `/analyze`

One upload should return:

```json
{
  "success": true,
  "filename": "victim.wav",
  "emotion": {
    "predicted": "Fearful",
    "confidence": 0.81,
    "scores": []
  },
  "transcription": {
    "text": "...",
    "language": "hi-IN",
    "request_id": "..."
  }
}
```

This is the next concrete backend milestone.

---

# 10. Next AI Layer — Speech Analytics

After emotion + STT work reliably, add acoustic/speech behaviour features.

Recommended components:

### VAD

Use a pretrained VAD such as Silero VAD.

Goal:

```text
Audio
 ↓
Speech segments
 ↓
Silence / pause segments
```

Extract:

- pause count
- average pause duration
- longest pause
- speech/silence ratio

### Librosa / audio feature extraction

Extract:

- pitch
- pitch variation
- RMS energy
- speech duration
- approximate speech rate
- MFCC / spectral features

These are **signals**, not diagnoses.

---

# 11. Next AI Layer — NLP

Input:

```text
Sarvam transcript
```

Output structured indicators.

Initial labels:

```text
fear
immediate_threat
intimidation
trauma_distress
social_isolation
hopelessness
self_harm
family_vulnerability
```

For the 24-hour MVP, prefer an existing multilingual/zero-shot model rather than training from scratch.

Later the model can be replaced with a domain-trained model after collecting ethically sourced data.

---

# 12. How We Handle Sensitive Concepts

## Trauma

We should say:

> “trauma/distress-related language indicators detected”

not:

> “the victim has PTSD.”

## Depression

We should detect:

> “depressive/hopelessness language indicators”

not claim a clinical diagnosis.

## Suicidal ideation

Use a dedicated high-priority language/safety detector.

If a strong signal is detected:

```text
Self-harm concern
      ↓
Safety rule
      ↓
Critical / urgent human review
```

The AI must not autonomously make a medical or emergency-care decision.

---

# 13. SVI Design

The SVI is the project's main custom decision layer.

For the prototype, use a transparent weighted fusion model rather than training a huge neural model.

Conceptually:

```text
SVI =
    linguistic distress
  + threat
  + fear
  + trauma-related language
  + speech emotion
  + speech behaviour
  + vulnerability/context
```

Potential prototype weighting can be configured and tuned during testing.

Example starting point:

```text
Threat                 25%
Fear                   15%
Distress               15%
Trauma-related signals 10%
Speech emotion         10%
Speech behaviour       10%
Vulnerability/context 15%
```

These values are **prototype parameters only**, not clinically validated coefficients.

The SVI must have a safety override layer.

Example:

```text
if immediate_threat == true:
    minimum_risk = HIGH

if self_harm_signal >= threshold:
    risk = CRITICAL
```

---

# 14. Risk Classification

Prototype bands:

```text
0–24   LOW
25–49  MODERATE
50–74  HIGH
75–100 CRITICAL
```

These should be treated as configurable prototype thresholds and later calibrated with domain experts and validated datasets.

---

# 15. Explainability

Do not only show:

```text
SVI = 86
```

Show:

```text
SVI: 86 / 100
Risk: CRITICAL

Detected signs:
✓ Immediate threat language
✓ High fear signal
✓ Intimidation indicator
✓ Elevated speech-pause anomaly
✓ Fearful vocal emotion
✓ High distress language
```

Each signal should have a source:

```text
Fear → NLP + emotion
Threat → NLP
Pauses → VAD
Pitch → audio analytics
Perpetrator proximity → case context
```

This makes the result auditable and useful to an administrator.

---

# 16. Recommendation Engine

Recommendations should be rule/SOP-driven, not freely invented by an LLM.

Example prototype mapping:

```text
LOW
→ Routine grievance processing

MODERATE
→ Counselling / follow-up

HIGH
→ Priority counselling
→ Legal assistance review
→ Medical review where indicated

CRITICAL
→ Immediate human review
→ Protection / safety assessment
→ Emergency support evaluation
```

Condition-specific rules can add:

```text
Threat → protection/police review
Medical emergency → medical assistance
Self-harm concern → urgent human escalation
Displacement → welfare/rehabilitation review
```

Final action must remain with authorized personnel and official SOPs.

---

# 17. Final Admin Experience

The target admin result is:

```text
┌────────────────────────────────────────────┐
│ NHAA AI ASSESSMENT                         │
├────────────────────────────────────────────┤
│ Case: NHAA-DEMO-001                       │
│ Language: hi-IN                            │
│ Channel: Voice                             │
│                                            │
│ SVI                 86 / 100               │
│                                            │
│              ⚠ CRITICAL                   │
│                                            │
│ DETECTED SIGNS                             │
│ • Immediate threat                         │
│ • High fear                                │
│ • Threat-related language                 │
│ • High distress                            │
│ • Fearful vocal emotion                    │
│ • Frequent pauses                          │
│                                            │
│ RECOMMENDED RESPONSE                       │
│ → Immediate Human Review                   │
│ → Protection Assessment                    │
│ → Counselling Review                       │
└────────────────────────────────────────────┘
```

This is the primary value proposition of the MVP.

---

# 18. Privacy and Ethical Architecture

For the hackathon demo:

```text
Upload role-play/synthetic audio
       ↓
Temporary processing
       ↓
AI inference
       ↓
Return assessment
       ↓
Delete audio
```

Do not use real victim recordings in the hackathon prototype.

Production design should include:

- informed consent
- data minimization
- encryption in transit and at rest
- RBAC
- audit logging
- retention/deletion policies
- explicit human oversight
- model confidence
- bias testing by language/accent/group

---

# 19. What We Are Intentionally NOT Building Yet

To protect the 24-hour timeline, do not prioritize:

- Direct 14566 telecom integration
- Real carrier/SIP integration
- Full government portal replacement
- Full native mobile application
- Custom model training from scratch
- Large-scale clinical validation
- Custom multimodal transformer training
- Kubernetes/microservice overengineering
- Production-grade identity infrastructure
- Long-term mental-health prediction

The system should remain a modular AI assessment service that can later integrate into NHAA.

---

# 20. Future Production Architecture

```text
14566 / IVRS / Portal / Mobile / Chatbot
                    │
                    ▼
             Secure API Adapter
                    │
                    ▼
             AI Assessment Layer
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
      Speech       NLP        Context
        │           │           │
        └───────────┼───────────┘
                    ▼
              SVI + Safety
                    │
                    ▼
             NHAA Case Workflow
                    │
                    ▼
              Human Authorities
```

The current Lightning-hosted service is a prototype/development environment. It should not be presented as the final government production infrastructure.

---

# 21. Recommended Team Work Split

## Member 1 — Speech AI

Own:

- Emotion model
- Sarvam STT integration support
- VAD
- Acoustic features

## Member 2 — NLP / Risk Signals

Own:

- Threat detection
- Fear
- Trauma-distress language
- Intimidation
- Social isolation
- Self-harm language
- Multilingual testing

## Member 3 — Backend / SVI

Own:

- FastAPI
- `/analyze`
- SVI engine
- Rule engine
- Recommendation engine
- Result schema
- Data storage

## Member 4 — Frontend / Victim UI

Own:

- upload / record UI
- language display
- processing state
- result presentation

## Member 5 — Frontend / Admin Dashboard

Own:

- case list
- SVI cards
- critical alerts
- detected signs
- recommendations
- human-review workflow

---

# 22. Immediate Development Sequence

The team should follow this order exactly:

```text
1. Emotion model                  ✅
2. Browser upload                 🟡
3. Sarvam STT                     🟡 NEXT
4. Emotion + transcript           🟡
5. VAD / pauses                   ❌
6. Pitch / energy / rate          ❌
7. NLP threat/fear                ❌
8. Context features               ❌
9. Feature fusion                 ❌
10. SVI                            ❌
11. Risk classification            ❌
12. Recommendation engine         ❌
13. Admin alert                   ❌
14. Dashboard                     ❌
15. Demo polishing                 ❌
```

Do not jump ahead while the previous milestone is unstable.

---

# 23. Definition of Done for the MVP

The MVP is considered complete when a judge can perform this sequence:

```text
1. Open the web application
2. Upload a role-play victim recording
3. Click Analyze
4. See detected language
5. See transcript
6. See emotion distribution
7. See speech-derived indicators
8. See NLP-derived indicators
9. See SVI 0–100
10. See LOW/MODERATE/HIGH/CRITICAL
11. See a clear list of detected signs
12. See a critical alert when appropriate
13. See recommended human support action
```

The final demonstration should emphasize that the AI **prioritizes cases and surfaces explainable indicators for human review**.

---

# 24. Current Immediate Goal

The current immediate objective is:

> **Complete the Audio → Sarvam STT + Emotion AI web flow on Lightning.**

Target result:

```text
Upload audio
      ↓
┌───────────────┬───────────────┐
│               │               │
▼               ▼               │
Sarvam STT   Emotion AI         │
│               │               │
▼               ▼               │
Transcript   Emotion scores      │
│               │               │
└───────────────┴───────────────┘
                ↓
        Unified JSON result
```

After this is stable, the next work is **NLP signal extraction**, followed by **SVI**, safety rules, recommendations and the admin dashboard.

---

# 25. Guiding Principle

The entire implementation should follow:

> **Use existing pretrained AI wherever possible; build the value layer ourselves.**

Existing components:

- Sarvam STT
- Pretrained speech emotion model
- VAD
- Audio feature libraries
- Pretrained multilingual NLP models

Our custom work:

- multimodal feature schema
- SVI
- safety rules
- explainability
- recommendations
- human-in-the-loop admin workflow
- NHAA-oriented integration architecture

This keeps the project feasible within the hackathon while still giving it a meaningful technical contribution.
