import { addHistory, uploadMedia } from "./api.js";
import { ClipPlayer } from "./clip-player.js";
import { getSettings, saveSettings } from "./settings.js";
import { el, showToast } from "./ui.js";

const ACCEPTED_EXTENSIONS = new Set(["mp4", "mov", "avi", "mkv", "webm", "mp3", "wav", "m4a", "ogg"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "m4a", "ogg"]);
const MAX_FILE_SIZE = 200 * 1024 * 1024;

const fileInput = document.querySelector("#media-file");
const uploadZone = document.querySelector("#upload-zone");
const chooseFileButton = document.querySelector("#choose-file");
const selectedFileEl = document.querySelector("#selected-file");
const languageSelect = document.querySelector("#language-select");
const showGlossToggle = document.querySelector("#show-gloss");
const translateButton = document.querySelector("#translate-button");
const uploadProgress = document.querySelector("#upload-progress");
const progressFill = document.querySelector("#progress-fill");
const progressLabel = document.querySelector("#progress-label");
const processingState = document.querySelector("#processing-state");
const resultsSection = document.querySelector("#results-section");
const mediaPreview = document.querySelector("#media-preview");
const transcriptEl = document.querySelector("#transcript");
const copyButton = document.querySelector("#copy-transcript");
const downloadButton = document.querySelector("#download-transcript");
const newUploadButton = document.querySelector("#new-upload");
const player = new ClipPlayer(document.querySelector("#clip-player"));

let selectedFile = null;
let previewUrl = "";
let lastTranscript = "";
let lastSegments = [];
let clipIndexToSegmentIndex = [];
let segmentFirstClipIndex = [];

const settings = getSettings();
languageSelect.value = settings.language;
showGlossToggle.checked = settings.showGloss;

chooseFileButton.addEventListener("click", () => fileInput.click());
uploadZone.addEventListener("click", (event) => {
  if (event.target !== chooseFileButton) {
    fileInput.click();
  }
});
uploadZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener("change", () => setSelectedFile(fileInput.files[0]));

["dragenter", "dragover"].forEach((eventName) => {
  uploadZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadZone.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  uploadZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadZone.classList.remove("drag-over");
  });
});

uploadZone.addEventListener("drop", (event) => {
  setSelectedFile(event.dataTransfer.files[0]);
});

languageSelect.addEventListener("change", () => saveSettings({ language: languageSelect.value }));
showGlossToggle.addEventListener("change", () => {
  saveSettings({ showGloss: showGlossToggle.checked });
  transcriptEl.classList.toggle("hide-gloss", !showGlossToggle.checked);
});

translateButton.addEventListener("click", translateSelectedFile);
copyButton.addEventListener("click", copyTranscript);
downloadButton.addEventListener("click", downloadTranscript);
newUploadButton.addEventListener("click", resetPage);

player.containerEl.addEventListener("clipchange", (event) => {
  const clipIndex = event.detail.index;
  highlightActiveTranscript(clipIndexToSegmentIndex[clipIndex], clipIndex);
});

function setSelectedFile(file) {
  if (!file) {
    return;
  }

  const validationError = validateFile(file);
  if (validationError) {
    showToast(validationError, "error");
    fileInput.value = "";
    return;
  }

  selectedFile = file;
  selectedFileEl.textContent = `${file.name} (${formatBytes(file.size)})`;
  translateButton.disabled = false;
  renderPreview(file);
}

function validateFile(file) {
  const extension = extensionFor(file.name);
  if (!ACCEPTED_EXTENSIONS.has(extension)) {
    return "Unsupported file. Choose MP4, MOV, AVI, MKV, WEBM, MP3, WAV, M4A or OGG.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "File is too large. Please choose media under 200 MB.";
  }

  return "";
}

async function translateSelectedFile() {
  if (!selectedFile) {
    showToast("Choose a media file first.", "warning");
    return;
  }

  setBusy(true);
  setProgress(0);
  uploadProgress.classList.remove("hidden");
  processingState.classList.add("hidden");

  try {
    const result = await uploadMedia(selectedFile, languageSelect.value, (progress) => {
      setProgress(progress);
      if (progress >= 100) {
        processingState.classList.remove("hidden");
      }
    });

    lastTranscript = result.transcript || "";
    lastSegments = normalizeSegments(result);
    buildClipMaps(lastSegments);
    renderTranscript(lastSegments);
    player.load(lastSegments.flatMap((segment) => segment.clips));
    resultsSection.classList.remove("hidden");
    processingState.classList.add("hidden");
    uploadProgress.classList.add("hidden");
    showToast("Media translated successfully.", "success");
    try {
      await addHistory({ mode: "media", input: selectedFile.name, output: lastTranscript });
    } catch (historyError) {
      showToast(historyError.message || "Translated, but history could not be saved.", "warning");
    }
  } catch (error) {
    processingState.classList.add("hidden");
    showToast(error.message || "Transcription failed. Please try again.", "error");
  } finally {
    setBusy(false);
  }
}

