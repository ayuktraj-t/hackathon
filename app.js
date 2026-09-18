// ==========================================================================
// POLICYLENS 2.0 — FRONTEND CONTROLLER & INTERACTIVE DIFF ENGINE
// ==========================================================================

let presetsData = {};
let currentResults = null;
let activePresetKey = "hr_policy";
let activeInputMode = "files"; // 'files' or 'text'
let activeViewMode = "sideBySide";

let filterCategory = "all";
let filterRisk = "all";
let searchQuery = "";

// DOM ELEMENTS
const dropzoneOld = document.getElementById("dropzoneOld");
const dropzoneNew = document.getElementById("dropzoneNew");
const oldFileInput = document.getElementById("oldFileInput");
const newFileInput = document.getElementById("newFileInput");
const oldFileName = document.getElementById("oldFileName");
const newFileName = document.getElementById("newFileName");
const oldFileSize = document.getElementById("oldFileSize");
const newFileSize = document.getElementById("newFileSize");

const tabFiles = document.getElementById("tabFiles");
const tabText = document.getElementById("tabText");
const fileUploadContainer = document.getElementById("fileUploadContainer");
const textEditorContainer = document.getElementById("textEditorContainer");

const rawOldText = document.getElementById("rawOldText");
const rawNewText = document.getElementById("rawNewText");
const oldCharCount = document.getElementById("oldCharCount");
const newCharCount = document.getElementById("newCharCount");

const compareBtn = document.getElementById("compareBtn");
const errorMessage = document.getElementById("errorMessage");
const loadingState = document.getElementById("loadingState");
const resultsSection = document.getElementById("resultsSection");
const scenarioIndicator = document.getElementById("scenarioIndicator");

const presetButtons = document.getElementById("presetButtons");
const searchInput = document.getElementById("searchInput");
const categoryChips = document.getElementById("categoryChips");
const riskChips = document.getElementById("riskChips");

const btnExportCsv = document.getElementById("btnExportCsv");
const btnPrintReport = document.getElementById("btnPrintReport");

// INITIALIZATION
document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  setupDragAndDrop();
  setupTextCounters();
  setupFiltersAndSearch();
  setupViewTabs();
  setupExports();
  await loadPresets();
});

// TAB SWITCHING
function setupTabs() {
  tabFiles.onclick = () => {
    activeInputMode = "files";
    tabFiles.classList.add("active");
    tabText.classList.remove("active");
    fileUploadContainer.classList.add("active");
    textEditorContainer.classList.remove("active");
  };
  tabText.onclick = () => {
    activeInputMode = "text";
    tabText.classList.add("active");
    tabFiles.classList.remove("active");
    textEditorContainer.classList.add("active");
    fileUploadContainer.classList.remove("active");
  };
}

// DRAG AND DROP
function setupDragAndDrop() {
  [
    { zone: dropzoneOld, input: oldFileInput, name: oldFileName, size: oldFileSize },
    { zone: dropzoneNew, input: newFileInput, name: newFileName, size: newFileSize }
  ].forEach(({ zone, input, name, size }) => {
    ["dragenter", "dragover"].forEach(eventName => {
      zone.addEventListener(eventName, e => {
        e.preventDefault();
        zone.classList.add("dragover");
      });
    });

    ["dragleave", "drop"].forEach(eventName => {
      zone.addEventListener(eventName, e => {
        e.preventDefault();
        zone.classList.remove("dragover");
      });
    });

    zone.addEventListener("drop", e => {
      if (e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files;
        updateFileDisplay(input.files[0], name, size);
      }
    });

    input.addEventListener("change", () => {
      if (input.files.length) {
        updateFileDisplay(input.files[0], name, size);
      }
    });
  });
}

function updateFileDisplay(file, nameEl, sizeEl) {
  if (!file) return;
  nameEl.textContent = file.name;
  sizeEl.textContent = formatBytes(file.size);
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// TEXT EDITORS LIVE CHAR COUNTERS
function setupTextCounters() {
  const updateCounts = () => {
    oldCharCount.textContent = `${rawOldText.value.length} chars (${rawOldText.value.split(/\s+/).filter(Boolean).length} words)`;
    newCharCount.textContent = `${rawNewText.value.length} chars (${rawNewText.value.split(/\s+/).filter(Boolean).length} words)`;
  };
  rawOldText.addEventListener("input", updateCounts);
  rawNewText.addEventListener("input", updateCounts);
}

// LOAD DEMO PRESETS
async function loadPresets() {
  try {
    const res = await fetch("/api/presets");
    presetsData = await res.json();
    setupPresetButtons();
    // Select default preset
    selectPreset("hr_policy", true);
  } catch (err) {
    console.error("Failed to load presets:", err);
  }
}

function setupPresetButtons() {
  presetButtons.querySelectorAll(".preset-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const pKey = chip.getAttribute("data-preset");
      presetButtons.querySelectorAll(".preset-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      selectPreset(pKey, false);
    });
  });
}

