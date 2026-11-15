/**
 * app.js - Main Application Controller (GUI Layer)
 * ==================================================
 * Coordinates GUI screens, SessionState, and the CLI terminal emulator.
 * Faithful to the workflow and architecture of Test Data Generator & Store.
 */

// ---------------------------------------------------------------------------
// Global Application State
// ---------------------------------------------------------------------------

class SessionState {
  constructor() {
    this.count = null;
    this.fields = null;
    this.lastRecords = null;
  }

  get isReady() {
    return this.count !== null && this.count > 0 && Array.isArray(this.fields) && this.fields.length > 0;
  }

  reset() {
    this.count = null;
    this.fields = null;
    this.lastRecords = null;
  }
}

const state = new SessionState();
let cliSimulator = null;
let currentTab = "screen-dashboard";
let previewPage = 1;
const PAGE_SIZE = 15;

// ---------------------------------------------------------------------------
// DOM Elements & Initialization
// ---------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initScreen1Count();
  initScreen2Fields();
  initScreen3Generate();
  initScreen4Save();
  initScreen5Files();
  initCliTerminal();
  updateHeaderStatus();

  // If virtual storage is empty, initialize with a sample file
  seedInitialFileIfEmpty();
});

// ---------------------------------------------------------------------------
// Navigation / Tab Switching
// ---------------------------------------------------------------------------

function initNavigation() {
  const navButtons = document.querySelectorAll(".nav-btn");
  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetScreen = btn.getAttribute("data-screen");
      switchScreen(targetScreen);
    });
  });

  // Mode switcher (GUI vs Terminal)
  const modeGuiBtn = document.getElementById("mode-gui-btn");
  const modeTermBtn = document.getElementById("mode-term-btn");
  const guiContainer = document.getElementById("gui-container");
  const termContainer = document.getElementById("term-container");

  if (modeGuiBtn && modeTermBtn) {
    modeGuiBtn.addEventListener("click", () => {
      modeGuiBtn.classList.add("active");
      modeTermBtn.classList.remove("active");
      guiContainer.classList.remove("hidden");
      termContainer.classList.add("hidden");
    });

    modeTermBtn.addEventListener("click", () => {
      modeTermBtn.classList.add("active");
      modeGuiBtn.classList.remove("active");
      guiContainer.classList.add("hidden");
      termContainer.classList.remove("hidden");
      if (cliSimulator) {
        cliSimulator.showMainMenu();
      }
    });
  }

  // Reset session button
  const resetBtn = document.getElementById("reset-session-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("Reset current configuration and generated data?")) {
        state.reset();
        updateHeaderStatus();
        renderScreen1();
        renderScreen2();
        renderScreen3();
        renderScreen4();
        if (cliSimulator) cliSimulator.showMainMenu();
        showToast("Session reset to initial state.", "info");
      }
    });
  }
}

