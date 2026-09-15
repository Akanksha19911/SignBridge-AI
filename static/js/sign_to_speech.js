import { addHistory, signSentence } from "./api.js";
import { getSettings } from "./settings.js";
import { SignSession } from "./sign-session.js";
import { el, showToast } from "./ui.js";

const videoEl = document.querySelector("#camera-video");
const canvasEl = document.querySelector("#landmark-canvas");
const startButton = document.querySelector("#start-camera");
const stopButton = document.querySelector("#stop-camera");
const cameraStatus = document.querySelector("#camera-status");
const handsStatus = document.querySelector("#hands-status");
const currentPrediction = document.querySelector("#current-prediction");
const confidenceFill = document.querySelector("#confidence-fill");
const confidenceLabel = document.querySelector("#confidence-label");
const modelBanner = document.querySelector("#model-banner");
const detectedWordsEl = document.querySelector("#detected-words");
const sentenceOutput = document.querySelector("#sentence-output");
const speakButton = document.querySelector("#speak-button");
const clearButton = document.querySelector("#clear-button");
const autoSpeakToggle = document.querySelector("#auto-speak");
const conversationHistory = document.querySelector("#conversation-history");

const settings = getSettings();
const session = new SignSession({
  confidenceThreshold: settings.confidenceThreshold,
  onFrame: ({ handsDetected }) => {
    handsStatus.textContent = `Hands detected: ${handsDetected ? "yes" : "no"}`;
  },
  onPrediction: ({ word, confidence }) => renderPrediction(word, confidence),
  onAccept: (word) => acceptWord(word),
  onModelNotTrained: () => {
    modelBanner.classList.remove("hidden");
    showToast("Sign model not trained yet.", "warning");
  },
  onError: (error) => showToast(error.message || "Could not predict the sign.", "error"),
});

let acceptedWords = [];
let currentSentence = "";
let autoSpeakTimer = 0;
let voices = [];

startButton.addEventListener("click", startCamera);
stopButton.addEventListener("click", stopCamera);
speakButton.addEventListener("click", () => speakAndArchiveCurrent());
clearButton.addEventListener("click", clearCurrent);
window.addEventListener("beforeunload", () => session.stop());

window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
loadVoices();

async function startCamera() {
  try {
    startButton.disabled = true;
    startButton.textContent = "Starting...";
    modelBanner.classList.add("hidden");
    session.setPredictionEnabled(true);
    await session.start(videoEl, canvasEl);
    cameraStatus.textContent = "Camera on";
    stopButton.disabled = false;
    startButton.textContent = "Start";
  } catch (error) {
    startButton.disabled = false;
    startButton.textContent = "Start";
    if (error.name === "NotAllowedError") {
      showToast("Camera permission was denied. Allow camera access in Chrome and try again.", "error");
    } else {
      showToast(error.message || "Could not start the camera.", "error");
    }
  }
}

function stopCamera() {
  session.stop();
  cameraStatus.textContent = "Camera off";
  handsStatus.textContent = "Hands detected: no";
  startButton.disabled = false;
  stopButton.disabled = true;
  resetPredictionDisplay();
}

async function acceptWord(word) {
  acceptedWords.push(word);
  renderAcceptedWords();
  scheduleAutoSpeak();

  try {
    const result = await signSentence(acceptedWords);
    currentSentence = result.text || acceptedWords.join(" ");
    sentenceOutput.textContent = currentSentence;
    speakButton.disabled = !currentSentence;
  } catch (error) {
    currentSentence = acceptedWords.join(" ");
    sentenceOutput.textContent = currentSentence;
    speakButton.disabled = false;
    showToast(error.message || "Could not build the sentence.", "error");
  }
}

function renderAcceptedWords() {
  detectedWordsEl.replaceChildren(
    ...acceptedWords.map((word) => el("span", { className: "word-chip active" }, [word]))
  );
}

function renderPrediction(word, confidence) {
  currentPrediction.textContent = word || "Waiting";
  const percent = Math.round(confidence * 100);
  confidenceFill.style.width = `${Math.max(0, Math.min(percent, 100))}%`;
  confidenceLabel.textContent = `${percent}%`;
}

function resetPredictionDisplay() {
  currentPrediction.textContent = "Waiting";
  confidenceFill.style.width = "0%";
  confidenceLabel.textContent = "0%";
}

function scheduleAutoSpeak() {
  window.clearTimeout(autoSpeakTimer);
  if (!autoSpeakToggle.checked) {
    return;
  }

  autoSpeakTimer = window.setTimeout(() => {
    if (currentSentence) {
      speakAndArchiveCurrent();
    }
  }, 2500);
}

async function speakAndArchiveCurrent() {
  if (!currentSentence || !acceptedWords.length) {
    showToast("No sentence to speak yet.", "warning");
    return;
  }

  window.clearTimeout(autoSpeakTimer);
  const words = [...acceptedWords];
  const sentence = currentSentence;
  speakText(sentence);
  addConversationItem(words, sentence);
  resetCurrentSentence();

  try {
    await addHistory({ mode: "sign-to-speech", input: words.join(" "), output: sentence });
  } catch (error) {
    showToast(error.message || "Spoken, but history could not be saved.", "warning");
  }
}

function addConversationItem(words, sentence) {
  const item = el("div", { className: "conversation-item" }, [
    el("button", {
      className: "btn btn-secondary",
      type: "button",
      "aria-label": "Replay spoken sentence",
      onClick: () => speakText(sentence),
    }, ["Play"]),
    el("div", {}, [
      el("strong", {}, [sentence]),
      el("small", {}, [words.join(" ")]),
    ]),
  ]);
  conversationHistory.prepend(item);
}

function speakText(text) {
  if (!window.speechSynthesis) {
    showToast("Speech synthesis is not available in this browser.", "error");
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = Number(settings.speechRate) || 1;
  utterance.lang = "en-IN";
  const voice = selectVoice();
  if (voice) {
    utterance.voice = voice;
  }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function selectVoice() {
  if (settings.voiceURI) {
    const savedVoice = voices.find((voice) => voice.voiceURI === settings.voiceURI);
    if (savedVoice) {
      return savedVoice;
    }
  }
  return voices.find((voice) => voice.lang === "en-IN") || null;
}

function loadVoices() {
  voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
}

function clearCurrent() {
  window.clearTimeout(autoSpeakTimer);
  resetCurrentSentence();
  conversationHistory.replaceChildren();
  session.resetAcceptance();
}

function resetCurrentSentence() {
  acceptedWords = [];
  currentSentence = "";
  detectedWordsEl.replaceChildren();
  sentenceOutput.textContent = "Accepted signs will appear here.";
  speakButton.disabled = true;
}
