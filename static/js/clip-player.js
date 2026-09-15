import { getSettings } from "./settings.js";
import { el } from "./ui.js";

export class ClipPlayer {
  constructor(containerEl) {
    this.containerEl = containerEl;
    this.clips = [];
    this.index = -1;
    this.isPlaying = false;
    this.fallbackTimer = null;
    this.speed = getSettings().clipSpeed;

    this.video = el("video", {
      muted: true,
      playsinline: true,
      preload: "metadata",
      "aria-label": "Current sign clip",
    });
    this.caption = el("div", { className: "clip-caption", "aria-live": "polite" }, [""]);
    this.strip = el("div", { className: "word-chip-strip", "aria-label": "Queued signs" });
    this.playButton = el("button", { className: "btn btn-primary", type: "button", onClick: () => this.togglePlay() }, ["Play"]);
    this.prevButton = el("button", { className: "btn btn-secondary", type: "button", onClick: () => this.prev() }, ["Previous"]);
    this.nextButton = el("button", { className: "btn btn-secondary", type: "button", onClick: () => this.next() }, ["Next"]);
    this.restartButton = el("button", { className: "btn btn-secondary", type: "button", onClick: () => this.restart() }, ["Restart"]);
    this.speedDisplay = el("span", { className: "speed-display" }, [`${this.speed.toFixed(1)}x`]);

    this.stage = el("div", { className: "clip-player-stage video-frame" }, [this.video]);
    this.controls = el("div", { className: "clip-controls" }, [
      this.playButton,
      this.prevButton,
      this.nextButton,
      this.restartButton,
      this.speedDisplay,
    ]);

    this.containerEl.classList.add("clip-player");
    this.containerEl.replaceChildren(this.stage, this.caption, this.strip, this.controls);

    this.video.addEventListener("ended", () => this.next());
    this.video.addEventListener("error", () => this.showFallbackAndContinue());
    this.render();
  }

  load(clips = []) {
    this.clear();
    this.clips = Array.isArray(clips) ? [...clips] : [];
    this.index = this.clips.length ? 0 : -1;
    this.isPlaying = false;
    this.render();
    this.setCurrentClip();
  }

  enqueue(clips = []) {
    const nextClips = Array.isArray(clips) ? clips : [];
    const wasIdle = this.clips.length === 0 || this.index === -1;
    this.clips.push(...nextClips);

    if (wasIdle && this.clips.length) {
      this.index = 0;
      this.render();
      this.setCurrentClip();
      this.play();
    } else {
      this.render();
    }
  }

  play() {
    if (!this.clips.length) {
      return;
    }

    if (this.index < 0) {
      this.index = 0;
      this.setCurrentClip();
    }

    this.isPlaying = true;
    this.playButton.textContent = "Pause";
    this.video.playbackRate = this.speed;
    const playPromise = this.video.play();
    if (playPromise) {
      playPromise.catch(() => this.showFallbackAndContinue());
    }
  }

  pause() {
    this.isPlaying = false;
    this.playButton.textContent = "Play";
    this.video.pause();
    window.clearTimeout(this.fallbackTimer);
  }

  next() {
    if (!this.clips.length) {
      return;
    }

    if (this.index >= this.clips.length - 1) {
      const wasPlaying = this.isPlaying;
      this.pause();
      this.index = this.clips.length - 1;
      this.render();
      if (wasPlaying) {
        this.containerEl.dispatchEvent(new CustomEvent("queueend"));
      }
      return;
    }

    this.index += 1;
    this.setCurrentClip();
    if (this.isPlaying) {
      this.play();
    }
  }

  prev() {
    if (!this.clips.length) {
      return;
    }

    this.index = Math.max(0, this.index - 1);
    this.setCurrentClip();
    if (this.isPlaying) {
      this.play();
    }
  }

  restart() {
    if (!this.clips.length) {
      return;
    }

    this.index = 0;
    this.setCurrentClip();
    this.play();
  }

  clear() {
    window.clearTimeout(this.fallbackTimer);
    this.clips = [];
    this.index = -1;
    this.isPlaying = false;
    this.video.removeAttribute("src");
    this.video.load();
    this.render();
  }

  setSpeed(rate) {
    const nextRate = Number(rate) || 1;
    this.speed = Math.max(0.25, Math.min(nextRate, 3));
    this.video.playbackRate = this.speed;
    this.speedDisplay.textContent = `${this.speed.toFixed(1)}x`;
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  setCurrentClip() {
    window.clearTimeout(this.fallbackTimer);
    const clip = this.clips[this.index];
    if (!clip) {
      this.render();
      return;
    }

    this.video.removeAttribute("src");
    this.video.src = clip.url || "";
    this.video.playbackRate = this.speed;
    this.video.load();
    this.render();
    this.containerEl.dispatchEvent(new CustomEvent("clipchange", { detail: { index: this.index, clip } }));
  }

  render() {
    const clip = this.clips[this.index];

    if (!this.clips.length) {
      this.stage.replaceChildren(el("div", { className: "empty-state" }, ["Signs will appear here"]));
      this.caption.textContent = "";
      this.strip.replaceChildren();
      this.playButton.textContent = "Play";
      this.setButtonsDisabled(true);
      return;
    }

    if (!this.stage.contains(this.video)) {
      this.stage.replaceChildren(this.video);
    }

    this.caption.textContent = clip ? this.labelForClip(clip) : "";
    this.strip.replaceChildren(
      ...this.clips.map((queuedClip, queuedIndex) =>
        el("span", { className: `word-chip ${queuedIndex === this.index ? "active" : ""}` }, [this.labelForClip(queuedClip)])
      )
    );
    this.playButton.textContent = this.isPlaying ? "Pause" : "Play";
    this.setButtonsDisabled(false);
    this.speedDisplay.textContent = `${this.speed.toFixed(1)}x`;
  }

  setButtonsDisabled(disabled) {
    [this.playButton, this.prevButton, this.nextButton, this.restartButton].forEach((button) => {
      button.disabled = disabled;
    });
  }

  labelForClip(clip) {
    if (clip?.type === "letter" && clip.letter) {
      return `${clip.word || "LETTER"} (${clip.letter})`;
    }
    return clip?.word || "";
  }

  showFallbackAndContinue() {
    const clip = this.clips[this.index];
    if (!clip || !this.isPlaying) {
      return;
    }

    this.stage.replaceChildren(el("div", { className: "empty-state" }, [this.labelForClip(clip)]));
    window.clearTimeout(this.fallbackTimer);
    this.fallbackTimer = window.setTimeout(() => {
      if (this.isPlaying) {
        this.next();
      }
    }, 1000);
  }
}
