import uuid
import json
from datetime import datetime
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from conflict_resolver import resolve_all_steps
from intelligence import validate_golden_record
from models import GoldenRecord, SourceRecord
from audit import log_action

def produce_golden_record(records: List[Dict], db: Session, cluster_id: str = None) -> Dict:
    """Step 9: Produce the detailed Golden Record Object with full clinical lineage."""
    if not records:
        return {}

    # Step 9: Resolve using the 6-step Flowchart logic
    res = resolve_all_steps(records)
    
    golden_id = cluster_id or f"GR-{str(uuid.uuid4())[:8].upper()}"
    source_ids = [str(r.get("id", "")) for r in records]
    
    golden = {
        "golden_id": golden_id,
        "name": res["name"]["value"].title() if res["name"]["value"] else "Unknown",
        "name_source": res["name"]["source"],
        "name_confidence": res["name"]["confidence"],
        "dob": res["dob"]["value"],
        "dob_source": res["dob"]["source"],
        "dob_confidence": res["dob"]["confidence"],
        "phone": res["phone"]["value"],
        "alternate_phones": res.get("phone", {}).get("alternates", []),
        "phone_source": res["phone"]["source"],
        "phone_confidence": res["phone"]["confidence"],
        "insurance_id": res["insurance_id"]["value"],
        "insurance_source": res["insurance_id"]["source"],
        "insurance_confidence": res["insurance_id"]["confidence"],
        "email": res["email"]["value"],
        "email_source": res["email"]["source"],
        "email_confidence": res["email"]["confidence"],
        "address": res["address"]["value"],
        "address_source": res["address"]["source"],
        "address_confidence": res["address"]["confidence"],
        "allergy": res["allergy"]["value"],
        "allergy_sources": res["allergy"]["source"],
        "allergy_critical": res["allergy"]["critical"],
        "diagnosis": res["diagnosis"]["value"],
        "alternate_diagnoses": res.get("diagnosis", {}).get("alternates", []),
        "source_record_ids": source_ids,
        "source_count": len(records),
        "overall_confidence": 0.0, # Will be set by cluster logic
        "resolved_at": datetime.now().isoformat(),
        "lineage": res["lineage"]
    }
    
    # Calculate weighted data quality/confidence
    key_fields = ["name", "dob", "insurance_id", "phone", "email"]
    filled = sum(1 for f in key_fields if golden.get(f))
    golden["data_quality_score"] = (filled / len(key_fields)) * 100
    
    # Post-Merge Validation (Step 10 requirement)
    validation_errors = validate_golden_record(golden)
    golden["validation_status"] = "VALID" if not validation_errors else "ERROR"
    golden["validation_errors"] = validation_errors
    
    return golden

from temporal import store_version

def add_to_golden_table(golden: Dict, db: Session) -> GoldenRecord:
    """Step 10: Store Golden Record and Link Source Records."""
    
    # Step 10: Unique golden record design
    gr = GoldenRecord(
        patient_id=golden["golden_id"],
        full_name=golden["name"],
        dob=golden["dob"],
        phone=golden["phone"],
        alternate_phones=golden["alternate_phones"],
        email=golden["email"],
        insurance_id=golden["insurance_id"],
        allergy=golden["allergy"],
        allergy_critical=golden["allergy_critical"],
        diagnosis=golden["diagnosis"],
        alternate_diagnoses=golden["alternate_diagnoses"],
        source_record_ids=golden["source_record_ids"],
        sources_count=golden["source_count"],
        data_quality_score=golden["data_quality_score"],
        overall_confidence=golden.get("overall_confidence", 0.0),
        resolved_at=datetime.now(),
        field_sources=golden["lineage"],
        lineage=golden["lineage"],
        resolution_method=golden.get("resolution_method", "auto_merge")
    )
    db.add(gr)
    db.flush() # Get ID if needed
    
    # Capture initial version in temporal history
    store_version(gr.patient_id, gr, "create", [{"field": "all", "old_value": None, "new_value": "Initial Creation"}], db)

    # Step 10: Update source records with golden_id
    db.query(SourceRecord).filter(SourceRecord.record_id.in_(golden["source_record_ids"])).update(
        {SourceRecord.golden_id: golden["golden_id"]}, synchronize_session=False
    )
    
    db.flush() 
    return gr

def get_all_golden_records(db: Session, skip: int = 0, limit: int = 50,
                            name: str = None, dob: str = None,
                            insurance_id: str = None):
    query = db.query(GoldenRecord)
    if name:
        query = query.filter(GoldenRecord.full_name.ilike(f"%{name}%"))
    if dob:
        query = query.filter(GoldenRecord.dob == dob)
    if insurance_id:
        query = query.filter(GoldenRecord.insurance_id.ilike(f"%{insurance_id}%"))
    return query.offset(skip).limit(limit).all()

def get_golden_record(db: Session, patient_id: str):
    return db.query(GoldenRecord).filter(GoldenRecord.patient_id == patient_id).first()
