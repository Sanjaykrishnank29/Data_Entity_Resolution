from datetime import datetime
from sqlalchemy.orm import Session
from models import EntityVersion, GoldenRecord
from typing import Dict, List, Optional
import json


def detect_change(new_record: Dict, existing_gr: GoldenRecord) -> Dict:
    """Compare new record against existing golden record, identify changed fields."""
    changed_fields = []
    fields = ["full_name", "dob", "phone", "email", "insurance_id", "address", "allergy", "diagnosis"]

    for field in fields:
        old_val = getattr(existing_gr, field, "") or ""
        new_val = str(new_record.get(field, "") or "")
        if old_val.lower().strip() != new_val.lower().strip() and new_val:
            changed_fields.append({
                "field": field,
                "old_value": old_val,
                "new_value": new_val,
            })

    return {
        "has_changes": len(changed_fields) > 0,
        "changed_fields": changed_fields,
        "change_count": len(changed_fields),
        "name_changed": any(c["field"] == "full_name" for c in changed_fields)
    }


def store_version(patient_id: str, golden_record: GoldenRecord, change_type: str,
                  changed_fields: List, db: Session, changed_by: str = "system") -> EntityVersion:
    """Save snapshot of golden record state before any change."""
    # Get current version count
    version_count = db.query(EntityVersion).filter(
        EntityVersion.patient_id == patient_id
    ).count()

    snapshot = {
        "patient_id": golden_record.patient_id,
        "full_name": golden_record.full_name,
        "dob": golden_record.dob,
        "phone": golden_record.phone,
        "email": golden_record.email,
        "insurance_id": golden_record.insurance_id,
        "address": golden_record.address,
        "allergy": golden_record.allergy,
        "diagnosis": golden_record.diagnosis,
        "data_quality_score": golden_record.data_quality_score,
        "sources_count": golden_record.sources_count,
        "captured_at": datetime.utcnow().isoformat(),
    }

    version = EntityVersion(
        patient_id=patient_id,
        version_number=version_count + 1,
        snapshot=snapshot,
        change_type=change_type,
        changed_fields=changed_fields,
        changed_by=changed_by,
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


def get_entity_history(patient_id: str, db: Session) -> List[Dict]:
    """Return all historical versions of one patient record."""
    versions = db.query(EntityVersion).filter(
        EntityVersion.patient_id == patient_id
    ).order_by(EntityVersion.version_number).all()

    return [
        {
            "version": v.version_number,
            "change_type": v.change_type,
            "changed_fields": v.changed_fields,
            "snapshot": v.snapshot,
            "changed_by": v.changed_by,
            "timestamp": v.timestamp.isoformat() if v.timestamp else "",
        }
        for v in versions
    ]


def get_timeline_events(patient_id: str, db: Session) -> List[Dict]:
    """Return list of timestamped change events for timeline visualization."""
    versions = db.query(EntityVersion).filter(
        EntityVersion.patient_id == patient_id
    ).order_by(EntityVersion.timestamp).all()

    events = []
    for v in versions:
        event_type = _classify_event(v.change_type, v.changed_fields or [])
        events.append({
            "id": v.id,
            "patient_id": patient_id,
            "timestamp": v.timestamp.isoformat() if v.timestamp else "",
            "event_type": event_type,
            "change_type": v.change_type,
            "description": _describe_event(v.change_type, v.changed_fields or []),
            "version": v.version_number,
            "snapshot": v.snapshot,
            "changed_fields": v.changed_fields,
            "icon": _get_event_icon(event_type),
        })
    return events


def detect_name_change(patient_id: str, db: Session) -> Optional[Dict]:
    """Specifically identify when name changed — marriage, legal change."""
    versions = db.query(EntityVersion).filter(
        EntityVersion.patient_id == patient_id
    ).order_by(EntityVersion.timestamp).all()

    for v in versions:
        changed = v.changed_fields or []
        for change in changed:
            if isinstance(change, dict) and change.get("field") in ("full_name", "last_name"):
                return {
                    "detected": True,
                    "old_name": change.get("old_value", ""),
                    "new_name": change.get("new_value", ""),
                    "timestamp": v.timestamp.isoformat() if v.timestamp else "",
                    "version": v.version_number,
                    "likely_reason": _infer_name_change_reason(
                        change.get("old_value", ""), change.get("new_value", "")
                    ),
                }
    return {"detected": False}


def _classify_event(change_type: str, changed_fields: List) -> str:
    field_names = [c.get("field", "") if isinstance(c, dict) else c for c in changed_fields]
    if "full_name" in field_names or "last_name" in field_names:
        return "name_change"
    if change_type == "merge":
        return "merge"
    if change_type == "split":
        return "split"
    if change_type == "create":
        return "admission"
    if "address" in field_names:
        return "address_update"
    if any(f in field_names for f in ["source", "sources_count"]):
        return "source_added"
    return "update"


def _describe_event(change_type: str, changed_fields: List) -> str:
    if not changed_fields:
        return f"Record {change_type}"
    field_names = [c.get("field", c) if isinstance(c, dict) else c for c in changed_fields]
    return f"{change_type.capitalize()}: {', '.join(field_names)} updated"


def _get_event_icon(event_type: str) -> str:
    icons = {
        "name_change": "user-edit",
        "merge": "git-merge",
        "split": "scissors",
        "admission": "plus-circle",
        "address_update": "map-pin",
        "source_added": "database",
        "update": "edit",
    }
    return icons.get(event_type, "circle")


def _infer_name_change_reason(old_name: str, new_name: str) -> str:
    """Try to infer why a name changed."""
    old_parts = old_name.lower().split()
    new_parts = new_name.lower().split()
    if len(old_parts) >= 2 and len(new_parts) >= 2:
        if old_parts[0] == new_parts[0] and old_parts[-1] != new_parts[-1]:
            return "Possible marriage or legal name change (last name changed)"
    return "Legal name change"
