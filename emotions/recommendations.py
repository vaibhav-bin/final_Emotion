import logging
from typing import Any, Dict, List, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NHAA_Recommendations")


def generate_sop_recommendations(
    classification_result: Dict[str, Any],
    semantics_data: Dict[str, Any],
    transcript: str,
) -> Dict[str, Any]:
    """
    Generate comprehensive statutory SOP recommendations mapped to National Helpline Against Atrocities (14566),
    SC/ST (Prevention of Atrocities) Act 1989 & Rules, DLSA Legal Aid, Medical Emergency, and Victim Compensation.
    """
    risk_category = classification_result.get("risk_category", "LOW")
    class_info = classification_result.get("predicted_class", {})
    class_id = class_info.get("class_id", 0)
    svi_score = classification_result.get("svi_score", 0.0)
    
    suicidal_flag = semantics_data.get("suicidal_risk_flag", False)
    immediate_threat_flag = semantics_data.get("immediate_threat_flag", False)
    detected_cats = [c.get("category", "") for c in semantics_data.get("detected_categories", [])]
    transcript_lower = transcript.lower()

    recommendations = []
    primary_action = ""
    urgency_level = ""

    # ========================================================
    # 1. EMERGENCY / CRITICAL (Class 2: Deep Trauma / High Danger)
    # ========================================================
    if risk_category == "CRITICAL" or class_id == 2 or svi_score >= 80:
        urgency_level = "IMMEDIATE ESCALATION (< 15 MINS)"
        primary_action = "Initiate Emergency Inter-Agency Police Escort, Section 15A Protection & Crisis Relief Protocol"

        # 1. Immediate Police PCR & SP Alert
        recommendations.append({
            "service_domain": "POLICE_AND_LAW_ENFORCEMENT",
            "title": "Immediate Police PCR Escort & SHO Alert",
            "action": "Immediate dispatch alert to Superintendent of Police (SP) and local SHO for rapid on-site physical protection and perimeter security.",
            "urgency": "Immediate (< 15 mins)",
            "statutory_reference": "Section 15A(1) & 15A(6) of SC/ST (PoA) Act, 1989",
            "icon": "🚔",
            "badge_color": "#dc2626",
        })

        # 2. Witness & Victim Protection Protocol
        recommendations.append({
            "service_domain": "WITNESS_PROTECTION_AND_SAFETY",
            "title": "Section 15A Witness Protection & Safe Shelter",
            "action": "Activate mandatory Witness Protection Protocol under Section 15A; arrange safe transit, temporary shelter, and round-the-clock police picket at victim residence.",
            "urgency": "Within 2 hours",
            "statutory_reference": "Section 15A of SC/ST (PoA) Act, 1989",
            "icon": "🛡️",
            "badge_color": "#dc2626",
        })

        # 3. Statutory FIR Registration under Specific Clauses
        offence_clauses = "Section 3(1)(r), 3(1)(s)"
        if "पानी" in transcript or "बहिष्कार" in transcript or "water" in transcript_lower or "boycott" in transcript_lower:
            offence_clauses = "Section 3(1)(za)(A), 3(1)(za)(B) (Social Boycott & Denial of Water)"
        elif "घर" in transcript or "मार" in transcript or "kill" in transcript_lower or "burn" in transcript_lower:
            offence_clauses = "Section 3(2)(v), 3(1)(g) (Arson, Assault & Threat to Life)"

        recommendations.append({
            "service_domain": "STATUTORY_FIR_REGISTRATION",
            "title": f"Mandatory Non-Bailable FIR under {offence_clauses}",
            "action": f"Ensure immediate registration of non-bailable FIR under {offence_clauses} without preliminary enquiry per Section 18A mandate.",
            "urgency": "Immediate / Within 6 hours",
            "statutory_reference": f"SC/ST (PoA) Act {offence_clauses} & Section 18A",
            "icon": "⚖️",
            "badge_color": "#ea580c",
        })

        # 4. First-Stage Economic Relief & Compensation (Rule 12(4))
        recommendations.append({
            "service_domain": "STATUTORY_VICTIM_RELIEF",
            "title": "Rule 12(4) Mandatory Immediate Financial Relief",
            "action": "Initiate immediate 25% provisional compensation disbursement (₹1,00,000 to ₹2,00,000) under Rule 12(4) payable upon FIR registration by District Magistrate.",
            "urgency": "Within 7 days",
            "statutory_reference": "Rule 12(4) of SC/ST (PoA) Rules Schedule Annexure",
            "icon": "📋",
            "badge_color": "#d97706",
        })

        # 5. DLSA Legal Aid Counsel
        recommendations.append({
            "service_domain": "FREE_LEGAL_AID_NALSA_DLSA",
            "title": "Assign Senior DLSA Retainer Advocate",
            "action": "Route case to District Legal Services Authority (DLSA) Secretary for appointment of a dedicated Special Public Prosecutor for continuous legal representation.",
            "urgency": "Within 24 hours",
            "statutory_reference": "NALSA (Legal Services to Victims of Atrocities) Scheme",
            "icon": "🏛️",
            "badge_color": "#ea580c",
        })

        # 6. Psychological First Aid / Tele-MANAS
        recommendations.append({
            "service_domain": "PSYCHOLOGICAL_CRISIS_SUPPORT",
            "title": "Emergency Tele-MANAS Crisis Counselling",
            "action": "Immediate warm-transfer to dedicated Tele-MANAS / NHAA psychiatric trauma counselor for acute de-escalation and emotional stabilization.",
            "urgency": "Real-time / Immediate",
            "statutory_reference": "NHAA Standard Operating Procedure",
            "icon": "🧠",
            "badge_color": "#dc2626",
        })

    # ========================================================
    # 2. HIGH RISK (Class 1 / High SVI)
    # ========================================================
    elif risk_category == "HIGH" or svi_score >= 65:
        urgency_level = "HIGH PRIORITY (< 2 HOURS)"
        primary_action = "Assign Case Officer & Route to Priority Legal Aid / Psychological Support"

        recommendations.append({
            "service_domain": "STATUTORY_FIR_REGISTRATION",
            "title": "Expedited FIR Registration & Investigation Assignment",
            "action": "Direct local police station to register formal grievance under Section 3(1) and assign Deputy Superintendent of Police (DySP) as Investigating Officer.",
            "urgency": "Within 12 hours",
            "statutory_reference": "Rule 7 of SC/ST (PoA) Rules, 1995",
            "icon": "🚔",
            "badge_color": "#ea580c",
        })

        recommendations.append({
            "service_domain": "FREE_LEGAL_AID_NALSA_DLSA",
            "title": "DLSA Legal Aid Advocate Assignment",
            "action": "Forward grievance details to DLSA Secretary for legal advisory, drafting of formal complaint, and court proceeding assistance.",
            "urgency": "Within 24 hours",
            "statutory_reference": "Legal Services Authorities Act, 1987",
            "icon": "⚖️",
            "badge_color": "#ea580c",
        })

        recommendations.append({
            "service_domain": "PSYCHOLOGICAL_COUNSELLING",
            "title": "Priority Trauma Recovery Tele-Session",
            "action": "Assign clinical trauma counselor to conduct structured tele-counselling session within 2 hours for acute stress alleviation.",
            "urgency": "Within 2 hours",
            "statutory_reference": "NHAA Clinical Triage Protocol",
            "icon": "🧠",
            "badge_color": "#ea580c",
        })

        recommendations.append({
            "service_domain": "SOCIAL_WELFARE_RELIEF",
            "title": "First-Stage Relief & Rehabilitation Assessment",
            "action": "Initiate administrative assessment by District SC/ST Welfare Officer for immediate relief disbursement under Annexure-I of PoA Rules.",
            "urgency": "Within 48 hours",
            "statutory_reference": "SC/ST (PoA) Rules Schedule Annexure-I",
            "icon": "📋",
            "badge_color": "#d97706",
        })

    # ========================================================
    # 3. MODERATE RISK
    # ========================================================
    elif risk_category == "MODERATE" or svi_score >= 40:
        urgency_level = "STANDARD PRIORITY (< 24 HOURS)"
        primary_action = "Institutional Grievance Redressal & Scheduled Tele-Support"

        recommendations.append({
            "service_domain": "GRIEVANCE_REDRESSAL",
            "title": "District Welfare Officer Assignment & Portal Tracking",
            "action": "Forward complaint to District SC/ST Welfare Officer with 7-day statutory action deadline; generate unique NHAA grievance token.",
            "urgency": "Within 24 hours",
            "statutory_reference": "NHAA Integrated Grievance SOP",
            "icon": "📁",
            "badge_color": "#2563eb",
        })

        recommendations.append({
            "service_domain": "PSYCHOLOGICAL_COUNSELLING",
            "title": "Scheduled Follow-up Tele-Support",
            "action": "Schedule follow-up emotional support session with community welfare worker to monitor psychological wellbeing.",
            "urgency": "Within 48 hours",
            "statutory_reference": "NHAA Support Guidelines",
            "icon": "🧠",
            "badge_color": "#d97706",
        })

        recommendations.append({
            "service_domain": "LEGAL_INFORMATION",
            "title": "Legal Rights Information Package Dispatch",
            "action": "Dispatch legal advisory SMS/Email to complainant detailing rights under SC/ST (PoA) Act and nearest DLSA clinic location.",
            "urgency": "Within 24 hours",
            "statutory_reference": "NALSA Legal Literacy Protocol",
            "icon": "📜",
            "badge_color": "#16a34a",
        })

    # ========================================================
    # 4. LOW RISK
    # ========================================================
    else:
        urgency_level = "ROUTINE ASSISTANCE"
        primary_action = "Record Grievance & Issue Tracking Acknowledgement"

        recommendations.append({
            "service_domain": "ROUTINE_GRIEVANCE",
            "title": "Grievance Registration & SMS Tracking",
            "action": "Log complaint in Integrated Atrocity Portal, generate unique NHAA Tracking ID, and dispatch SMS confirmation to complainant.",
            "urgency": "Immediate / Automated",
            "statutory_reference": "NHAA Standard Redressal Protocol",
            "icon": "📱",
            "badge_color": "#16a34a",
        })

        recommendations.append({
            "service_domain": "INFORMATION_SERVICES",
            "title": "Welfare Scheme Information Guidance",
            "action": "Provide complainant with relevant central and state welfare scheme guidelines and contact numbers of local officers.",
            "urgency": "Automated",
            "statutory_reference": "NHAA Citizen Charter",
            "icon": "ℹ️",
            "badge_color": "#16a34a",
        })

    # Administrative Summary for Officer Briefing
    admin_brief = _generate_admin_brief(svi_score, risk_category, class_info, semantics_data, transcript)

    return {
        "success": True,
        "risk_category": risk_category,
        "urgency_level": urgency_level,
        "primary_action": primary_action,
        "recommendations": recommendations,
        "admin_executive_brief": admin_brief,
        "total_recommendations": len(recommendations),
    }


def _generate_admin_brief(
    svi: float,
    risk_cat: str,
    class_info: Dict[str, Any],
    semantics_data: Dict[str, Any],
    transcript: str,
) -> str:
    """Generate concise officer executive briefing."""
    detected = [c["category"].replace("_", " ").title() for c in semantics_data.get("detected_categories", [])]
    cats_str = ", ".join(detected) if detected else "Caste-related grievance narrative"

    brief = (
        f"Complainant interaction screened with composite Stress Vulnerability Index (SVI) of {svi}/100 "
        f"({risk_cat} Risk — {class_info.get('label', 'Assessment')}). "
        f"Key detected indicators include {cats_str}. "
    )

    if risk_cat in ["CRITICAL", "HIGH"]:
        brief += "Immediate inter-agency police protection per Section 15A, non-bailable FIR registration per Section 18A, DLSA legal counsel assignment, and Rule 12(4) relief disbursement are strictly recommended."
    else:
        brief += "Standard institutional grievance logging and procedural follow-up initiated under NHAA citizen charter."

    return brief
