import jellyfish
from rapidfuzz import fuzz, distance
from sqlalchemy.orm import Session

# ────────── PILLAR 1.2: MULTI-SIGNAL SIMILARITY SCORING ──────────

VALID_BLOOD_GROUPS = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}


def score_name(name1: str, name2: str) -> dict:
    """
    Multi-Metric Hybrid Scoring.
    Jaro-Winkler (prefix focus) + Levenshtein (edit distance).
    Returns dict with both signals for explainability.
    """
    if not name1 or not name2:
        return {"combined": 0.0, "jaro_winkler": 0.0, "levenshtein": 0.0, "token_sort": 0.0}

    # 1. Jaro-Winkler (Excellent for prefixes/transpositions)
    jw = distance.JaroWinkler.normalized_similarity(name1, name2)

    # 2. Levenshtein (Standard edit distance) — visible in explainability
    lev = distance.Levenshtein.normalized_similarity(name1, name2)

    # 3. Token sort ratio for name-order independence (Zhang Wei == Wei Zhang)
    tsr = fuzz.token_sort_ratio(name1, name2) / 100.0

    # Hybrid score: Jaro-Winkler primary, Levenshtein secondary, TSR handles CJK swaps
    combined = (jw * 0.60) + (lev * 0.20) + (tsr * 0.20)

    return {
        "combined": round(combined, 4),
        "jaro_winkler": round(jw, 4),
        "levenshtein": round(lev, 4),
        "token_sort": round(tsr, 4),
    }


def score_dob(dob1: str, dob2: str) -> float:
    """Exact match on normalized DOB (Primary linkage signal)."""
    if not dob1 or not dob2:
        return 0.0
    return 1.0 if dob1 == dob2 else 0.0


def score_phone(phone1: str, phone2: str) -> float:
    """Canonicalized Phone Matching."""
    if not phone1 or not phone2:
        return 0.0
    if phone1 == phone2:
        return 1.0
    # Prefix 6 match (prefix blocking signal — 0.5 weight for family or typos)
    if phone1[:6] == phone2[:6] and len(phone1) >= 6 and len(phone2) >= 6:
        return 0.5
    return 0.0


def score_insurance(ins1: str, ins2: str) -> float:
    """Exact match on standardized Insurance ID."""
    if not ins1 or not ins2:
        return 0.0
    return 1.0 if ins1 == ins2 else 0.0


def score_email(email1: str, email2: str) -> float:
    """Canonicalized Email Matching — exact then domain match."""
    if not email1 or not email2:
        return 0.0
    if email1 == email2:
        return 1.0
    p1 = email1.split('@')
    p2 = email2.split('@')
    if len(p1) == 2 and len(p2) == 2 and p1[1] == p2[1]:
        return 0.7  # Same domain
    return 0.0


def score_address(addr1: str, addr2: str) -> float:
    """Address partial ratio scoring — bonus signal."""
    if not addr1 or not addr2:
        return 0.0
    return fuzz.token_sort_ratio(addr1, addr2) / 100.0


def score_blood_group_penalty(bg1: str, bg2: str) -> float:
    """
    Return a CONFLICT PENALTY (negative float) when blood groups mismatch.
    Blood type conflict is life-critical — reduce confidence significantly.
    Returns 0.0 if no conflict (match or missing data), -0.15 on mismatch.
    """
    if not bg1 or not bg2:
        return 0.0  # Missing data — no penalty
    # Only penalize if both are valid and differ
    if bg1 in VALID_BLOOD_GROUPS and bg2 in VALID_BLOOD_GROUPS:
        if bg1 != bg2:
            return -0.20  # Significant confidence reduction for blood type conflict
    return 0.0


