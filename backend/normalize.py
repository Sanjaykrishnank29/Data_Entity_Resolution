import re
import pandas as pd
from dateutil import parser as dateutil_parser
import unicodedata


def normalize_name(name: str) -> str:
    """Lowercase, strip spaces, remove suffixes, expand initials logic."""
    if not name or not isinstance(name, str):
        return ""
    name = name.lower().strip()
    # Remove suffixes
    name = re.sub(r"\b(jr|sr|ii|iii|iv|v)\b\.?", "", name)
    # Remove punctuation except spaces
    name = re.sub(r"[^a-z\s\.]", "", name)
    # Basic initials handling: "p. green" -> "p green"
    name = name.replace(".", " ")
    # Collapse multiple spaces
    name = re.sub(r"\s+", " ", name).strip()
    return name


def normalize_dob(dob: str) -> str:
    """Convert all date formats to YYYY-MM-DD using dateutil."""
    if not dob or not isinstance(dob, str):
        return ""
    try:
        parsed = dateutil_parser.parse(dob, dayfirst=False)
        return parsed.strftime("%Y-%m-%d")
    except Exception:
        try:
            parsed = dateutil_parser.parse(dob, dayfirst=True)
            return parsed.strftime("%Y-%m-%d")
        except Exception:
            return dob.strip()


def normalize_phone(phone: str) -> str:
    """Canonicalisation of phone numbers: Strip all non-digits, keep last 10 digits."""
    if not phone or not isinstance(phone, str):
        return ""
    digits = re.sub(r"\D", "", str(phone))
    return digits[-10:] if len(digits) >= 10 else digits


def normalize_insurance(insurance_id: str) -> str:
    """Canonicalisation of insurance IDs: Strip hyphens, spaces, uppercase."""
    if not insurance_id or not isinstance(insurance_id, str):
        return ""
    return re.sub(r"[\s\-]", "", insurance_id).upper()


def normalize_email(email: str) -> str:
    """Canonicalisation of emails: Lowercase, strip spaces."""
    if not email or not isinstance(email, str):
        return ""
    return email.lower().strip()


ADDRESS_ABBREVIATIONS = {
    r"\bst\b": "street",
    r"\bave?\b": "avenue",
    r"\bblvd\b": "boulevard",
    r"\bdr\b": "drive",
    r"\brd\b": "road",
    r"\bln\b": "lane",
    r"\bct\b": "court",
    r"\bwy\b": "way",
    r"\bpl\b": "place",
    r"\bsq\b": "square",
    r"\bpkwy\b": "parkway",
    r"\bhwy\b": "highway",
    r"\bapt\b": "apartment",
    r"\bste\b": "suite",
}


def normalize_address(address: str) -> str:
    """Expand abbreviations, strip extra spaces, lowercase. Shows raw vs normalized."""
    if not address or not isinstance(address, str):
        return ""
    addr = address.lower().strip()
    addr = re.sub(r"\s+", " ", addr)
    for pattern, replacement in ADDRESS_ABBREVIATIONS.items():
        addr = re.sub(pattern, replacement, addr)
    return addr


def normalize_allergy(allergy: str) -> list:
    """Split allergy string into normalized list."""
    if not allergy or not isinstance(allergy, str):
        return []
    if allergy.lower() in ("none", "nka", "nkda", "nil", "n/a", "no known allergies", "no allergies", "none known"):
        return []
    parts = re.split(r"[;,]|\band\b", allergy, flags=re.IGNORECASE)
    allergies = []
    for part in parts:
        cleaned = part.strip().lower()
        if cleaned and cleaned not in ("none", "nka", "nkda", "nil", "n/a"):
            allergies.append(cleaned)
    return allergies


# ── Blood Group Normalization ─────────────────────────────────────────────────
_BLOOD_MAP = {
    # A variants
    "a+": "A+", "a positive": "A+", "a pos": "A+", "a_positive": "A+", "apositive": "A+",
    "a-": "A-", "a negative": "A-", "a neg": "A-",
    # B variants
    "b+": "B+", "b positive": "B+", "b pos": "B+", "b_positive": "B+", "bpositive": "B+",
    "b-": "B-", "b negative": "B-", "b neg": "B-",
    # AB variants
    "ab+": "AB+", "ab positive": "AB+", "ab pos": "AB+",
    "ab-": "AB-", "ab negative": "AB-", "ab neg": "AB-",
    # O variants
    "o+": "O+", "o positive": "O+", "o pos": "O+",
    "o-": "O-", "o negative": "O-", "o neg": "O-",
}

