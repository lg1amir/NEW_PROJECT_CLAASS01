/**
 * storage.js - File I/O Layer (Web Port)
 * =====================================
 * Responsible for CSV parsing, serializing, virtual file storage (localStorage),
 * and client-side file downloads with UTF-8 BOM encoding.
 * 
 * Includes fixes documented in QA reports:
 * - Case-insensitive .csv check (BUG-CLI-005)
 * - Safe Schema Alignment on CSV Append (BUG-CLI-003)
 */

const STORAGE_KEY = "test_data_generator_output_files";
const DEFAULT_FILENAME = "test_data.csv";
const PREFERRED_FIELD_ORDER = ["full_name", "email", "phone", "id_number"];

/**
 * Escape a cell value according to RFC 4180 standard.
 */
function _escapeCsvCell(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Parse a CSV string into { rows, fieldnames } conforming to RFC 4180.
 * @param {string} csvText 
 * @returns {{ rows: Array<Object>, fieldnames: string[] }}
 */
function parseCsv(csvText) {
  if (!csvText || !csvText.trim()) {
    throw new Error("File is empty or missing column headers.");
  }

  // Strip UTF-8 BOM if present
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xFEFF) {
    cleanText = cleanText.slice(1);
  }

  // Parse lines taking into account quoted newlines
  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++; // skip LF
        }
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
  }

  // Flush remaining cell/row
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  // Filter out any trailing completely empty rows
  const nonEmptyRows = rows.filter(r => r.length > 0 && r.some(c => c !== ""));

  if (nonEmptyRows.length === 0) {
    throw new Error("File is empty or missing column headers.");
  }

  const fieldnames = nonEmptyRows[0];
  if (!fieldnames || fieldnames.length === 0 || fieldnames.every(f => !f)) {
    throw new Error("File is empty or missing column headers.");
  }

  const dataRows = nonEmptyRows.slice(1);
  if (dataRows.length === 0) {
    throw new Error("The file contains no records.");
  }

  const resultRows = dataRows.map(row => {
    const rowObj = {};
    for (let j = 0; j < fieldnames.length; j++) {
      rowObj[fieldnames[j]] = row[j] !== undefined ? row[j] : "";
    }
    return rowObj;
  });

  return {
    fieldnames,
    rows: resultRows
  };
}

/**
 * Retrieve the dictionary of stored files from localStorage.
 * @returns {Record<string, { filename: string, content: string, size: number, modified: number, rowsCount: number, fieldnames: string[] }>}
 */
function _getStorageMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Failed to read from localStorage:", e);
    return {};
  }
}

/**
 * Save dictionary of files back to localStorage.
 */
function _setStorageMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error("Failed to write to localStorage:", e);
    throw new Error("Virtual storage quota exceeded or unavailable.");
  }
}

/**
 * Return sorted list of all virtual CSV files stored.
 */
function listCsvFiles() {
  const map = _getStorageMap();
  const fileList = Object.values(map);
  fileList.sort((a, b) => a.filename.localeCompare(b.filename));
  return fileList;
}

/**
 * Check if a file already exists in virtual storage.
 */
function checkFileExists(filename) {
  const resolved = resolveFilename(filename);
  const map = _getStorageMap();
  return Boolean(map[resolved.toLowerCase()]);
}

/**
 * Ensure file has .csv extension (case-insensitive - BUG-CLI-005 fix).
 */
function resolveFilename(rawName) {
  let name = (rawName || "").trim();
  if (!name) {
    name = DEFAULT_FILENAME;
  }
  if (!name.toLowerCase().endsWith(".csv")) {
    name += ".csv";
  }
  return name;
}

/**
 * Order columns according to PREFERRED_FIELD_ORDER.
 */
function collectFieldnames(records) {
  const present = new Set();
  for (const rec of records) {
    for (const key of Object.keys(rec)) {
      if (rec[key] !== null && rec[key] !== undefined) {
        present.add(key);
      }
    }
  }
  return PREFERRED_FIELD_ORDER.filter(f => present.has(f));
}

/**
 * Build CSV string with UTF-8 BOM.
 */
function buildCsvString(records, fieldnames, includeHeader = true) {
  const lines = [];
  if (includeHeader) {
    lines.push(fieldnames.map(_escapeCsvCell).join(","));
  }
  for (const rec of records) {
    const row = fieldnames.map(f => _escapeCsvCell(rec[f] ?? ""));
    lines.push(row.join(","));
  }
  return lines.join("\r\n");
}

