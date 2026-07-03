# `database.py` - Line-by-Line Explanation

This file is the foundational entry point for the backend's data storage. It sets up the SQLite database connection using SQLAlchemy.

```python
1: from sqlalchemy import create_engine
2: from sqlalchemy.ext.declarative import declarative_base
3: from sqlalchemy.orm import sessionmaker
4: import os
```
**Explanation (Lines 1-4):**
These lines import the necessary tools from `sqlalchemy` to manage our database connection (`create_engine`), define our database tables as Python classes (`declarative_base`), and create database sessions to execute queries (`sessionmaker`). `os` is imported to handle file paths.

```python
6: BASE_DIR = os.path.dirname(os.path.abspath(__file__))
7: DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'datadna.db')}"
```
**Explanation (Lines 6-7):**
Here, the code determines the absolute path to the directory containing this script (`BASE_DIR`). It then constructs the `DATABASE_URL` to point to a local SQLite database file named `datadna.db` in the same directory. SQLite is a lightweight, serverless database perfect for this project's local setup.

```python
9: engine = create_engine(
10:     DATABASE_URL,
11:     connect_args={"check_same_thread": False}
12: )
```
**Explanation (Lines 9-12):**
The `create_engine` function establishes the core connection to the SQLite database. The `connect_args={"check_same_thread": False}` argument is specifically required for SQLite when used with FastAPI; it allows multiple web requests (threads) to share the same database connection without throwing errors.

```python
14: SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
15: Base = declarative_base()
```
**Explanation (Lines 14-15):**
`SessionLocal` is a factory that will generate new database sessions whenever we need to read or write data. `autocommit=False` ensures changes aren't saved until we explicitly tell it to, preventing partial/corrupted data writes.
`Base = declarative_base()` creates a base class. In other files (like `models.py`), every database table will inherit from this `Base` class so SQLAlchemy knows how to map Python objects to SQL tables.

```python
18: def get_db():
19:     db = SessionLocal()
20:     try:
21:         yield db
22:     finally:
23:         db.close()
```
**Explanation (Lines 18-24):**
This is a dependency injection function used extensively by FastAPI. Whenever a web request comes in that needs database access, FastAPI calls `get_db()`.
- Line 19: Opens a new database session (`db`).
- Line 21: `yield db` temporarily hands the session over to the API endpoint to use.
- Lines 22-23: Once the API endpoint is completely finished (or if it crashes), the `finally` block ensures `db.close()` is always called, safely releasing the connection back to the pool.
