from datetime import datetime
from sqlalchemy.orm import Session
from models import AuditLog
from typing import List, Dict, Optional


def log_action(db: Session, action_type: str, record_ids: List,
               confidence_score: float = 0.0, rule_fired: str = "",
               reviewer_note: str = "", details: Dict = None):
    """Store every system action in SQLite audit table."""
    entry = AuditLog(
        action_type=action_type,
        record_ids=record_ids,
        confidence_score=confidence_score,
        rule_fired=rule_fired,
        reviewer_note=reviewer_note,
        details=details or {},
    )
    db.add(entry)
    db.commit()
    return entry


def get_audit_log(db: Session, skip: int = 0, limit: int = 100,
                  action_type: str = None, date_from: str = None,
                  date_to: str = None, min_confidence: float = None,
                  max_confidence: float = None) -> List[Dict]:
    """Return paginated audit entries with filters."""
    query = db.query(AuditLog)

    if action_type:
        query = query.filter(AuditLog.action_type == action_type)
    if date_from:
        try:
            from dateutil import parser
            query = query.filter(AuditLog.timestamp >= parser.parse(date_from))
        except Exception:
            pass
    if date_to:
        try:
            from dateutil import parser
            query = query.filter(AuditLog.timestamp <= parser.parse(date_to))
        except Exception:
            pass
    if min_confidence is not None:
        query = query.filter(AuditLog.confidence_score >= min_confidence)
    if max_confidence is not None:
        query = query.filter(AuditLog.confidence_score <= max_confidence)

    entries = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()

    return [
        {
            "id": e.id,
            "timestamp": e.timestamp.isoformat() if e.timestamp else "",
            "action_type": e.action_type,
            "record_ids": e.record_ids,
            "confidence_score": e.confidence_score,
            "rule_fired": e.rule_fired,
            "reviewer_note": e.reviewer_note,
            "details": e.details,
            "color": _action_color(e.action_type),
        }
        for e in entries
    ]


def _action_color(action_type: str) -> str:
    colors = {
        "approve_merge": "green",
        "reject_merge": "red",
        "split_record": "orange",
        "create_golden_record": "blue",
        "batch_resolve": "purple",
        "override": "yellow",
        "delete": "red",
    }
    return colors.get(action_type, "gray")