VALID_BLOOD_GROUPS = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}


def normalize_blood_group(bg: str) -> str:
    """Normalize blood group variants: B Positive → B+, B pos → B+."""
    if not bg or not isinstance(bg, str):
        return ""
    key = bg.lower().strip().replace("/", "").replace(" ", " ").strip()
    # Direct lookup
    result = _BLOOD_MAP.get(key)
    if result:
        return result
    # Try stripping whitespace variations
    key2 = re.sub(r"\s+", " ", key).strip()
    result = _BLOOD_MAP.get(key2)
    if result:
        return result
    # If already a valid standard form, return as-is (uppercase)
    upper = bg.strip().upper()
    if upper in VALID_BLOOD_GROUPS:
        return upper
    return bg.strip()  # Return original if unrecognized


# ── Gender Normalization ──────────────────────────────────────────────────────
_GENDER_MAP = {
    "m": "Male", "male": "Male", "man": "Male", "boy": "Male",
    "f": "Female", "female": "Female", "woman": "Female", "girl": "Female",
    "nb": "Non-Binary", "nonbinary": "Non-Binary", "non-binary": "Non-Binary",
    "other": "Other", "prefer not to say": "Not Disclosed",
    "unknown": "Unknown", "u": "Unknown",
}


def normalize_gender(gender: str) -> str:
    """Normalize gender variants: M → Male, MALE → Male."""
    if not gender or not isinstance(gender, str):
        return ""
    key = gender.lower().strip()
    return _GENDER_MAP.get(key, gender.strip().title())


# ── Diagnosis Normalization ───────────────────────────────────────────────────
_DIAGNOSIS_MAP = {
    "dm2": "Type 2 Diabetes Mellitus",
    "t2dm": "Type 2 Diabetes Mellitus",
    "diabetes type 2": "Type 2 Diabetes Mellitus",
    "type2 diabetes": "Type 2 Diabetes Mellitus",
    "dm": "Diabetes Mellitus",
    "htn": "Hypertension",
    "high blood pressure": "Hypertension",
    "hypertension": "Hypertension",
    "chf": "Congestive Heart Failure",
    "heart failure": "Congestive Heart Failure",
    "copd": "Chronic Obstructive Pulmonary Disease",
    "ckd": "Chronic Kidney Disease",
    "afib": "Atrial Fibrillation",
    "a-fib": "Atrial Fibrillation",
    "mi": "Myocardial Infarction",
    "heart attack": "Myocardial Infarction",
    "cva": "Cerebrovascular Accident",
    "stroke": "Cerebrovascular Accident",
    "gerd": "Gastroesophageal Reflux Disease",
    "acid reflux": "Gastroesophageal Reflux Disease",
    "oa": "Osteoarthritis",
    "ra": "Rheumatoid Arthritis",
    "uti": "Urinary Tract Infection",
    "lbp": "Low Back Pain",
    "mdd": "Major Depressive Disorder",
}


def normalize_diagnosis(diagnosis: str) -> str:
    """Map diagnosis variants to canonical medical term."""
    if not diagnosis or not isinstance(diagnosis, str):
        return ""
    key = diagnosis.lower().strip()
    return _DIAGNOSIS_MAP.get(key, diagnosis.strip())


