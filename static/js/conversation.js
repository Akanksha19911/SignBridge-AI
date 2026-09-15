import { addHistory, signSentence, textToSign } from "./api.js";
import { ClipPlayer } from "./clip-player.js";
import { getSettings, saveSettings } from "./settings.js";
import { SignSession } from "./sign-session.js";
import { isSpeechRecognitionSupported, SpeechListener } from "./speech-listener.js";
import { el, showToast } from "./ui.js";

const languageSelect = document.querySelector("#person-a-language");
const turnToggle = document.querySelector("#turn-toggle");
const turnALabel = document.querySelector("#turn-a-label");
const turnBLabel = document.querySelector("#turn-b-label");
const autoSwitchToggle = document.querySelector("#auto-switch");
const endButton = document.querySelector("#end-conversation");
const downloadButton = document.querySelector("#download-conversation");
const supportMessage = document.querySelector("#speech-support-message");
const modelBanner = document.querySelector("#conversation-model-banner");
const micStatus = document.querySelector("#mic-status");
const personAPanel = document.querySelector("#person-a-panel");
const personBPanel = document.querySelector("#person-b-panel");
const personAInterim = document.querySelector("#person-a-interim");
const chatTimeline = document.querySelector("#chat-timeline");
const doneSigningButton = document.querySelector("#done-signing");
const videoEl = document.querySelector("#conversation-video");
const canvasEl = document.querySelector("#conversation-canvas");
const cameraStatus = document.querySelector("#camera-status");
const cameraStage = document.querySelector(".conversation-camera");
const handsStatus = document.querySelector("#hands-status");
const detectedWordsEl = document.querySelector("#detected-words");
const player = new ClipPlayer(document.querySelector("#conversation-player"));

const settings = getSettings();
languageSelect.value = settings.language;

let turn = "";
let cameraStarted = false;
let ended = false;
let messages = [];
let bWords = [];
let bPauseTimer = 0;
let voices = [];
let listenerState = { active: false, listening: false, paused: false, supported: isSpeechRecognitionSupported() };

const listener = new SpeechListener({
  onFinal: (text) => {
    if (turn === "a" && !ended) {
      handlePersonAFinal(text);
    }
  },
  onInterim: (text) => {
    personAInterim.textContent = text || (turn === "a" ? "Listening..." : "Mic paused while Person B signs");
    personAInterim.classList.toggle("has-interim", Boolean(text));
  },
  onError: (error) => showToast(error.message, "error"),
  onState: (state) => {
    listenerState = state;
    renderMicStatus();
  },
});

const signSession = new SignSession({
  confidenceThreshold: settings.confidenceThreshold,
  onFrame: ({ handsDetected }) => {
    handsStatus.textContent = `Hands detected: ${handsDetected ? "yes" : "no"}`;
    cameraStage.classList.toggle("hands-detected", handsDetected);
  },
  onPrediction: () => {},
  onAccept: (word) => handlePersonBWord(word),
  onModelNotTrained: () => {
    modelBanner.classList.remove("hidden");
    showToast("Sign model not trained yet.", "warning");
  },
  onError: (error) => showToast(error.message || "Could not predict the sign.", "error"),
});

if (!isSpeechRecognitionSupported()) {
  supportMessage.classList.remove("hidden");
}

turnToggle.addEventListener("click", () => switchTurn(turn === "a" ? "b" : "a"));
languageSelect.addEventListener("change", () => {
  saveSettings({ language: languageSelect.value });
  listener.setLanguage(languageSelect.value);
});
doneSigningButton.addEventListener("click", () => finishPersonBSigning());
endButton.addEventListener("click", endConversation);
downloadButton.addEventListener("click", downloadTranscript);
player.containerEl.addEventListener("queueend", () => {
  if (turn === "a" && autoSwitchToggle.checked && !ended) {
    switchTurn("b");
  }
});
document.addEventListener("keydown", (event) => {
  const typing = event.target.closest("input, textarea, select, button");
  if (event.code === "Space" && !typing) {
    event.preventDefault();
    switchTurn(turn === "a" ? "b" : "a");
  }
});
window.addEventListener("beforeunload", cleanup);
window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
loadVoices();

switchTurn("a");

async function switchTurn(nextTurn) {
  if (ended || turn === nextTurn) {
    renderTurn();
    return;
  }

  turn = nextTurn;
  renderTurn();

  if (turn === "a") {
    window.clearTimeout(bPauseTimer);
    signSession.setPredictionEnabled(false);
    listenerStart();
    personAInterim.textContent = "Listening...";
  } else {
    listener.stop();
    personAInterim.textContent = "Mic paused while Person B signs";
    signSession.setPredictionEnabled(true);
    await ensureCameraStarted();
  }
}

async function handlePersonAFinal(text) {
  personAInterim.textContent = "Listening...";
  try {
    const result = await textToSign(text, languageSelect.value);
    const gloss = Array.isArray(result.gloss) ? result.gloss : [];
    addMessage({
      speaker: "a",
      label: "Spoken",
      text,
      gloss,
    });

    if (Array.isArray(result.clips) && result.clips.length) {
      player.enqueue(result.clips);
    } else if (autoSwitchToggle.checked) {
      switchTurn("b");
    }
  } catch (error) {
    showToast(error.message || "Could not translate Person A's speech.", "error");
  }
}

function handlePersonBWord(word) {
  if (turn !== "b") {
    return;
  }

  bWords.push(word);
  renderBWords();
  scheduleBPause();
}

