import logging
from typing import Any, Dict, List, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Recommendations")


def generate_sop_recommendations(
    classification_result: Dict[str, Any],
    semantics_data: Dict[str, Any],
    transcript: str,
) -> Dict[str, Any]:
    """
    Generate statutory SOP recommendations mapped to National Helpline Against Atrocities (14566),
    SC/ST (Prevention of Atrocities) Act rules, DLSA Legal Aid, Medical Emergency, and Witness Protection.
    """
    risk_category = classification_result.get("risk_category", "LOW")
    class_info = classification_result.get("predicted_class", {})
    class_id = class_info.get("class_id", 0)
    svi_score = classification_result.get("svi_score", 0.0)
    
    suicidal_flag = semantics_data.get("suicidal_risk_flag", False)
    immediate_threat_flag = semantics_data.get("immediate_threat_flag", False)
    detected_cats = [c.get("category", "") for c in semantics_data.get("detected_categories", [])]

    recommendations = []
    primary_action = ""
    urgency_level = ""

    # ========================================================
    # 1. EMERGENCY / CRITICAL (Class 2: Deep Trauma / High Danger)
    # ========================================================
    if risk_category == "CRITICAL" or class_id == 2:
        urgency_level = "IMMEDIATE ESCALATION (< 15 MINS)"
        primary_action = "Initiate Emergency Inter-Agency Police PCR & Crisis Shelter Protocol"

        # Police intervention
        recommendations.append({
            "service_domain": "POLICE_AND_LAW_ENFORCEMENT",
            "title": "Urgent Police PCR Dispatch & SHO Alert",
            "action": "Immediate alert to District Superintendent of Police (SP) and local SHO under Section 4 & 18 of SC/ST (PoA) Act for rapid on-site safety intervention.",
            "urgency": "Immediate (< 15 mins)",
            "statutory_reference": "SC/ST (PoA) Act 1989 & PCR Rules",
            "icon": "🚔",
            "badge_color": "#dc2626",
        })

        # Witness Protection
        if immediate_threat_flag or "INTIMIDATION_AND_THREAT" in detected_cats:
            recommendations.append({
                "service_domain": "WITNESS_PROTECTION_AND_SAFETY",
                "title": "Section 15A Witness Protection & Safe Relocation",
                "action": "Activate Witness Protection Protocol under Section 15A of SC/ST (PoA) Act; arrange temporary safe shelter for complainant & dependent family.",
                "urgency": "Immediate / Within 6 hours",
                "statutory_reference": "SC/ST (PoA) Act Section 15A",
                "icon": "🛡️",
                "badge_color": "#dc2626",
            })

        # Free Legal Aid
        recommendations.append({
            "service_domain": "FREE_LEGAL_AID_NALSA_DLSA",
            "title": "Assign DLSA Special Public Prosecutor",
            "action": "Route case to District Legal Services Authority (DLSA) for mandatory free legal representation and FIR registration monitoring.",
            "urgency": "Within 24 hours",
            "statutory_reference": "NALSA (Legal Services to Victims of Atrocities) Scheme",
            "icon": "⚖️",
            "badge_color": "#ea580c",
        })

        # Emergency Psychological Crisis Support
        recommendations.append({
            "service_domain": "PSYCHOLOGICAL_CRISIS_SUPPORT",
            "title": "Emergency Tele-Mental Health & De-escalation",
            "action": "Immediate warm-transfer to Tele-MANAS / NHAA specialized trauma counselor for acute de-escalation and psychological first aid.",
            "urgency": "Immediate / Real-time",
            "statutory_reference": "NHAA Standard Operating Procedure",
            "icon": "🧠",
            "badge_color": "#dc2626",
        })

        # Medical Assistance if assault/violence
        if "SEXUAL_VIOLENCE_AND_ASSAULT" in detected_cats or "IMMEDIATE_PHYSICAL_VIOLENCE" in detected_cats:
            recommendations.append({
                "service_domain": "EMERGENCY_MEDICAL_CARE",
                "title": "One-Stop Crisis Centre (OSCC) & Medico-Legal Care",
                "action": "Facilitate immediate emergency medical examination, treatment, and medico-legal protocol at the nearest District Hospital.",
                "urgency": "Urgent",
                "statutory_reference": "Ministry of Health Medico-Legal Guidelines",
                "icon": "🏥",
                "badge_color": "#dc2626",
            })

    # ========================================================
    # 2. HIGH RISK (Class 1 / High SVI)
    # ========================================================
    elif risk_category == "HIGH":
        urgency_level = "HIGH PRIORITY (< 2 HOURS)"
        primary_action = "Assign Case Officer & Route to Priority Legal Aid / Counselling"

        recommendations.append({
            "service_domain": "PSYCHOLOGICAL_COUNSELLING",
            "title": "Priority Trauma Counselling Call",
            "action": "Assign senior grievance counselor to conduct structured tele-counselling session within 2 hours.",
            "urgency": "Within 2 hours",
            "statutory_reference": "NHAA Clinical Triage Protocol",
            "icon": "🧠",
            "badge_color": "#ea580c",
        })

        recommendations.append({
            "service_domain": "FREE_LEGAL_AID_NALSA_DLSA",
            "title": "DLSA Legal Aid Advocate Assignment",
            "action": "Forward grievance details to DLSA Secretary for legal advisory and verification of FIR/complaint filing.",
            "urgency": "Within 24 hours",
            "statutory_reference": "Legal Services Authorities Act 1987",
            "icon": "⚖️",
            "badge_color": "#ea580c",
        })

        recommendations.append({
            "service_domain": "SOCIAL_WELFARE_RELIEF",
            "title": "First-Stage Relief & Compensation Assessment",
            "action": "Initiate administrative assessment for immediate relief disbursement under Annexure-I of PoA Rules.",
            "urgency": "Within 48 hours",
            "statutory_reference": "SC/ST (PoA) Rules Schedule Annexure-I",
            "icon": "📋",
            "badge_color": "#d97706",
        })

    # ========================================================
    # 3. MODERATE RISK
    # ========================================================
    elif risk_category == "MODERATE":
        urgency_level = "STANDARD PRIORITY (< 24 HOURS)"
        primary_action = "Grievance Redressal & Scheduled Tele-Support"

        recommendations.append({
            "service_domain": "PSYCHOLOGICAL_COUNSELLING",
            "title": "Scheduled Follow-up Tele-Counselling",
            "action": "Schedule follow-up emotional support session with community welfare worker.",
            "urgency": "Within 24 hours",
            "statutory_reference": "NHAA Support Guidelines",
            "icon": "🧠",
            "badge_color": "#d97706",
        })

        recommendations.append({
            "service_domain": "GRIEVANCE_REDRESSAL",
            "title": "Portal Grievance Tracking & Officer Assignment",
            "action": "Forward complaint to District SC/ST Welfare Officer with 7-day statutory action deadline.",
            "urgency": "Within 24 hours",
            "statutory_reference": "NHAA Integrated Grievance SOP",
            "icon": "📁",
            "badge_color": "#2563eb",
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
    cats_str = ", ".join(detected) if detected else "General caste-related grievance"

    brief = (
        f"Complainant interaction screened with Stress Vulnerability Index (SVI) of {svi}/100 "
        f"({risk_cat} Risk — {class_info.get('label', 'Assessment')}). "
        f"Key detected indicators include {cats_str}. "
    )

    if risk_category_is_urgent := (risk_cat in ["CRITICAL", "HIGH"]):
        brief += "Immediate inter-agency protection, legal counsel assignment, and crisis counseling are recommended."
    else:
        brief += "Standard institutional grievance logging and procedural follow-up initiated."

    return brief
