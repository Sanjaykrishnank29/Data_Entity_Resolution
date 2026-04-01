from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, JSON
from sqlalchemy.sql import func
from database import Base


class SourceRecord(Base):
    __tablename__ = "source_records"
    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(String, unique=True, index=True)
    golden_id = Column(String, index=True) # Link to Golden Record
    first_name = Column(String)
    last_name = Column(String)
    dob = Column(String)
    phone = Column(String)
    email = Column(String)
    insurance_id = Column(String)
    address = Column(String)
    allergy = Column(Text)
    diagnosis = Column(Text)
    source = Column(String, index=True)
    last_updated = Column(String)
    norm_name = Column(String)
    norm_dob = Column(String)
    norm_phone = Column(String)
    norm_insurance = Column(String)
    norm_email = Column(String)
    norm_address = Column(String)
    block_primary = Column(String, index=True)
    block_secondary = Column(String, index=True)
    created_at = Column(DateTime, server_default=func.now())


class GoldenRecord(Base):
    __tablename__ = "golden_records"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, unique=True, index=True)
    full_name = Column(String)
    first_name = Column(String)
    last_name = Column(String)
    dob = Column(String)
    phone = Column(String)
    alternate_phones = Column(JSON)
    email = Column(String)
    insurance_id = Column(String)
    address = Column(String)
    allergy = Column(JSON) # Merged list
    allergy_critical = Column(Boolean, default=False)
    diagnosis = Column(String)
    alternate_diagnoses = Column(JSON)
    field_sources = Column(JSON)  # Detailed lineage: {field: {value, source, rule, confidence}}
    source_record_ids = Column(JSON)  # list of source record IDs
    sources_count = Column(Integer, default=1)
    data_quality_score = Column(Float, default=0.0)
    overall_confidence = Column(Float, default=0.0)
    resolution_method = Column(String) # auto_merge, human_approved, etc.
    resolved_at = Column(DateTime, server_default=func.now())
    lineage = Column(JSON)
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime, server_default=func.now())
    is_stale = Column(Boolean, default=False)
    decay_score = Column(Float, default=0.0)


class CandidatePair(Base):
    __tablename__ = "candidate_pairs"
    id = Column(Integer, primary_key=True, index=True)
    record_id_1 = Column(String, index=True)
    record_id_2 = Column(String, index=True)
    source_1 = Column(String)
    source_2 = Column(String)
    name_score = Column(Float)
    dob_score = Column(Float)
    phone_score = Column(Float)
    insurance_score = Column(Float)
    email_score = Column(Float)
    address_score = Column(Float)
    confidence = Column(Float)
    explanation = Column(Text)
    status = Column(String, default="pending")  # pending, approved, rejected
    conflict_fields = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())


class ReviewDecision(Base):
    __tablename__ = "review_decisions"
    id = Column(Integer, primary_key=True, index=True)
    record_id_1 = Column(String)
    record_id_2 = Column(String)
    decision = Column(String)  # approve, reject
    confidence_at_decision = Column(Float)
    reason = Column(Text)
    reviewer = Column(String, default="system")
    features = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, server_default=func.now())
    action_type = Column(String, index=True)
    record_ids = Column(JSON)
    confidence_score = Column(Float)
    rule_fired = Column(String)
    reviewer_note = Column(Text)
    details = Column(JSON)


class EntityVersion(Base):
    __tablename__ = "entity_versions"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True)
    version_number = Column(Integer)
    snapshot = Column(JSON)  # full golden record snapshot
    change_type = Column(String)  # update, merge, split, create
    changed_fields = Column(JSON)
    changed_by = Column(String, default="system")
    timestamp = Column(DateTime, server_default=func.now())


class FeedbackWeight(Base):
    __tablename__ = "feedback_weights"
    id = Column(Integer, primary_key=True, index=True)
    pattern_key = Column(String, unique=True, index=True)
    rejection_count = Column(Integer, default=0)
    approval_count = Column(Integer, default=0)
    weight_multiplier = Column(Float, default=1.0)
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())
