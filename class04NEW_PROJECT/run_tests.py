"""
run_tests.py – Automated Invalid-Input Test Runner
====================================================
Runs every invalid / edge-case scenario for the business logic and file I/O
layers without requiring any external library.

Usage:
    python run_tests.py           # run all suites
    python run_tests.py -v        # verbose (show all PASS lines too)
    python run_tests.py --suite validation   # only validation suite
    python run_tests.py --suite storage      # only storage suite
    python run_tests.py --suite generation   # only generation suite
"""

import csv
import sys
import tempfile
import traceback
from pathlib import Path
from typing import Callable

# ---------------------------------------------------------------------------
# Make sure project root is importable
# ---------------------------------------------------------------------------
sys.path.insert(0, str(Path(__file__).parent))

from logic import (
    TestDataGenerator,
    _luhn_check_digit,
    generate_id_number,
    validate_count,
    validate_field_choices,
)
from storage import load_records_from_csv, save_records_to_csv
from logic import Record


# ---------------------------------------------------------------------------
# Tiny test framework
# ---------------------------------------------------------------------------

RESET  = "\033[0m"
BOLD   = "\033[1m"
GREEN  = "\033[32m"
RED    = "\033[31m"
YELLOW = "\033[33m"
CYAN   = "\033[36m"
DIM    = "\033[2m"

_verbose = False


class TestResult:
    def __init__(self) -> None:
        self.passed = 0
        self.failed = 0
        self.errors = 0
        self.failures: list[str] = []

    def record_pass(self, name: str) -> None:
        self.passed += 1
        if _verbose:
            print(f"  {GREEN}✔ PASS{RESET}  {DIM}{name}{RESET}")

    def record_fail(self, name: str, reason: str) -> None:
        self.failed += 1
        self.failures.append(f"{name}: {reason}")
        print(f"  {RED}✘ FAIL{RESET}  {name}")
        print(f"         {RED}{reason}{RESET}")

    def record_error(self, name: str, exc: Exception) -> None:
        self.errors += 1
        tb = traceback.format_exc().strip().splitlines()[-1]
        self.failures.append(f"{name}: UNEXPECTED {tb}")
        print(f"  {YELLOW}⚡ ERR {RESET}  {name}")
        print(f"         {YELLOW}{tb}{RESET}")


_global = TestResult()


def _run_case(
    result: TestResult,
    name: str,
    fn: Callable,
    *,
    expect_raises: type | tuple | None = None,
    expect_value=None,
    not_raises: bool = False,
) -> None:
    """
    Execute fn() and check the outcome:
    - expect_raises  → fn() must raise that exception type
    - not_raises     → fn() must NOT raise any exception
    - expect_value   → fn() must return this exact value
    """
    try:
        value = fn()
        if expect_raises:
            result.record_fail(name, f"Expected {expect_raises} to be raised, but got {value!r}")
        elif expect_value is not None and value != expect_value:
            result.record_fail(name, f"Expected {expect_value!r}, got {value!r}")
        else:
            result.record_pass(name)
    except Exception as exc:
        if expect_raises and isinstance(exc, expect_raises):
            result.record_pass(name)
        elif not_raises:
            result.record_error(name, exc)
        elif expect_raises:
            result.record_error(name, exc)
        else:
            result.record_error(name, exc)


def _suite(title: str) -> TestResult:
    print(f"\n{BOLD}{CYAN}{'─'*60}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{'─'*60}{RESET}")
    r = TestResult()
    return r


def _merge(into: TestResult, src: TestResult) -> None:
    into.passed += src.passed
    into.failed += src.failed
    into.errors  += src.errors
    into.failures.extend(src.failures)


# ===========================================================================
# Suite 1 – validate_count (invalid inputs)
# ===========================================================================

