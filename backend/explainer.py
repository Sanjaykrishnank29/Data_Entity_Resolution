def explain_pair(scores: dict) -> str:
    """Step 5: Call Local Llama 3 to generate clinical reasoning string."""
    from ai_service import explain_matching_logic
    return explain_matching_logic(scores)


def explain_conflict(record1: dict, record2: dict) -> dict:
    """Identify which fields conflict between two records."""
    fields_to_check = ["norm_name", "norm_dob", "norm_phone", "norm_insurance", "norm_email", "norm_address"]
    labels = {
        "norm_name": "Name",
        "norm_dob": "Date of Birth",
        "norm_phone": "Phone",
        "norm_insurance": "Insurance ID",
        "norm_email": "Email",
        "norm_address": "Address",
    }
    conflicts = []
    matches = []

    for field in fields_to_check:
        v1 = record1.get(field, "")
        v2 = record2.get(field, "")
        label = labels.get(field, field)
        if v1 and v2 and v1 != v2:
            conflicts.append({
                "field": label,
                "value_1": v1,
                "value_2": v2,
                "type": "mismatch"
            })
        elif v1 == v2 and v1:
            matches.append(label)

    # Check raw allergy
    allergy1 = record1.get("allergy", "")
    allergy2 = record2.get("allergy", "")
    if allergy1 and allergy2 and allergy1.lower() != allergy2.lower():
        conflicts.append({
            "field": "Allergy",
            "value_1": allergy1,
            "value_2": allergy2,
            "type": "allergy_conflict",
            "critical": True
        })

    # Expert AI Reasoning (Step 4 Fallback / Decision Support)
    from ai_service import get_clinical_expert_opinion
    ai_analysis = get_clinical_expert_opinion(record1, record2, [c["field"] for c in conflicts])
    
    return {
        "conflicts": conflicts,
        "matches": matches,
        "conflict_count": len(conflicts),
        "has_allergy_conflict": any(c.get("type") == "allergy_conflict" for c in conflicts),
        "ai_decision": ai_analysis.get("decision", "UNSURE"),
        "ai_reasoning": ai_analysis.get("reasoning", "No AI evaluation available."),
        "ai_confidence": ai_analysis.get("confidence_score", 0.0),
        "ai_resolved_fields": ai_analysis.get("resolved_fields", {})
    }


def get_conflict_priority(conflict_summary: dict) -> str:
    """Return priority level based on conflict type."""
    if conflict_summary.get("has_allergy_conflict"):
        return "CRITICAL"
    count = conflict_summary.get("conflict_count", 0)
    if count >= 3:
        return "HIGH"
    if count >= 1:
        return "MEDIUM"
    return "LOW"
