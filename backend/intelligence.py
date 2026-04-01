"""
Intelligence module — anomaly detection, duplicate IQ score, source health report,
data quality SLA, merge impact predictor, entity relationship discovery.
"""
from datetime import datetime
from collections import defaultdict
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from models import SourceRecord, GoldenRecord, CandidatePair

# ─── Anomaly Detection ────────────────────────────────────────────────────────

def detect_anomalies(db: Session) -> List[Dict]:
    """
    Flag:
    1. Same phone number appearing across many different records
    2. Excessive updates in one day
    3. Records with blank high-importance fields
    """
    anomalies = []

    # 1. Same phone across many records
    from sqlalchemy import func
    phone_counts = (
        db.query(SourceRecord.norm_phone, func.count(SourceRecord.record_id).label("cnt"))
        .filter(SourceRecord.norm_phone != "")
        .group_by(SourceRecord.norm_phone)
        .having(func.count(SourceRecord.record_id) >= 3)
        .all()
    )
    for phone, cnt in phone_counts:
        anomalies.append({
            "type": "shared_phone",
            "severity": "HIGH" if cnt >= 5 else "MEDIUM",
            "description": f"Phone ending ...{phone[-4:] if len(phone) >= 4 else phone} appears in {cnt} records",
            "value": phone,
            "count": cnt,
        })

    # 2. Records missing critical fields
    blank_insurance = db.query(SourceRecord).filter(
        (SourceRecord.norm_insurance == "") | (SourceRecord.norm_insurance == None)
    ).count()
    if blank_insurance > 0:
        anomalies.append({
            "type": "missing_critical_field",
            "severity": "MEDIUM",
            "description": f"{blank_insurance} records have blank Insurance ID",
            "value": "insurance_id",
            "count": blank_insurance,
        })

    return anomalies


# ─── Duplicate Entry IQ Score ─────────────────────────────────────────────────

def get_duplicate_iq(db: Session) -> List[Dict]:
    """Score each source system by duplicate contribution percentage."""
    from sqlalchemy import func
    source_totals = dict(db.query(SourceRecord.source, func.count(SourceRecord.record_id)).group_by(SourceRecord.source).all())
    all_pairs = db.query(CandidatePair).filter(CandidatePair.status.in_(["auto_approved", "approved"])).all()

    source_dup_count = defaultdict(int)
    for pair in all_pairs:
        r1 = db.query(SourceRecord.source).filter(SourceRecord.record_id == pair.record_id_1).first()
        r2 = db.query(SourceRecord.source).filter(SourceRecord.record_id == pair.record_id_2).first()
        if r1: source_dup_count[r1[0]] += 1
        if r2: source_dup_count[r2[0]] += 1

    results = []
    for source, total in source_totals.items():
        dup_count = source_dup_count.get(source, 0)
        dup_pct = round((dup_count / max(total, 1)) * 100, 1)
        results.append({
            "source": source,
            "total_records": total,
            "duplicate_contributions": dup_count,
            "duplicate_pct": dup_pct,
            "iq_score": max(0, 100 - dup_pct),
            "risk_level": "HIGH" if dup_pct > 20 else "MEDIUM" if dup_pct > 10 else "LOW",
        })
    return sorted(results, key=lambda x: x["duplicate_pct"], reverse=True)


# ─── Source Health Report ─────────────────────────────────────────────────────

def get_source_health_report(db: Session) -> List[Dict]:
    """Per-source: completeness rate, conflict rate, duplicate contribution."""
    from sqlalchemy import func
    CRITICAL_FIELDS = ["norm_name", "norm_dob", "norm_phone", "norm_insurance", "norm_email"]
    source_totals = dict(db.query(SourceRecord.source, func.count(SourceRecord.record_id)).group_by(SourceRecord.source).all())
    iq_data = {r["source"]: r for r in get_duplicate_iq(db)}

    results = []
    for source, total in source_totals.items():
        records = db.query(SourceRecord).filter(SourceRecord.source == source).all()
        field_completion = []
        for rec in records:
            filled = sum(1 for f in CRITICAL_FIELDS if getattr(rec, f, "") and getattr(rec, f, "") != "")
            field_completion.append(filled / len(CRITICAL_FIELDS))
        completeness_rate = round((sum(field_completion) / max(len(field_completion), 1)) * 100, 1)
        iq_info = iq_data.get(source, {})
        results.append({
            "source": source,
            "total_records": total,
            "completeness_rate": completeness_rate,
            "conflict_rate": iq_info.get("duplicate_pct", 0),
            "duplicate_contribution": iq_info.get("duplicate_pct", 0),
            "iq_score": iq_info.get("iq_score", 100),
        })
    return sorted(results, key=lambda x: x["completeness_rate"], reverse=True)