def suite_validate_count() -> TestResult:
    r = _suite("Suite 1 · validate_count — Invalid Inputs")

    INVALID_INPUTS = [
        # (label, raw_input, expected_exception)
        ("empty string",           "",          ValueError),
        ("blank spaces",           "   ",       ValueError),
        ("zero",                   "0",         ValueError),
        ("negative integer",       "-1",        ValueError),
        ("negative string",        "-100",      ValueError),
        ("float",                  "3.14",      ValueError),
        ("float with comma",       "3,14",      ValueError),
        ("letters only",           "abc",       ValueError),
        ("mixed alpha-num",        "10x",       ValueError),
        ("special chars",          "10!",       ValueError),
        ("tab character",          "\t",        ValueError),
        ("newline character",      "\n",        ValueError),
        ("very large number",      "100001",    ValueError),
        ("one above max",          "100001",    ValueError),
        ("SQL injection attempt",  "1; DROP",   ValueError),
        ("unicode digit lookalike","１",         ValueError),  # fullwidth 1
        ("hex string",             "0xFF",      ValueError),
        ("scientific notation",    "1e3",       ValueError),
        ("whitespace+number+ws",   " 1 2 ",     ValueError),
        ("comma-separated",        "1,000",     ValueError),
    ]

    for label, raw, exc_type in INVALID_INPUTS:
        _run_case(r, label, lambda v=raw: validate_count(v), expect_raises=exc_type)

    # Valid boundary values (should NOT raise)
    VALID_INPUTS = [
        ("minimum valid: 1",       "1",      1),
        ("leading zeros strip",    "050",    50),
        ("max valid: 100000",      "100000", 100_000),
        ("with surrounding spaces","  42  ", 42),
    ]
    for label, raw, expected in VALID_INPUTS:
        _run_case(r, f"[valid] {label}", lambda v=raw: validate_count(v), expect_value=expected)

    return r


# ===========================================================================
# Suite 2 – validate_field_choices (invalid inputs)
# ===========================================================================

def suite_validate_field_choices() -> TestResult:
    r = _suite("Suite 2 · validate_field_choices — Invalid Inputs")

    INVALID_INPUTS = [
        ("empty string",             ""),
        ("blank spaces",             "   "),
        ("out-of-range: 0",          "0"),
        ("out-of-range: 5",          "5"),
        ("out-of-range: 9",          "9"),
        ("out-of-range: -1",         "-1"),
        ("letters",                  "a"),
        ("word",                     "name"),
        ("mixed valid+invalid",      "1,99"),
        ("float field number",       "1.5"),
        ("comma only",               ","),
        ("multiple commas",          ",,,,"),
        ("spaces only",              "    "),
        ("SQL injection",            "1; DROP TABLE"),
        ("unicode",                  "١"),  # Arabic-Indic digit 1
    ]

    for label, raw in INVALID_INPUTS:
        _run_case(r, label, lambda v=raw: validate_field_choices(v), expect_raises=ValueError)

    # Valid inputs
    VALID_INPUTS = [
        ("single field 1",         "1",     ["full_name"]),
        ("single field 4",         "4",     ["id_number"]),
        ("comma separated 1,2",    "1,2",   ["full_name", "email"]),
        ("space separated 1 3",    "1 3",   ["full_name", "phone"]),
        ("all four fields",        "1,2,3,4",["full_name","email","phone","id_number"]),
        ("dedup 1,1,2",            "1,1,2", ["full_name","email"]),
        ("reversed order 4,3,2,1", "4,3,2,1",["id_number","phone","email","full_name"]),  # input order preserved
    ]
    for label, raw, expected in VALID_INPUTS:
        _run_case(r, f"[valid] {label}", lambda v=raw, e=expected: validate_field_choices(v) == e
                  or (_ for _ in ()).throw(AssertionError(f"got {validate_field_choices(v)}")),
                  not_raises=True)
        # simpler: just check no exception and correct result
        try:
            result = validate_field_choices(raw)
            if result == expected:
                r.record_pass(f"[valid] {label}")
            else:
                r.record_fail(f"[valid] {label}", f"Expected {expected}, got {result}")
        except Exception as exc:
            r.record_error(f"[valid] {label}", exc)

    return r


# ===========================================================================
# Suite 3 – TestDataGenerator (invalid inputs / edge cases)
# ===========================================================================

