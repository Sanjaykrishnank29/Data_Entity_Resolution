from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import GoldenRecord
from typing import List, Dict


STALE_THRESHOLD_MONTHS = 12


def calculate_decay_score(last_updated_dt) -> float:
    """Based on last updated timestamp, return staleness percentage (0-100)."""
    if not last_updated_dt:
        return 100.0
    now = datetime.utcnow()
    if isinstance(last_updated_dt, str):
        try:
            from dateutil import parser
            last_updated_dt = parser.parse(last_updated_dt)
        except Exception:
            return 100.0
    days_old = (now - last_updated_dt).days
    threshold_days = STALE_THRESHOLD_MONTHS * 30
    if days_old >= threshold_days:
        score = min(100.0, (days_old / threshold_days) * 100)
    else:
        score = (days_old / threshold_days) * 80  # ramp up to 80% at threshold
    return round(score, 1)


def flag_stale_records(db: Session) -> int:
    """Scan all golden records, flag those not updated in 12+ months."""
    threshold = datetime.utcnow() - timedelta(days=STALE_THRESHOLD_MONTHS * 30)
    stale_records = db.query(GoldenRecord).filter(
        GoldenRecord.last_updated < threshold
    ).all()

    count = 0
    for gr in stale_records:
        gr.is_stale = True
        gr.decay_score = calculate_decay_score(gr.last_updated)
        count += 1

    # Update non-stale records too
    fresh_records = db.query(GoldenRecord).filter(
        GoldenRecord.last_updated >= threshold
    ).all()
    for gr in fresh_records:
        gr.is_stale = False
        gr.decay_score = calculate_decay_score(gr.last_updated)

    db.commit()
    return count


def get_decay_report(db: Session) -> List[Dict]:
    """Return list of stale records sorted by staleness score."""
    records = db.query(GoldenRecord).order_by(GoldenRecord.decay_score.desc()).all()
    report = []
    for gr in records:
        decay = calculate_decay_score(gr.last_updated)
        if decay > 10:  # Only report meaningfully stale
            report.append({
                "patient_id": gr.patient_id,
                "full_name": gr.full_name,
                "dob": gr.dob,
                "last_updated": gr.last_updated.isoformat() if gr.last_updated else "never",
                "decay_score": decay,
                "is_stale": gr.is_stale or decay >= 80,
                "days_since_update": _days_since(gr.last_updated),
                "risk_level": _risk_level(decay),
            })
    return sorted(report, key=lambda r: r["decay_score"], reverse=True)


def _days_since(dt) -> int:
    if not dt:
        return 9999
    if isinstance(dt, str):
        try:
            from dateutil import parser
            dt = parser.parse(dt)
        except Exception:
            return 9999
    return (datetime.utcnow() - dt).days


def _risk_level(decay_score: float) -> str:
    if decay_score >= 80:
        return "critical"
    if decay_score >= 60:
        return "high"
    if decay_score >= 30:
        return "medium"
    return "low"
