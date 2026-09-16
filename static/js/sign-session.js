import { predictSign } from "./api.js";
import { HandTracker } from "./hand-tracker.js";

export class SignSession {
  constructor({ confidenceThreshold = 0.8, onFrame, onPrediction, onAccept, onModelNotTrained, onError, onState } = {}) {
    this.confidenceThreshold = confidenceThreshold;
    this.onFrame = onFrame || (() => {});
    this.onPrediction = onPrediction || (() => {});
    this.onAccept = onAccept || (() => {});
    this.onModelNotTrained = onModelNotTrained || (() => {});
    this.onError = onError || (() => {});
    this.onState = onState || (() => {});
    this.tracker = new HandTracker({
      onFrame: (event) => this.handleFrame(event),
      onError: (error) => this.onError(error),
    });
    this.frameCount = 0;
    this.predictionBusy = false;
    this.predictionsDisabled = false;
    this.predictionEnabled = true;
    this.cameraOn = false;
    this.lastPredictionWord = "";
    this.repeatedPredictions = 0;
    this.lastAcceptedWord = "";
    this.cooldownUntil = 0;
  }

  async start(videoEl, canvasEl) {
    this.predictionsDisabled = false;
    this.frameCount = 0;
    await this.tracker.start(videoEl, canvasEl);
    this.cameraOn = true;
    this.emitState();
  }

  stop() {
    this.tracker.stop();
    this.cameraOn = false;
    this.emitState();
  }

  setPredictionEnabled(enabled) {
    this.predictionEnabled = enabled;
    this.emitState();
  }

  resetAcceptance() {
    this.lastPredictionWord = "";
    this.repeatedPredictions = 0;
    this.lastAcceptedWord = "";
    this.cooldownUntil = 0;
  }

  handleFrame(event) {
    this.frameCount += 1;
    this.onFrame(event);

    if (
      !this.predictionEnabled ||
      this.predictionsDisabled ||
      this.predictionBusy ||
      this.frameCount % 10 !== 0
    ) {
      return;
    }

    const buffer = this.tracker.getBuffer();
    if (buffer.length === 30 && this.tracker.getRecentHandsDetectedCount() >= 20) {
      this.requestPrediction(buffer);
    }
  }

  async requestPrediction(buffer) {
    if (Date.now() < this.cooldownUntil) {
      return;
    }

    this.predictionBusy = true;
    try {
      const result = await predictSign(buffer);
      const word = String(result.word || "").toUpperCase();
      const confidence = Number(result.confidence) || 0;
      this.onPrediction({ word, confidence });

      if (word && word === this.lastPredictionWord) {
        this.repeatedPredictions += 1;
      } else {
        this.lastPredictionWord = word;
        this.repeatedPredictions = 1;
      }

      if (
        word &&
        confidence >= this.confidenceThreshold &&
        this.repeatedPredictions >= 2 &&
        word !== this.lastAcceptedWord
      ) {
        this.lastAcceptedWord = word;
        this.cooldownUntil = Date.now() + 1000;
        this.onAccept(word);
      }
    } catch (error) {
      if (error.status === 503) {
        this.predictionsDisabled = true;
        this.onModelNotTrained(error);
      } else {
        this.onError(error);
      }
    } finally {
      this.predictionBusy = false;
    }
  }

  emitState() {
    this.onState({
      cameraOn: this.cameraOn,
      predictionEnabled: this.predictionEnabled,
      predictionsDisabled: this.predictionsDisabled,
    });
  }
}