def suite_generator() -> TestResult:
    r = _suite("Suite 3 · TestDataGenerator — Edge Cases & Invalid Inputs")

    # count = 0
    _run_case(r, "generate(0) raises ValueError",
              lambda: TestDataGenerator(["full_name"]).generate(0),
              expect_raises=ValueError)

    # count < 0
    _run_case(r, "generate(-5) raises ValueError",
              lambda: TestDataGenerator(["full_name"]).generate(-5),
              expect_raises=ValueError)

    # empty fields list – should still work (produces empty-field records)
    def _gen_no_fields():
        gen = TestDataGenerator([])
        recs = gen.generate(3)
        assert len(recs) == 3
    _run_case(r, "generate with empty fields list produces records",
              _gen_no_fields, not_raises=True)

    # Uniqueness: full_name across 20 records
    def _unique_names():
        gen = TestDataGenerator(["full_name"])
        recs = gen.generate(20)
        names = [r.full_name for r in recs]
        assert len(set(names)) == len(names), f"Duplicates found: {len(names)-len(set(names))}"
    _run_case(r, "20 full_name records are all unique", _unique_names, not_raises=True)

    # Uniqueness: email across 50 records
    def _unique_emails():
        gen = TestDataGenerator(["email"])
        recs = gen.generate(50)
        emails = [r.email for r in recs]
        assert len(set(emails)) == len(emails)
    _run_case(r, "50 email records are all unique", _unique_emails, not_raises=True)

    # Uniqueness: phone across 100 records
    def _unique_phones():
        gen = TestDataGenerator(["phone"])
        recs = gen.generate(100)
        phones = [r.phone for r in recs]
        assert len(set(phones)) == len(phones)
    _run_case(r, "100 phone records are all unique", _unique_phones, not_raises=True)

    # Uniqueness: id_number across 200 records + Luhn validity
    def _unique_ids_and_luhn():
        gen = TestDataGenerator(["id_number"])
        recs = gen.generate(200)
        ids = [r.id_number for r in recs]
        assert len(set(ids)) == len(ids), "Duplicate IDs found"
        for id_num in ids:
            assert len(id_num) == 9, f"ID not 9 digits: {id_num}"
            assert id_num.isdigit(), f"ID not numeric: {id_num}"
            digits = [int(d) for d in id_num[:8]]
            assert int(id_num[8]) == _luhn_check_digit(digits), f"Bad Luhn: {id_num}"
    _run_case(r, "200 ID numbers: unique + valid Luhn check digit",
              _unique_ids_and_luhn, not_raises=True)

    # Fields isolation: requesting only 'email' must not populate other fields
    def _field_isolation():
        gen = TestDataGenerator(["email"])
        rec = gen.generate(1)[0]
        assert rec.email is not None
        assert rec.full_name is None
        assert rec.phone is None
        assert rec.id_number is None
    _run_case(r, "Field isolation: only requested fields are populated",
              _field_isolation, not_raises=True)

    # Email format validity
    def _email_format():
        gen = TestDataGenerator(["email"])
        recs = gen.generate(30)
        for rec in recs:
            assert "@" in rec.email, f"Invalid email: {rec.email}"
            local, domain = rec.email.split("@", 1)
            assert local, "Empty local part"
            assert "." in domain, f"Invalid domain: {domain}"
    _run_case(r, "30 generated emails have valid format (local@domain.tld)",
              _email_format, not_raises=True)

    # Phone format validity
    def _phone_format():
        gen = TestDataGenerator(["phone"])
        recs = gen.generate(30)
        for rec in recs:
            p = rec.phone
            assert p.startswith("05"), f"Phone doesn't start with 05: {p}"
            assert "-" in p, f"Phone missing hyphen: {p}"
            digits_only = p.replace("-", "")
            assert len(digits_only) == 10, f"Phone has {len(digits_only)} digits: {p}"
    _run_case(r, "30 generated phones match Israeli format (05x-xxxxxxx)",
              _phone_format, not_raises=True)

    # Large batch – 500 records with all fields (performance + uniqueness)
    def _large_batch():
        gen = TestDataGenerator(["full_name", "email", "phone", "id_number"])
        recs = gen.generate(500)
        assert len(recs) == 500
        emails = [r.email for r in recs]
        phones = [r.phone for r in recs]
        ids    = [r.id_number for r in recs]
        assert len(set(emails)) == 500, "Duplicate emails in 500-record batch"
        assert len(set(phones)) == 500, "Duplicate phones in 500-record batch"
        assert len(set(ids))    == 500, "Duplicate IDs in 500-record batch"
    _run_case(r, "500 records (all fields): generated, unique, no crash",
              _large_batch, not_raises=True)

    return r


# ===========================================================================
# Suite 4 – storage layer (invalid inputs / file edge cases)
# ===========================================================================

