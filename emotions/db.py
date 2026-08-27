import json
import logging
from pathlib import Path
import sqlite3
from typing import Any, Dict, List, Optional, Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NHAA_Database")

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "nhaa_cases.db"


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize SQLite tables and indices for NHAA case records."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        filename TEXT,
        language TEXT,
        transcript TEXT,
        svi_score REAL,
        risk_category TEXT,
        predicted_class TEXT,
        primary_action TEXT,
        urgency_level TEXT,
        dominant_emotion TEXT,
        emotion_confidence REAL,
        acoustic_panic_index REAL,
        linguistic_threat_score REAL,
        status TEXT DEFAULT 'PENDING_REVIEW',
        officer_notes TEXT DEFAULT '',
        audio_path TEXT DEFAULT '',
        report_json TEXT NOT NULL
    );
    """)

    # Check if audio_path column exists (for backward compatibility)
    try:
        cursor.execute("SELECT audio_path FROM cases LIMIT 1;")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE cases ADD COLUMN audio_path TEXT DEFAULT '';")

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cases_created ON cases(created_at DESC);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cases_risk ON cases(risk_category);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cases_case_id ON cases(case_id);")

    conn.commit()
    conn.close()
    logger.info(f"Database initialized successfully at {DB_PATH}")


def save_case(report: Dict[str, Any], audio_path: Optional[str] = None) -> str:
    """
    Save or update a full analysis report into SQLite.
    """
    case_id = report.get("case_id", "")
    filename = report.get("filename", "audio_clip.wav")
    
    if audio_path:
        report["audio_url"] = f"/api/cases/{case_id}/audio"
        report["audio_path"] = str(audio_path)
    
    # Extract fields
    svi_info = report.get("svi", {})
    svi_score = float(svi_info.get("score", 0.0))
    risk_category = str(svi_info.get("risk_category", "LOW"))
    sub_scores = svi_info.get("sub_scores", {})
    
    class_info = report.get("classification", {}).get("predicted_class", {})
    predicted_class = str(class_info.get("label", "Normal"))
    
    primary_action = str(report.get("primary_action", "Routine Review"))
    urgency_level = str(report.get("urgency_level", "STANDARD"))
    
    trans_info = report.get("transcription", {})
    transcript = str(trans_info.get("text", ""))
    language = str(trans_info.get("language", "hi-IN"))
    
    emotion_info = report.get("emotion", {})
    dominant_emotion = str(emotion_info.get("predicted", "Neutral"))
    emotion_confidence = float(emotion_info.get("confidence", 0.0))
    
    prosody_info = report.get("prosody", {})
    acoustic_panic = float(prosody_info.get("acoustic_panic_index", 0.0))
    linguistic_threat = float(sub_scores.get("linguistic_threat", 0.0)) / 100.0

    report_json_str = json.dumps(report, ensure_ascii=False)

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO cases (
        case_id, filename, language, transcript, svi_score, risk_category,
        predicted_class, primary_action, urgency_level, dominant_emotion,
        emotion_confidence, acoustic_panic_index, linguistic_threat_score,
        status, officer_notes, audio_path, report_json
    ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_REVIEW', '', ?, ?
    )
    ON CONFLICT(case_id) DO UPDATE SET
        svi_score = excluded.svi_score,
        risk_category = excluded.risk_category,
        predicted_class = excluded.predicted_class,
        primary_action = excluded.primary_action,
        urgency_level = excluded.urgency_level,
        audio_path = COALESCE(NULLIF(excluded.audio_path, ''), cases.audio_path),
        report_json = excluded.report_json;
    """, (
        case_id, filename, language, transcript, svi_score, risk_category,
        predicted_class, primary_action, urgency_level, dominant_emotion,
        emotion_confidence, acoustic_panic, linguistic_threat,
        str(audio_path or ""), report_json_str
    ))

    conn.commit()
    conn.close()
    logger.info(f"Case {case_id} saved to database with audio_path: {audio_path}")
    return case_id


