export const MOCK = true;

const MOCK_DELAY = 600;
const PREDICTIONS = ["HELLO", "REGISTRATION", "DESK", "WHERE"];
let predictionIndex = 0;

function delay(ms = MOCK_DELAY) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clipForWord(word) {
  const cleanWord = String(word).trim().toUpperCase();
  return {
    word: cleanWord,
    type: "sign",
    url: `/static/signs/${encodeURIComponent(cleanWord.toLowerCase())}.mp4`,
  };
}

function glossFromText(text) {
  const stopWords = new Set(["IS", "THE", "A"]);
  return String(text)
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !stopWords.has(word));
}

async function parseJsonResponse(response) {
  let body = {};
  try {
    body = await response.json();
  } catch (error) {
    body = {};
  }

  if (!response.ok) {
    throw new Error(body.error || `Request failed with status ${response.status}`);
  }

  return body;
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  return parseJsonResponse(response);
}

function readMockHistory() {
  try {
    return JSON.parse(localStorage.getItem("signbridge-history") || "[]");
  } catch (error) {
    return [];
  }
}

function writeMockHistory(entries) {
  try {
    localStorage.setItem("signbridge-history", JSON.stringify(entries));
  } catch (error) {
    // History is nice to have in mock mode, but storage can be unavailable.
  }
}

export async function health() {
  if (MOCK) {
    await delay();
    return { status: "ok", sign_model_loaded: true };
  }

  const response = await fetch("/api/health");
  return parseJsonResponse(response);
}

export async function textToSign(text, language = "en") {
  if (MOCK) {
    await delay();
    const gloss = glossFromText(text);
    return {
      text,
      language,
      gloss,
      clips: gloss.map(clipForWord),
    };
  }

  return jsonRequest("/api/text-to-sign", {
    method: "POST",
    body: JSON.stringify({ text, language }),
  });
}

export function uploadMedia(file, language = "en", onProgress = () => {}) {
  if (MOCK) {
    return new Promise((resolve) => {
      let progress = 0;
      const timer = setInterval(() => {
        progress = Math.min(progress + 20, 100);
        onProgress(progress);
        if (progress === 100) {
          clearInterval(timer);
          const segments = [
            {
              start: 0,
              end: 4.5,
              text: "Welcome to today's college lecture.",
              gloss: ["WELCOME", "TODAY", "COLLEGE", "LECTURE"],
              clips: ["WELCOME", "TODAY", "COLLEGE", "LECTURE"].map(clipForWord),
            },
            {
              start: 4.5,
              end: 9.2,
              text: "Registration starts at the desk near the entrance.",
              gloss: ["REGISTRATION", "STARTS", "DESK", "NEAR", "ENTRANCE"],
              clips: ["REGISTRATION", "STARTS", "DESK", "NEAR", "ENTRANCE"].map(clipForWord),
            },
            {
              start: 9.2,
              end: 13.8,
              text: "Please ask questions after the demonstration.",
              gloss: ["PLEASE", "ASK", "QUESTIONS", "AFTER", "DEMONSTRATION"],
              clips: ["PLEASE", "ASK", "QUESTIONS", "AFTER", "DEMONSTRATION"].map(clipForWord),
            },
          ];
          const gloss = segments.flatMap((segment) => segment.gloss);
          resolve({
            transcript: segments.map((segment) => segment.text).join(" "),
            segments,
            gloss,
            clips: segments.flatMap((segment) => segment.clips),
            language,
            fileName: file?.name || "mock-lecture.mp4",
          });
        }
      }, MOCK_DELAY / 5);
    });
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      let body = {};
      try {
        body = JSON.parse(xhr.responseText || "{}");
      } catch (error) {
        body = {};
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body);
      } else {
        reject(new Error(body.error || `Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Upload failed. Please try again.")));
    xhr.open("POST", "/api/media/upload");
    xhr.send(formData);
  });
}

export async function predictSign(landmarks) {
  if (MOCK) {
    await delay();
    const word = PREDICTIONS[predictionIndex % PREDICTIONS.length];
    predictionIndex += 1;
    return { word, confidence: 0.9, landmarks };
  }

  return jsonRequest("/api/sign/predict", {
    method: "POST",
    body: JSON.stringify({ landmarks }),
  });
}

export async function signSentence(words) {
  if (MOCK) {
    await delay();
    const text = words.join(" ").toLowerCase();
    return { text: text ? `${text[0].toUpperCase()}${text.slice(1)}.` : "" };
  }

  return jsonRequest("/api/sign/sentence", {
    method: "POST",
    body: JSON.stringify({ words }),
  });
}

export async function getHistory() {
  if (MOCK) {
    await delay();
    return readMockHistory();
  }

  const response = await fetch("/api/history");
  return parseJsonResponse(response);
}

export async function addHistory(entry) {
  if (MOCK) {
    await delay();
    const nextEntry = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      created_at: new Date().toISOString(),
      ...entry,
    };
    const entries = [nextEntry, ...readMockHistory()];
    writeMockHistory(entries);
    return nextEntry;
  }

  return jsonRequest("/api/history", {
    method: "POST",
    body: JSON.stringify(entry),
  });
}

export async function clearHistory() {
  if (MOCK) {
    await delay();
    writeMockHistory([]);
    return { status: "ok" };
  }

  const response = await fetch("/api/history", { method: "DELETE" });
  return parseJsonResponse(response);
}
