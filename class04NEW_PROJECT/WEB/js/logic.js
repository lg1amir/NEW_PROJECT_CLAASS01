/**
 * logic.js - Business Logic Layer (Web Port)
 * ==========================================
 * Pure client-side data generation and uniqueness validation.
 * Algorithmic and structural equivalent of Python's logic.py.
 * Zero server dependencies, zero external libraries.
 */

// ---------------------------------------------------------------------------
// Data Constants
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
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
  "Jonathan", "Karin", "Liav", "Maayan", "Niv", "Ofek", "Pele"
];

const LAST_NAMES = [
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
  "Moshe", "Nave", "Ohayon", "Peri", "Ramon", "Stern", "Tzabari"
];

const EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "outlook.com", "walla.co.il",
  "hotmail.com", "example.com", "testmail.dev"
];

const VALID_FIELDS = {
  "1": "full_name",
  "2": "email",
  "3": "phone",
  "4": "id_number"
};

const FIELD_DISPLAY_NAMES = {
  "full_name": "Full Name",
  "email": "Email",
  "phone": "Phone",
  "id_number": "ID Number"
};

// ---------------------------------------------------------------------------
// Algorithmic Generators
// ---------------------------------------------------------------------------

/**
 * Return a random full name from FIRST_NAMES and LAST_NAMES.
 */
