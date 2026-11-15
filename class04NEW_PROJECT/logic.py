"""
logic.py - Business Logic Layer
===============================
Responsible for generating fake test data and validating uniqueness.
No CLI or file I/O logic here - pure data generation and validation.
"""

import random
import string
import re
from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class Record:
    """Represents a single generated test record."""
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    id_number: Optional[str] = None  # Israeli ID (Teudat Zehut)

    def as_dict(self) -> dict:
        """Return only the populated fields as a dictionary."""
        return {k: v for k, v in self.__dict__.items() if v is not None}


# ---------------------------------------------------------------------------
# Name generation helpers
# ---------------------------------------------------------------------------

FIRST_NAMES = [
    "Lior", "Noa", "Avi", "Maya", "Yoni", "Dana", "Ron", "Shira",
    "Itai", "Tamar", "Eran", "Michal", "Guy", "Hila", "Tal", "Orli",
    "Yael", "Barak", "Gal", "Einav", "Dor", "Roni", "Amit", "Liora",
    "Nimrod", "Ofri", "Idan", "Neta", "Ohad", "Yarden",
    "Adam", "Bella", "Chen", "Dina", "Eli", "Fiona", "Gil", "Hannah",
    "Igor", "Julia", "Keren", "Leon", "Mia", "Noam", "Oren", "Pnina",
    "Roi", "Sara", "Tom", "Uri", "Vered", "Wally", "Xena", "Yoav", "Ziv",
    "Alon", "Bat-El", "Carmel", "Doron", "Eden", "Faye", "Gali", "Hen",
    "Ilan", "Jenna", "Kesem", "Lahav", "Mor", "Nir", "Oded", "Paz",
    "Reut", "Shai", "Tomer", "Uriya", "Vivi", "Yotam", "Zohar",
    "Adar", "Ben", "Coral", "Dan", "Efrat", "Galit", "Hadas", "Ido",
    "Jonathan", "Karin", "Liav", "Maayan", "Niv", "Ofek", "Pele",
]

LAST_NAMES = [
    "Cohen", "Levi", "Mizrahi", "Peretz", "Katz", "Shapiro", "Friedman",
    "Dayan", "Avraham", "Ben-David", "Carmi", "Zamir", "Paz", "Tzur",
    "Golan", "Haim", "Yosef", "Ben-Ami", "Natan", "Oren", "Shalom",
    "Biton", "Barak", "Keshet", "Regev", "Levy", "Tzvi", "Ronen", "Koren",
    "Aloni", "Bar", "Caspi", "Dagan", "Even", "Fux", "Gabay", "Harel",
    "Israeli", "Jacobi", "Kimchi", "Luria", "Manor", "Nave", "Ofir",
    "Peled", "Rabi", "Sasson", "Tal", "Uziel", "Vilner", "Wolf", "Yadin",
    "Zeira", "Argaman", "Blum", "Citron", "Dotan", "Elad", "Farhi",
    "Gross", "Hadad", "Inbar", "Jacobson", "Klein", "Landau", "Meir",
    "Nadler", "Ovadia", "Polak", "Rozen", "Segal", "Tzion", "Vaknin",
    "Weiss", "Yarkoni", "Zadok", "Almog", "Ben-Zvi", "Carmeli", "Dror",
    "Erlich", "Galili", "Herman", "Itzhak", "Jonah", "Kaufman", "Lipman",
    "Moshe", "Nave", "Ohayon", "Peri", "Ramon", "Stern", "Tzabari",
]

EMAIL_DOMAINS = [
    "gmail.com", "yahoo.com", "outlook.com", "walla.co.il",
    "hotmail.com", "example.com", "testmail.dev",
]


# ---------------------------------------------------------------------------
# Generator functions
# ---------------------------------------------------------------------------

def generate_full_name() -> str:
    """Return a random full name."""
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
def generate_email(name: Optional[str] = None) -> str:
    """
    Return a valid-format email address.
    If a name is supplied the local part is derived from it,
    otherwise a random alphanumeric local part is used.
    """
    if name:
        local = name.lower().replace(" ", ".").replace("-", "")
        # Add a short random suffix to reduce collisions
        suffix = "".join(random.choices(string.digits, k=3))
        local = f"{local}{suffix}"
    else:
        local = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    domain = random.choice(EMAIL_DOMAINS)
    return f"{local}@{domain}"


def generate_phone() -> str:
    """
    Return an Israeli-style mobile phone number (05x-xxxxxxx).
    Format: 05[0-9]-[0-9]{7}
    """
    prefix_digit = random.choice(["0", "2", "3", "4", "5", "6", "7", "8", "9"])
    prefix = f"05{prefix_digit}"
    number = "".join(random.choices(string.digits, k=7))
    return f"{prefix}-{number}"


