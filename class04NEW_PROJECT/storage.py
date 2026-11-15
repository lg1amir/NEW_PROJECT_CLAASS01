"""
storage.py - File I/O Layer
============================
Responsible only for reading and writing data to disk (CSV).
No generation logic or CLI interaction belongs here.
"""

import csv
import os
from pathlib import Path
from typing import Optional

from logic import Record


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_OUTPUT_DIR = Path(__file__).parent / "output"
DEFAULT_FILENAME = "test_data.csv"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def save_records_to_csv(
    records: list[Record],
    filepath: Optional[str] = None,
    append: bool = False,
) -> Path:
    """
    Write a list of Record objects to a CSV file.

    Parameters
    ----------
    records  : list of Record instances to persist.
    filepath : destination path (string or None).
               If None, the file is saved to the default output directory.
    append   : if True and the file already exists, new rows are appended
               instead of overwriting. The header is written only when
               the file is new or empty.

    Returns
    -------
    Absolute Path of the written file.

    Raises
    ------
    ValueError  : if records list is empty.
    OSError     : on filesystem permission or other I/O errors (re-raised
                  with a user-friendly prefix).
    """
    if not records:
        raise ValueError("No records to save.")

    # Collect all column names present in this batch
    fieldnames = _collect_fieldnames(records)

    # Resolve destination path
    dest = _resolve_path(filepath)

    # Determine whether to write header
    file_exists_and_non_empty = dest.exists() and dest.stat().st_size > 0
    write_header = not (append and file_exists_and_non_empty)

    mode = "a" if append else "w"

    try:
        dest.parent.mkdir(parents=True, exist_ok=True)
        with dest.open(mode, newline="", encoding="utf-8-sig") as fh:
            writer = csv.DictWriter(
                fh,
                fieldnames=fieldnames,
                extrasaction="ignore",
                restval="",
            )
            if write_header:
                writer.writeheader()
            for rec in records:
                writer.writerow(rec.as_dict())
    except OSError as exc:
        raise OSError(f"File error: {exc}") from exc

    return dest.resolve()


def load_records_from_csv(filepath: str) -> tuple[list[dict], list[str]]:
    """
    Read records from an existing CSV file.

    Returns
    -------
    (rows, fieldnames) where rows is a list of dicts and fieldnames is
    the list of column headers.

    Raises
    ------
    FileNotFoundError : if the file does not exist.
    OSError           : on other I/O errors.
    ValueError        : if the file is empty or has no header.
    """
    dest = Path(filepath)
    if not dest.exists():
        raise FileNotFoundError(f"File not found: {dest}")

    try:
        with dest.open("r", newline="", encoding="utf-8-sig") as fh:
            reader = csv.DictReader(fh)
            if reader.fieldnames is None:
                raise ValueError("File is empty or missing column headers.")
            fieldnames = list(reader.fieldnames)
            rows = list(reader)
    except OSError as exc:
        raise OSError(f"File error: {exc}") from exc

    if not rows:
        raise ValueError("The file contains no records.")

    return rows, fieldnames


def list_csv_files(directory: Optional[str] = None) -> list[Path]:
    """
    Return all CSV files found in `directory` (defaults to output dir).
    Returns an empty list if the directory does not exist.
    """
    base = Path(directory) if directory else DEFAULT_OUTPUT_DIR
    if not base.exists():
        return []
    return sorted(base.glob("*.csv"))


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _collect_fieldnames(records: list[Record]) -> list[str]:
    """Return ordered column names based on a fixed preferred order."""
    preferred_order = ["full_name", "email", "phone", "id_number"]
    present = {k for rec in records for k in rec.as_dict()}
    return [f for f in preferred_order if f in present]


def _resolve_path(filepath: Optional[str]) -> Path:
    """Resolve the target file path, applying defaults where needed."""
    if filepath:
        p = Path(filepath)
        # If the user gave just a name without directory, place in default dir
        if not p.parent or p.parent == Path("."):
            return DEFAULT_OUTPUT_DIR / p
        return p
    return DEFAULT_OUTPUT_DIR / DEFAULT_FILENAME