function selectPreset(key, autoRun = false) {
  const preset = presetsData[key];
  if (!preset) return;
  activePresetKey = key;

  scenarioIndicator.innerHTML = `<span class="loaded-scenario-text">Loaded Scenario: <strong>${escapeHtml(preset.title)}</strong></span>`;
  
  // Populate textareas
  rawOldText.value = preset.old_text;
  rawNewText.value = preset.new_text;
  oldFileName.textContent = `${preset.old_title}.txt`;
  newFileName.textContent = `${preset.new_title}.txt`;
  oldFileSize.textContent = "Demo Preset";
  newFileSize.textContent = "Demo Preset";

  const updateCounts = () => {
    oldCharCount.textContent = `${rawOldText.value.length} chars`;
    newCharCount.textContent = `${rawNewText.value.length} chars`;
  };
  updateCounts();

  if (autoRun) {
    runComparison();
  }
}

// EXECUTE COMPARISON
compareBtn.onclick = runComparison;

async function runComparison() {
  errorMessage.classList.add("hidden");
  errorMessage.textContent = "";

  let payload = null;
  let isFormData = false;

  if (activeInputMode === "files" && oldFileInput.files[0] && newFileInput.files[0]) {
    // Real file upload mode
    const fd = new FormData();
    fd.append("old_file", oldFileInput.files[0]);
    fd.append("new_file", newFileInput.files[0]);
    payload = fd;
    isFormData = true;
  } else {
    // Direct text / Preset mode
    const oldT = rawOldText.value.trim();
    const newT = rawNewText.value.trim();
    if (!oldT || !newT) {
      errorMessage.textContent = "Please upload files or paste text in both baseline and revised policy fields.";
      errorMessage.classList.remove("hidden");
      return;
    }
    payload = JSON.stringify({
      old_text: oldT,
      new_text: newT,
      old_filename: oldFileName.textContent || "Baseline v1",
      new_filename: newFileName.textContent || "Proposed v2"
    });
  }

  // Show loading
  loadingState.classList.remove("hidden");
  resultsSection.classList.add("hidden");

  try {
    const fetchOptions = {
      method: "POST",
      body: payload
    };
    if (!isFormData) {
      fetchOptions.headers = { "Content-Type": "application/json" };
    }

    const res = await fetch("/compare", fetchOptions);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to compare policy documents.");
    }

    currentResults = data;
    renderResults(data);

  } catch (err) {
    errorMessage.textContent = err.message;
    errorMessage.classList.remove("hidden");
  } finally {
    loadingState.classList.add("hidden");
  }
}

// RENDER RESULTS DASHBOARD
function renderResults(data) {
  resultsSection.classList.remove("hidden");

  // 1. Render Scorecard & Volatility
  const briefing = data.executive_briefing || {};
  const summary = data.summary || {};

  const scoreEl = document.getElementById("volatilityScore");
  const fillEl = document.getElementById("volatilityFill");
  const strictBadge = document.getElementById("strictnessBadge");

  const score = briefing.volatility_score || 0;
  scoreEl.textContent = score;
  fillEl.style.width = `${Math.max(5, score)}%`;

  strictBadge.textContent = briefing.strictness_verdict || "Balanced";
  strictBadge.className = `strictness-badge ${briefing.strictness_class || "strict-neutral"}`;

  // 2. Render KPIs
  document.getElementById("totalChanges").textContent = summary.total_changes || 0;
  document.getElementById("highRiskCount").textContent = summary.high_risk || 0;
  document.getElementById("modifiedCount").textContent = summary.modified || 0;
  document.getElementById("addedCount").textContent = summary.added || 0;
  document.getElementById("removedCount").textContent = summary.removed || 0;

  // 3. Render Executive Takeaways
  const takeawaysContainer = document.getElementById("executiveTakeaways");
  takeawaysContainer.innerHTML = "";
  if (briefing.takeaways && briefing.takeaways.length > 0) {
    briefing.takeaways.forEach(t => {
      const item = document.createElement("div");
      const isHigh = t.risk && t.risk.includes("High");
      const isFav = t.risk && t.risk.includes("Favorable");
      item.className = `takeaway-item ${isHigh ? 'takeaway-high' : isFav ? 'takeaway-fav' : ''}`;
      item.innerHTML = `
        <div class="takeaway-head">
          <span class="takeaway-title">${escapeHtml(t.title)}</span>
          <span class="takeaway-badge ${isHigh ? 'strict-high' : isFav ? 'strict-favorable' : 'strict-neutral'}">${escapeHtml(t.risk)}</span>
        </div>
        <div class="takeaway-text">${escapeHtml(t.text)}</div>
      `;
      takeawaysContainer.appendChild(item);
    });
  } else {
    takeawaysContainer.innerHTML = `<div class="takeaway-text" style="color: var(--text-muted);">No critical risk flags detected. Document modifications are primarily editorial.</div>`;
  }

  // 4. Stakeholders
  const stakeholderTags = document.getElementById("stakeholderTags");
  stakeholderTags.innerHTML = "";
  (briefing.stakeholders || []).forEach(sh => {
    const tag = document.createElement("span");
    tag.className = "stakeholder-tag";
    tag.textContent = sh;
    stakeholderTags.appendChild(tag);
  });

  // 5. Action Items
  const actionList = document.getElementById("actionItemsList");
  actionList.innerHTML = "";
  (briefing.action_items || []).forEach(act => {
    const li = document.createElement("li");
    li.textContent = act;
    actionList.appendChild(li);
  });

  // 6. Render Current Filtered Views
  renderActiveViews();
}