function switchScreen(screenId) {
  currentTab = screenId;
  document.querySelectorAll(".screen-panel").forEach(panel => {
    panel.classList.add("hidden");
  });

  const activePanel = document.getElementById(screenId);
  if (activePanel) {
    activePanel.classList.remove("hidden");
  }

  document.querySelectorAll(".nav-btn").forEach(btn => {
    if (btn.getAttribute("data-screen") === screenId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Re-render target screen components
  if (screenId === "screen-1") renderScreen1();
  if (screenId === "screen-2") renderScreen2();
  if (screenId === "screen-3") renderScreen3();
  if (screenId === "screen-4") renderScreen4();
  if (screenId === "screen-5") renderScreen5();
  if (screenId === "screen-dashboard") renderDashboard();
}

// ---------------------------------------------------------------------------
// Header & Status Updates
// ---------------------------------------------------------------------------

function updateHeaderStatus() {
  const countBadge = document.getElementById("status-count-val");
  const fieldsBadge = document.getElementById("status-fields-val");
  const readyBadge = document.getElementById("status-ready-badge");
  const recordsBadge = document.getElementById("status-records-val");

  if (countBadge) {
    countBadge.textContent = state.count !== null ? `${state.count} records` : "not set";
    countBadge.className = state.count !== null ? "badge badge-success" : "badge badge-muted";
  }

  if (fieldsBadge) {
    if (state.fields && state.fields.length > 0) {
      const names = state.fields.map(f => FIELD_DISPLAY_NAMES[f] || f).join(", ");
      fieldsBadge.textContent = names;
      fieldsBadge.className = "badge badge-success";
    } else {
      fieldsBadge.textContent = "none selected";
      fieldsBadge.className = "badge badge-muted";
    }
  }

  if (readyBadge) {
    if (state.isReady) {
      readyBadge.textContent = "[Ready ✔]";
      readyBadge.className = "badge badge-ready";
    } else {
      readyBadge.textContent = "[Setup Required]";
      readyBadge.className = "badge badge-warning";
    }
  }

  if (recordsBadge) {
    if (state.lastRecords && state.lastRecords.length > 0) {
      recordsBadge.textContent = `${state.lastRecords.length} records ready`;
      recordsBadge.className = "badge badge-cyan";
    } else {
      recordsBadge.textContent = "No data generated";
      recordsBadge.className = "badge badge-muted";
    }
  }
}

// ---------------------------------------------------------------------------
// Screen 1: Set Record Count
// ---------------------------------------------------------------------------

function initScreen1Count() {
  const input = document.getElementById("count-input");
  const saveBtn = document.getElementById("save-count-btn");
  const errorMsg = document.getElementById("count-error");

  // Presets
  document.querySelectorAll(".count-preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const val = btn.getAttribute("data-value");
      input.value = val;
      errorMsg.textContent = "";
      input.classList.remove("input-error");
    });
  });

  saveBtn.addEventListener("click", () => {
    const raw = input.value;
    try {
      const validated = validateCount(raw);
      state.count = validated;
      // BUG-CLI-004 fix: Invalidate previous generated data
      state.lastRecords = null;
      updateHeaderStatus();
      errorMsg.textContent = "";
      input.classList.remove("input-error");
      showToast(`Record count set to: ${validated}`, "success");
      switchScreen("screen-2");
    } catch (err) {
      errorMsg.textContent = err.message;
      input.classList.add("input-error");
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveBtn.click();
  });
}

function renderScreen1() {
  const input = document.getElementById("count-input");
  const currentDisplay = document.getElementById("current-count-display");
  if (state.count !== null) {
    input.value = state.count;
    if (currentDisplay) currentDisplay.textContent = `Current value: ${state.count} records`;
  } else {
    if (currentDisplay) currentDisplay.textContent = "Current value: Not set";
  }
}

// ---------------------------------------------------------------------------
// Screen 2: Select Fields
// ---------------------------------------------------------------------------

function initScreen2Fields() {
  const checkboxes = document.querySelectorAll(".field-checkbox");
  const rawInput = document.getElementById("fields-cli-input");
  const applyBtn = document.getElementById("save-fields-btn");
  const selectAllBtn = document.getElementById("fields-all-btn");
  const clearAllBtn = document.getElementById("fields-clear-btn");
  const errorMsg = document.getElementById("fields-error");

  // Sync checkboxes with CLI input
  checkboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      syncCheckboxesToCliInput();
      errorMsg.textContent = "";
    });
  });

  selectAllBtn.addEventListener("click", () => {
    checkboxes.forEach(cb => cb.checked = true);
    syncCheckboxesToCliInput();
    errorMsg.textContent = "";
  });

  clearAllBtn.addEventListener("click", () => {
    checkboxes.forEach(cb => cb.checked = false);
    rawInput.value = "";
    errorMsg.textContent = "";
  });

  applyBtn.addEventListener("click", () => {
    // Either from input or checkboxes
    const raw = rawInput.value.trim();
    try {
      let chosen = [];
      if (raw) {
        chosen = validateFieldChoices(raw);
      } else {
        const checkedValues = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
        if (checkedValues.length === 0) {
          throw new Error("At least one field must be selected.");
        }
        chosen = checkedValues;
      }

      state.fields = chosen;
      // BUG-CLI-004 fix: invalidate previous generated data
      state.lastRecords = null;
      updateHeaderStatus();
      errorMsg.textContent = "";
      showToast(`Selected fields: ${chosen.map(f => FIELD_DISPLAY_NAMES[f]).join(", ")}`, "success");
      switchScreen("screen-3");
    } catch (err) {
      errorMsg.textContent = err.message;
    }
  });

  rawInput.addEventListener("input", () => {
    // Try to update checkboxes live
    try {
      const raw = rawInput.value.trim();
      if (!raw) return;
      const chosen = validateFieldChoices(raw);
      checkboxes.forEach(cb => {
        cb.checked = chosen.includes(cb.value);
      });
      errorMsg.textContent = "";
    } catch (e) {
      // User is typing
    }
  });
}