def suite_storage() -> TestResult:
    r = _suite("Suite 4 · Storage Layer — Invalid Inputs & File Edge Cases")

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir)

        # save_records_to_csv – empty list
        _run_case(r, "save empty list raises ValueError",
                  lambda: save_records_to_csv([], str(tmp / "x.csv")),
                  expect_raises=ValueError)

        # load_records_from_csv – file does not exist
        _run_case(r, "load non-existent file raises FileNotFoundError",
                  lambda: load_records_from_csv(str(tmp / "ghost.csv")),
                  expect_raises=FileNotFoundError)

        # load_records_from_csv – completely empty file (0 bytes)
        empty_file = tmp / "empty.csv"
        empty_file.write_text("", encoding="utf-8")
        _run_case(r, "load empty (0-byte) file raises ValueError",
                  lambda: load_records_from_csv(str(empty_file)),
                  expect_raises=ValueError)

        # load_records_from_csv – header only, no data rows
        header_only = tmp / "header_only.csv"
        header_only.write_text("full_name,email\n", encoding="utf-8")
        _run_case(r, "load header-only CSV (no data rows) raises ValueError",
                  lambda: load_records_from_csv(str(header_only)),
                  expect_raises=ValueError)

        # save then load round-trip (1 record)
        def _round_trip_1():
            rec = Record(full_name="Alice Test", email="alice@test.com")
            dest = tmp / "roundtrip.csv"
            save_records_to_csv([rec], str(dest))
            rows, fieldnames = load_records_from_csv(str(dest))
            assert len(rows) == 1
            assert rows[0]["full_name"] == "Alice Test"
            assert rows[0]["email"] == "alice@test.com"
        _run_case(r, "round-trip: save 1 record then load it back correctly",
                  _round_trip_1, not_raises=True)

        # append mode does not duplicate header
        def _append_no_dup_header():
            rec = Record(full_name="Bob", email="bob@test.com")
            dest = tmp / "append_test.csv"
            save_records_to_csv([rec], str(dest))
            save_records_to_csv([rec], str(dest), append=True)
            with dest.open(encoding="utf-8-sig") as fh:
                lines = fh.readlines()
            # Count header lines (should be exactly 1)
            headers = [l for l in lines if l.startswith("full_name")]
            assert len(headers) == 1, f"Expected 1 header, found {len(headers)}"
            rows, _ = load_records_from_csv(str(dest))
            assert len(rows) == 2, f"Expected 2 rows, got {len(rows)}"
        _run_case(r, "append mode: header written once, 2 data rows total",
                  _append_no_dup_header, not_raises=True)

        # overwrite mode replaces previous content
        def _overwrite():
            dest = tmp / "overwrite_test.csv"
            recs_a = [Record(full_name=f"User{i}") for i in range(5)]
            recs_b = [Record(full_name="Solo")]
            save_records_to_csv(recs_a, str(dest))
            save_records_to_csv(recs_b, str(dest), append=False)
            rows, _ = load_records_from_csv(str(dest))
            assert len(rows) == 1, f"Expected 1 row after overwrite, got {len(rows)}"
        _run_case(r, "overwrite mode: previous 5 rows replaced by 1 new row",
                  _overwrite, not_raises=True)

        # CSV values must not contain unescaped commas that break the format
        def _special_chars_in_value():
            rec = Record(full_name='Smith, John "Jr."', email="ok@test.com")
            dest = tmp / "special.csv"
            save_records_to_csv([rec], str(dest))
            rows, _ = load_records_from_csv(str(dest))
            assert rows[0]["full_name"] == 'Smith, John "Jr."', (
                f"Value corrupted: {rows[0]['full_name']}"
            )
        _run_case(r, "special chars (comma, quotes) in value survive CSV round-trip",
                  _special_chars_in_value, not_raises=True)

        # save to nested directory that doesn't exist yet
        def _nested_dir():
            nested = tmp / "a" / "b" / "c" / "data.csv"
            rec = Record(email="x@y.com")
            save_records_to_csv([rec], str(nested))
            assert nested.exists()
        _run_case(r, "auto-creates nested output directory if it doesn't exist",
                  _nested_dir, not_raises=True)

        # UTF-8 BOM: file must be readable by Excel (utf-8-sig)
        def _utf8_bom():
            dest = tmp / "bom_test.csv"
            rec = Record(full_name="Lior Cohen")
            save_records_to_csv([rec], str(dest))
            raw_bytes = dest.read_bytes()
            assert raw_bytes[:3] == b"\xef\xbb\xbf", "UTF-8 BOM missing"
        _run_case(r, "output CSV starts with UTF-8 BOM (Excel-compatible)",
                  _utf8_bom, not_raises=True)

    return r


# ===========================================================================
# Suite 5 – Luhn algorithm (ID number check digit)
# ===========================================================================

