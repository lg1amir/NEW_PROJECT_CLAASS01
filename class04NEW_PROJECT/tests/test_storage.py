"""
tests/test_storage.py - Unit Tests for the File I/O Layer
==========================================================
Run with:  python -m pytest tests/ -v
"""

import csv
import sys
import os
import pytest
from pathlib import Path

# Make project root importable when running tests from the tests/ folder
sys.path.insert(0, str(Path(__file__).parent.parent))

from logic import Record
from storage import (
    _collect_fieldnames,
    _resolve_path,
    load_records_from_csv,
    save_records_to_csv,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_records(n: int = 3) -> list[Record]:
    return [
        Record(full_name=f"User {i}", email=f"user{i}@example.com")
        for i in range(n)
    ]


# ---------------------------------------------------------------------------
# _collect_fieldnames
# ---------------------------------------------------------------------------

class TestCollectFieldnames:
    def test_respects_preferred_order(self):
        records = [Record(email="a@b.com", full_name="Alice")]
        result = _collect_fieldnames(records)
        assert result == ["full_name", "email"]

    def test_only_present_fields(self):
        records = [Record(phone="050-0000000")]
        result = _collect_fieldnames(records)
        assert result == ["phone"]


# ---------------------------------------------------------------------------
# _resolve_path
# ---------------------------------------------------------------------------

class TestResolvePath:
    def test_none_gives_default(self):
        from storage import DEFAULT_OUTPUT_DIR, DEFAULT_FILENAME
        result = _resolve_path(None)
        assert result == DEFAULT_OUTPUT_DIR / DEFAULT_FILENAME

    def test_bare_filename_placed_in_output_dir(self):
        from storage import DEFAULT_OUTPUT_DIR
        result = _resolve_path("custom.csv")
        assert result == DEFAULT_OUTPUT_DIR / "custom.csv"

    def test_full_path_preserved(self, tmp_path):
        full = str(tmp_path / "sub" / "data.csv")
        result = _resolve_path(full)
        assert result == Path(full)


# ---------------------------------------------------------------------------
# save_records_to_csv
# ---------------------------------------------------------------------------

class TestSaveRecordsToCsv:
    def test_creates_file(self, tmp_path):
        records = _make_records()
        dest = tmp_path / "out.csv"
        result = save_records_to_csv(records, str(dest))
        assert result.exists()

    def test_header_present(self, tmp_path):
        records = _make_records(1)
        dest = tmp_path / "out.csv"
        save_records_to_csv(records, str(dest))
        with dest.open(encoding="utf-8-sig") as fh:
            reader = csv.DictReader(fh)
            assert "full_name" in reader.fieldnames
            assert "email" in reader.fieldnames

    def test_correct_row_count(self, tmp_path):
        records = _make_records(5)
        dest = tmp_path / "out.csv"
        save_records_to_csv(records, str(dest))
        with dest.open(encoding="utf-8-sig") as fh:
            rows = list(csv.DictReader(fh))
        assert len(rows) == 5

    def test_append_mode(self, tmp_path):
        records = _make_records(3)
        dest = tmp_path / "out.csv"
        save_records_to_csv(records, str(dest))
        save_records_to_csv(records, str(dest), append=True)
        with dest.open(encoding="utf-8-sig") as fh:
            rows = list(csv.DictReader(fh))
        assert len(rows) == 6

    def test_overwrite_mode(self, tmp_path):
        records = _make_records(3)
        dest = tmp_path / "out.csv"
        save_records_to_csv(records, str(dest))
        save_records_to_csv(_make_records(1), str(dest), append=False)
        with dest.open(encoding="utf-8-sig") as fh:
            rows = list(csv.DictReader(fh))
        assert len(rows) == 1

    def test_empty_records_raises(self, tmp_path):
        with pytest.raises(ValueError):
            save_records_to_csv([], str(tmp_path / "out.csv"))


# ---------------------------------------------------------------------------
# load_records_from_csv
# ---------------------------------------------------------------------------

class TestLoadRecordsFromCsv:
    def test_loads_all_rows(self, tmp_path):
        records = _make_records(4)
        dest = tmp_path / "out.csv"
        save_records_to_csv(records, str(dest))
        rows, _ = load_records_from_csv(str(dest))
        assert len(rows) == 4

    def test_returns_correct_fieldnames(self, tmp_path):
        records = _make_records(2)
        dest = tmp_path / "out.csv"
        save_records_to_csv(records, str(dest))
        _, fieldnames = load_records_from_csv(str(dest))
        assert "full_name" in fieldnames
        assert "email" in fieldnames

    def test_missing_file_raises(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            load_records_from_csv(str(tmp_path / "nonexistent.csv"))

    def test_empty_file_raises(self, tmp_path):
        empty = tmp_path / "empty.csv"
        empty.write_text("", encoding="utf-8")
        with pytest.raises(ValueError):
            load_records_from_csv(str(empty))