function scheduleBPause() {
  window.clearTimeout(bPauseTimer);
  bPauseTimer = window.setTimeout(() => finishPersonBSigning(), 2500);
}

async function finishPersonBSigning() {
  window.clearTimeout(bPauseTimer);
  if (turn !== "b" || !bWords.length) {
    return;
  }

  const words = [...bWords];
  try {
    const result = await signSentence(words);
    const sentence = result.text || words.join(" ");
    addMessage({
      speaker: "b",
      label: "Signed",
      text: sentence,
      words,
    });
    resetBWords();
    speakText(sentence, () => {
      if (autoSwitchToggle.checked && !ended) {
        switchTurn("a");
      }
    });
  } catch (error) {
    showToast(error.message || "Could not build Person B's sentence.", "error");
  }
}

function addMessage(message) {
  messages.push({ ...message, time: new Date() });
  renderMessages();
}

function renderMessages() {
  chatTimeline.replaceChildren(
    ...messages.map((message) => {
      const meta = `${message.label} - ${formatTime(message.time)}`;
      const body = [
        el("span", { className: "chat-label" }, [meta]),
        el("p", {}, [message.text]),
      ];

      if (message.gloss?.length) {
        body.push(el("div", { className: "bubble-gloss" }, message.gloss.map((word) =>
          el("span", { className: "gloss-word" }, [word])
        )));
      }

      if (message.words?.length) {
        body.push(el("small", {}, [message.words.join(" ")]));
      }

      return el("div", { className: `chat-message ${message.speaker === "a" ? "from-a" : "from-b"}` }, [
        el("div", { className: "chat-bubble" }, body),
      ]);
    })
  );
  chatTimeline.scrollTop = chatTimeline.scrollHeight;
}

function renderBWords() {
  detectedWordsEl.replaceChildren(
    ...bWords.map((word) => el("span", { className: "word-chip active" }, [word]))
  );
}

function resetBWords() {
  bWords = [];
  detectedWordsEl.replaceChildren();
  signSession.resetAcceptance();
}

async function ensureCameraStarted() {
  if (cameraStarted) {
    cameraStatus.textContent = "Camera on";
    return;
  }

  try {
    cameraStatus.textContent = "Camera starting";
    await signSession.start(videoEl, canvasEl);
    cameraStarted = true;
    cameraStatus.textContent = "Camera on";
  } catch (error) {
    cameraStatus.textContent = "Camera off";
    if (error.name === "NotAllowedError") {
      showToast("Camera permission was denied. Allow camera access in Chrome and try again.", "error");
    } else {
      showToast(error.message || "Could not start Person B's camera.", "error");
    }
  }
}

function listenerStart() {
  if (!isSpeechRecognitionSupported()) {
    showToast("Please use Google Chrome for live speech", "warning");
    return;
  }

  try {
    listener.start(languageSelect.value);
  } catch (error) {
    showToast(error.message, "warning");
  }
}

async function endConversation() {
  ended = true;
  cleanup();
  turnToggle.disabled = true;
  doneSigningButton.disabled = true;
  endButton.disabled = true;
  downloadButton.classList.remove("hidden");

  const transcript = buildTranscript();
  try {
    await addHistory({ mode: "conversation", input: "A/B conversation", output: transcript });
    showToast("Conversation saved.", "success");
  } catch (error) {
    showToast(error.message || "Conversation ended, but history could not be saved.", "warning");
  }
}

function downloadTranscript() {
  const blob = new Blob([buildTranscript()], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = el("a", { href: url, download: "conversation-transcript.txt" });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildTranscript() {
  if (!messages.length) {
    return "Conversation ended with no messages.";
  }

  return messages.map((message) => {
    const who = message.speaker === "a" ? "Person A" : "Person B";
    const parts = [`[${formatTime(message.time)}] ${who} (${message.label}): ${message.text}`];
    if (message.gloss?.length) {
      parts.push(`Gloss: ${message.gloss.join(" ")}`);
    }
    if (message.words?.length) {
      parts.push(`Signs: ${message.words.join(" ")}`);
    }
    return parts.join("\n");
  }).join("\n\n");
}

function renderTurn() {
  turnToggle.classList.toggle("person-b", turn === "b");
  turnALabel.classList.toggle("active", turn === "a");
  turnBLabel.classList.toggle("active", turn === "b");
  personAPanel.classList.toggle("active-turn", turn === "a");
  personAPanel.classList.toggle("inactive-turn", turn !== "a");
  personBPanel.classList.toggle("active-turn", turn === "b");
  personBPanel.classList.toggle("inactive-turn", turn !== "b");
  doneSigningButton.disabled = turn !== "b";
  renderMicStatus();
}

function renderMicStatus() {
  micStatus.textContent = listenerState.active && turn === "a" ? "Mic on" : "Mic off";
}

function speakText(text, onEnd = () => {}) {
  if (!window.speechSynthesis) {
    showToast("Speech synthesis is not available in this browser.", "error");
    onEnd();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = Number(settings.speechRate) || 1;
  utterance.lang = "en-IN";
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
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

function cleanup() {
  window.clearTimeout(bPauseTimer);
  listener.stop();
  signSession.stop();
  player.pause();
  window.speechSynthesis?.cancel();
  cameraStarted = false;
  cameraStatus.textContent = "Camera off";
  handsStatus.textContent = "Hands detected: no";
  cameraStage.classList.remove("hands-detected");
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
