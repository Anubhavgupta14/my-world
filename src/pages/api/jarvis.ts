import type { NextApiRequest, NextApiResponse } from "next";
import {
  FUNCTION_DECLARATIONS,
  TOOL_KIND,
  type Content,
  type JarvisEvent,
  type JarvisRequest,
  type Part,
  type ToolCall,
  type ToolName,
} from "@/lib/jarvis/protocol";
import { getHistory, getSettings, saveHistory, updateSettings } from "@/server/db";
import { generate } from "@/server/jarvis/gemini";
import { systemPrompt, toolLabel } from "@/server/jarvis/prompt";
import { reverseGeocode, sendToEngineer, webSearch } from "@/server/jarvis/tools";
import { requireSession, sameOrigin } from "@/server/session";

export const config = {
  api: { bodyParser: { sizeLimit: "2mb" } },
  maxDuration: 60,
};

const MAX_STEPS = 8;

/** Phrases that claim an action was taken. Used to catch "Consider it sent" with no tool call. */
const CLAIMS_ACTION =
  /\b(sent|sending|i'll send|i will send|i've sent|dispatch(ed|ing)?|calling|i'll call|ringing|connecting you|logged|i've logged|noted it in|opened|opening|consider it (done|sent)|let (him|the engineer) know|passed (it|that) on|on (its|it's) way)\b/i;

const NUDGE =
  "\n\n# Correction\nYour previous draft claimed to send, call, log or open something, but you did not call any tool. If she asked for an action, call the right tool now. If she did not, reply again without claiming any action.";
const MAX_HISTORY = 40;

/**
 * The agent loop. Streams newline-delimited JSON events:
 *   status → tool → tool_done → … → final
 * If a tool needs the phone to answer (location), it streams `ask` and stops;
 * the phone answers and calls back with `resume` to continue the same turn.
 * The conversation itself lives in Supabase (jarvis_history).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  if (!requireSession(req, res)) return;

  const body = req.body as JarvisRequest;
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 4000) : "";
  if (!body?.context || (!message && !body.resume)) return res.status(400).json({ error: "Bad request" });

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    "Content-Encoding": "none",
    "X-Accel-Buffering": "no",
  });
  const send = (e: JarvisEvent) => res.write(JSON.stringify(e) + "\n");
  const tools = [{ functionDeclarations: FUNCTION_DECLARATIONS }];

  try {
    const [history, settings] = await Promise.all([getHistory(), getSettings()]);
    const introduced = Boolean(settings?.jarvis_introduced);
    const system = systemPrompt(body.context, introduced);
    const contents = trimHistory(history);

    let acted = false;
    let nudged = false;

    if (body.resume) {
      // The paused turn is the last model message; its calls are re-derived here, never trusted from the phone.
      const last = contents[contents.length - 1];
      const pending = last?.role === "model" ? callsOf(last) : [];
      if (!pending.length) throw new Error("Nothing to resume.");
      contents.push({ role: "user", parts: await runCalls(pending, body.resume.answers ?? {}, body, send) });
      acted = true;
    } else {
      // If she left a question unanswered (e.g. closed the app at the location prompt),
      // close those calls out, or Gemini rejects the conversation.
      const last = contents[contents.length - 1];
      const dangling = last?.role === "model" ? callsOf(last) : [];
      const closeOut: Part[] = dangling.map((c) => ({
        functionResponse: { ...(c.id ? { id: c.id } : {}), name: c.name, response: { error: "She moved on without answering." } },
      }));
      contents.push({ role: "user", parts: [...closeOut, { text: message }] });
    }

    for (let step = 0; step < MAX_STEPS; step++) {
      send({ type: "status", text: step === 0 ? "Thinking…" : "Putting it together…" });
      const { content } = await generate(
        { systemInstruction: nudged && !acted ? system + NUDGE : system, contents, tools },
        (t) => send({ type: "status", text: t }),
      );
      const calls = callsOf(content);

      if (!calls.length) {
        const text = content.parts
          .filter((p) => p.text && !p.thought)
          .map((p) => p.text)
          .join("")
          .trim();
        // Claimed an action without doing it: discard this draft and ask once more.
        if (!acted && !nudged && CLAIMS_ACTION.test(text)) {
          nudged = true;
          continue;
        }
        contents.push(content);
        await Promise.all([
          saveHistory(trimHistory(contents)),
          introduced ? undefined : updateSettings({ jarvis_introduced: true }),
        ]);
        send({ type: "final", text });
        return res.end();
      }

      contents.push(content);
      acted = true;

      const asks = calls.filter((c) => TOOL_KIND[c.name] === "ask");
      if (asks.length) {
        await saveHistory(contents);
        for (const c of asks) send({ type: "tool", call: c, label: toolLabel(c.name, c.args) });
        send({ type: "ask", calls: asks });
        return res.end();
      }

      contents.push({ role: "user", parts: await runCalls(calls, {}, body, send) });
    }

    await saveHistory(trimHistory(contents));
    send({ type: "final", text: "I seem to be going in circles, Miss Dhruvi. Could you put that another way?" });
  } catch (e) {
    send({ type: "error", message: (e as Error).message });
  }
  res.end();
}

function callsOf(content: Content): ToolCall[] {
  return content.parts
    .filter((p) => p.functionCall)
    .map((p, index) => ({
      index,
      id: p.functionCall!.id,
      name: p.functionCall!.name as ToolName,
      args: p.functionCall!.args ?? {},
    }));
}

async function runCalls(
  calls: ToolCall[],
  answers: Record<number, Record<string, unknown>>,
  body: JarvisRequest,
  send: (e: JarvisEvent) => void,
): Promise<Part[]> {
  return Promise.all(
    calls.map(async (call) => {
      const kind = TOOL_KIND[call.name];
      if (kind !== "ask") send({ type: "tool", call, label: toolLabel(call.name, call.args) });

      let result: Record<string, unknown>;
      if (!kind) {
        result = { error: `Unknown tool ${call.name}` };
      } else if (kind === "server") {
        result = call.name === "web_search" ? await webSearch(call.args) : await sendToEngineer(call.args);
      } else if (kind === "action") {
        if (call.name === "call_engineer" && !body.context.canCall) {
          result = { error: "His phone number isn't set up in the app yet. Offer to email him instead." };
        } else {
          send({ type: "action", call });
          result = { ok: true, status: "Done on her screen." };
        }
      } else {
        result = answers[call.index] ?? { error: "No answer from her phone." };
        if (call.name === "get_location" && typeof result.lat === "number" && typeof result.lng === "number") {
          const address = await reverseGeocode(result.lat, result.lng as number);
          if (address) result = { ...result, address };
        }
      }

      send({ type: "tool_done", index: call.index, ok: !result.error, summary: summarize(call.name, result) });
      return {
        functionResponse: { ...(call.id ? { id: call.id } : {}), name: call.name, response: result },
      } satisfies Part;
    }),
  );
}

function summarize(name: ToolName, r: Record<string, unknown>): string {
  if (r.error) return String(r.error).split(".")[0];
  switch (name) {
    case "web_search":
      return `${(r.results as unknown[] | undefined)?.length ?? 0} results`;
    case "send_to_engineer":
      return "Delivered to his inbox";
    case "get_location":
      return r.address ? String(r.address).split(",").slice(0, 2).join(",") : "Location received";
    default:
      return "Done";
  }
}


/** Keep the recent conversation, always starting at one of her messages. */
function trimHistory(contents: Content[]): Content[] {
  if (contents.length <= MAX_HISTORY) return contents;
  let start = contents.length - MAX_HISTORY;
  while (start < contents.length && !(contents[start].role === "user" && contents[start].parts.some((p) => p.text))) {
    start++;
  }
  return contents.slice(start);
}

