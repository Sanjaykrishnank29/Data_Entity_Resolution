import jellyfish
import pandas as pd
from itertools import combinations
import numpy as np

# ────────── PILLAR 1.1: ADVANCED MULTI-KEY BLOCKING STRATEGIES ──────────


def get_block_key(record: dict) -> str:
    """
    Primary block key: birth year + first 3 chars of normalized name 
    combined with Metaphone phonetic sound token.
    """
    dob = str(record.get("norm_dob", ""))
    birth_year = dob[:4] if len(dob) >= 4 else "0000"

    name = str(record.get("norm_name", ""))
    parts = name.split()
    # Primary: first 3 chars of normalized name
    name_prefix = parts[0][:3] if parts else "UNK"

    # Metaphone phonetic
    if len(parts) >= 2:
        sound_token = jellyfish.metaphone(parts[0]) + "_" + jellyfish.metaphone(parts[-1])
    elif parts:
        sound_token = jellyfish.metaphone(parts[0])
    else:
        sound_token = "UNK"

    return f"{birth_year}_{name_prefix}_{sound_token}"


def get_soundex_key(record: dict) -> str:
    """Soundex phonetic blocking key using Jellyfish."""
    name = str(record.get("norm_name", ""))
    parts = name.split()
    if not parts:
        return "0000"
    sdx_first = jellyfish.soundex(parts[0])
    sdx_last = jellyfish.soundex(parts[-1]) if len(parts) > 1 else ""
    dob = str(record.get("norm_dob", ""))
    birth_year = dob[:4] if len(dob) >= 4 else "0000"
    return f"{birth_year}_{sdx_first}_{sdx_last}"


def get_metaphone_key(record: dict) -> str:
    """Metaphone phonetic blocking key using Jellyfish."""
    name = str(record.get("norm_name", ""))
    parts = name.split()
    if not parts:
        return "UNK_UNK"
    meta_first = jellyfish.metaphone(parts[0]) if parts else "UNK"
    meta_last = jellyfish.metaphone(parts[-1]) if len(parts) > 1 else "UNK"
    dob = str(record.get("norm_dob", ""))
    birth_year = dob[:4] if len(dob) >= 4 else "0000"
    return f"{birth_year}_{meta_first}_{meta_last}"


def get_insurance_block(record: dict) -> str:
    """Secondary block key: normalized insurance ID first 6 chars."""
    ins = str(record.get("norm_insurance", ""))
    return ins[:6] if len(ins) >= 6 else ins


def get_email_domain_block(record: dict) -> str:
    """Tertiary block key: email domain grouping."""
    email = str(record.get("norm_email", ""))
    if "@" in email:
        domain = email.split("@")[1]
        return f"email_{domain}"
    return ""


def get_phone_prefix_block(record: dict) -> str:
    """Quaternary block key: first 6 digits of phone number."""
    phone = str(record.get("norm_phone", ""))
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) >= 6:
        return f"phone_{digits[:6]}"
    return ""


def get_lsh_shingles(name: str, k: int = 3) -> set:
    """LSH: Generate k-shingles for MinHash."""
    if not name or len(name) < k:
        return {name or "N/A"}
    return {name[i:i+k] for i in range(len(name) - k + 1)}


def get_lsh_minhash_signature(name: str, hash_functions: int = 8) -> str:
    """LSH: Generate a consistent MinHash signature for locality-sensitive hashing."""
    shingles = get_lsh_shingles(name)
    signature = []
    for i in range(hash_functions):
        min_hash = min(hash(s + str(i)) for s in shingles)
        signature.append(str(min_hash % 10000))
    return "_".join(signature[:2])


def sorted_neighborhood_blocking(df: pd.DataFrame, window_size: int = 5) -> list:
    """
    Sorted Neighbourhood Blocking — explicitly implemented.
    Sort by combined demographic key, slide a fixed-size window of W records.
    Compare all records within the window. O(n * W) complexity.
    """
    if df.empty:
        return []
    df = df.sort_values(by=["norm_name", "norm_dob"]).reset_index(drop=True)
    records = df.to_dict(orient="records")
    pairs = []

    for i in range(len(records)):
        for j in range(i + 1, min(i + window_size, len(records))):
            pairs.append((records[i], records[j]))
    return pairs


