"""
tests/test_logic.py - Unit Tests for the Business Logic Layer
=============================================================
Run with:  python -m pytest tests/ -v
"""

import pytest
from logic import (
    TestDataGenerator,
    generate_email,
    generate_full_name,
    generate_id_number,
    generate_phone,
    validate_count,
    validate_field_choices,
    _luhn_check_digit,
)


# ---------------------------------------------------------------------------
# Individual generator functions
# ---------------------------------------------------------------------------

class TestGenerateFullName:
    def test_returns_two_words(self):
        name = generate_full_name()
        assert len(name.split()) == 2

    def test_non_empty(self):
        assert generate_full_name() != ""


class TestGenerateEmail:
    def test_contains_at_sign(self):
        assert "@" in generate_email()

    def test_derived_from_name(self):
        email = generate_email("Lior Cohen")
        assert "lior" in email or "cohen" in email

    def test_valid_domain(self):
        email = generate_email()
        domain = email.split("@")[1]
        assert "." in domain


class TestGeneratePhone:
    def test_starts_with_05(self):
        phone = generate_phone()
        assert phone.startswith("05")

    def test_contains_hyphen(self):
        assert "-" in generate_phone()

    def test_total_digits(self):
        phone = generate_phone().replace("-", "")
        assert len(phone) == 10


class TestGenerateIdNumber:
    def test_nine_digits(self):
        id_num = generate_id_number()
        assert len(id_num) == 9 and id_num.isdigit()

    def test_check_digit_valid(self):
        id_num = generate_id_number()
        digits = [int(d) for d in id_num[:8]]
        expected_check = _luhn_check_digit(digits)
        assert int(id_num[8]) == expected_check


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

class TestValidateCount:
    def test_valid_integer(self):
        assert validate_count("50") == 50

    def test_leading_trailing_spaces(self):
        assert validate_count("  100  ") == 100

    def test_zero_raises(self):
        with pytest.raises(ValueError):
            validate_count("0")

    def test_negative_raises(self):
        with pytest.raises(ValueError):
            validate_count("-5")

    def test_non_numeric_raises(self):
        with pytest.raises(ValueError):
            validate_count("abc")

    def test_float_raises(self):
        with pytest.raises(ValueError):
            validate_count("3.5")

    def test_exceeds_max_raises(self):
        with pytest.raises(ValueError):
            validate_count("100001")


class TestValidateFieldChoices:
    def test_single_valid(self):
        assert validate_field_choices("1") == ["full_name"]

    def test_multiple_comma_separated(self):
        result = validate_field_choices("1,2,3")
        assert result == ["full_name", "email", "phone"]

    def test_space_separated(self):
        result = validate_field_choices("1 4")
        assert result == ["full_name", "id_number"]

    def test_duplicates_deduplicated(self):
        result = validate_field_choices("1,1,2")
        assert result == ["full_name", "email"]

    def test_invalid_number_raises(self):
        with pytest.raises(ValueError):
            validate_field_choices("5")

    def test_empty_raises(self):
        with pytest.raises(ValueError):
            validate_field_choices("   ")

    def test_mixed_valid_invalid_raises(self):
        with pytest.raises(ValueError):
            validate_field_choices("1,99")


# ---------------------------------------------------------------------------
# TestDataGenerator
# ---------------------------------------------------------------------------

class TestTestDataGenerator:
    def test_generates_correct_count(self):
        gen = TestDataGenerator(fields=["full_name"])
        records = gen.generate(10)
        assert len(records) == 10

    def test_all_fields_populated(self):
        fields = ["full_name", "email", "phone", "id_number"]
        gen = TestDataGenerator(fields=fields)
        records = gen.generate(5)
        for rec in records:
            for f in fields:
                assert getattr(rec, f) is not None

    def test_names_are_unique(self):
        gen = TestDataGenerator(fields=["full_name"])
        records = gen.generate(20)
        names = [r.full_name for r in records]
        assert len(set(names)) == len(names)

    def test_emails_are_unique(self):
        gen = TestDataGenerator(fields=["email"])
        records = gen.generate(20)
        emails = [r.email for r in records]
        assert len(set(emails)) == len(emails)

    def test_phones_are_unique(self):
        gen = TestDataGenerator(fields=["phone"])
        records = gen.generate(20)
        phones = [r.phone for r in records]
        assert len(set(phones)) == len(phones)

    def test_id_numbers_are_unique(self):
        gen = TestDataGenerator(fields=["id_number"])
        records = gen.generate(50)
        ids = [r.id_number for r in records]
        assert len(set(ids)) == len(ids)

    def test_zero_count_raises(self):
        gen = TestDataGenerator(fields=["full_name"])
        with pytest.raises(ValueError):
            gen.generate(0)

    def test_only_requested_fields_populated(self):
        gen = TestDataGenerator(fields=["email"])
        rec = gen.generate(1)[0]
        assert rec.email is not None
        assert rec.full_name is None
        assert rec.phone is None
        assert rec.id_number is None

