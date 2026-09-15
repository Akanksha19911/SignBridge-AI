import { clearHistory, getHistory, textToSign } from "./api.js";
import { ClipPlayer } from "./clip-player.js";
import { getSettings } from "./settings.js";
import { el, showToast } from "./ui.js";

const MODE_LABELS = {
  media: "Media",
  "speech-to-sign": "Speech to Sign",
  "sign-to-speech": "Sign to Speech",
  conversation: "Conversation",
};

const MODE_ICONS = {
  media: "play",
  "speech-to-sign": "wave",
  "sign-to-speech": "hand",
  conversation: "chat",
};

const listEl = document.querySelector("#history-list");
const searchInput = document.querySelector("#history-search");
const tabsEl = document.querySelector("#mode-tabs");
const clearButton = document.querySelector("#clear-history");
const confirmDialog = document.querySelector("#confirm-clear");
const confirmYes = document.querySelector("#confirm-clear-yes");
const confirmNo = document.querySelector("#confirm-clear-no");
const modal = document.querySelector("#isl-modal");
const closeModalButton = document.querySelector("#close-isl-modal");
const player = new ClipPlayer(document.querySelector("#history-clip-player"));

let entries = [];
let activeMode = "all";

searchInput.addEventListener("input", renderHistory);
tabsEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-mode]");
  if (!button) {
    return;
  }
  activeMode = button.dataset.mode;
  tabsEl.querySelectorAll(".tab-button").forEach((tab) => {
    const active = tab === button;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  renderHistory();
});

clearButton.addEventListener("click", () => confirmDialog.classList.remove("hidden"));
confirmNo.addEventListener("click", () => confirmDialog.classList.add("hidden"));
confirmYes.addEventListener("click", clearAllHistory);
closeModalButton.addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

loadHistory();

async function loadHistory() {
  try {
    entries = normalizeEntries(await getHistory());
    renderHistory();
  } catch (error) {
    showToast(error.message || "Could not load history.", "error");
    renderEmpty("History could not be loaded.");
  }
}

function normalizeEntries(rawEntries) {
  return [...(Array.isArray(rawEntries) ? rawEntries : [])]
    .map((entry, index) => ({
      id: entry.id || `${entry.mode || "entry"}-${index}`,
      mode: entry.mode || "media",
      input: String(entry.input || ""),
      output: String(entry.output || ""),
      created_at: entry.created_at || entry.timestamp || entry.time || "",
    }))
    .sort((a, b) => timestampFor(b) - timestampFor(a));
}

function renderHistory() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = entries.filter((entry) => {
    const modeMatches = activeMode === "all" || entry.mode === activeMode;
    const textMatches = !query || `${entry.input} ${entry.output}`.toLowerCase().includes(query);
    return modeMatches && textMatches;
  });

  if (!filtered.length) {
    renderEmpty(entries.length ? "No history entries match this filter." : "No history yet.");
    return;
  }

  listEl.replaceChildren(...filtered.map(renderEntry));
}

function renderEntry(entry) {
  const outputNode = entry.output.length > 220
    ? el("details", { className: "expandable-text" }, [
      el("summary", {}, [entry.output.slice(0, 180), "..."]),
      el("p", {}, [entry.output]),
    ])
    : el("p", { className: "history-output" }, [entry.output || "No output saved"]);

  return el("article", { className: "card history-card" }, [
    el("div", { className: "history-card-header" }, [
      el("div", { className: "history-mode" }, [
        iconTile(MODE_ICONS[entry.mode] || "chat"),
        el("span", { className: "badge" }, [MODE_LABELS[entry.mode] || entry.mode]),
      ]),
      el("time", { datetime: entry.created_at || "" }, [relativeTime(entry.created_at)]),
    ]),
    el("div", { className: "history-section" }, [
      el("span", { className: "history-label" }, ["Input"]),
      el("p", {}, [entry.input || "No input saved"]),
    ]),
    el("div", { className: "history-section" }, [
      el("span", { className: "history-label" }, ["Output"]),
      outputNode,
    ]),
    el("div", { className: "control-row" }, [
      el("button", { className: "btn btn-secondary", type: "button", onClick: () => copyEntry(entry) }, ["Copy"]),
      el("button", { className: "btn btn-primary", type: "button", onClick: () => playEntry(entry) }, ["Play in ISL"]),
    ]),
  ]);
}

function iconTile(name) {
  const paths = {
    play: ["M4 6h16v12H4z", "m10 9 5 3-5 3z"],
    wave: ["M12 3v18", "M8 7v10", "M4 10v4", "M16 7v10", "M20 10v4"],
    hand: ["M7 11v2a5 5 0 0 0 10 0v-2", "M12 18v3", "M8 21h8", "M9 5a3 3 0 0 1 6 0v8a3 3 0 0 1-6 0z"],
    chat: ["M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z", "M8 10h8", "M8 14h5"],
  };
  return el("span", { className: "history-icon", "aria-hidden": "true" }, [
    el("svg", { viewBox: "0 0 24 24" }, paths[name].map((d) => el("path", { d }))),
  ]);
}

function renderEmpty(message) {
  listEl.replaceChildren(el("div", { className: "empty-state" }, [
    el("svg", { viewBox: "0 0 48 48", "aria-hidden": "true" }, [
      el("path", { d: "M12 14h24v24H12z" }),
      el("path", { d: "M17 10h14" }),
      el("path", { d: "M18 22h12" }),
      el("path", { d: "M18 29h8" }),
    ]),
    el("strong", {}, [message]),
    el("p", {}, ["Saved translations will appear here after you use a mode."]),
  ]));
}

async function copyEntry(entry) {
  try {
    await navigator.clipboard.writeText(entry.output || entry.input);
    showToast("Copied history output.", "success");
  } catch (error) {
    showToast("Could not copy this entry.", "error");
  }
}

async function playEntry(entry) {
  const text = entry.output || entry.input;
  if (!text.trim()) {
    showToast("This entry has no text to play.", "warning");
    return;
  }

  modal.classList.remove("hidden");
  try {
    const result = await textToSign(text, getSettings().language);
    player.load(result.clips || []);
    player.play();
  } catch (error) {
    showToast(error.message || "Could not load ISL playback.", "error");
  }
}

function closeModal() {
  player.clear();
  modal.classList.add("hidden");
}

async function clearAllHistory() {
  try {
    await clearHistory();
    entries = [];
    confirmDialog.classList.add("hidden");
    renderHistory();
    showToast("History cleared.", "success");
  } catch (error) {
    showToast(error.message || "Could not clear history.", "error");
  }
}

function timestampFor(entry) {
  const value = Date.parse(entry.created_at || "");
  return Number.isNaN(value) ? 0 : value;
}

function formatTimestamp(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return "Unknown time";
  }
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function relativeTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) {
    return "Just now";
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }
  const days = Math.round(hours / 24);
  return days < 7 ? `${days} days ago` : formatTimestamp(value);
}
