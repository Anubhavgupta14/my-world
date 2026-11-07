import type { Content, Part } from "@/lib/jarvis/protocol";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models/";

export function geminiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GEMINI;
  if (!key) throw new Error("Gemini key missing: set GEMINI_API_KEY (or GEMINI) in .env");
  return key;
}

/** Primary model first; fallbacks only if it keeps failing (overloaded / rate limited). */
function models(): string[] {
  // Tested Nov 2026: gemini-flash-latest and gemini-3.8-flash were hanging; these respond.
  const primary = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  return [...new Set([primary, "gemini-3-flash-preview", "gemini-2.5-flash"])];
}

/** Voice needs speed: Gemini 3+ uses a thinking level, 2.5 a token budget. */
function thinkingFor(model: string) {
  if (/gemini-2\./.test(model)) return { thinkingBudget: 512 };
  // "low" rather than "minimal": minimal sometimes skipped tool calls it promised to make.
  return { thinkingLevel: process.env.JARVIS_THINKING || "low" };
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Thought signatures are model-specific, so drop them before asking a different model. */
function stripSignatures(contents: Content[]): Content[] {
  return contents.map((c) => ({
    ...c,
    parts: c.parts.map((p) => {
      const rest: Part = { ...p };
      delete rest.thoughtSignature;
      return rest;
    }),
  }));
}

export interface GenerateResult {
  content: Content;
  model: string;
}

export async function generate(body: {
  systemInstruction: string;
  contents: Content[];
  tools?: unknown[];
  temperature?: number;
  /** Ask for JSON back (can't be combined with tools). */
  responseMimeType?: string;
  responseSchema?: unknown;
}, onRetry?: (msg: string) => void): Promise<GenerateResult> {
  const key = geminiKey();
  const list = models();
  let lastError = "unknown error";

  for (let m = 0; m < list.length; m++) {
    const model = list[m];
    const payload = {
      systemInstruction: { parts: [{ text: body.systemInstruction }] },
      contents: m === 0 ? body.contents : stripSignatures(body.contents),
      tools: body.tools,
      generationConfig: {
        temperature: body.temperature ?? 0.8,
        maxOutputTokens: 4096,
        thinkingConfig: thinkingFor(model),
        ...(body.responseMimeType ? { responseMimeType: body.responseMimeType } : {}),
        ...(body.responseSchema ? { responseSchema: body.responseSchema } : {}),
      },
    };
    // A hanging model goes straight to the next one; only fast 429/5xx errors get one retry.
    for (let attempt = 0; attempt < 2; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), m === list.length - 1 ? 25_000 : 15_000);
      let timedOut = false;
      try {
        const res = await fetch(`${BASE}${model}:generateContent`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          const content = json.candidates?.[0]?.content as Content | undefined;
          if (!content?.parts?.length) {
            const reason = json.candidates?.[0]?.finishReason ?? json.promptFeedback?.blockReason ?? "empty";
            return { model, content: { role: "model", parts: [{ text: emptyReply(reason) }] } };
          }
          return { model, content: { role: "model", parts: content.parts } };
        }
        lastError = `${model} ${res.status}: ${json.error?.message ?? res.statusText}`;
        if (!RETRYABLE.has(res.status)) break;
      } catch (e) {
        timedOut = (e as Error).name === "AbortError";
        lastError = `${model}: ${timedOut ? "timed out" : (e as Error).message}`;
      } finally {
        clearTimeout(timer);
      }
      onRetry?.("Recalibrating…");
      if (timedOut) break;
      await sleep(600);
    }
  }
  throw new Error(lastError);
}

/**
 * Stream a plain-text reply, calling `onDelta` with each new fragment as it arrives.
 * Falls through to the next model only while nothing has streamed yet; once text has
 * started flowing we keep that model and stop on error (returning what we have).
 * Returns the full text. Throws only if no model produced anything.
 */