def _luhn_check_digit(digits: list[int]) -> int:
    """
    Compute the Israeli ID check digit using the standard algorithm.
    The first 8 digits are provided; the 9th is computed here.
    """
    total = 0
    for i, d in enumerate(digits):
        if i % 2 == 0:
            total += d
        else:
            doubled = d * 2
            total += doubled if doubled < 10 else doubled - 9
    remainder = total % 10
    return 0 if remainder == 0 else 10 - remainder


def generate_id_number() -> str:
    """
    Return a valid 9-digit Israeli ID number (Teudat Zehut).
    The last digit is a valid check digit.
    """
    base = [random.randint(0, 9) for _ in range(8)]
    check = _luhn_check_digit(base)
    all_digits = base + [check]
    return "".join(map(str, all_digits))


# ---------------------------------------------------------------------------
# Generator class (orchestrates generation + uniqueness)
# ---------------------------------------------------------------------------

class TestDataGenerator:
    """
    Generates records with the requested fields and guarantees no duplicates
    within the current batch.
    """

    def __init__(self, fields: list[str]):
        """
        Parameters
        ----------
        fields : list of field names chosen by the user.
                 Valid values: 'full_name', 'email', 'phone', 'id_number'
        """
        self.fields = fields
        # Uniqueness sets per field
        self._seen: dict[str, set] = {f: set() for f in fields}

    def _generate_unique_value(self, field_name: str, name: Optional[str] = None) -> str:
        """Keep generating until a unique value is produced (bounded loop)."""
        for attempt in range(1_000):
            if field_name == "full_name":
                value = generate_full_name()
                # After many attempts, append a numeric suffix to avoid pool exhaustion
                if attempt >= 50:
                    value = f"{value} {attempt}"
            elif field_name == "email":
                value = generate_email(name)
            elif field_name == "phone":
                value = generate_phone()
            elif field_name == "id_number":
                value = generate_id_number()
            else:
                raise ValueError(f"Unknown field: {field_name}")

            if value not in self._seen[field_name]:
                self._seen[field_name].add(value)
                return value

        raise RuntimeError(
            f"Could not generate a unique value for field '{field_name}' "
            "after 1,000 attempts. The value pool may be exhausted."
        )

    def generate(self, count: int) -> list[Record]:
        """
        Generate `count` unique records.

        Parameters
        ----------
        count : number of records to generate (must be > 0)

        Returns
        -------
        List of Record objects.
        """
        if count <= 0:
            raise ValueError("Count must be a positive integer.")

        records: list[Record] = []
        for _ in range(count):
            rec = Record()
            name = None

            # Generate name first so email can be derived from it
            if "full_name" in self.fields:
                name = self._generate_unique_value("full_name")
                rec.full_name = name

            if "email" in self.fields:
                rec.email = self._generate_unique_value("email", name)

            if "phone" in self.fields:
                rec.phone = self._generate_unique_value("phone")

            if "id_number" in self.fields:
                rec.id_number = self._generate_unique_value("id_number")

            records.append(rec)

        return records


# ---------------------------------------------------------------------------
# Validation helpers (re-usable by CLI layer)
# ---------------------------------------------------------------------------

VALID_FIELDS = {
    "1": "full_name",
    "2": "email",
    "3": "phone",
    "4": "id_number",
}

FIELD_DISPLAY_NAMES = {
    "full_name": "Full Name",
    "email":     "Email",
    "phone":     "Phone",
    "id_number": "ID Number",
}


def validate_count(raw: str) -> int:
    """
    Parse and validate a user-supplied record count.
    Raises ValueError with a descriptive message on failure.
    """
    raw = raw.strip()
    if not raw.isdigit() or not raw.isascii():
        raise ValueError("Value must be a positive integer.")
    count = int(raw)
    if count <= 0:
        raise ValueError("Count must be greater than zero.")
    if count > 100_000:
        raise ValueError("Maximum allowed count is 100,000.")
    return count


def validate_field_choices(raw: str) -> list[str]:
    """
    Parse a comma/space-separated string of field numbers.
    Returns a list of internal field names (deduplicated, order preserved).
    Raises ValueError if input is invalid or no valid field is chosen.
    """
    tokens = re.split(r"[,\s]+", raw.strip())
    chosen: list[str] = []
    seen: set[str] = set()
    invalid: list[str] = []

    for token in tokens:
        token = token.strip()
        if not token:
            continue
        if token in VALID_FIELDS:
            field = VALID_FIELDS[token]
            if field not in seen:
                chosen.append(field)
                seen.add(field)
        else:
            invalid.append(token)

    if invalid:
        raise ValueError(f"Invalid choices: {', '.join(invalid)}. Please select numbers 1–4.")
    if not chosen:
        raise ValueError("At least one field must be selected.")
    return chosen

