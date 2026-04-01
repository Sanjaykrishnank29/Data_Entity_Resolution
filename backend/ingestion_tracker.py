"""
Ingestion Tracker — Live statistics and log for the ingestion pipeline.
Tracks records received, duplicates caught, processing speed, and per-source breakdown.
"""
from datetime import datetime, date
from collections import deque
from typing import List, Dict
import time
import threading

# Thread-safe in-memory store
_lock = threading.Lock()

_ingestion_log: deque = deque(maxlen=200)  # Last 200 log entries

_stats = {
    "records_today": 0,
    "duplicates_caught": 0,
    "auto_merged": 0,
    "sent_to_review": 0,
    "rejected": 0,
    "processing_times_ms": deque(maxlen=100),
    "method_counts": {
        "csv_upload": 0,
        "websocket_feed": 0,
        "api_single": 0,
        "api_batch": 0,
        "file_watcher": 0,
        "folder_ingest": 0,
    },
    "source_counts": {},
    "last_reset_date": str(date.today()),
}


def _check_daily_reset():
    today_str = str(date.today())
    with _lock:
        if _stats["last_reset_date"] != today_str:
            _stats["records_today"] = 0
            _stats["duplicates_caught"] = 0
            _stats["auto_merged"] = 0
            _stats["sent_to_review"] = 0
            _stats["rejected"] = 0
            _stats["processing_times_ms"].clear()
            _stats["last_reset_date"] = today_str


def log_ingestion_event(source: str, record_name: str, result: str,
                         confidence: float = 0.0, method: str = "folder_ingest",
                         latency_ms: float = 0.0):
    """Record a single ingestion event."""
    _check_daily_reset()

    status_map = {
        "safe": "safe",
        "duplicate": "duplicate",
        "review": "review",
        "auto_merge": "duplicate",
        "new_identity": "safe",
        "pending": "review",
    }
    normalized_result = status_map.get(result, result)

    entry = {
        "timestamp": datetime.now().isoformat(),
        "source": source,
        "record_name": record_name,
        "result": normalized_result,
        "confidence": round(confidence, 4),
        "method": method,
        "latency_ms": round(latency_ms, 1),
    }

    with _lock:
        _ingestion_log.appendleft(entry)
        _stats["records_today"] += 1

        if normalized_result == "duplicate":
            _stats["duplicates_caught"] += 1
            _stats["auto_merged"] += 1
        elif normalized_result == "review":
            _stats["sent_to_review"] += 1
        else:
            _stats["rejected"] = 0  # 'safe' means it passed

        if latency_ms > 0:
            _stats["processing_times_ms"].append(latency_ms)

        # Method breakdown
        if method in _stats["method_counts"]:
            _stats["method_counts"][method] += 1

        # Source breakdown
        src_key = source or "unknown"
        _stats["source_counts"][src_key] = _stats["source_counts"].get(src_key, 0) + 1


def log_batch_ingestion(source: str, count: int, duplicates: int, method: str = "folder_ingest", latency_ms: float = 0.0):
    """Bulk update stats for a batch of records."""
    _check_daily_reset()
    with _lock:
        _stats["records_today"] += count
        _stats["duplicates_caught"] += duplicates
        _stats["auto_merged"] += duplicates
        if latency_ms > 0:
            _stats["processing_times_ms"].append(latency_ms)
        if method in _stats["method_counts"]:
            _stats["method_counts"][method] += count
        src_key = source or "unknown"
        _stats["source_counts"][src_key] = _stats["source_counts"].get(src_key, 0) + count


def get_ingestion_stats() -> Dict:
    """Return live ingestion statistics including available local CSV files."""
    _check_daily_reset()
    
    import os
    import glob
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data2")
    csv_files = []
    if os.path.exists(data_dir):
        csv_files = [os.path.basename(f) for f in glob.glob(os.path.join(data_dir, "*.csv"))]

    with _lock:
        times = list(_stats["processing_times_ms"])
        avg_latency = round(sum(times) / len(times), 1) if times else 0.0
        # Records per second: based on average latency
        rps = round(1000.0 / avg_latency, 1) if avg_latency > 0 else 0.0
        total = max(_stats["records_today"], 1)
        dup_rate = round((_stats["duplicates_caught"] / total) * 100, 1)

        return {
            "records_today": _stats["records_today"],
            "duplicates_caught": _stats["duplicates_caught"],
            "auto_merged": _stats["auto_merged"],
            "sent_to_review": _stats["sent_to_review"],
            "duplicate_catch_rate_pct": dup_rate,
            "avg_latency_ms": avg_latency,
            "records_per_second": rps,
            "method_breakdown": dict(_stats["method_counts"]),
            "source_breakdown": dict(_stats["source_counts"]),
            "csv_files": csv_files,
        }


def get_ingestion_log(limit: int = 50) -> List[Dict]:
    """Return last N ingestion log entries."""
    with _lock:
        return list(_ingestion_log)[:limit]