def suite_luhn() -> TestResult:
    r = _suite("Suite 5 · Israeli ID / Luhn Check Digit")

    # Known valid IDs (Wikipedia examples + manually computed)
    KNOWN_VALID = [
        "123456782",   # 1-2-3-4-5-6-7-8 → check=2
        "000000000",   # all zeros → check=0 (Luhn sum=0, 10%10=0)
    ]
    for id_num in KNOWN_VALID:
        def _check(v=id_num):
            digits = [int(d) for d in v[:8]]
            assert int(v[8]) == _luhn_check_digit(digits), f"Luhn failed for {v}"
        _run_case(r, f"known valid ID {id_num} passes Luhn", _check, not_raises=True)

    # generate_id_number: every generated ID must pass its own check digit
    def _all_generated_valid():
        for _ in range(500):
            id_num = generate_id_number()
            assert len(id_num) == 9 and id_num.isdigit()
            digits = [int(d) for d in id_num[:8]]
            assert int(id_num[8]) == _luhn_check_digit(digits), f"Bad ID: {id_num}"
    _run_case(r, "500 generated IDs all pass their Luhn check digit",
              _all_generated_valid, not_raises=True)

    # Tampered digit must fail
    def _tampered():
        id_num = generate_id_number()
        digits = [int(d) for d in id_num[:8]]
        correct_check = _luhn_check_digit(digits)
        wrong_check = (correct_check + 1) % 10
        tampered = id_num[:8] + str(wrong_check)
        digits2 = [int(d) for d in tampered[:8]]
        assert int(tampered[8]) != _luhn_check_digit(digits2), "Tampered ID passed!"
    _run_case(r, "ID with wrong check digit correctly fails Luhn validation",
              _tampered, not_raises=True)

    return r


# ===========================================================================
# Main entry
# ===========================================================================

SUITES = {
    "validation": [suite_validate_count, suite_validate_field_choices],
    "generation":  [suite_generator],
    "storage":     [suite_storage],
    "luhn":        [suite_luhn],
}

ALL_SUITES = [
    suite_validate_count,
    suite_validate_field_choices,
    suite_generator,
    suite_storage,
    suite_luhn,
]


def _print_summary(total: TestResult) -> None:
    print(f"\n{'═'*60}")
    print(f"{BOLD}  RESULTS{RESET}")
    print(f"{'═'*60}")
    print(f"  {GREEN}Passed : {total.passed}{RESET}")
    if total.failed:
        print(f"  {RED}Failed : {total.failed}{RESET}")
    else:
        print(f"  Failed : 0")
    if total.errors:
        print(f"  {YELLOW}Errors : {total.errors}{RESET}")
    else:
        print(f"  Errors : 0")

    total_run = total.passed + total.failed + total.errors
    print(f"  Total  : {total_run}")
    print(f"{'─'*60}")

    if total.failures:
        print(f"\n{RED}{BOLD}  Failures / Errors:{RESET}")
        for msg in total.failures:
            print(f"  {RED}• {msg}{RESET}")

    print()
    if total.failed == 0 and total.errors == 0:
        print(f"  {GREEN}{BOLD}ALL TESTS PASSED ✔{RESET}\n")
    else:
        print(f"  {RED}{BOLD}SOME TESTS FAILED ✘{RESET}\n")
        sys.exit(1)


def main() -> None:
    global _verbose

    args = sys.argv[1:]
    _verbose = "-v" in args or "--verbose" in args

    # Determine which suites to run
    suite_filter = None
    if "--suite" in args:
        idx = args.index("--suite")
        suite_filter = args[idx + 1] if idx + 1 < len(args) else None

    if suite_filter:
        if suite_filter not in SUITES:
            print(f"Unknown suite '{suite_filter}'. Available: {', '.join(SUITES)}")
            sys.exit(1)
        fns = SUITES[suite_filter]
    else:
        fns = ALL_SUITES

    total = TestResult()

    print(f"\n{BOLD}{CYAN}{'═'*60}{RESET}")
    print(f"{BOLD}{CYAN}  Test Data Generator — Invalid Input Test Runner{RESET}")
    print(f"{BOLD}{CYAN}{'═'*60}{RESET}")

    for fn in fns:
        result = fn()
        _merge(total, result)
        passed = result.passed
        failed = result.failed + result.errors
        badge = f"{GREEN}({passed} pass){RESET}" if not failed else f"{RED}({failed} fail){RESET}"
        print(f"  → {badge}")

    _print_summary(total)


if __name__ == "__main__":
    main()
