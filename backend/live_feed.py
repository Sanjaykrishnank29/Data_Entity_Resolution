"""
Live WebSocket feed — pushes one new patient record every 3 seconds from a queue.
Simulates a real-time data stream from external sources.
"""
import asyncio
import random
import uuid
from datetime import datetime, date
from typing import List


# Sample pool for generating realistic fake patient records
FIRST_NAMES = ["James", "Maria", "Robert", "Linda", "Michael", "Patricia", "William", "Barbara",
               "David", "Elizabeth", "Richard", "Jennifer", "Joseph", "Sarah", "Thomas", "Karen",
               "Priya", "Arjun", "Wei", "Fatima", "Amara", "Liam", "Sophia", "Noah", "Emma"]

LAST_NAMES = ["Smith", "Johnson", "Williams", "Jones", "Brown", "Davis", "Miller", "Wilson",
              "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin",
              "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Lewis", "Lee", "Walker",
              "Patel", "Zhang", "Kumar", "Müller", "Al-Hassan", "Okafor"]

DIAGNOSES = ["Hypertension", "Type 2 Diabetes", "Asthma", "COPD", "CHF", "Atrial Fibrillation",
             "CKD Stage 3", "Osteoarthritis", "Major Depression", "Anxiety Disorder",
             "Hypothyroidism", "Hyperlipidemia", "GERD", "Migraine", "Pneumonia"]

ALLERGIES = ["Penicillin", "Sulfa", "Aspirin", "Ibuprofen", "Codeine", "Latex", "Shellfish",
             "Peanuts", "None", "NKDA", "Morphine", "Contrast Dye", "Amoxicillin"]

SOURCES = ["Source_A_Hospital", "Source_B_Lab", "Source_C_Pharmacy", "Source_D_Insurance", "Source_E_ER"]

BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]


def generate_fake_record() -> dict:
    """Generate a realistic looking patient record for the live feed."""
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    year = random.randint(1940, 2005)
    month = random.randint(1, 12)
    day = random.randint(1, 28)
    dob = f"{year}-{month:02d}-{day:02d}"
    phone_digits = "".join([str(random.randint(0, 9)) for _ in range(10)])
    ins_id = f"INS{random.randint(10000,99999)}{random.choice('ABCDE')}"
    local_part = f"{first.lower()}.{last.lower()}{random.randint(1, 99)}"
    domain = random.choice(["gmail.com", "yahoo.com", "outlook.com", "healthmail.com", "mednet.org"])
    email = f"{local_part}@{domain}"
    street_no = random.randint(100, 9999)
    street_name = random.choice(["Main St", "Park Ave", "Oak Lane", "Elm Blvd", "Cedar Rd", "Maple Court"])
    city = random.choice(["Austin", "Dallas", "Houston", "Phoenix", "Chicago", "New York", "Denver", "Seattle"])
    address = f"{street_no} {street_name}, {city}, TX"

    return {
        "record_id": f"WS_{uuid.uuid4().hex[:8].upper()}",
        "first_name": first,
        "last_name": last,
        "full_name": f"{first} {last}",
        "dob": dob,
        "phone": phone_digits,
        "email": email,
        "insurance_id": ins_id,
        "address": address,
        "allergy": random.choice(ALLERGIES),
        "diagnosis": random.choice(DIAGNOSES),
        "blood_group": random.choice(BLOOD_GROUPS),
        "source": random.choice(SOURCES),
        "timestamp": datetime.now().isoformat(),
    }


# Global queue for records waiting to be broadcast
_live_feed_queue: asyncio.Queue = None
_live_feed_task = None


def get_live_queue() -> asyncio.Queue:
    global _live_feed_queue
    if _live_feed_queue is None:
        _live_feed_queue = asyncio.Queue()
    return _live_feed_queue


async def live_feed_generator(connections: list, process_fn=None):
    """
    Infinite loop — push one generated patient record every 3 seconds to all
    connected WebSocket clients on /ws/live-feed endpoint.
    Optionally calls process_fn(record) to run duplicate check.
    """
    queue = get_live_queue()

    # Pre-populate queue with 20 records 
    for _ in range(20):
        await queue.put(generate_fake_record())

    while True:
        # Generate and enqueue new records continuously
        await queue.put(generate_fake_record())

        # Process one record from the head of the queue
        try:
            record = await asyncio.wait_for(queue.get(), timeout=0.5)
        except asyncio.TimeoutError:
            await asyncio.sleep(3)
            continue

        # Run duplicate check if available
        result_label = "safe"
        confidence = 0.0
        if process_fn:
            try:
                check_result = await asyncio.to_thread(process_fn, record)
                if check_result.get("is_duplicate"):
                    best = check_result.get("matches", [{}])[0]
                    confidence = best.get("confidence", 0.0)
                    if confidence >= 0.90:
                        result_label = "duplicate"
                    else:
                        result_label = "review"
            except Exception:
                pass

        payload = {
            "type": "live_record",
            "record": record,
            "result": result_label,
            "confidence": round(confidence, 4),
            "timestamp": datetime.now().strftime("%H:%M:%S"),
        }

        import json
        dead = []
        for ws in connections:
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.append(ws)
        for d in dead:
            if d in connections:
                connections.remove(d)

        await asyncio.sleep(3)