function normalizeSegments(result) {
  if (Array.isArray(result.segments) && result.segments.length) {
    return result.segments.map((segment) => ({
      ...segment,
      gloss: Array.isArray(segment.gloss) ? segment.gloss : [],
      clips: Array.isArray(segment.clips) ? segment.clips : [],
    }));
  }

  return [
    {
      start: 0,
      end: 0,
      text: result.transcript || "",
      gloss: Array.isArray(result.gloss) ? result.gloss : [],
      clips: Array.isArray(result.clips) ? result.clips : [],
    },
  ];
}

function buildClipMaps(segments) {
  clipIndexToSegmentIndex = [];
  segmentFirstClipIndex = [];
  let clipIndex = 0;

  segments.forEach((segment, segmentIndex) => {
    segmentFirstClipIndex[segmentIndex] = clipIndex;
    segment.clips.forEach(() => {
      clipIndexToSegmentIndex[clipIndex] = segmentIndex;
      clipIndex += 1;
    });
  });
}

function renderPreview(file) {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }

  previewUrl = URL.createObjectURL(file);
  const extension = extensionFor(file.name);
  const mediaEl = AUDIO_EXTENSIONS.has(extension)
    ? el("audio", { controls: true, src: previewUrl, "aria-label": "Uploaded audio preview" })
    : el("video", { controls: true, src: previewUrl, "aria-label": "Uploaded video preview" });

  mediaPreview.replaceChildren(mediaEl);
}

function renderTranscript(segments) {
  transcriptEl.classList.toggle("hide-gloss", !showGlossToggle.checked);
  transcriptEl.replaceChildren(
    ...segments.map((segment, segmentIndex) => {
      const firstClipIndex = segmentFirstClipIndex[segmentIndex] || 0;
      return el("button", {
        className: "transcript-segment",
        type: "button",
        "data-segment-index": segmentIndex,
        onClick: () => jumpToSegment(segmentIndex),
      }, [
        el("span", { className: "segment-time" }, [`${formatTime(segment.start)} - ${formatTime(segment.end)}`]),
        el("span", { className: "segment-text" }, [segment.text || ""]),
        el("span", { className: "segment-gloss" }, segment.gloss.map((word, wordIndex) =>
          el("span", { className: "gloss-word", "data-clip-index": firstClipIndex + wordIndex }, [word])
        )),
      ]);
    })
  );
}

function jumpToSegment(segmentIndex) {
  const clipIndex = segmentFirstClipIndex[segmentIndex];
  if (clipIndex === undefined) {
    showToast("No sign clips found for this segment.", "warning");
    return;
  }

  player.index = clipIndex;
  player.setCurrentClip();
  player.play();
}

function highlightActiveTranscript(segmentIndex, clipIndex) {
  transcriptEl.querySelectorAll(".transcript-segment").forEach((segmentEl) => {
    segmentEl.classList.toggle("active", Number(segmentEl.dataset.segmentIndex) === segmentIndex);
  });
  transcriptEl.querySelectorAll(".gloss-word").forEach((wordEl) => {
    wordEl.classList.toggle("active", Number(wordEl.dataset.clipIndex) === clipIndex);
  });
}

async function copyTranscript() {
  if (!lastTranscript) {
    showToast("No transcript to copy yet.", "warning");
    return;
  }

  try {
    await navigator.clipboard.writeText(lastTranscript);
    showToast("Transcript copied.", "success");
  } catch (error) {
    showToast("Could not copy transcript.", "error");
  }
}

function downloadTranscript() {
  if (!lastTranscript) {
    showToast("No transcript to download yet.", "warning");
    return;
  }

  const blob = new Blob([buildTranscriptText()], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = el("a", {
    href: url,
    download: `${stripExtension(selectedFile?.name || "transcript")}-transcript.txt`,
  });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildTranscriptText() {
  return lastSegments
    .map((segment) => `[${formatTime(segment.start)} - ${formatTime(segment.end)}] ${segment.text || ""}`)
    .join("\n");
}

function resetPage() {
  selectedFile = null;
  lastTranscript = "";
  lastSegments = [];
  clipIndexToSegmentIndex = [];
  segmentFirstClipIndex = [];
  fileInput.value = "";
  selectedFileEl.textContent = "No file selected";
  translateButton.disabled = true;
  uploadProgress.classList.add("hidden");
  processingState.classList.add("hidden");
  resultsSection.classList.add("hidden");
  transcriptEl.replaceChildren();
  player.clear();
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = "";
  }
  mediaPreview.replaceChildren();
}

function setBusy(isBusy) {
  translateButton.disabled = isBusy || !selectedFile;
  translateButton.textContent = isBusy ? "Translating..." : "Translate";
  fileInput.disabled = isBusy;
  chooseFileButton.disabled = isBusy;
}

function setProgress(progress) {
  const normalizedProgress = Math.max(0, Math.min(Math.round(progress || 0), 100));
  progressFill.style.width = `${normalizedProgress}%`;
  progressLabel.textContent = normalizedProgress >= 100 ? "Upload complete" : `Uploading ${normalizedProgress}%`;
}

function formatTime(seconds = 0) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const remainder = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function extensionFor(fileName = "") {
  return fileName.split(".").pop().toLowerCase();
}

function stripExtension(fileName) {
  return fileName.replace(/\.[^.]+$/, "");
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