// RENDER ALL VIEWS ACCORDING TO FILTER/SEARCH
function renderActiveViews() {
  if (!currentResults || !currentResults.sections) return;

  const filtered = currentResults.sections.filter(sec => {
    // Search query match
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (sec.display_title || "").toLowerCase().includes(q);
      const matchOld = (sec.old_text || "").toLowerCase().includes(q);
      const matchNew = (sec.new_text || "").toLowerCase().includes(q);
      const matchSumm = (sec.summary || "").toLowerCase().includes(q);
      if (!matchTitle && !matchOld && !matchNew && !matchSumm) return false;
    }

    // Category match
    if (filterCategory !== "all" && sec.category !== filterCategory) {
      return false;
    }

    // Risk match
    if (filterRisk !== "all" && sec.risk.level !== filterRisk) {
      return false;
    }

    return true;
  });

  document.getElementById("showingCount").textContent = `Showing ${filtered.length} of ${currentResults.sections.length} clauses`;

  renderSideBySideView(filtered);
  renderUnifiedRedlineView(filtered);
  renderChangeMatrixView(filtered);
  renderDeltasLedgerView(currentResults.all_deltas || []);
}

// 1. SIDE-BY-SIDE RENDERER
function renderSideBySideView(sections) {
  const container = document.getElementById("clauseCardsContainer");
  container.innerHTML = "";

  if (sections.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">No clauses matched your active filter criteria.</div>`;
    return;
  }

  sections.forEach(sec => {
    const card = document.createElement("div");
    card.className = "clause-card";

    const isHigh = sec.risk?.level === "High";
    const isFav = sec.risk?.level === "Favorable";
    const riskBadgeClass = isHigh ? "strict-high" : isFav ? "strict-favorable" : "strict-neutral";

    const deltaPillsHtml = (sec.deltas || []).map(d => {
      const cls = d.direction === "increased" ? "delta-increased" : d.direction === "decreased" ? "delta-decreased" : "";
      return `<span class="delta-pill ${cls}">${escapeHtml(d.description)}</span>`;
    }).join("");

    card.innerHTML = `
      <div class="clause-card-header">
        <div class="clause-title-group">
          <span class="clause-title">${escapeHtml(sec.display_title)}</span>
          <span class="category-badge">${escapeHtml(sec.category)}</span>
        </div>
        <div class="clause-badges">
          <span class="status-tag ${sec.status}">${sec.status}</span>
          <span class="strictness-badge ${riskBadgeClass}">${escapeHtml(sec.risk.badge)}</span>
          ${sec.similarity ? `<span class="status-pill">${sec.similarity}% match</span>` : ''}
        </div>
      </div>
      <div class="clause-columns">
        <div class="clause-col">
          <div class="col-header">
            <span>Baseline Version 1.0</span>
          </div>
          <div class="clause-text">${sec.diff_html ? sec.diff_html.old_html : escapeHtml(sec.old_text || "—")}</div>
        </div>
        <div class="clause-col">
          <div class="col-header">
            <span>Revised Version 2.0</span>
          </div>
          <div class="clause-text">${sec.diff_html ? sec.diff_html.new_html : escapeHtml(sec.new_text || "—")}</div>
        </div>
      </div>
      <div class="clause-card-footer">
        <div class="clause-summary-line">
          <strong>Executive Evidence:</strong> ${escapeHtml(sec.summary || "No changes.")}
        </div>
        ${deltaPillsHtml ? `<div class="delta-pills-row">${deltaPillsHtml}</div>` : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

// 2. UNIFIED REDLINE RENDERER
function renderUnifiedRedlineView(sections) {
  const container = document.getElementById("unifiedRedlineContainer");
  container.innerHTML = "";

  if (sections.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">No clauses matched your active filter criteria.</div>`;
    return;
  }

  sections.forEach(sec => {
    const block = document.createElement("div");
    block.className = "unified-section-block";
    block.innerHTML = `
      <div class="unified-section-title">
        ${escapeHtml(sec.display_title)} 
        <span class="status-tag ${sec.status}" style="margin-left: 8px;">${sec.status}</span>
      </div>
      <div class="clause-text" style="line-height: 1.7;">
        ${sec.diff_html ? sec.diff_html.unified_html : escapeHtml(sec.new_text || sec.old_text)}
      </div>
    `;
    container.appendChild(block);
  });
}

// 3. CHANGE MATRIX TABLE RENDERER
function renderChangeMatrixView(sections) {
  const tbody = document.getElementById("changeMatrixBody");
  tbody.innerHTML = "";

  if (sections.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-muted);">No matching clauses found.</td></tr>`;
    return;
  }

  sections.forEach(sec => {
    const tr = document.createElement("tr");
    const isHigh = sec.risk?.level === "High";
    const isFav = sec.risk?.level === "Favorable";
    const riskBadgeClass = isHigh ? "strict-high" : isFav ? "strict-favorable" : "strict-neutral";

    tr.innerHTML = `
      <td><div class="table-sec-title">${escapeHtml(sec.display_title)}</div></td>
      <td><span class="category-badge">${escapeHtml(sec.category)}</span></td>
      <td><span class="status-tag ${sec.status}">${sec.status}</span></td>
      <td><span class="strictness-badge ${riskBadgeClass}">${escapeHtml(sec.risk.badge)}</span></td>
      <td><div class="table-summary-text">${escapeHtml(sec.summary)}</div></td>
    `;
    tbody.appendChild(tr);
  });
}