function syncCheckboxesToCliInput() {
  const checkboxes = document.querySelectorAll(".field-checkbox");
  const rawInput = document.getElementById("fields-cli-input");
  const numbers = [];
  checkboxes.forEach(cb => {
    if (cb.checked) {
      const num = cb.getAttribute("data-number");
      numbers.push(num);
    }
  });
  rawInput.value = numbers.join(",");
}

function renderScreen2() {
  const checkboxes = document.querySelectorAll(".field-checkbox");
  if (state.fields && state.fields.length > 0) {
    checkboxes.forEach(cb => {
      cb.checked = state.fields.includes(cb.value);
    });
    syncCheckboxesToCliInput();
  }
}

// ---------------------------------------------------------------------------
// Screen 3: Generate & Validate Uniqueness
// ---------------------------------------------------------------------------

function initScreen3Generate() {
  const generateBtn = document.getElementById("start-generate-btn");
  const cancelBtn = document.getElementById("cancel-generate-btn");
  const proceedToSaveBtn = document.getElementById("proceed-to-save-btn");

  generateBtn.addEventListener("click", () => {
    if (!state.isReady) {
      showToast("Configuration incomplete. Set count and fields first.", "error");
      return;
    }

    const confirmModal = document.getElementById("generate-confirm-modal");
    if (confirmModal) {
      document.getElementById("modal-count-val").textContent = state.count;
      document.getElementById("modal-fields-val").textContent = state.fields.map(f => FIELD_DISPLAY_NAMES[f]).join(", ");
      confirmModal.classList.remove("hidden");
    } else {
      executeGeneration();
    }
  });

  const confirmYesBtn = document.getElementById("modal-confirm-yes");
  const confirmNoBtn = document.getElementById("modal-confirm-no");

  if (confirmYesBtn) {
    confirmYesBtn.addEventListener("click", () => {
      document.getElementById("generate-confirm-modal").classList.add("hidden");
      executeGeneration();
    });
  }

  if (confirmNoBtn) {
    confirmNoBtn.addEventListener("click", () => {
      document.getElementById("generate-confirm-modal").classList.add("hidden");
      showToast("Generation cancelled.", "info");
    });
  }

  if (proceedToSaveBtn) {
    proceedToSaveBtn.addEventListener("click", () => {
      switchScreen("screen-4");
    });
  }
}