export async function generateStream(
  body: { systemInstruction: string; contents: Content[]; temperature?: number },
  onDelta: (text: string) => void,
): Promise<string> {
  const key = geminiKey();
  const list = models();
  let lastError = "unknown error";

  for (let m = 0; m < list.length; m++) {
    const model = list[m];
    const payload = {
      systemInstruction: { parts: [{ text: body.systemInstruction }] },
      contents: m === 0 ? body.contents : stripSignatures(body.contents),
      generationConfig: {
        temperature: body.temperature ?? 0.8,
        maxOutputTokens: 4096,
        thinkingConfig: thinkingFor(model),
      },
    };

    const ctrl = new AbortController();
    // Idle timeout: generous to connect, then reset on each chunk so a live stream isn't cut off.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = (ms: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => ctrl.abort(), ms);
    };
    arm(m === list.length - 1 ? 25_000 : 15_000);

    let full = "";
    try {
      const res = await fetch(`${BASE}${model}:streamGenerateContent?alt=sse`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        lastError = `${model} ${res.status}: ${json.error?.message ?? res.statusText}`;
        clearTimeout(timer);
        continue; // try the next model
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        arm(20_000); // reset idle timer on activity
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const obj = JSON.parse(data);
            for (const p of (obj.candidates?.[0]?.content?.parts ?? []) as Part[]) {
              if (p.text && !p.thought) {
                full += p.text;
                onDelta(p.text);
              }
            }
          } catch {
            /* skip a partial/non-JSON line */
          }
        }
      }
      clearTimeout(timer);
      if (full.trim()) return full;
      lastError = `${model}: empty reply`;
    } catch (e) {
      clearTimeout(timer);
      lastError = `${model}: ${(e as Error).name === "AbortError" ? "timed out" : (e as Error).message}`;
      if (full.trim()) return full; // already sent something — keep it
    }
  }
  throw new Error(lastError);
}

/** Pull the plain text out of a model reply (ignores thoughts). */
export function textOf(content: Content): string {
  return content.parts
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text)
    .join("")
    .trim();
}

/** Ask Gemini for a JSON object matching `schema` and parse it. Throws if it can't be parsed. */
export async function generateJSON<T>(body: {
  systemInstruction: string;
  contents: Content[];
  schema: unknown;
  temperature?: number;
}): Promise<T> {
  const { content } = await generate({
    systemInstruction: body.systemInstruction,
    contents: body.contents,
    temperature: body.temperature,
    responseMimeType: "application/json",
    responseSchema: body.schema,
  });
  const raw = textOf(content).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Last resort: grab the outermost {...} or [...] if the model wrapped it in prose.
    const match = raw.match(/[{[][\s\S]*[}\]]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("The model's reply wasn't valid JSON.");
  }
}

function emptyReply(reason: string) {
  return reason === "SAFETY" || reason === "PROHIBITED_CONTENT"
    ? "I'd rather not go there, Miss Dhruvi. Shall we try that another way?"
    : "My apologies, I lost my train of thought for a moment. Could you say that once more?";
}

/* ---------- Text to speech ---------- */

/** How he sounds. Kept out of the transcript so it is never read aloud. */
const SPEAK_STYLE = "warm, natural, affectionate";

/**
 * Gemini 3.8 TTS speaks `text` verbatim, so tone goes in speechMetadata.
 * The 2.5 fallback has no metadata field; a few style-only words before ":" stay unspoken.
 */
function speechBody(model: string, text: string, voice: string) {
  const legacy = /2\.5|preview-tts/.test(model);
  return {
    contents: [
      {
        role: "user",
        parts: [
          legacy
            ? { text: `Say warmly:\n${text}` }
            : { text, speechMetadata: { style: SPEAK_STYLE } },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  };
}

export async function speak(text: string, voice = process.env.JARVIS_VOICE || "Charon"): Promise<Buffer> {
  const key = geminiKey();
  const ttsModels = [...new Set([process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts", "gemini-2.5-flash-preview-tts"])];
  let lastError = "";
  for (const model of ttsModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(`${BASE}${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(speechBody(model, text, voice)),
        signal: AbortSignal.timeout(25_000),
      }).catch((e: Error) => e);
      if (res instanceof Error) {
        lastError = `${model}: ${res.message}`;
        continue;
      }
      const json = await res.json().catch(() => ({}));
      const data = json.candidates?.[0]?.content?.parts?.find((p: Part) => p.inlineData)?.inlineData;
      if (res.ok && data?.data) {
        const audio = Buffer.from(data.data, "base64");
        // Newer TTS models return a WAV file; older ones return raw PCM.
        return /wav/i.test(data.mimeType ?? "") ? audio : pcmToWav(audio, rateFrom(data.mimeType));
      }
      lastError = `${model} ${res.status}: ${json.error?.message ?? "no audio"}`;
      if (!RETRYABLE.has(res.status)) break;
      await sleep(600);
    }
  }
  throw new Error(lastError);
}

function rateFrom(mime?: string) {
  const m = /rate=(\d+)/.exec(mime ?? "");
  return m ? Number(m[1]) : 24000;
}

/** Gemini TTS returns raw 16-bit mono PCM; wrap it in a WAV header so browsers can play it. */
function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