def generate_blocks(df: pd.DataFrame) -> dict:
    """
    Multi-key blocking — each record falls into MULTIPLE buckets simultaneously.
    Union of all buckets reduces O(n²) to O(n * avg_bucket_size).
    
    Keys:
    1. Primary: birth year + first 3 chars + Metaphone (explicit)
    2. Soundex phonetic (explicit)  
    3. Insurance ID prefix (first 6) — secondary block key
    4. Email domain — tertiary block key
    5. Phone prefix (first 6) — quaternary block key
    6. LSH MinHash
    """
    df = df.copy()
    df["block_primary"] = df.apply(get_block_key, axis=1)
    df["block_soundex"] = df.apply(get_soundex_key, axis=1)
    df["block_metaphone"] = df.apply(get_metaphone_key, axis=1)
    df["block_lsh"] = df.apply(lambda r: get_lsh_minhash_signature(r.get("norm_name", "")), axis=1)
    df["block_insurance"] = df.apply(get_insurance_block, axis=1)
    df["block_email_domain"] = df.apply(get_email_domain_block, axis=1)
    df["block_phone_prefix"] = df.apply(get_phone_prefix_block, axis=1)

    blocks = {}
    
    # FATAL ERROR PROTECTION: No block should exceed this size or else N-choose-2 Memory Explodes!
    MAX_BLOCK_SIZE = 50

    # 1. Primary phonetic (Metaphone + Name prefix + Year)
    for key, group in df.groupby("block_primary"):
        if 1 < len(group) <= MAX_BLOCK_SIZE and "UNK" not in key and "0000" not in key:
            blocks[f"primary_{key}"] = group.to_dict(orient="records")

    # 2. Soundex phonetic blocking
    for key, group in df.groupby("block_soundex"):
        if 1 < len(group) <= MAX_BLOCK_SIZE and "0000" not in key:
            blocks[f"soundex_{key}"] = group.to_dict(orient="records")

    # 3. Metaphone blocking (standalone)
    for key, group in df.groupby("block_metaphone"):
        if 1 < len(group) <= MAX_BLOCK_SIZE and "UNK" not in key:
            blocks[f"metaphone_{key}"] = group.to_dict(orient="records")

    # 4. LSH Blocking (MinHash Banding)
    for key, group in df.groupby("block_lsh"):
        if 1 < len(group) <= MAX_BLOCK_SIZE:
            blocks[f"lsh_{key}"] = group.to_dict(orient="records")

    # 5. Insurance ID prefix blocking
    for key, group in df.groupby("block_insurance"):
        if key and 1 < len(group) <= MAX_BLOCK_SIZE:
            blocks[f"ins_{key}"] = group.to_dict(orient="records")

    # 6. Email domain blocking (can easily exceed limit e.g. 'gmail.com')
    df_email = df[df["block_email_domain"] != ""]
    for key, group in df_email.groupby("block_email_domain"):
        if 1 < len(group) <= MAX_BLOCK_SIZE:
            blocks[f"email_{key}"] = group.to_dict(orient="records")

    # 7. Phone prefix blocking
    df_phone = df[df["block_phone_prefix"] != ""]
    for key, group in df_phone.groupby("block_phone_prefix"):
        if 1 < len(group) <= MAX_BLOCK_SIZE:
            blocks[f"phone_{key}"] = group.to_dict(orient="records")

    return blocks


def get_candidate_pairs(df: pd.DataFrame) -> list:
    """
    Generate candidate pairs using Hybrid Multi-Key Approach:
    Phonetic (Metaphone + Soundex) + LSH + Insurance + Email domain + 
    Phone prefix + Sorted Neighborhood.
    
    Multi-key: one record falls into multiple buckets simultaneously.
    Union of all buckets — O(n²) to O(n * W) reduction.
    """
    if df.empty:
        return []

    # Multi-key block discovery
    blocks = generate_blocks(df)
    candidate_pairs = []
    seen_pairs = set()

    for block_key, records in blocks.items():
        if len(records) < 2:
            continue
        for r1, r2 in combinations(records, 2):
            id1, id2 = str(r1.get("id", "")), str(r2.get("id", ""))
            pair_key = tuple(sorted([id1, id2]))
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)
            candidate_pairs.append((r1, r2))

    # Add Sorted Neighbourhood Blocking candidates
    sn_pairs = sorted_neighborhood_blocking(df, window_size=5)
    for r1, r2 in sn_pairs:
        id1, id2 = str(r1.get("id", "")), str(r2.get("id", ""))
        pair_key = tuple(sorted([id1, id2]))
        if pair_key not in seen_pairs:
            seen_pairs.add(pair_key)
            candidate_pairs.append((r1, r2))

    return candidate_pairs
