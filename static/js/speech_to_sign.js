import { addHistory, textToSign } from "./api.js";
import { ClipPlayer } from "./clip-player.js";
import { getSettings, saveSettings } from "./settings.js";
import { isSpeechRecognitionSupported, SpeechListener } from "./speech-listener.js";
import { el, showToast } from "./ui.js";

const micButton = document.querySelector("#mic-button");
const micButtonLabel = document.querySelector("#mic-button-label");
const micDot = document.querySelector("#mic-dot");
const pauseButton = document.querySelector("#pause-button");
const clearButton = document.querySelector("#clear-button");
const languageSelect = document.querySelector("#speech-language");
const supportMessage = document.querySelector("#speech-support-message");
const interimText = document.querySelector("#interim-text");
const typedSentence = document.querySelector("#typed-sentence");
const sendTextButton = document.querySelector("#send-text");
const sentenceList = document.querySelector("#sentence-list");
const player = new ClipPlayer(document.querySelector("#clip-player"));

const settings = getSettings();
languageSelect.value = settings.language;

let listenerState = { active: false, listening: false, paused: false, supported: isSpeechRecognitionSupported() };
const listener = new SpeechListener({
  onFinal: handleFinalSentence,
  onInterim: renderInterim,
  onError: (error) => showToast(error.message, "error"),
  onState: (state) => {
    listenerState = state;
    renderMicState();
  },
});

if (!isSpeechRecognitionSupported()) {
  supportMessage.classList.remove("hidden");
  micButton.disabled = true;
  pauseButton.disabled = true;
}

micButton.addEventListener("click", () => {
  if (listenerState.listening) {
    stopListening();
  } else {
    startListening();
  }
});

pauseButton.addEventListener("click", () => {
  if (listenerState.paused) {
    resumeListening();
  } else {
    pauseListening();
  }
});

clearButton.addEventListener("click", clearSession);
sendTextButton.addEventListener("click", sendTypedSentence);
typedSentence.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    sendTypedSentence();
  }
});

languageSelect.addEventListener("change", () => {
  saveSettings({ language: languageSelect.value });
  listener.setLanguage(languageSelect.value);
});

window.addEventListener("beforeunload", () => listener.destroy());

function startListening() {
  try {
    listener.start(languageSelect.value);
    interimText.textContent = "Listening...";
  } catch (error) {
    showToast(error.message, "warning");
  }
}

function stopListening() {
  listener.stop();
  interimText.textContent = "Stopped";
}

function pauseListening() {
  listener.pause();
  player.pause();
  interimText.textContent = "Paused";
}

function resumeListening() {
  listener.resume(languageSelect.value);
  player.play();
  interimText.textContent = "Listening...";
}

async function handleFinalSentence(text) {
  const bubble = renderSentenceBubble(text);
  interimText.textContent = "Listening...";
  interimText.classList.remove("has-interim");

  try {
    const result = await textToSign(text, languageSelect.value);
    const gloss = Array.isArray(result.gloss) ? result.gloss : [];
    bubble.querySelector(".bubble-gloss").replaceChildren(
      ...gloss.map((word) => el("span", { className: "gloss-word" }, [word]))
    );
    if (Array.isArray(result.clips) && result.clips.length) {
      player.enqueue(result.clips);
      if (listenerState.paused) {
        player.pause();
      }
    }

    try {
      await addHistory({ mode: "speech-to-sign", input: text, output: gloss.join(" ") });
    } catch (historyError) {
      showToast(historyError.message || "Sentence translated, but history could not be saved.", "warning");
    }
  } catch (error) {
    bubble.classList.add("error");
    bubble.querySelector(".bubble-gloss").textContent = "Could not translate this sentence.";
    showToast(error.message || "Speech translation failed.", "error");
  }
}

function renderSentenceBubble(text) {
  const bubble = el("div", { className: "speech-bubble" }, [
    el("div", { className: "bubble-meta" }, [formatTime(new Date())]),
    el("p", {}, [text]),
    el("div", { className: "bubble-gloss" }, [el("span", { className: "badge" }, ["Translating..."])]),
  ]);
  sentenceList.append(bubble);
  bubble.scrollIntoView({ block: "nearest" });
  return bubble;
}

function renderInterim(text) {
  interimText.textContent = text || "Listening...";
  interimText.classList.toggle("has-interim", Boolean(text));
}

function sendTypedSentence() {
  const text = typedSentence.value.trim();
  if (!text) {
    showToast("Type a sentence first.", "warning");
    return;
  }

  typedSentence.value = "";
  handleFinalSentence(text);
}

function clearSession() {
  sentenceList.replaceChildren();
  interimText.textContent = listenerState.active ? "Listening..." : "Waiting for speech...";
  interimText.classList.remove("has-interim");
  player.clear();
}

function renderMicState() {
  const active = listenerState.active;
  micButtonLabel.textContent = active ? "Stop" : "Start";
  micButton.setAttribute("aria-label", active ? "Stop microphone" : "Start microphone");
  micButton.classList.toggle("active", active);
  micDot.classList.toggle("hidden", !active);
  pauseButton.disabled = !listenerState.supported || (!listenerState.listening && !listenerState.paused);
  pauseButton.textContent = listenerState.paused ? "Resume" : "Pause";
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