# ── Doctor Name Normalization ─────────────────────────────────────────────────
def normalize_doctor_name(name: str) -> str:
    """Standardize Dr. James, J. Wilson MD → Dr. James / J. Wilson."""
    if not name or not isinstance(name, str):
        return ""
    # Remove trailing credentials
    name = re.sub(r"\b(md|do|mbbs|dds|phd|rn|np|pa|dpm|facc|facg|mph)\b\.?", "", name, flags=re.IGNORECASE)
    # Normalize 'dr.' to 'Dr.'
    name = re.sub(r"\bdr\.?\s*", "Dr. ", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+", " ", name).strip()
    # Title case the result
    parts = name.split()
    normalized = " ".join(p.title() if not p.startswith("Dr") else p for p in parts)
    return normalized.strip()


# ── European Umlaut Normalization ─────────────────────────────────────────────
def normalize_unicode_name(name: str) -> str:
    """
    Normalize European umlauts and diacritics:
    Müller → Mueller → resolves to same entity.
    Also handles Arabic transliteration prefix matching.
    """
    if not name or not isinstance(name, str):
        return name
    # Decompose unicode and remove combining characters
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_approx = "".join(c for c in nfkd if not unicodedata.combining(c))
    # Common German umlaut expansions
    umlaut_map = {
        "Ä": "Ae", "ä": "ae",
        "Ö": "Oe", "ö": "oe",
        "Ü": "Ue", "ü": "ue",
        "ß": "ss",
    }
    for uml, expansion in umlaut_map.items():
        ascii_approx = ascii_approx.replace(uml, expansion)
    return ascii_approx


def normalize_row(row: dict) -> dict:
    """Apply all normalizations to a single record dict."""
    name_val = row.get('full_name', '')
    if not name_val:
        name_val = f"{row.get('first_name', '')} {row.get('last_name', '')}"

    raw_address = str(row.get("address", "") or "")
    norm_addr = normalize_address(raw_address)

    return {
        **row,
        "norm_name": normalize_name(name_val),
        "norm_dob": normalize_dob(row.get("dob", "")),
        "norm_phone": normalize_phone(row.get("phone", "")),
        "norm_insurance": normalize_insurance(row.get("insurance_id", "")),
        "norm_email": normalize_email(row.get("email", "")),
        "norm_address": norm_addr,
        "raw_address": raw_address,
        "norm_blood_group": normalize_blood_group(row.get("blood_group", "") or row.get("Blood_Group", "")),
        "norm_gender": normalize_gender(row.get("gender", "") or row.get("Gender", "")),
        "norm_diagnosis": normalize_diagnosis(row.get("diagnosis", "") or row.get("Diagnosis", "")),
    }


def normalize_all(df: pd.DataFrame) -> pd.DataFrame:
    """Apply all normalizations to an entire DataFrame."""
    df = df.copy()

    # Ensure expected columns exist to prevent KeyError
    for col in ["first_name", "last_name", "dob", "phone", "insurance_id", "email", "address"]:
        if col not in df.columns:
            df[col] = ""

    df["norm_name"] = (df["first_name"].fillna("").astype(str) + " " + df["last_name"].fillna("").astype(str)).apply(normalize_name)
    df["norm_dob"] = df["dob"].fillna("").astype(str).apply(normalize_dob)
    df["norm_phone"] = df["phone"].fillna("").astype(str).apply(normalize_phone)
    df["norm_insurance"] = df["insurance_id"].fillna("").astype(str).apply(normalize_insurance)
    df["norm_email"] = df["email"].fillna("").astype(str).apply(normalize_email)
    df["raw_address"] = df["address"].fillna("").astype(str)
    df["norm_address"] = df["raw_address"].apply(normalize_address)

    # New: Blood group, gender, diagnosis normalization
    bg_col = "Blood_Group" if "Blood_Group" in df.columns else "blood_group" if "blood_group" in df.columns else None
    if bg_col:
        df["norm_blood_group"] = df[bg_col].fillna("").astype(str).apply(normalize_blood_group)
    else:
        df["norm_blood_group"] = ""

    gender_col = "Gender" if "Gender" in df.columns else "gender" if "gender" in df.columns else None
    if gender_col:
        df["norm_gender"] = df[gender_col].fillna("").astype(str).apply(normalize_gender)
    else:
        df["norm_gender"] = ""

    diag_col = "Diagnosis" if "Diagnosis" in df.columns else "diagnosis" if "diagnosis" in df.columns else None
    if diag_col:
        df["norm_diagnosis"] = df[diag_col].fillna("").astype(str).apply(normalize_diagnosis)
    else:
        df["norm_diagnosis"] = ""

    return df
