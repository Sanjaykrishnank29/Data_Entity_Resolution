import json
import logging
from typing import List, Dict, Any
import ollama

# Configure local Llama 3 connection
MODEL_NAME = "llama3:latest"

def get_clinical_expert_opinion(record1: dict, record2: dict, conflicts: list) -> Dict[str, Any]:
    """
    Expert AI Decision Support:
    Sends record fragments + conflicts to local Llama 3 to get a natural language reasoning for the Review Screen.
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

    # Strip private SQLAlchemy state before sending to LLM
    r1_clean = {k: v for k, v in record1.items() if not k.startswith('_')}
    r2_clean = {k: v for k, v in record2.items() if not k.startswith('_')}

    user_content = f"""
    COMPARING RECORDS:
    A: {r1_clean}
    B: {r2_clean}
    
    SPECIFIC CONFLICTS: {json.dumps(conflicts)}
    
    Based on the clinical flowchart, perform a tie-breaker decision.
    """

    try:
        # Step 4: AI Reasons the Edge Case
        response = ollama.chat(model=MODEL_NAME, messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_content},
        ], format='json')
        
        return json.loads(response['message']['content'])
    except Exception as e:
        # Fallback if service is down/busy
        logging.error(f"Local AI Error: {str(e)}")
        return {
            "decision": "UNSURE",
            "reasoning": f"AI Engine Exception: {str(e)}",
            "confidence_score": 0.0,
            "resolved_fields": {}
        }

def explain_matching_logic(scores: dict) -> str:
    """Uses LLM to generate a natural language explanation for match scores."""
    prompt = f"Explain to a doctor why these similarity scores suggest a match: {json.dumps(scores)}. Keep it under 20 words."
    
    try:
        response = ollama.generate(model=MODEL_NAME, prompt=prompt)
        return response['response'].strip()
    except:
        return f"Weighted Score Analysis: {scores.get('confidence', 0)*100:.1f}% confidence."