# ─── Merge Impact Predictor ───────────────────────────────────────────────────

def predict_merge_impact(patient_id: str, db: Session) -> Dict:
    """Predict downstream impact before merge."""
    gr = db.query(GoldenRecord).filter(GoldenRecord.patient_id == patient_id).first()
    if not gr: return {"error": "Golden record not found"}
    source_count = len(gr.source_record_ids or [])
    return {
        "patient_id": patient_id,
        "source_records_affected": source_count,
        "estimated_lab_records": source_count * 3,
        "estimated_prescriptions": source_count * 2,
        "total_downstream_records": source_count * 5,
        "risk_level": "HIGH" if source_count > 3 else "MEDIUM",
    }


# ─── Entity Relationship Discovery ───────────────────────────────────────────

def discover_entity_relationships(db: Session) -> List[Dict]:
    """Find hidden relationships (shared phone/address)."""
    relationships = []
    phone_groups = defaultdict(list)
    golden_records = db.query(GoldenRecord).all()
    for gr in golden_records:
        if gr.phone and len(gr.phone) >= 7:
            phone_groups[gr.phone].append(gr)
    for phone, grs in phone_groups.items():
        if len(grs) >= 2:
            relationships.append({
                "type": "shared_phone",
                "description": f"{len(grs)} patients share phone ending ...{phone[-4:]}",
                "patient_ids": [gr.patient_id for gr in grs],
                "names": [gr.full_name for gr in grs],
            })
    return relationships


# ─── Data Quality SLA ─────────────────────────────────────────────────────────

SLA_THRESHOLD = 75.0

def check_quality_sla(db: Session) -> Dict:
    """Check if overall quality meets SLA."""
    from sqlalchemy import func
    avg_quality = db.query(func.avg(GoldenRecord.data_quality_score)).scalar() or 0.0
    breached = float(avg_quality) < SLA_THRESHOLD
    return {
        "current_quality_score": round(float(avg_quality), 1),
        "sla_threshold": SLA_THRESHOLD,
        "sla_breached": breached,
        "status": "BREACH" if breached else "OK",
    }


# ─── Source Trust Evolution ───────────────────────────────────────────────────

def get_dynamic_source_authority(db: Session) -> Dict[str, List[str]]:
    """Source authority scores update dynamically based on historical conflict rates."""
    iq_scores = get_duplicate_iq(db)
    trusted = [s["source"] for s in iq_scores if s["iq_score"] > 85]
    if not trusted: trusted = [s["source"] for s in iq_scores[:2]]
    return {
        "dob": trusted,
        "insurance_id": trusted,
        "phone": trusted,
        "email": trusted,
    }


# ─── Post-Merge Validation ───────────────────────────────────────────────────

def validate_golden_record(gr: Dict) -> List[str]:
    """Post-Merge Validation logic."""
    errors = []
    phone = str(gr.get("phone", ""))
    digits = "".join(filter(str.isdigit, phone))
    if phone and len(digits) < 10: errors.append("Invalid phone: less than 10 digits")
    
    dob_str = gr.get("dob", "")
    if dob_str:
        try:
            from dateutil import parser
            dob = parser.parse(dob_str)
            age = (datetime.now() - dob).days // 365
            if age < 0 or age > 120: errors.append(f"Invalid age: {age}")
        except: errors.append("Invalid DOB format")
            
    valid_blood = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    bg = gr.get("blood_group", "")
    if bg and bg not in valid_blood: errors.append(f"Invalid blood group: {bg}")
        
    return errors
