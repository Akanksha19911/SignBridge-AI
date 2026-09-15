const STORAGE_KEY = "signbridge-settings";

export const DEFAULT_SETTINGS = {
  language: "en",
  theme: "light",
  clipSpeed: 1.0,
  confidenceThreshold: 0.8,
  speechRate: 1.0,
  voiceURI: "",
  showGloss: true,
};

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
}

export function getSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch (error) {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(obj) {
  const settings = { ...getSettings(), ...(obj || {}) };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    // Keep runtime behavior steady even when localStorage is blocked.
  }
  applyTheme(settings.theme);
  return settings;
}

applyTheme(getSettings().theme);
