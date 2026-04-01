"""
File watcher — monitors the data folder continuously using watchdog.
Any new CSV dropped is detected within 1 second -> auto-triggers full pipeline.
"""
import os
import asyncio
import time
from datetime import datetime
from typing import Callable

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler, FileCreatedEvent
    WATCHDOG_AVAILABLE = True
except ImportError:
    WATCHDOG_AVAILABLE = False


class CSVDropHandler(FileSystemEventHandler):
    """React to new CSV files dropped into the watched data folder."""

    def __init__(self, callback: Callable, loop: asyncio.AbstractEventLoop):
        super().__init__()
        self.callback = callback
        self.loop = loop
        self._seen = set()

    def on_created(self, event):
        if not event.is_directory and str(event.src_path).lower().endswith('.csv'):
            path = str(event.src_path)
            if path in self._seen:
                return
            self._seen.add(path)
            # Give OS time to finish writing the file
            time.sleep(0.5)
            try:
                asyncio.run_coroutine_threadsafe(self.callback(path), self.loop)
            except Exception as exc:
                print(f"[WATCHER] Error triggering callback: {exc}")

    def on_modified(self, event):
        # Also handle modified events for large file writes
        if not event.is_directory and str(event.src_path).lower().endswith('.csv'):
            path = str(event.src_path)
            # Only trigger if not recently seen
            if path not in self._seen:
                self._seen.add(path)
                time.sleep(0.5)
                try:
                    asyncio.run_coroutine_threadsafe(self.callback(path), self.loop)
                except Exception as exc:
                    print(f"[WATCHER] Error triggering callback: {exc}")


_observer: Observer = None


def start_file_watcher(data_dir: str, callback: Callable, loop: asyncio.AbstractEventLoop):
    """Start watchdog observer on the data directory."""
    global _observer

    if not WATCHDOG_AVAILABLE:
        print("[WATCHER] watchdog library not installed — file watching disabled.")
        return False

    if _observer and _observer.is_alive():
        print("[WATCHER] Observer already running.")
        return True

    handler = CSVDropHandler(callback=callback, loop=loop)
    _observer = Observer()
    _observer.schedule(handler, path=data_dir, recursive=False)
    _observer.daemon = True
    _observer.start()
    print(f"[WATCHER] Monitoring {data_dir} for new CSV files...")
    return True


def stop_file_watcher():
    global _observer
    if _observer and _observer.is_alive():
        _observer.stop()
        _observer.join()
        _observer = None
        print("[WATCHER] Observer stopped.")
