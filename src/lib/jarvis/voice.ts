/**
 * Voice in (Web Speech recognition) and voice out (Gemini TTS, with the
 * browser's own British voice as a fallback). Module-level so playback
 * continues across tab switches.
 */

/* ---------- Speech recognition (minimal types; not in lib.dom yet) ---------- */

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function Recognizer(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const canListen = () => Recognizer() !== null;

let active: Recognition | null = null;

/** How long to wait for her to start talking before the mic closes itself. */
const SILENCE_MS = 7000;

/** Listen once. `onInterim` gets live text; resolves with the final transcript ("" if nothing). */
export function listen(onInterim: (t: string) => void): Promise<string> {
  const R = Recognizer();
  if (!R) return Promise.reject(new Error("Speech recognition isn't supported in this browser."));
  stopListening();
  return new Promise((resolve, reject) => {
    const rec = new R();
    active = rec;
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    let settled = false;
    let backup = 0;
    const finish = (text: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(silenceTimer);
      window.clearTimeout(backup);
      if (active === rec) active = null;
      resolve(text.trim());
    };
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(silenceTimer);
      window.clearTimeout(backup);
      if (active === rec) active = null;
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
      reject(err);
    };
    // No words yet: close the mic. Once she starts, let the utterance finish on its own.
    const silenceTimer = window.setTimeout(() => {
      try {
        rec.stop();
      } catch {
        /* already ended */
      }
      backup = window.setTimeout(() => finish(finalText), 500);
    }, SILENCE_MS);
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      const live = (finalText + " " + interim).trim();
      if (live) window.clearTimeout(silenceTimer);
      onInterim(live);
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      fail(new Error(e.error === "not-allowed" ? "Microphone permission was denied." : `Mic error: ${e.error}`));
    };
    rec.onend = () => finish(finalText);
    try {
      rec.start();
    } catch (e) {
      fail(e instanceof Error ? e : new Error("Couldn't start the microphone."));
    }
  });
}

export function stopListening() {
  active?.stop();
  active = null;
}

/* ---------- Speaking ---------- */

let audio: HTMLAudioElement | null = null;
let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let levels: Uint8Array<ArrayBuffer> | null = null;
let speaking = false;
let cancelToken = 0;
const speakListeners = new Set<(s: boolean) => void>();

function setSpeaking(s: boolean) {
  speaking = s;
  speakListeners.forEach((l) => l(s));
}

export function onSpeakingChange(cb: (s: boolean) => void) {
  speakListeners.add(cb);
  return () => speakListeners.delete(cb);
}

export const isSpeaking = () => speaking;

/**
 * Must be called from a tap: iOS only allows audio that was started by a user
 * gesture, so we create and "unlock" the element and audio graph up front.
 */
export function unlockAudio() {
  if (typeof window === "undefined") return;
  if (!audio) {
    audio = new Audio();
    audio.preload = "auto";
    audio.setAttribute("playsinline", "true");
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      const src = ctx.createMediaElementSource(audio);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      levels = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      ctx = null;
      analyser = null;
    }
  }
  void ctx?.resume();
  // A silent play() inside the gesture unlocks later programmatic playback.
  audio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
  audio.play().catch(() => {});
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** 0..1 loudness of whatever Jarvis is saying right now (for the orb). */
export function level(): number {
  if (!speaking) return 0;
  if (!analyser || !levels) return 0.35 + Math.random() * 0.25;
  analyser.getByteFrequencyData(levels);
  let sum = 0;
  for (let i = 2; i < 40; i++) sum += levels[i];
  return Math.min(1, sum / (38 * 160));
}

export function stopSpeaking() {
  cancelToken++;
  audio?.pause();
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  setSpeaking(false);
}

/** Fetch Gemini TTS for one chunk. Never throws — returns a blob URL, or null on failure. */
async function fetchTTS(text: string, token: number): Promise<string | null> {
  try {
    const res = await fetch("/api/jarvis-voice", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (token !== cancelToken || !res.ok) return null;
    return URL.createObjectURL(await res.blob());
  } catch {
    return null;
  }
}

/** Play one audio URL to completion (or until cancelled). */
function playUrl(url: string, token: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (token !== cancelToken || !audio) return reject(new Error("cancelled"));
    audio.src = url;
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("playback failed"));
    audio.play().catch(reject);
  }).finally(() => URL.revokeObjectURL(url));
}

/**
 * Split a reply so the first sentence can start playing fast while the rest is still
 * generating. Capped at two parts, so a reply costs at most two TTS calls.
 */
function splitForSpeech(text: string): string[] {
  const t = text.trim();
  if (t.length < 90) return [t]; // short enough to speak in one go
  const first = /^([\s\S]*?[.!?])(\s+)([\s\S]+)$/.exec(t);
  if (!first) return [t];
  let head = first[1];
  let rest = first[3];
  // Don't lead with a trivially short clip ("Yes.") — pull the next sentence in too.
  if (head.length < 25) {
    const second = /^([\s\S]*?[.!?])(\s+)([\s\S]+)$/.exec(rest);
    if (second) {
      head = `${head} ${second[1]}`;
      rest = second[3];
    } else {
      return [t];
    }
  }
  return [head, rest];
}

/**
 * Speak with Gemini's voice; fall back to the device voice if that fails.
 * The first sentence is fetched and played as soon as it's ready while the
 * remainder generates in parallel, so audio starts with much less delay.
 * Resolves when finished.
 */
export async function say(text: string): Promise<void> {
  stopSpeaking();
  const token = cancelToken;
  setSpeaking(true);
  try {
    const chunks = splitForSpeech(text);
    let pending = fetchTTS(chunks[0], token); // kick off the first chunk now
    for (let i = 0; i < chunks.length; i++) {
      const url = await pending;
      if (token !== cancelToken) return;
      if (!url) {
        // TTS failed: speak whatever's left with the device voice, then stop.
        await deviceVoice(chunks.slice(i).join(" "));
        return;
      }
      // Start the next chunk generating while this one plays.
      if (i + 1 < chunks.length) pending = fetchTTS(chunks[i + 1], token);
      await playUrl(url, token);
      if (token !== cancelToken) return;
    }
  } catch {
    if (token === cancelToken) await deviceVoice(text);
  } finally {
    if (token === cancelToken) setSpeaking(false);
  }
}

function deviceVoice(text: string): Promise<void> {
  if (!("speechSynthesis" in window)) return Promise.resolve();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    u.voice =
      voices.find((v) => /Daniel|Arthur|Google UK English Male/i.test(v.name)) ??
      voices.find((v) => v.lang === "en-GB") ??
      null;
    u.lang = u.voice?.lang ?? "en-GB";
    u.rate = 1.02;
    u.pitch = 0.95;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}