function executeGeneration() {
  const progressContainer = document.getElementById("generate-progress-box");
  const resultsContainer = document.getElementById("generation-results-box");
  const generateBtn = document.getElementById("start-generate-btn");

  progressContainer.classList.remove("hidden");
  resultsContainer.classList.add("hidden");
  generateBtn.disabled = true;

  setTimeout(() => {
    const startTime = performance.now();
    try {
      const generator = new TestDataGenerator(state.fields);
      const records = generator.generate(state.count);
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

      state.lastRecords = records;
      updateHeaderStatus();

      // Render Uniqueness Report
      renderUniquenessReport(records);

      // Render Preview
      previewPage = 1;
      renderRecordsPreviewTable(records);

      progressContainer.classList.add("hidden");
      resultsContainer.classList.remove("hidden");
      document.getElementById("gen-time-stat").textContent = `${elapsed}s`;
      showToast(`Generated ${records.length} records successfully in ${elapsed}s!`, "success");
    } catch (err) {
      progressContainer.classList.add("hidden");
      showToast(`Error during generation: ${err.message}`, "error");
    } finally {
      generateBtn.disabled = false;
    }
  }, 100);
}

function renderUniquenessReport(records) {
  const container = document.getElementById("uniqueness-report-container");
  container.innerHTML = "";

  state.fields.forEach(field => {
    const values = records.map(r => r[field]).filter(Boolean);
    const uniqueCount = new Set(values).size;
    const total = values.length;
    const isUnique = uniqueCount === total;
    const diff = total - uniqueCount;

    const card = document.createElement("div");
    card.className = `report-card ${isUnique ? "report-success" : "report-danger"}`;
    card.innerHTML = `
      <div class="report-header">
        <span class="report-field-name">${FIELD_DISPLAY_NAMES[field] || field}</span>
        <span class="badge ${isUnique ? "badge-success" : "badge-danger"}">
          ${isUnique ? "✔ No duplicates" : `✘ ${diff} duplicates!`}
        </span>
      </div>
      <div class="report-stats">
        <span>Unique: <strong>${uniqueCount}</strong> / ${total}</span>
        <span>100% Uniqueness Guarantee</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill ${isUnique ? "fill-success" : "fill-danger"}" style="width: 100%"></div>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderRecordsPreviewTable(records) {
  const tbody = document.getElementById("preview-table-body");
  const thead = document.getElementById("preview-table-head");
  const paginationInfo = document.getElementById("preview-pagination-info");
  const prevBtn = document.getElementById("preview-prev-btn");
  const nextBtn = document.getElementById("preview-next-btn");

  if (!records || records.length === 0) {
    thead.innerHTML = "";
    tbody.innerHTML = `<tr><td class="text-center">No records to preview.</td></tr>`;
    return;
  }

  // Table header
  const columns = collectFieldnames(records);
  thead.innerHTML = `
    <tr>
      <th style="width: 50px">#</th>
      ${columns.map(c => `<th>${FIELD_DISPLAY_NAMES[c] || c}</th>`).join("")}
    </tr>
  `;

  // Pagination
  const totalPages = Math.ceil(records.length / PAGE_SIZE);
  const startIdx = (previewPage - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, records.length);
  const pageRows = records.slice(startIdx, endIdx);

  tbody.innerHTML = pageRows.map((rec, i) => {
    const globalIdx = startIdx + i + 1;
    return `
      <tr>
        <td class="dim">${globalIdx}</td>
        ${columns.map(c => `<td>${escapeHtml(rec[c] || "")}</td>`).join("")}
      </tr>
    `;
  }).join("");

  paginationInfo.textContent = `Showing ${startIdx + 1}–${endIdx} of ${records.length} records`;

  prevBtn.disabled = previewPage <= 1;
  nextBtn.disabled = previewPage >= totalPages;

  prevBtn.onclick = () => {
    if (previewPage > 1) {
      previewPage--;
      renderRecordsPreviewTable(records);
    }
  };

  nextBtn.onclick = () => {
    if (previewPage < totalPages) {
      previewPage++;
      renderRecordsPreviewTable(records);
    }
  };

  // Render CLI 5-records preview block
  const cliPreview = document.getElementById("cli-preview-text");
  if (cliPreview) {
    const first5 = records.slice(0, 5);
    const lines = first5.map((rec, i) => {
      const parts = Object.entries(rec).map(([k, v]) => `${k}=${v}`);
      return `  <span class="dim">${i + 1}.</span> ${parts.join(" | ")}`;
    });
    cliPreview.innerHTML = `<strong>Preview (first 5 of ${records.length} records):</strong><br/>${lines.join("<br/>")}`;
  }
}

function renderScreen3() {
  const readyAlert = document.getElementById("generate-ready-alert");
  const configSummary = document.getElementById("gen-config-summary");
  const generateBtn = document.getElementById("start-generate-btn");

  if (!state.isReady) {
    readyAlert.innerHTML = `
      <div class="alert alert-warning">
        <span class="bold">Configuration Incomplete:</span> Please set a record count (Option 1) and select at least one field (Option 2) before generating.
      </div>
    `;
    generateBtn.disabled = true;
    configSummary.innerHTML = "";
  } else {
    readyAlert.innerHTML = `
      <div class="alert alert-success">
        <span class="bold">Configuration Ready:</span> Ready to generate ${state.count} records with fields: ${state.fields.map(f => FIELD_DISPLAY_NAMES[f]).join(", ")}.
      </div>
    `;
    generateBtn.disabled = false;
    configSummary.innerHTML = `
      <div class="summary-card">
        <div><strong>Record Count:</strong> ${state.count}</div>
        <div><strong>Selected Fields:</strong> ${state.fields.map(f => FIELD_DISPLAY_NAMES[f]).join(", ")}</div>
      </div>
    `;
  }

  if (state.lastRecords) {
    document.getElementById("generation-results-box").classList.remove("hidden");
    renderUniquenessReport(state.lastRecords);
    renderRecordsPreviewTable(state.lastRecords);
  }
}

// ---------------------------------------------------------------------------
// Screen 4: Save Data to CSV
// ---------------------------------------------------------------------------

function initScreen4Save() {
  const filenameInput = document.getElementById("save-filename-input");
  const saveBtn = document.getElementById("execute-save-btn");
  const downloadOnlyBtn = document.getElementById("download-csv-btn");

  saveBtn.addEventListener("click", () => {
    handleSaveCsv(false);
  });

  if (downloadOnlyBtn) {
    downloadOnlyBtn.addEventListener("click", () => {
      handleSaveCsv(true);
    });
  }
}

function handleSaveCsv(downloadDirect = false) {
  if (!state.lastRecords || state.lastRecords.length === 0) {
    showToast("No data to save. Please generate data first.", "error");
    return;
  }

  const filenameInput = document.getElementById("save-filename-input");
  const chosenName = resolveFilename(filenameInput.value || DEFAULT_FILENAME);
  const exists = checkFileExists(chosenName);

  if (exists) {
    // Show append/overwrite prompt modal
    const modal = document.getElementById("save-mode-modal");
    document.getElementById("modal-existing-filename").textContent = chosenName;
    modal.classList.remove("hidden");

    document.getElementById("modal-save-append").onclick = () => {
      modal.classList.add("hidden");
      executeSaveOperation(chosenName, true, downloadDirect);
    };

    document.getElementById("modal-save-overwrite").onclick = () => {
      modal.classList.add("hidden");
      executeSaveOperation(chosenName, false, downloadDirect);
    };

    document.getElementById("modal-save-cancel").onclick = () => {
      modal.classList.add("hidden");
      showToast("Save cancelled.", "info");
    };
  } else {
    executeSaveOperation(chosenName, false, downloadDirect);
  }
}

function executeSaveOperation(filename, append, downloadDirect) {
  try {
    const res = saveRecordsToCsv(state.lastRecords, filename, append);
    // Instant trigger download with UTF-8 BOM
    triggerCsvDownload(res.filename, res.fullContent);

    const modeText = res.mode === "append" ? "appended to" : "saved to";
    showToast(`File ${modeText} output/${res.filename} (${res.totalRecords} total records)`, "success");

    // Show save result banner
    const resultBox = document.getElementById("save-result-box");
    resultBox.classList.remove("hidden");
    resultBox.innerHTML = `
      <div class="alert alert-success">
        <h4 class="bold">✔ File Saved & Downloaded Successfully!</h4>
        <p>File: <code>output/${res.filename}</code></p>
        <p>Total Records: <strong>${res.totalRecords}</strong> | Size: <strong>${(res.sizeBytes / 1024).toFixed(1)} KB</strong></p>
        <p class="dim">Encoded with UTF-8 BOM for immediate opening in Microsoft Excel and text editors.</p>
      </div>
    `;

    renderScreen5();
  } catch (err) {
    showToast(`Failed to save: ${err.message}`, "error");
  }
}

function renderScreen4() {
  const readyInfo = document.getElementById("save-ready-info");
  const saveBtn = document.getElementById("execute-save-btn");

  if (!state.lastRecords || state.lastRecords.length === 0) {
    readyInfo.innerHTML = `
      <div class="alert alert-warning">
        <span class="bold">No data to save:</span> Please generate data first (Option 3).
      </div>
    `;
    saveBtn.disabled = true;
  } else {
    readyInfo.innerHTML = `
      <div class="alert alert-success">
        <span class="bold">${state.lastRecords.length} records ready to save.</span>
      </div>
    `;
    saveBtn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Screen 5: View Existing CSV Files
// ---------------------------------------------------------------------------

function initScreen5Files() {
  const uploadInput = document.getElementById("import-csv-file-input");
  const uploadBtn = document.getElementById("import-csv-btn");

  if (uploadBtn && uploadInput) {
    uploadBtn.addEventListener("click", () => uploadInput.click());
    uploadInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target.result;
          const parsed = parseCsv(content);
          // Save to virtual storage as imported file
          saveRecordsToCsv(parsed.rows, file.name, false);
          showToast(`Imported ${file.name} (${parsed.rows.length} records)`, "success");
          renderScreen5();
        } catch (err) {
          showToast(`Import failed: ${err.message}`, "error");
        }
      };
      reader.readAsText(file);
      uploadInput.value = "";
    });
  }

  // Modal close button
  const fileModal = document.getElementById("file-preview-modal");
  const closeModalBtn = document.getElementById("modal-file-close");
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => fileModal.classList.add("hidden"));
  }
}

function renderScreen5() {
  const tbody = document.getElementById("existing-files-tbody");
  const emptyState = document.getElementById("no-files-notice");
  const files = listCsvFiles();

  if (files.length === 0) {
    tbody.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  tbody.innerHTML = files.map((f, i) => {
    const sizeKb = (f.size / 1024).toFixed(1);
    const dateStr = new Date(f.modified).toLocaleString();
    return `
      <tr>
        <td class="bold">${i + 1}</td>
        <td><code>${escapeHtml(f.filename)}</code></td>
        <td>${f.rowsCount} records</td>
        <td>${sizeKb} KB</td>
        <td class="dim">${dateStr}</td>
        <td class="actions-cell">
          <button class="btn btn-sm btn-primary" onclick="previewSavedFile('${escapeHtml(f.filename)}')">Preview</button>
          <button class="btn btn-sm btn-secondary" onclick="downloadSavedFile('${escapeHtml(f.filename)}')">Download</button>
          <button class="btn btn-sm btn-danger" onclick="deleteSavedFileAction('${escapeHtml(f.filename)}')">Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}

window.previewSavedFile = function (filename) {
  try {
    const { rows, fieldnames } = loadRecordsFromCsv(filename);
    const modal = document.getElementById("file-preview-modal");
    document.getElementById("modal-filename-title").textContent = filename;
    document.getElementById("modal-file-stats").textContent = `Total: ${rows.length} records, ${fieldnames.length} columns`;

    const thead = document.getElementById("modal-file-thead");
    const tbody = document.getElementById("modal-file-tbody");

    thead.innerHTML = `<tr>${fieldnames.map(f => `<th>${escapeHtml(f)}</th>`).join("")}</tr>`;
    tbody.innerHTML = rows.slice(0, 20).map(r => {
      return `<tr>${fieldnames.map(f => `<td>${escapeHtml(r[f] ?? "")}</td>`).join("")}</tr>`;
    }).join("");

    const truncationNotice = document.getElementById("modal-file-truncation");
    if (rows.length > 20) {
      truncationNotice.textContent = `... and ${rows.length - 20} more records (showing first 20 records)`;
      truncationNotice.classList.remove("hidden");
    } else {
      truncationNotice.classList.add("hidden");
    }

    modal.classList.remove("hidden");
  } catch (err) {
    showToast(err.message, "error");
  }
};

window.downloadSavedFile = function (filename) {
  try {
    const { rows, fieldnames, size } = loadRecordsFromCsv(filename);
    const csvBody = buildCsvString(rows, fieldnames, true);
    triggerCsvDownload(filename, "\uFEFF" + csvBody);
    showToast(`Downloaded ${filename}`, "success");
  } catch (err) {
    showToast(err.message, "error");
  }
};

window.deleteSavedFileAction = function (filename) {
  if (confirm(`Delete '${filename}' from virtual storage?`)) {
    deleteCsvFile(filename);
    renderScreen5();
    showToast(`Deleted ${filename}`, "info");
  }
};

// ---------------------------------------------------------------------------
// Dashboard Overview Render
// ---------------------------------------------------------------------------

function renderDashboard() {
  updateHeaderStatus();
  const summaryCount = document.getElementById("dash-count-display");
  const summaryFields = document.getElementById("dash-fields-display");
  const summaryStatus = document.getElementById("dash-ready-display");

  if (summaryCount) {
    summaryCount.textContent = state.count !== null ? `${state.count} records` : "Not set";
  }
  if (summaryFields) {
    summaryFields.textContent = state.fields ? state.fields.map(f => FIELD_DISPLAY_NAMES[f]).join(", ") : "None selected";
  }
  if (summaryStatus) {
    summaryStatus.textContent = state.isReady ? "Ready to generate" : "Setup required";
    summaryStatus.className = state.isReady ? "text-success bold" : "text-warning bold";
  }
}

// ---------------------------------------------------------------------------
// CLI Terminal Initialization
// ---------------------------------------------------------------------------

function initCliTerminal() {
  const container = document.getElementById("terminal-view-wrapper");
  if (container) {
    cliSimulator = new CliSimulator(container, state, () => {
      // Sync terminal state changes back to GUI
      updateHeaderStatus();
      if (currentTab === "screen-1") renderScreen1();
      if (currentTab === "screen-2") renderScreen2();
      if (currentTab === "screen-3") renderScreen3();
      if (currentTab === "screen-4") renderScreen4();
    });
  }
}

// ---------------------------------------------------------------------------
// Initial Virtual Storage Seed
// ---------------------------------------------------------------------------

function seedInitialFileIfEmpty() {
  const files = listCsvFiles();
  if (files.length === 0) {
    // Generate a sample batch of 10 records with all fields
    try {
      const generator = new TestDataGenerator(["full_name", "email", "phone", "id_number"]);
      const sampleRecords = generator.generate(10);
      saveRecordsToCsv(sampleRecords, "sample_test_data.csv", false);
    } catch (e) {
      console.warn("Could not seed initial sample file:", e);
    }
  }
}

// ---------------------------------------------------------------------------
// Utility Helpers
// ---------------------------------------------------------------------------

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type} animate-slide-in`;
  toast.innerHTML = `
    <span class="toast-icon">${type === "success" ? "✔" : type === "error" ? "✘" : "ℹ"}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("toast-fade-out");
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