/**
 * Save records to virtual storage and return file metadata.
 * Implements Safe Schema Alignment for Append mode (BUG-CLI-003 fix).
 * 
 * @param {Array<Object>} records 
 * @param {string} rawFilename 
 * @param {boolean} append 
 * @returns {{ filename: string, totalRecords: number, sizeBytes: number, fullContent: string, mode: 'overwrite'|'append' }}
 */
function saveRecordsToCsv(records, rawFilename, append = false) {
  if (!records || records.length === 0) {
    throw new Error("No records to save.");
  }

  const filename = resolveFilename(rawFilename);
  const map = _getStorageMap();
  const lowerKey = filename.toLowerCase();
  const existingFile = map[lowerKey];

  let finalRows = [];
  let finalFieldnames = [];

  if (append && existingFile) {
    // Read existing file and parse
    try {
      const parsed = parseCsv(existingFile.content);
      // BUG-CLI-003 fix: Align new records to the schema of the existing file.
      // If new records have fields not present in existing, we add them to the end of header.
      const combinedFieldsSet = new Set(parsed.fieldnames);
      const currentBatchFields = collectFieldnames(records);
      for (const f of currentBatchFields) {
        combinedFieldsSet.add(f);
      }
      finalFieldnames = Array.from(combinedFieldsSet);

      // Existing rows remain
      finalRows = [...parsed.rows];
      // Append new records
      for (const rec of records) {
        finalRows.push(rec);
      }
    } catch (e) {
      // If existing file was corrupt, overwrite it safely
      finalFieldnames = collectFieldnames(records);
      finalRows = [...records];
    }
  } else {
    // Overwrite mode
    finalFieldnames = collectFieldnames(records);
    finalRows = [...records];
  }

  const csvBody = buildCsvString(finalRows, finalFieldnames, true);
  // Prepend UTF-8 BOM
  const fullContent = "\uFEFF" + csvBody;
  const sizeBytes = new Blob([fullContent]).size;

  const fileMeta = {
    filename: filename,
    content: fullContent,
    size: sizeBytes,
    rowsCount: finalRows.length,
    fieldnames: finalFieldnames,
    modified: Date.now()
  };

  map[lowerKey] = fileMeta;
  _setStorageMap(map);

  return {
    filename,
    totalRecords: finalRows.length,
    sizeBytes,
    fullContent,
    mode: (append && existingFile) ? "append" : "overwrite"
  };
}

/**
 * Load records and fieldnames from virtual storage or raw CSV content.
 * @param {string} identifier - either a filename in virtual storage or raw CSV string
 * @returns {{ rows: Array<Object>, fieldnames: string[], filename: string, size: number }}
 */
function loadRecordsFromCsv(identifier) {
  const map = _getStorageMap();
  let content = "";
  let filename = identifier;

  const lowerKey = identifier.toLowerCase();
  if (map[lowerKey]) {
    content = map[lowerKey].content;
    filename = map[lowerKey].filename;
  } else {
    // Maybe identifier is raw CSV string
    content = identifier;
  }

  if (!content) {
    throw new Error(`File not found: ${identifier}`);
  }

  const parsed = parseCsv(content);
  return {
    rows: parsed.rows,
    fieldnames: parsed.fieldnames,
    filename: filename,
    size: new Blob([content]).size
  };
}

/**
 * Delete a file from virtual storage.
 */
function deleteCsvFile(filename) {
  const map = _getStorageMap();
  const lowerKey = filename.toLowerCase();
  if (map[lowerKey]) {
    delete map[lowerKey];
    _setStorageMap(map);
    return true;
  }
  return false;
}

/**
 * Trigger immediate browser download of CSV file with UTF-8 BOM.
 */
function triggerCsvDownload(filename, csvContentWithBom) {
  const blob = new Blob([csvContentWithBom], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = resolveFilename(filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Export for module/browser global usage
if (typeof window !== "undefined") {
  window.listCsvFiles = listCsvFiles;
  window.checkFileExists = checkFileExists;
  window.resolveFilename = resolveFilename;
  window.saveRecordsToCsv = saveRecordsToCsv;
  window.loadRecordsFromCsv = loadRecordsFromCsv;
  window.deleteCsvFile = deleteCsvFile;
  window.triggerCsvDownload = triggerCsvDownload;
  window.parseCsv = parseCsv;
  window.collectFieldnames = collectFieldnames;
  window.buildCsvString = buildCsvString;
  window.DEFAULT_FILENAME = DEFAULT_FILENAME;
  window.PREFERRED_FIELD_ORDER = PREFERRED_FIELD_ORDER;
}
