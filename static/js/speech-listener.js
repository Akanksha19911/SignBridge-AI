const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const LANGUAGE_TO_RECOGNITION = {
  en: "en-IN",
  hi: "hi-IN",
};

export function isSpeechRecognitionSupported() {
  return Boolean(SpeechRecognition);
}

export class SpeechListener {
  constructor({ onFinal, onInterim, onError, onState } = {}) {
    this.onFinal = onFinal || (() => {});
    this.onInterim = onInterim || (() => {});
    this.onError = onError || (() => {});
    this.onState = onState || (() => {});
    this.recognition = SpeechRecognition ? new SpeechRecognition() : null;
    this.language = "en";
    this.shouldListen = false;
    this.isPaused = false;
    this.isRunning = false;

    if (this.recognition) {
      this.configureRecognition();
    }
  }

  start(language = this.language) {
    if (!this.recognition) {
      throw new Error("Please use Google Chrome for live speech");
    }

    this.language = language;
    this.shouldListen = true;
    this.isPaused = false;
    this.startRecognition();
    this.emitState();
  }

  stop() {
    this.shouldListen = false;
    this.isPaused = false;
    this.stopRecognition();
    this.emitState();
  }

  pause() {
    this.isPaused = true;
    this.stopRecognition();
    this.emitState();
  }

  resume(language = this.language) {
    if (!this.recognition) {
      return;
    }

    this.language = language;
    this.shouldListen = true;
    this.isPaused = false;
    this.startRecognition();
    this.emitState();
  }

  setLanguage(language) {
    this.language = language;
    if (this.recognition) {
      this.recognition.lang = this.recognitionLanguage();
    }
  }

  destroy() {
    this.stop();
    if (this.recognition) {
      this.recognition.onstart = null;
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;
    }
  }

  configureRecognition() {
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.recognitionLanguage();

    this.recognition.onstart = () => {
      this.isRunning = true;
      this.emitState();
    };

    this.recognition.onresult = (event) => {
      let interim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0].transcript.trim();
        if (!text) {
          continue;
        }

        if (result.isFinal) {
          this.onFinal(text);
        } else {
          interim += `${text} `;
        }
      }

      this.onInterim(interim.trim());
    };

    this.recognition.onerror = (event) => {
      const error = new Error(event.error === "not-allowed"
        ? "Microphone permission was denied. Allow mic access in Chrome and try again."
        : `Speech recognition error: ${event.error}`);
      error.speechError = event.error;

      if (event.error === "not-allowed") {
        this.shouldListen = false;
        this.isPaused = false;
      }

      if (event.error !== "no-speech") {
        this.onError(error);
      }
      this.emitState();
    };

    this.recognition.onend = () => {
      this.isRunning = false;
      this.emitState();

      if (this.shouldListen && !this.isPaused) {
        window.setTimeout(() => {
          if (this.shouldListen && !this.isPaused && !this.isRunning) {
            this.startRecognition();
          }
        }, 250);
      }
    };
  }

  startRecognition() {
    if (!this.recognition || this.isRunning) {
      return;
    }

    this.recognition.lang = this.recognitionLanguage();
    try {
      this.recognition.start();
    } catch (error) {
      this.onError(new Error("Could not start speech recognition. Please try again."));
    }
  }

  stopRecognition() {
    if (!this.recognition || !this.isRunning) {
      return;
    }

    try {
      this.recognition.stop();
    } catch (error) {
      this.isRunning = false;
    }
  }

  recognitionLanguage() {
    return LANGUAGE_TO_RECOGNITION[this.language] || "en-IN";
  }

  emitState() {
    this.onState({
      active: this.shouldListen && !this.isPaused,
      listening: this.shouldListen,
      paused: this.isPaused,
      running: this.isRunning,
      supported: Boolean(this.recognition),
    });
  }
}
