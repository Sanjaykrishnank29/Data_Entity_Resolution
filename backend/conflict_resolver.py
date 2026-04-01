import re
from datetime import datetime
from dateutil import parser as dateutil_parser
from typing import List, Dict

# RULE 1: Configurable Source Authority
# We trust Insurance for ID/DOB and CRM/Hospital for contact data
SOURCE_AUTHORITY = {
    "dob": ["source_d_insurance"],
    "insurance_id": ["source_d_insurance"],
    "phone": ["source_a_hospital"],
    "email": ["source_a_hospital", "source_b_lab"]
}

def get_record_timestamp(record: dict):
    """Helper to parse last_updated ISO string."""
    try:
        return dateutil_parser.parse(str(record.get("last_updated", "")))
    except:
        return datetime.min

def resolve_clinical_field(records: List[Dict], field_name: str, norm_field: str = None) -> Dict:
    """
    Unified decision engine following the Flowchart:
    Authority -> Recency -> Completeness -> LLM -> Audit
    """
    target = norm_field or field_name
    # Filter to records that actually have a value for this field
    candidates = [r for r in records if r.get(target) and str(r.get(target)).strip().lower() not in ("none", "n/a", "")]
    
    if not candidates:
        return {"value": "", "source": "none", "rule": "No Data Found", "confidence": 0.0}

    if len(candidates) == 1:
        return {
            "value": candidates[0].get(target),
            "source": candidates[0].get("source"),
            "rule": "Single Source Truth", 
            "confidence": 1.0
        }

    # --- STEP 1: RULE 1 — SOURCE AUTHORITY ---
    trusted_list = SOURCE_AUTHORITY.get(field_name, [])
    for trusted_name in trusted_list:
        match = next((r for r in candidates if trusted_name.lower() in str(r.get("source")).lower()), None)
        if match:
            return {
                "value": match.get(target),
                "source": match.get("source"),
                "rule": f"Rule 1 — Source Authority ({trusted_name})",
                "confidence": 1.0
            }

    # --- STEP 2: RULE 2 — RECENCY ---
    # Sort by timestamp
    sorted_by_time = sorted(candidates, key=lambda r: get_record_timestamp(r), reverse=True)
    t1 = get_record_timestamp(sorted_by_time[0])
    t2 = get_record_timestamp(sorted_by_time[1])
    
    if t1 > t2: # Clear winner by time
        return {
            "value": sorted_by_time[0].get(target),
            "source": sorted_by_time[0].get("source"),
            "rule": "Rule 2 — Recency (Newest Wins)",
            "confidence": 0.95
        }

    # --- STEP 3: RULE 3 — COMPLETENESS ---
    # Compare string lengths (Full names win over initials, detailed addresses over short ones)
    sorted_by_len = sorted(candidates, key=lambda r: len(str(r.get(target))), reverse=True)
    l1 = len(str(sorted_by_len[0].get(target)))
    l2 = len(str(sorted_by_len[1].get(target)))
    
    if l1 > l2:
        return {
            "value": sorted_by_len[0].get(target),
            "source": sorted_by_len[0].get("source"),
            "rule": "Rule 3 — Completeness (Detailed Wins)",
            "confidence": 0.90
        }

    # --- STEP 4: RULE 4 — LLM REASONS THE EDGE CASE (Live Llama 3) ---
    import os
    if os.getenv("BATCH_MODE") == "true":
        # Skip LLM during massive initial batch to save minutes of boot time
        return {
            "value": candidates[0].get(target),
            "source": candidates[0].get("source"),
            "rule": "Rule 4 — Bypassed (Batch Processing Mode)",
            "confidence": 0.80
        }

    from ai_service import get_clinical_expert_opinion
    
    # Send high-conflict records to Llama 3 for tie-breaker
    # We only send first two candidates for the reasoning
    ai_opinion = get_clinical_expert_opinion(candidates[0], candidates[1], [field_name])
    
    return {
        "value": ai_opinion.get("resolved_fields", {}).get(target, candidates[0].get(target)),
        "source": "AI Reasoning Bureau",
        "rule": f"Rule 4 — AI Resolved: {ai_opinion.get('reasoning', 'LLM Decision')[:60]}...",
        "confidence": ai_opinion.get("confidence_score", 0.75)
    }

def resolve_all_steps(records: List[Dict]) -> Dict:
    """Orchestrates resolution for all field types."""
    results = {
        "name": resolve_clinical_field(records, "name", "norm_name"),
        "dob": resolve_clinical_field(records, "dob", "norm_dob"),
        "phone": resolve_clinical_field(records, "phone", "norm_phone"),
        "insurance_id": resolve_clinical_field(records, "insurance_id", "norm_insurance"),
        "email": resolve_clinical_field(records, "email", "norm_email"),
        "address": resolve_clinical_field(records, "address", "norm_address"),
        "diagnosis": resolve_clinical_field(records, "diagnosis")
    }

    # Special logic for Allergies (Cumulative Merge)
    all_allergies = set()
    sources = set()
    for r in records:
        val = str(r.get("allergy", "")).lower()
        if val and val not in ("none", "n/a", "nkda"):
            parts = [p.strip() for p in re.split(r'[,;]', val)]
            for p in parts:
                if p:
                    all_allergies.add(p.title())
                    sources.add(r.get("source"))

    results["allergy"] = {
        "value": list(sorted(all_allergies)),
        "source": "Merged Sources",
        "rule": "Cumulative Clinical Merge",
        "confidence": 1.0,
        "critical": len(all_allergies) > 0
    }
    
    # Bundle lineage for the Golden Table
    lineage = {k: {"value": v["value"], "source": v["source"], "rule": v["rule"]} 
               for k, v in results.items()}
    
    results["lineage"] = lineage
    return results
