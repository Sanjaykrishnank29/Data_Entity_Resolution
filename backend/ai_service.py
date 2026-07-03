import json
import logging
from typing import List, Dict, Any
import ollama

# Configure local connection
MODEL_NAME = "phi3:mini"

def get_clinical_expert_opinion(record1: dict, record2: dict, conflicts: list) -> Dict[str, Any]:
    """
    Expert AI Decision Support:
    Sends record fragments + conflicts to local LLM to get a natural language reasoning for the Review Screen.
    """
    
    system_prompt = """
    You are a Senior Data Steward for a National Clinical Master Patient Index (MPI).
    Your objective is to perform high-fidelity clinical identity deduplication.
    
    CRITICAL REASONING RULES:
    1. PHONETIC VARIATIONS: 'Catherine' vs 'Katherine' are likely matches if DOB aligns.
    2. TYPOS: '123 Main St' vs '123 Main Str' or '123 Main' are address matches.
    3. CLINICAL SAFETY: If Date of Birth (DOB) differs by more than 5 years, it is likely a 'CLASH' (different person), unless phone/insurance matches exactly (family members sharing devices).
    4. TWIN DETECTION: Same Last Name, Same DOB, Same Address, but different First Name (e.g., 'James' vs 'John') is a 'CLASH' (likely twins).
    
    EXPECTED JSON RESPONSE FORMAT:
    {
        "decision": "MATCH" | "CLASH" | "UNSURE",
        "reasoning": "A professional one-sentence clinical evaluation.",
        "confidence_score": 0.0 to 1.0,
        "resolved_fields": {
            "name": "Winning full name",
            "dob": "YYYY-MM-DD",
            "phone": "digits only",
            "insurance_id": "Winner ID"
        }
    }
    """

    user_prompt = f"""
    Compare these two candidate records:
    Record 1: {json.dumps(record1, default=str)}
    Record 2: {json.dumps(record2, default=str)}
    
    Known Conflicts Detected by Heuristics: {conflicts}
    
    Respond STRICTLY in the requested JSON format.
    """
    
    try:
        response = ollama.chat(model=MODEL_NAME, messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ])
        
        content = response['message']['content'].strip()
        if content.startswith("```json"):
            content = content[7:-3].strip()
            
        result = json.loads(content)
        return result
    except Exception as e:
        logging.error(f"[AI SERVICE ERROR] {e}")
        return {
            "decision": "UNSURE",
            "reasoning": "AI Service unavailable. Review required.",
            "confidence_score": 0.5,
            "resolved_fields": {}
        }


def explain_matching_logic(scores: dict) -> str:
    """Natural language summary of why two records were scored a certain way."""
    prompt = f"""
    Explain in one sentence why this pair scored {scores.get('confidence', 0)} based on these metrics: {scores}.
    Be concise.
    """
    try:
        response = ollama.generate(model=MODEL_NAME, prompt=prompt)
        return response['response'].strip()
    except Exception:
        return f"Weighted Score Analysis: {scores.get('confidence', 0)*100:.1f}% confidence."