function generateFullName() {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

/**
 * Return a valid-format email address.
 * If a name is supplied, the local part is derived from it.
 * Otherwise a random alphanumeric 8-character local part is generated.
 */
function generateEmail(name = null) {
  let local;
  if (name) {
    local = name.toLowerCase().replace(/ /g, ".").replace(/-/g, "");
    let suffix = "";
    for (let i = 0; i < 3; i++) {
      suffix += Math.floor(Math.random() * 10).toString();
    }
    local = `${local}${suffix}`;
  } else {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    local = "";
    for (let i = 0; i < 8; i++) {
      local += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  const domain = EMAIL_DOMAINS[Math.floor(Math.random() * EMAIL_DOMAINS.length)];
  return `${local}@${domain}`;
}

/**
 * Return an Israeli mobile phone number: 05X-XXXXXXX
 */
function generatePhone() {
  const prefixDigits = ["0", "2", "3", "4", "5", "6", "7", "8", "9"];
  const prefixDigit = prefixDigits[Math.floor(Math.random() * prefixDigits.length)];
  let number = "";
  for (let i = 0; i < 7; i++) {
    number += Math.floor(Math.random() * 10).toString();
  }
  return `05${prefixDigit}-${number}`;
}

/**
 * Compute Israeli ID check digit according to Luhn algorithm.
 * @param {number[]} digits - First 8 digits of the ID
 * @returns {number} - 9th check digit (0-9)
 */
function luhnCheckDigit(digits) {
  let total = 0;
  for (let i = 0; i < digits.length; i++) {
    const d = digits[i];
    if (i % 2 === 0) {
      total += d;
    } else {
      const doubled = d * 2;
      total += doubled < 10 ? doubled : doubled - 9;
    }
  }
  const remainder = total % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Return a valid 9-digit Israeli ID number (Teudat Zehut) with correct Luhn check digit.
 */
function generateIdNumber() {
  const base = [];
  for (let i = 0; i < 8; i++) {
    base.push(Math.floor(Math.random() * 10));
  }
  const check = luhnCheckDigit(base);
  return base.concat(check).join("");
}

// ---------------------------------------------------------------------------
// Validation Helpers (Matching CLI specifications exactly)
// ---------------------------------------------------------------------------

/**
 * Parse and validate a user-supplied record count.
 * Throws Error with exact descriptive message on failure.
 * @param {string} raw 
 * @returns {number}
 */
function validateCount(raw) {
  if (typeof raw !== "string") {
    raw = String(raw ?? "");
  }
  raw = raw.trim();

  // Must be ASCII digits only
  if (!/^\d+$/.test(raw)) {
    throw new Error("Value must be a positive integer.");
  }

  const count = parseInt(raw, 10);
  if (isNaN(count) || count <= 0) {
    throw new Error("Count must be greater than zero.");
  }
  if (count > 100000) {
    throw new Error("Maximum allowed count is 100,000.");
  }
  return count;
}

/**
 * Parse a comma/space-separated string of field numbers or 'all'.
 * Returns an array of internal field names (deduplicated, order preserved).
 * @param {string} raw 
 * @returns {string[]}
 */
function validateFieldChoices(raw) {
  if (typeof raw !== "string") {
    raw = String(raw ?? "");
  }
  raw = raw.trim();

  if (raw.toLowerCase() === "all") {
    return Object.values(VALID_FIELDS);
  }

  if (!raw) {
    throw new Error("At least one field must be selected.");
  }

  const tokens = raw.split(/[,\s]+/).map(t => t.trim()).filter(Boolean);
  const chosen = [];
  const seen = new Set();
  const invalid = [];

  for (const token of tokens) {
    if (VALID_FIELDS[token]) {
      const field = VALID_FIELDS[token];
      if (!seen.has(field)) {
        chosen.push(field);
        seen.add(field);
      }
    } else {
      invalid.push(token);
    }
  }

  if (invalid.length > 0) {
    throw new Error(`Invalid choices: ${invalid.join(", ")}. Please select numbers 1–4.`);
  }

  if (chosen.length === 0) {
    throw new Error("At least one field must be selected.");
  }

  return chosen;
}

// ---------------------------------------------------------------------------
// TestDataGenerator Class
// ---------------------------------------------------------------------------

class TestDataGenerator {
  /**
   * @param {string[]} fields - List of internal field names ('full_name', 'email', 'phone', 'id_number')
   */
  constructor(fields) {
    this.fields = Array.isArray(fields) ? [...fields] : [];
    this._seen = {};
    for (const f of this.fields) {
      this._seen[f] = new Set();
    }
  }

  /**
   * Generate a unique value for a given field within this batch.
   * After 50 attempts for full_name, appends an attempt suffix to prevent pool exhaustion.
   */
  _generateUniqueValue(fieldName, name = null) {
    for (let attempt = 0; attempt < 1000; attempt++) {
      let value;
      if (fieldName === "full_name") {
        value = generateFullName();
        if (attempt >= 50) {
          value = `${value} ${attempt}`;
        }
      } else if (fieldName === "email") {
        value = generateEmail(name);
      } else if (fieldName === "phone") {
        value = generatePhone();
      } else if (fieldName === "id_number") {
        value = generateIdNumber();
      } else {
        throw new Error(`Unknown field: ${fieldName}`);
      }

      if (!this._seen[fieldName].has(value)) {
        this._seen[fieldName].add(value);
        return value;
      }
    }

    throw new Error(
      `Could not generate a unique value for field '${fieldName}' after 1,000 attempts. The value pool may be exhausted.`
    );
  }

  /**
   * Generate `count` unique records according to requested fields.
   * @param {number} count 
   * @returns {Array<Object>}
   */
  generate(count) {
    if (typeof count !== "number" || count <= 0) {
      throw new Error("Count must be a positive integer.");
    }

    const records = [];
    for (let i = 0; i < count; i++) {
      const rec = {};
      let name = null;

      // Generate name first so email can be derived from it
      if (this.fields.includes("full_name")) {
        name = this._generateUniqueValue("full_name");
        rec.full_name = name;
      }

      if (this.fields.includes("email")) {
        rec.email = this._generateUniqueValue("email", name);
      }

      if (this.fields.includes("phone")) {
        rec.phone = this._generateUniqueValue("phone");
      }

      if (this.fields.includes("id_number")) {
        rec.id_number = this._generateUniqueValue("id_number");
      }

      records.push(rec);
    }

    return records;
  }
}

// Export for module/browser global usage
if (typeof window !== "undefined") {
  window.FIRST_NAMES = FIRST_NAMES;
  window.LAST_NAMES = LAST_NAMES;
  window.EMAIL_DOMAINS = EMAIL_DOMAINS;
  window.VALID_FIELDS = VALID_FIELDS;
  window.FIELD_DISPLAY_NAMES = FIELD_DISPLAY_NAMES;
  window.generateFullName = generateFullName;
  window.generateEmail = generateEmail;
  window.generatePhone = generatePhone;
  window.luhnCheckDigit = luhnCheckDigit;
  window.generateIdNumber = generateIdNumber;
  window.validateCount = validateCount;
  window.validateFieldChoices = validateFieldChoices;
  window.TestDataGenerator = TestDataGenerator;
}