def score_pair(record1: dict, record2: dict, db: Session = None) -> dict:
    """
    Weighted confidence score with Multi-Signal Integration.
    
    Weights:
      DOB           30%
      Insurance ID  25%
      Name          20%  (Jaro-Winkler + Levenshtein hybrid)
      Phone         15%
      Email         10%
      Address       (bonus signal, not weighted into base formula)
      Blood group   (conflict penalty applied post-aggregation)
    
    Feedback adjustment applied before threshold decision.
    """
    name_scores = score_name(
        str(record1.get("norm_name", "")),
        str(record2.get("norm_name", ""))
    )
    n_score = name_scores["combined"]
    d_score = score_dob(str(record1.get("norm_dob", "")), str(record2.get("norm_dob", "")))
    p_score = score_phone(str(record1.get("norm_phone", "")), str(record2.get("norm_phone", "")))
    i_score = score_insurance(str(record1.get("norm_insurance", "")), str(record2.get("norm_insurance", "")))
    e_score = score_email(str(record1.get("norm_email", "")), str(record2.get("norm_email", "")))
    a_score = score_address(str(record1.get("norm_address", "")), str(record2.get("norm_address", "")))

    # Blood group conflict penalty
    bg_penalty = score_blood_group_penalty(
        str(record1.get("norm_blood_group", record1.get("blood_group", ""))),
        str(record2.get("norm_blood_group", record2.get("blood_group", "")))
    )

    # Weighted base score
    w_dob, w_ins, w_name, w_phone, w_email = 0.30, 0.25, 0.20, 0.15, 0.10
    # Address is bonus signal — not in base formula
    # Email weight slightly reduced to fit exact spec weights

    base_confidence = (
        d_score * w_dob +
        i_score * w_ins +
        n_score * w_name +
        p_score * w_phone +
        e_score * w_email
    )

    # Add address as bonus (up to +5%)
    address_bonus = a_score * 0.05
    final_confidence = base_confidence + address_bonus + bg_penalty

    # Apply feedback learning if db available
    features = {
        "name_score": n_score,
        "dob_score": d_score,
        "insurance_score": i_score,
        "phone_score": p_score,
        "email_score": e_score,
    }
    if db is not None:
        try:
            from feedback import apply_feedback
            final_confidence = apply_feedback(db, final_confidence, features)
        except Exception:
            pass

    final_confidence = min(1.0, max(0.0, final_confidence))

    # Generate plain-english explanation
    explanation = _build_explanation(name_scores, d_score, p_score, i_score, e_score, a_score, bg_penalty)

    # Counter-evidence — what's stopping a higher score
    counter = _build_counter_evidence(name_scores, d_score, p_score, i_score, e_score, bg_penalty)

    return {
        "name_score": n_score,
        "name_jaro_winkler": name_scores["jaro_winkler"],
        "name_levenshtein": name_scores["levenshtein"],
        "name_token_sort": name_scores["token_sort"],
        "dob_score": d_score,
        "phone_score": p_score,
        "insurance_score": i_score,
        "email_score": e_score,
        "address_score": a_score,
        "blood_group_penalty": bg_penalty,
        "confidence": round(final_confidence, 4),
        "explanation": explanation,
        "counter_evidence": counter,
        "signal_breakdown": {
            "DOB Match": round(d_score * w_dob * 100, 1),
            "Insurance Match": round(i_score * w_ins * 100, 1),
            "Name Similarity": round(n_score * w_name * 100, 1),
            "Phone Match": round(p_score * w_phone * 100, 1),
            "Email Match": round(e_score * w_email * 100, 1),
            "Address Bonus": round(address_bonus * 100, 1),
            "Blood Type Penalty": round(bg_penalty * 100, 1),
        }
    }


def _build_explanation(name_scores, d_score, p_score, i_score, e_score, a_score, bg_penalty) -> str:
    parts = []
    if d_score == 1.0:
        parts.append("DOB matched exactly (30%)")
    if i_score == 1.0:
        parts.append("Insurance ID matched exactly (25%)")
    if name_scores["combined"] >= 0.85:
        jw = round(name_scores["jaro_winkler"] * 100, 1)
        lev = round(name_scores["levenshtein"] * 100, 1)
        parts.append(f"Name highly similar (JW:{jw}% / Lev:{lev}%) (20%)")
    elif name_scores["combined"] >= 0.60:
        parts.append(f"Name partially matched ({round(name_scores['combined']*100,1)}%)")
    if p_score == 1.0:
        parts.append("Phone matched exactly (15%)")
    if e_score >= 0.7:
        parts.append("Email matched (10%)")
    if bg_penalty < 0:
        parts.append(f"⚠️ Blood type conflict penalized ({round(bg_penalty*100, 1)}%)")
    return ". ".join(parts) if parts else "Partial signal match — review recommended."


def _build_counter_evidence(name_scores, d_score, p_score, i_score, e_score, bg_penalty) -> str:
    missing = []
    if d_score < 1.0:
        missing.append("if DOB matched, confidence would increase by 30%")
    if p_score < 1.0:
        missing.append("if phone matched, confidence would increase by 15%")
    if i_score < 1.0:
        missing.append("if Insurance ID matched, confidence would increase by 25%")
    if e_score < 0.7:
        missing.append("if email matched, confidence would increase by 10%")
    if bg_penalty < 0:
        missing.append("blood type conflict is actively suppressing confidence")
    return "; ".join(missing) if missing else "No major missing signals."
