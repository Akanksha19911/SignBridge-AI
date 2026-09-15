import { health, textToSign } from "./api.js";
import { ClipPlayer } from "./clip-player.js";
import { DEFAULT_SETTINGS, getSettings, saveSettings } from "./settings.js";
import { showToast } from "./ui.js";

const form = document.querySelector("#settings-form");
const languageInput = document.querySelector("#default-language");
const themeInput = document.querySelector("#theme");
const clipSpeedInput = document.querySelector("#clip-speed");
const confidenceInput = document.querySelector("#confidence-threshold");
const speechRateInput = document.querySelector("#speech-rate");
const voiceInput = document.querySelector("#voice");
const showGlossInput = document.querySelector("#show-gloss-setting");
const clipSpeedValue = document.querySelector("#clip-speed-value");
const confidenceValue = document.querySelector("#confidence-threshold-value");
const speechRateValue = document.querySelector("#speech-rate-value");
const resetButton = document.querySelector("#reset-settings");
const testVoiceButton = document.querySelector("#test-voice");
const testAvatarButton = document.querySelector("#test-avatar");
const healthEl = document.querySelector("#settings-health");
const player = new ClipPlayer(document.querySelector("#settings-clip-player"));

let voices = [];

form.addEventListener("submit", (event) => {
  event.preventDefault();
  saveCurrentSettings();
  showToast("Settings saved", "success");
});

themeInput.addEventListener("change", () => {
  saveSettings({ theme: themeInput.value });
});

[clipSpeedInput, confidenceInput, speechRateInput].forEach((input) => {
  input.addEventListener("input", renderRangeValues);
});

resetButton.addEventListener("click", () => {
  applyFormValues(DEFAULT_SETTINGS);
  saveSettings(DEFAULT_SETTINGS);
  player.setSpeed(DEFAULT_SETTINGS.clipSpeed);
  showToast("Settings reset to defaults.", "success");
});

testVoiceButton.addEventListener("click", () => speakTestVoice());
testAvatarButton.addEventListener("click", testAvatar);
window.speechSynthesis?.addEventListener("voiceschanged", populateVoices);

applyFormValues(getSettings());
populateVoices();
loadBackendInfo();

function applyFormValues(settings) {
  languageInput.value = settings.language;
  themeInput.value = settings.theme;
  clipSpeedInput.value = settings.clipSpeed;
  confidenceInput.value = settings.confidenceThreshold;
  speechRateInput.value = settings.speechRate;
  voiceInput.value = settings.voiceURI;
  showGlossInput.checked = settings.showGloss;
  renderRangeValues();
}

function currentFormSettings() {
  return {
    language: languageInput.value,
    theme: themeInput.value,
    clipSpeed: Number(clipSpeedInput.value),
    confidenceThreshold: Number(confidenceInput.value),
    speechRate: Number(speechRateInput.value),
    voiceURI: voiceInput.value,
    showGloss: showGlossInput.checked,
  };
}

function saveCurrentSettings() {
  const settings = saveSettings(currentFormSettings());
  player.setSpeed(settings.clipSpeed);
  return settings;
}

function renderRangeValues() {
  clipSpeedValue.textContent = `${Number(clipSpeedInput.value).toFixed(1)}x`;
  confidenceValue.textContent = Number(confidenceInput.value).toFixed(2);
  speechRateValue.textContent = `${Number(speechRateInput.value).toFixed(1)}x`;
}

function populateVoices() {
  voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  const selectedVoice = voiceInput.value || getSettings().voiceURI;
  const options = [new Option("Default voice", "")];
  voices.forEach((voice) => {
    options.push(new Option(`${voice.name} (${voice.lang})`, voice.voiceURI));
  });
  voiceInput.replaceChildren(...options);
  voiceInput.value = voices.some((voice) => voice.voiceURI === selectedVoice) ? selectedVoice : "";
}

function speakTestVoice() {
  if (!window.speechSynthesis) {
    showToast("Speech synthesis is not available in this browser.", "error");
    return;
  }

  const settings = saveCurrentSettings();
  const utterance = new SpeechSynthesisUtterance("Welcome to SignBridge AI");
  utterance.rate = settings.speechRate;
  utterance.lang = "en-IN";
  const voice = selectVoice(settings.voiceURI);
  if (voice) {
    utterance.voice = voice;
  }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

async function testAvatar() {
  const settings = saveCurrentSettings();
  try {
    const result = await textToSign("hello thank you", settings.language);
    player.setSpeed(settings.clipSpeed);
    player.load(result.clips || []);
    player.play();
  } catch (error) {
    showToast(error.message || "Could not test avatar.", "error");
  }
}

async function loadBackendInfo() {
  try {
    const result = await health();
    healthEl.querySelector("strong").textContent = result.status === "ok" || result.status === "online"
      ? "Backend online"
      : `Backend status: ${result.status || "unknown"}`;
    healthEl.querySelector("small").textContent = result.sign_model_loaded
      ? "Sign model ready"
      : "Sign model not trained";
  } catch (error) {
    healthEl.querySelector("strong").textContent = "Backend offline";
    healthEl.querySelector("small").textContent = error.message || "Could not reach backend";
  }
}

function selectVoice(voiceURI) {
  if (voiceURI) {
    const savedVoice = voices.find((voice) => voice.voiceURI === voiceURI);
    if (savedVoice) {
      return savedVoice;
    }
  }
  return voices.find((voice) => voice.lang === "en-IN") || null;
}
