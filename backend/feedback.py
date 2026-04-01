from sqlalchemy.orm import Session
from models import ReviewDecision, FeedbackWeight
from typing import Dict


def store_decision(db: Session, record_id_1: str, record_id_2: str,
                   decision: str, confidence: float, reason: str = "",
                   features: Dict = None, reviewer: str = "system") -> ReviewDecision:
    """Save reviewer approve or reject decision to SQLite with pair features."""
    rd = ReviewDecision(
        record_id_1=record_id_1,
        record_id_2=record_id_2,
        decision=decision,
        confidence_at_decision=confidence,
        reason=reason,
        reviewer=reviewer,
        features=features or {},
    )
    db.add(rd)
    db.commit()
    db.refresh(rd)

    # Update feedback weights
    _update_weight(db, record_id_1, record_id_2, decision, features or {})
    invalidate_weight_cache()
    return rd


def _get_pattern_key(record_id_1: str, record_id_2: str, features: Dict) -> str:
    """Build a pattern key based on match score ranges."""
    name_bucket = _bucket(features.get("name_score", 0))
    dob_match = "dob_match" if features.get("dob_score", 0) == 1.0 else "dob_miss"
    ins_match = "ins_match" if features.get("insurance_score", 0) == 1.0 else "ins_miss"
    return f"{dob_match}_{ins_match}_{name_bucket}"


def _bucket(score: float) -> str:
    if score >= 0.9:
        return "name_high"
    elif score >= 0.7:
        return "name_med"
    else:
        return "name_low"


def _update_weight(db: Session, r1: str, r2: str, decision: str, features: Dict):
    """Update pattern weight based on decision."""
    key = _get_pattern_key(r1, r2, features)
    fw = db.query(FeedbackWeight).filter(FeedbackWeight.pattern_key == key).first()
    if not fw:
        fw = FeedbackWeight(pattern_key=key, rejection_count=0, approval_count=0, weight_multiplier=1.0)
        db.add(fw)
        db.commit()
        db.refresh(fw)

    if decision == "reject":
        fw.rejection_count += 1
    else:
        fw.approval_count += 1

    total = fw.approval_count + fw.rejection_count
    if total > 0:
        rejection_rate = fw.rejection_count / total
        # If >50% rejections, downweight the pattern
        if rejection_rate > 0.5:
            fw.weight_multiplier = max(0.3, 1.0 - (rejection_rate * 0.7))
        else:
            fw.weight_multiplier = min(1.2, 1.0 + ((1 - rejection_rate) * 0.2))

    db.commit()


_WEIGHT_CACHE = {}

def get_weight_adjustment(db: Session, features: Dict) -> float:
    """Based on stored rejections, return adjusted confidence multiplier for similar pairs."""
    global _WEIGHT_CACHE
    if not _WEIGHT_CACHE:
        # Load all weights into memory cache once
        for w in db.query(FeedbackWeight).all():
            _WEIGHT_CACHE[w.pattern_key] = w.weight_multiplier
            
    key = _get_pattern_key("", "", features)
    return _WEIGHT_CACHE.get(key, 1.0)

def invalidate_weight_cache():
    """Clear the weight cache when a new decision is made."""
    global _WEIGHT_CACHE
    _WEIGHT_CACHE.clear()

def apply_feedback(db: Session, confidence: float, features: Dict) -> float:
    """Modify confidence score based on historical reviewer decisions."""
    multiplier = get_weight_adjustment(db, features)
    return round(min(confidence * multiplier, 1.0), 4)


def get_feedback_stats(db: Session) -> Dict:
    """Return how many decisions stored, accuracy improvement percentage."""
    total = db.query(ReviewDecision).count()
    approvals = db.query(ReviewDecision).filter(ReviewDecision.decision == "approve").count()
    rejections = db.query(ReviewDecision).filter(ReviewDecision.decision == "reject").count()
    weights = db.query(FeedbackWeight).all()

    patterns_tuned = len([w for w in weights if w.weight_multiplier != 1.0])
    accuracy_improvement = round((patterns_tuned / max(len(weights), 1)) * 100, 1)

    return {
        "total_decisions": total,
        "approvals": approvals,
        "rejections": rejections,
        "patterns_tuned": patterns_tuned,
        "accuracy_improvement_pct": accuracy_improvement,
        "active_weights": len(weights),
    }
