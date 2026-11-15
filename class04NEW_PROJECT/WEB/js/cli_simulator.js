/**
 * cli_simulator.js - Interactive Terminal Emulator
 * ==================================================
 * Faithfully simulates the terminal I/O from Python's cli.py.
 * Provides the authentic ANSI styling, prompts, pauses,
 * and exact menu workflows directly in the browser.
 */

class CliSimulator {
  constructor(containerElement, sharedState, onStateChangeCallback) {
    this.container = containerElement;
    this.state = sharedState;
    this.onStateChange = onStateChangeCallback || (() => {});

    this.history = [];
    this.currentScreen = "MAIN_MENU";
    this.inputHandler = null; // function to receive next entered string
    this.pendingPause = false;

    this.initDOM();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="terminal-window">
        <div class="terminal-titlebar">
          <div class="terminal-buttons">
            <span class="term-btn term-close"></span>
            <span class="term-btn term-min"></span>
            <span class="term-btn term-max"></span>
          </div>
          <div class="terminal-title">cli.py - Test Data Generator Terminal (PowerShell / Python 3.13)</div>
          <div class="terminal-actions">
            <button class="term-action-btn" id="term-clear-btn" title="Clear Terminal (cls)">Clear</button>
            <button class="term-action-btn" id="term-restart-btn" title="Restart Application">Restart</button>
          </div>
        </div>
        <div class="terminal-body" id="term-output"></div>
        <div class="terminal-input-bar">
          <span class="term-prompt-symbol">▶</span>
          <span class="term-prompt-label" id="term-prompt-text">Select an option: </span>
          <input type="text" class="term-input" id="term-input-field" autocomplete="off" spellcheck="false" autofocus />
          <button class="term-send-btn" id="term-send-btn">Enter ↵</button>
        </div>
        <div class="terminal-shortcuts">
          <span class="shortcut-label">Quick Commands:</span>
          <button class="term-shortcut" data-cmd="1">1: Set Count</button>
          <button class="term-shortcut" data-cmd="2">2: Select Fields</button>
          <button class="term-shortcut" data-cmd="3">3: Generate & Validate</button>
          <button class="term-shortcut" data-cmd="4">4: Save CSV</button>
          <button class="term-shortcut" data-cmd="5">5: View Files</button>
          <button class="term-shortcut" data-cmd="all">all</button>
          <button class="term-shortcut" data-cmd="yes">yes</button>
          <button class="term-shortcut" data-cmd="0">0: Exit</button>
        </div>
      </div>
    `;

    this.outputElem = this.container.querySelector("#term-output");
    this.promptTextElem = this.container.querySelector("#term-prompt-text");
    this.inputElem = this.container.querySelector("#term-input-field");
    this.sendBtn = this.container.querySelector("#term-send-btn");

    this.inputElem.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.submitInput();
      }
    });

    this.sendBtn.addEventListener("click", () => {
      this.submitInput();
    });

    this.container.querySelector("#term-clear-btn").addEventListener("click", () => {
      this.clear();
      this.showMainMenu();
    });

    this.container.querySelector("#term-restart-btn").addEventListener("click", () => {
      this.clear();
      this.printLine("<span class='cyan bold'>Restarting Test Data Generator session...</span>");
      setTimeout(() => this.showMainMenu(), 300);
    });

    // Shortcuts
    this.container.querySelectorAll(".term-shortcut").forEach(btn => {
      btn.addEventListener("click", () => {
        const cmd = btn.getAttribute("data-cmd");
        this.inputElem.value = cmd;
        this.submitInput();
      });
    });

    // Start with Main Menu
    this.showMainMenu();
  }

  // -------------------------------------------------------------------------
  // Terminal Output Helpers (Faithful to cli.py)
  // -------------------------------------------------------------------------

  clear() {
    this.outputElem.innerHTML = "";
  }

  printRaw(html) {
    const div = document.createElement("div");
    div.className = "term-line";
    div.innerHTML = html;
    this.outputElem.appendChild(div);
    this.outputElem.scrollTop = this.outputElem.scrollHeight;
  }

  printLine(text = "") {
    this.printRaw(text || "&nbsp;");
  }

  printSeparator(char = "─", width = 60) {
    this.printLine(`<span class="dim">${char.repeat(width)}</span>`);
  }

  printHeader(title) {
    this.printSeparator("═", 60);
    this.printLine(`<span class="cyan bold">&nbsp;&nbsp;${title}</span>`);
    this.printSeparator("═", 60);
  }

  printSuccess(msg) {
    this.printLine(`\n<span class="green bold">✔</span> ${msg}`);
  }

  printError(msg) {
    this.printLine(`\n<span class="red bold">✘</span> ${msg}`);
  }

  printWarning(msg) {
    this.printLine(`\n<span class="yellow bold">⚠</span> ${msg}`);
  }

  printInfo(msg) {
    this.printLine(`&nbsp;&nbsp;<span class="cyan bold">ℹ</span> ${msg}`);
  }

  setPrompt(message, defaultValue = "") {
    const suffix = defaultValue ? ` [${defaultValue}]` : "";
    this.promptTextElem.textContent = `${message}${suffix}: `;
    this.inputElem.placeholder = defaultValue ? `Press Enter for '${defaultValue}'` : "";
    this.inputElem.focus();
  }

  // Emulates _pause(message = "Press Enter to continue...")
  pause(callback, message = "Press Enter to continue...") {
    this.printLine(`\n<span class="dim">${message}</span>`);
    this.setPrompt("Press Enter", "");
    this.inputHandler = () => {
      callback();
    };
  }

  submitInput() {
    const value = this.inputElem.value.trim();
    this.inputElem.value = "";

    // Echo input to terminal
    this.printLine(`<span class="dim">▶ ${this.promptTextElem.textContent}</span> <span class="white bold">${value}</span>`);

    if (this.inputHandler) {
      const handler = this.inputHandler;
      this.inputHandler = null;
      handler(value);
    }
  }

  // -------------------------------------------------------------------------
  // Screens (Direct Ports of cli.py)
  // -------------------------------------------------------------------------

  buildSessionSummary() {
    let countLine = "";
    if (this.state.count !== null && this.state.count !== undefined) {
      countLine = `&nbsp;&nbsp;Record count : <span class="bold">${this.state.count}</span>`;
    } else {
      countLine = `&nbsp;&nbsp;Record count : <span class="yellow">not set</span>`;
    }

    let fieldsLine = "";
    if (this.state.fields && this.state.fields.length > 0) {
      const names = this.state.fields.map(f => FIELD_DISPLAY_NAMES[f] || f).join(", ");
      fieldsLine = `&nbsp;&nbsp;Selected fields : <span class="bold">${names}</span>`;
    } else {
      fieldsLine = `&nbsp;&nbsp;Selected fields : <span class="yellow">none selected</span>`;
    }

    return `${countLine}<br/>${fieldsLine}`;
  }

  showMainMenu() {
    this.currentScreen = "MAIN_MENU";
    this.clear();
    this.printHeader("🧪 Test Data Generator & Store");

    const readyBadge = this.state.isReady
      ? `<span class="green bold"> [Ready ✔]</span>`
      : `<span class="yellow bold"> [Setup Required]</span>`;

    const menu = `
<span class="bold">&nbsp;&nbsp;Main Menu</span>
<span class="dim">&nbsp;&nbsp;────────────────────────────────────────</span>
&nbsp;&nbsp;<span class="bold">1.</span> Set record count
&nbsp;&nbsp;<span class="bold">2.</span> Select fields to generate
&nbsp;&nbsp;<span class="bold">3.</span> Generate data & validate uniqueness${readyBadge}
&nbsp;&nbsp;<span class="bold">4.</span> Save data to CSV file
&nbsp;&nbsp;<span class="bold">5.</span> View existing CSV files
<span class="dim">&nbsp;&nbsp;────────────────────────────────────────</span>
&nbsp;&nbsp;<span class="bold">0.</span> Exit
`;
    this.printLine(menu);
    this.printRaw(this.buildSessionSummary());
    this.printLine("");

    this.setPrompt("Select an option", "");
    this.inputHandler = (choice) => {
      this.handleMainMenuChoice(choice);
    };
  }

  handleMainMenuChoice(raw) {
    if (raw === "0") {
      this.clear();
      this.printLine("\n<span class='cyan bold'>Thank you for using Test Data Generator. Goodbye! 👋</span>\n");
      this.pause(() => this.showMainMenu(), "Press Enter to start a new session...");
      return;
    }

    switch (raw) {
      case "1":
        this.screenSetCount();
        break;
      case "2":
        this.screenSelectFields();
        break;
      case "3":
        this.screenGenerateAndValidate();
        break;
      case "4":
        this.screenSaveToCsv();
        break;
      case "5":
        this.screenViewExistingFiles();
        break;
      default:
        this.printError(`'${raw}' – invalid option. Please choose a number between 0 and 5.`);
        this.pause(() => this.showMainMenu());
        break;
    }
  }

  // 1. Set Record Count
  screenSetCount() {
    this.clear();
    this.printHeader("1. Set Record Count");
    if (this.state.count !== null && this.state.count !== undefined) {
      this.printInfo(`Current value: ${this.state.count}`);
    }
    this.printLine("");

    const ask = () => {
      const defaultVal = this.state.count !== null ? String(this.state.count) : "";
      this.setPrompt("Enter number of records to generate (1 – 100,000)", defaultVal);
      this.inputHandler = (raw) => {
        const val = raw || defaultVal;
        if (!val) {
          this.printWarning("Action cancelled – value unchanged.");
          this.pause(() => this.showMainMenu());
          return;
        }
        try {
          const parsed = validateCount(val);
          this.state.count = parsed;
          // BUG-CLI-004 fix: invalidate old generation on config change
          this.state.lastRecords = null;
          this.onStateChange();
          this.printSuccess(`Count set to: ${this.state.count} records.`);
          this.pause(() => this.showMainMenu());
        } catch (err) {
          this.printError(err.message);
          ask();
        }
      };
    };
    ask();
  }

  // 2. Select Fields to Generate
  screenSelectFields() {
    this.clear();
    this.printHeader("2. Select Fields to Generate");
    this.printLine("");
    this.printLine("&nbsp;&nbsp;Available fields:");

    for (const [num, internal] of Object.entries(VALID_FIELDS)) {
      const display = FIELD_DISPLAY_NAMES[internal];
      const selected = this.state.fields && this.state.fields.includes(internal);
      const marker = selected ? `<span class="green bold">✔</span>` : "&nbsp;";
      this.printLine(`&nbsp;&nbsp;&nbsp;&nbsp;[${marker}] ${num}. ${display}`);
    }

    this.printLine("");
    this.printLine("<span class='dim'>&nbsp;&nbsp;Enter field numbers separated by commas or spaces (e.g. 1,2,4)</span>");
    this.printLine("<span class='dim'>&nbsp;&nbsp;Type 'all' to select all fields | Press Enter to cancel</span>");
    this.printLine("");

    const ask = () => {
      this.setPrompt("Your choice", "");
      this.inputHandler = (raw) => {
        if (!raw) {
          this.printWarning("Action cancelled – selection unchanged.");
          this.pause(() => this.showMainMenu());
          return;
        }

        if (raw.toLowerCase() === "all") {
          this.state.fields = Object.values(VALID_FIELDS);
          // BUG-CLI-004 fix: invalidate old records
          this.state.lastRecords = null;
          this.onStateChange();
          const names = this.state.fields.map(f => FIELD_DISPLAY_NAMES[f]).join(", ");
          this.printSuccess(`All fields selected: ${names}`);
          this.pause(() => this.showMainMenu());
          return;
        }

        try {
          const chosen = validateFieldChoices(raw);
          this.state.fields = chosen;
          // BUG-CLI-004 fix: invalidate old records
          this.state.lastRecords = null;
          this.onStateChange();
          const names = this.state.fields.map(f => FIELD_DISPLAY_NAMES[f]).join(", ");
          this.printSuccess(`Fields selected: ${names}`);
          this.pause(() => this.showMainMenu());
        } catch (err) {
          this.printError(err.message);
          ask();
        }
      };
    };
    ask();
  }

  // 3. Generate Data & Validate Uniqueness
  screenGenerateAndValidate() {
    this.clear();
    this.printHeader("3. Generate Data & Validate Uniqueness");
    this.printLine("");

    if (!this.state.isReady) {
      this.printError("Configuration incomplete. Set a record count (1) and select fields (2) before generating.");
      this.pause(() => this.showMainMenu());
      return;
    }

    this.printRaw(this.buildSessionSummary());
    this.printLine("");

    this.setPrompt("Proceed with data generation? (yes/no)", "yes");
    this.inputHandler = (confirmRaw) => {
      const confirm = (confirmRaw || "yes").toLowerCase();
      if (confirm !== "yes" && confirm !== "y") {
        this.printWarning("Generation cancelled.");
        this.pause(() => this.showMainMenu());
        return;
      }

      this.printLine(`\n<span class="cyan">⏳</span> Generating ${this.state.count} records... please wait.`);

      setTimeout(() => {
        try {
          const generator = new TestDataGenerator(this.state.fields);
          const records = generator.generate(this.state.count);

          // --- Uniqueness report ---
          this.printSeparator();
          this.printLine("\n<span class='bold'>&nbsp;&nbsp;Uniqueness Report:</span>");

          for (const fieldName of this.state.fields) {
            const values = records.map(r => r[fieldName]).filter(Boolean);
            const uniqueCount = new Set(values).size;
            const total = values.length;
            const status = uniqueCount === total
              ? `<span class="green bold">✔ No duplicates</span>`
              : `<span class="red bold">✘ ${total - uniqueCount} duplicates!</span>`;
            const display = FIELD_DISPLAY_NAMES[fieldName] || fieldName;
            this.printLine(`&nbsp;&nbsp;&nbsp;&nbsp;${display}: ${uniqueCount}/${total} unique – ${status}`);
          }

          // --- Preview (first 5) ---
          this.printSeparator();
          this.printLine(`\n<span class='bold'>&nbsp;&nbsp;Preview (first 5 of ${records.length} records):</span>`);
          records.slice(0, 5).forEach((rec, i) => {
            const parts = Object.entries(rec).map(([k, v]) => `${k}=${v}`);
            this.printLine(`&nbsp;&nbsp;&nbsp;&nbsp;<span class="dim">${i + 1}.</span> ${parts.join(" | ")}`);
          });

          this.state.lastRecords = records;
          this.onStateChange();
          this.printSuccess(`Generation complete – ${records.length} records created.`);
          this.pause(() => this.showMainMenu());
        } catch (err) {
          this.printError(`Error during generation: ${err.message}`);
          this.pause(() => this.showMainMenu());
        }
      }, 50);
    };
  }

  // 4. Save Data to CSV
  screenSaveToCsv() {
    this.clear();
    this.printHeader("4. Save Data to CSV");
    this.printLine("");

    const records = this.state.lastRecords;
    if (!records || records.length === 0) {
      this.printError("No data to save. Please generate data first (option 3).");
      this.pause(() => this.showMainMenu());
      return;
    }

    this.printInfo(`${records.length} records ready to save.`);
    this.printLine("");

    const defaultName = "test_data.csv";
    this.setPrompt(`Output filename (Enter for default: ${defaultName})`, defaultName);

    this.inputHandler = (rawName) => {
      const chosenName = resolveFilename(rawName || defaultName);
      const exists = checkFileExists(chosenName);

      const doSave = (append) => {
        this.printLine(`\n<span class="cyan">⏳</span> Saving...`);
        try {
          const res = saveRecordsToCsv(records, chosenName, append);
          // Also trigger physical CSV download
          triggerCsvDownload(res.filename, res.fullContent);
          this.printSuccess(`File saved successfully:\n&nbsp;&nbsp;output/${res.filename} (${res.totalRecords} total records)`);
          this.printInfo(`File downloaded with UTF-8 BOM encoding for Excel compatibility.`);
        } catch (err) {
          this.printError(`Save error: ${err.message}`);
        }
        this.pause(() => this.showMainMenu());
      };

      if (exists) {
        this.printWarning(`File '${chosenName}' already exists.`);
        this.setPrompt("Append to existing file? (yes=append / no=overwrite)", "no");
        this.inputHandler = (modeChoice) => {
          const append = (modeChoice || "no").toLowerCase() === "yes" || (modeChoice || "no").toLowerCase() === "y";
          doSave(append);
        };
      } else {
        doSave(false);
      }
    };
  }

  // 5. View Existing CSV Files
  screenViewExistingFiles() {
    this.clear();
    this.printHeader("5. View Existing Files");
    this.printLine("");

    const files = listCsvFiles();
    if (files.length === 0) {
      this.printInfo("No CSV files found in output directory.");
      this.pause(() => this.showMainMenu());
      return;
    }

    this.printLine("&nbsp;&nbsp;Files found in output directory:\n");
    files.forEach((f, i) => {
      const sizeKb = (f.size / 1024).toFixed(1);
      this.printLine(`&nbsp;&nbsp;&nbsp;&nbsp;<span class="bold">${i + 1}.</span> ${f.filename}  <span class="dim">(${sizeKb} KB, ${f.rowsCount} records)</span>`);
    });

    this.printLine("");
    this.setPrompt("Enter file number to preview, or press Enter to go back", "");

    this.inputHandler = (raw) => {
      if (!raw) {
        this.showMainMenu();
        return;
      }
      const num = parseInt(raw, 10);
      if (isNaN(num) || num < 1 || num > files.length) {
        this.printError("Invalid selection.");
        this.pause(() => this.showMainMenu());
        return;
      }

      const chosen = files[num - 1];
      this.clear();
      this.printHeader(`Contents: ${chosen.filename}`);
      try {
        const { rows, fieldnames } = loadRecordsFromCsv(chosen.filename);

        const colW = 22;
        const header = fieldnames.map(f => f.padEnd(colW)).join(" | ");
        this.printLine(`\n&nbsp;&nbsp;<span class="bold">${header}</span>`);
        this.printSeparator("-", header.length + 4);

        rows.slice(0, 20).forEach(row => {
          const line = fieldnames.map(f => String(row[f] ?? "").padEnd(colW)).join(" | ");
          this.printLine(`&nbsp;&nbsp;${line}`);
        });

        if (rows.length > 20) {
          this.printLine(`<span class="dim">\n&nbsp;&nbsp;... and ${rows.length - 20} more records (showing first 20)</span>`);
        }
        this.printInfo(`Total: ${rows.length} records, ${fieldnames.length} columns`);
      } catch (err) {
        this.printError(err.message);
      }
      this.pause(() => this.showMainMenu());
    };
  }
}

// Export for module/browser global usage
if (typeof window !== "undefined") {
  window.CliSimulator = CliSimulator;
}