def list_cases(
    limit: int = 50,
    offset: int = 0,
    risk_filter: Optional[str] = None,
    search_query: Optional[str] = None,
) -> Dict[str, Any]:
    """
    List past cases with optional risk level filtering and transcript search.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Base counts by risk
    counts_query = "SELECT risk_category, COUNT(*) as cnt FROM cases GROUP BY risk_category"
    cursor.execute(counts_query)
    risk_counts = {row["risk_category"]: row["cnt"] for row in cursor.fetchall()}
    
    cursor.execute("SELECT COUNT(*) as total FROM cases")
    total_all = cursor.fetchone()["total"]

    # Filtered query
    where_clauses = []
    params = []

    if risk_filter and risk_filter.upper() != "ALL":
        where_clauses.append("risk_category = ?")
        params.append(risk_filter.upper())

    if search_query and search_query.strip():
        where_clauses.append("(case_id LIKE ? OR transcript LIKE ? OR primary_action LIKE ?)")
        term = f"%{search_query.strip()}%"
        params.extend([term, term, term])

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    # Total matching
    count_sql = f"SELECT COUNT(*) as filtered_total FROM cases {where_sql}"
    cursor.execute(count_sql, params)
    filtered_total = cursor.fetchone()["filtered_total"]

    # Records
    sql = f"""
    SELECT 
        id, case_id, created_at, filename, language, transcript,
        svi_score, risk_category, predicted_class, primary_action,
        urgency_level, dominant_emotion, emotion_confidence,
        acoustic_panic_index, linguistic_threat_score, status, officer_notes
    FROM cases
    {where_sql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])
    cursor.execute(sql, params)
    rows = cursor.fetchall()

    cases = []
    for r in rows:
        cases.append({
            "id": r["id"],
            "case_id": r["case_id"],
            "created_at": r["created_at"],
            "filename": r["filename"],
            "language": r["language"],
            "transcript": r["transcript"],
            "svi_score": r["svi_score"],
            "risk_category": r["risk_category"],
            "predicted_class": r["predicted_class"],
            "primary_action": r["primary_action"],
            "urgency_level": r["urgency_level"],
            "dominant_emotion": r["dominant_emotion"],
            "emotion_confidence": r["emotion_confidence"],
            "acoustic_panic_index": r["acoustic_panic_index"],
            "linguistic_threat_score": r["linguistic_threat_score"],
            "status": r["status"],
            "officer_notes": r["officer_notes"],
        })

    conn.close()

    return {
        "success": True,
        "total_cases": total_all,
        "filtered_cases": filtered_total,
        "counts_by_risk": {
            "CRITICAL": risk_counts.get("CRITICAL", 0),
            "HIGH": risk_counts.get("HIGH", 0),
            "MODERATE": risk_counts.get("MODERATE", 0),
            "LOW": risk_counts.get("LOW", 0),
        },
        "cases": cases,
    }


def get_case(case_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve full case details and original JSON report.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM cases WHERE case_id = ? LIMIT 1;", (case_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    report_data = {}
    try:
        report_data = json.loads(row["report_json"])
    except Exception:
        pass

    audio_path = row["audio_path"] if "audio_path" in row.keys() else ""

    return {
        "success": True,
        "case_id": row["case_id"],
        "created_at": row["created_at"],
        "status": row["status"],
        "officer_notes": row["officer_notes"],
        "audio_path": audio_path,
        "audio_url": f"/api/cases/{case_id}/audio",
        "report": report_data,
    }


def update_case_status(case_id: str, status: str, officer_notes: Optional[str] = None) -> bool:
    """
    Update administrative status and officer notes for a case.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    if officer_notes is not None:
        cursor.execute(
            "UPDATE cases SET status = ?, officer_notes = ? WHERE case_id = ?;",
            (status, officer_notes, case_id)
        )
    else:
        cursor.execute(
            "UPDATE cases SET status = ? WHERE case_id = ?;",
            (status, case_id)
        )

    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated


def delete_case(case_id: str) -> bool:
    """
    Permanently delete a case record and its associated audio file.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get audio_path before deletion
    cursor.execute("SELECT audio_path FROM cases WHERE case_id = ? LIMIT 1;", (case_id,))
    row = cursor.fetchone()
    audio_path_str = row["audio_path"] if row and "audio_path" in row.keys() else ""

    cursor.execute("DELETE FROM cases WHERE case_id = ?;", (case_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()

    # Physically remove audio file if exists
    if deleted:
        if audio_path_str and Path(audio_path_str).exists():
            try:
                Path(audio_path_str).unlink(missing_ok=True)
                logger.info(f"Deleted audio file: {audio_path_str}")
            except Exception as e:
                logger.warning(f"Could not remove audio file {audio_path_str}: {e}")
        
        # Check standard upload naming in UPLOAD_DIR
        upload_dir = BASE_DIR / "uploads"
        for p in upload_dir.glob(f"{case_id}*"):
            try:
                p.unlink(missing_ok=True)
                logger.info(f"Deleted upload artifact: {p}")
            except Exception:
                pass

    return deleted
