# `file_watcher.py` — Overview & Explanation

## What is this file?

`file_watcher.py` is the **passive, always-on data sensor** of the DataDNA application. Instead of requiring the user to manually upload a CSV file every time, this module runs silently in the background and **automatically detects** when a new CSV file is dropped into the `data2/` folder — triggering the full entity resolution pipeline immediately, with no human interaction needed.

It uses a third-party library called **`watchdog`**, which interfaces directly with the operating system's file system events (like Windows' NTFS change notifications), making detection nearly instantaneous (within ~1 second).

---

## Where is it used?

`file_watcher.py` is started during application boot inside `main.py`'s lifespan startup:

```python
# In main.py → lifespan()
from file_watcher import start_file_watcher
start_file_watcher(DATA_DIR, _handle_new_csv, loop)
```

When a new CSV is detected, it calls `_handle_new_csv(path)` back in `main.py`, which reads the CSV and fires `run_pipeline_task()`.

---

## Code Walkthrough

### Lines 1–4 | Module Docstring
```python
"""
File watcher — monitors the data folder continuously using watchdog.
Any new CSV dropped is detected within 1 second -> auto-triggers full pipeline.
"""
```
The file declares its purpose clearly: monitor the folder, and trigger the pipeline on any new CSV.

---

### Lines 5–8 | Imports
```python
import os
import asyncio
import time
from typing import Callable, Optional
```
- `asyncio`: The backend uses async code (FastAPI). The watcher runs in a separate OS thread, so it needs `asyncio` to safely schedule tasks back on the main event loop.
- `time`: Used to add a small delay so the OS finishes writing the file before we try to read it.
- `Callable`: A type hint indicating the callback must be a function.

---

### Lines 10–15 | Safe Import of Watchdog
```python
try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
    WATCHDOG_AVAILABLE = True
except ImportError:
    WATCHDOG_AVAILABLE = False
```
**Why the `try/except`?** The `watchdog` library is an optional system dependency. If it isn't installed, the app doesn't crash — it just disables the file-watching feature gracefully. `WATCHDOG_AVAILABLE` is a flag used later to decide whether to proceed.

---

### Lines 18–51 | The `CSVDropHandler` Class
```python
class CSVDropHandler(FileSystemEventHandler):
```
This is the **event listener**. It inherits from `watchdog`'s `FileSystemEventHandler` and overrides two reaction methods:

#### `__init__()` — Constructor
```python
def __init__(self, callback: Callable, loop: asyncio.AbstractEventLoop):
    self.callback = callback
    self.loop = loop
    self._seen = set()
```
- `callback`: The function to call when a new CSV is found (this is `_handle_new_csv` from `main.py`).
- `loop`: The asyncio event loop from the main application thread.
- `self._seen`: A `set` of file paths already processed. This acts as a **deduplication guard** — preventing the same file from triggering the pipeline twice if the OS fires multiple events for one file.

---

#### `on_created()` — Triggered when a file is created
```python
def on_created(self, event):
    if not event.is_directory and str(event.src_path).lower().endswith('.csv'):
        path = str(event.src_path)
        if path in self._seen:
            return                          # Already handled — skip
        self._seen.add(path)
        time.sleep(0.5)                     # Wait for OS to finish writing
        asyncio.run_coroutine_threadsafe(self.callback(path), self.loop)
```
- First checks: is this a **file** (not a folder) and does it end in **`.csv`**? If not, ignore.
- Checks `_seen` to prevent duplicate processing.
- `time.sleep(0.5)` — critical safety pause. Without this, the system might try to read a CSV that is still being written to disk, causing a corrupt read.
- `asyncio.run_coroutine_threadsafe()` — The watcher runs in a separate OS thread. This is the thread-safe way to schedule an async function (`callback`) onto the main application event loop.

---

#### `on_modified()` — Triggered when a file is modified
```python
def on_modified(self, event):
    if not event.is_directory and str(event.src_path).lower().endswith('.csv'):
        path = str(event.src_path)
        if path not in self._seen:
            self._seen.add(path)
            time.sleep(0.5)
            asyncio.run_coroutine_threadsafe(self.callback(path), self.loop)
```
Some operating systems fire a "modified" event (not "created") when a large file finishes copying. This handler catches that case, ensuring no CSV gets missed. The `if path not in self._seen` check ensures it won't re-process a file that `on_created` already handled.

---

### Lines 54–55 | Global Observer Reference
```python
_observer: Optional["observer"] = None
```
A module-level variable that holds the single running `Observer` instance. Storing it globally allows `stop_file_watcher()` to access and cleanly shut it down later.

---

### Lines 58–76 | `start_file_watcher()` Function
```python
def start_file_watcher(data_dir: str, callback: Callable, loop: asyncio.AbstractEventLoop):
```
This is the public function called by `main.py` on startup.

```python
if not WATCHDOG_AVAILABLE:
    print("[WATCHER] watchdog library not installed — file watching disabled.")
    return False
```
Safety check — if the library isn't installed, exit gracefully.

```python
if _observer and _observer.is_alive():
    return True
```
Guard against accidentally starting two watchers — prevents resource leaks.

```python
handler = CSVDropHandler(callback=callback, loop=loop)
_observer = Observer()
_observer.schedule(handler, path=data_dir, recursive=False)
_observer.daemon = True
_observer.start()
```
- Creates the event handler, creates the Observer, and tells it to watch `data_dir`.
- `recursive=False` — only watches the top-level folder, not sub-folders.
- `daemon = True` — the watcher thread automatically dies when the main application exits, preventing zombie processes.

---

### Lines 79–85 | `stop_file_watcher()` Function
```python
def stop_file_watcher():
    global _observer
    if _observer and _observer.is_alive():
        _observer.stop()
        _observer.join()      # Wait for the thread to fully finish
        _observer = None
        print("[WATCHER] Observer stopped.")
```
Called during application shutdown (in `main.py`'s lifespan teardown). `_observer.join()` is important — it blocks until the background thread has fully stopped, ensuring no half-finished file reads happen during shutdown.

---

## Summary

| Component | Role |
|---|---|
| `CSVDropHandler` | OS-level event listener. Reacts to new/modified CSV files |
| `on_created()` | Catches a new file drop event |
| `on_modified()` | Catches large file copy completions |
| `self._seen` | Deduplication guard — prevents double-triggering |
| `time.sleep(0.5)` | OS safety pause — waits for file to fully write |
| `asyncio.run_coroutine_threadsafe()` | Bridge from OS thread → async pipeline |
| `start_file_watcher()` | Called once at app startup — arms the watcher |
| `stop_file_watcher()` | Called at app shutdown — disarms the watcher cleanly |