// 4. DELTAS LEDGER RENDERER
function renderDeltasLedgerView(deltas) {
  const tbody = document.getElementById("deltasLedgerBody");
  tbody.innerHTML = "";

  if (!deltas || deltas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">No specific currency, percentage, or timeline values shifted in this comparison.</td></tr>`;
    return;
  }

  deltas.forEach(d => {
    const tr = document.createElement("tr");
    const directionIcon = d.direction === "increased" ? "🔺 Increased" : d.direction === "decreased" ? "🔻 Decreased" : d.direction === "added" ? "➕ Added" : d.direction === "removed" ? "➖ Removed" : "Changed";

    tr.innerHTML = `
      <td><span class="delta-type-badge">${escapeHtml(d.type.toUpperCase())}</span></td>
      <td><span class="delta-val-old">${escapeHtml(d.old || "—")}</span></td>
      <td><span class="delta-arrow">➔</span></td>
      <td><span class="delta-val-new">${escapeHtml(d.new || "—")}</span></td>
      <td><span style="font-weight:600; font-size:12px;">${directionIcon}</span></td>
      <td><span style="font-family:var(--font-mono); color:var(--accent-cyan); font-weight:600;">${escapeHtml(d.pct_change || "Direct Value Change")}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// SETUP FILTERS AND SEARCH
function setupFiltersAndSearch() {
  searchInput.addEventListener("input", e => {
    searchQuery = e.target.value.trim();
    renderActiveViews();
  });

  categoryChips.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      categoryChips.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      filterCategory = chip.getAttribute("data-filter");
      renderActiveViews();
    });
  });

  riskChips.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      riskChips.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      filterRisk = chip.getAttribute("data-risk");
      renderActiveViews();
    });
  });
}

// SETUP VIEW TABS
function setupViewTabs() {
  document.querySelectorAll(".view-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".view-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active"));

      tab.classList.add("active");
      const viewKey = tab.getAttribute("data-view");
      activeViewMode = viewKey;

      if (viewKey === "sideBySide") document.getElementById("viewSideBySide").classList.add("active");
      if (viewKey === "unifiedRedline") document.getElementById("viewUnifiedRedline").classList.add("active");
      if (viewKey === "changeMatrix") document.getElementById("viewChangeMatrix").classList.add("active");
      if (viewKey === "deltasLedger") document.getElementById("viewDeltasLedger").classList.add("active");
    });
  });
}

// SETUP EXPORTS
function setupExports() {
  btnExportCsv.addEventListener("click", async () => {
    if (!currentResults) return;
    try {
      const res = await fetch("/api/export/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentResults)
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PolicyLens_Audit_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert("Failed to generate CSV export: " + err.message);
    }
  });

  btnPrintReport.addEventListener("click", () => {
    window.print();
  });
}

// UTILS
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));
}
