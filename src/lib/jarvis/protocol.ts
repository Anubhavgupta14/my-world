import { MOOD_IDS } from "../cycle";

/**
 * Everything the phone and the /api/jarvis server agree on: the Gemini content
 * shape, the context the phone sends along, the tools, and the stream events.
 */

/* ---------- Gemini content (kept opaque so thought signatures survive) ---------- */

export interface Part {
  text?: string;
  functionCall?: { id?: string; name: string; args?: Record<string, unknown> };
  functionResponse?: { id?: string; name: string; response: Record<string, unknown> };
  thoughtSignature?: string;
  thought?: boolean;
  [k: string]: unknown;
}

export interface Content {
  role: "user" | "model";
  parts: Part[];
}

/** One function call in a model turn, numbered so results can be matched back. */
export interface ToolCall {
  index: number;
  id?: string;
  name: ToolName;
  args: Record<string, unknown>;
}

/* ---------- What the phone tells Jarvis on every message ---------- */

export interface JarvisContext {
  now: string; // ISO with offset
  timezone: string;
  cycle: null | {
    phase: string;
    day: number;
    cycleLength: number;
    onPeriod: boolean;
    periodDay?: number;
    nextPeriod: string;
    daysUntilNext: number;
    ovulation: string;
    fertileWindow: string;
  };
  today: { pain?: number; moods?: string[] };
  canCall: boolean;
}

/* ---------- Tools ---------- */

export type ToolName =
  | "call_engineer"
  | "get_location"
  | "send_to_engineer"
  | "web_search"
  | "show_date_plan"
  | "open_comfort_tool"
  | "log_cycle";

/**
 * Where each tool runs:
 *  - server:  executed on the server (needs secret keys)
 *  - action:  the phone performs it; the server streams it and assumes success
 *  - ask:     the phone must answer (e.g. location), so the turn pauses for it
 */
export const TOOL_KIND: Record<ToolName, "server" | "action" | "ask"> = {
  call_engineer: "action",
  get_location: "ask",
  send_to_engineer: "server",
  web_search: "server",
  show_date_plan: "action",
  open_comfort_tool: "action",
  log_cycle: "action",
};

export interface DatePlanStop {
  time: string;
  name: string;
  activity: string;
  area?: string;
  cost_inr: number;
  why?: string;
}

export interface DatePlan {
  title: string;
  location: string;
  vibe: string;
  budget_min_inr: number;
  budget_max_inr: number;
  stops: DatePlanStop[];
  tips?: string[];
}

const STR = { type: "STRING" } as const;
const NUM = { type: "NUMBER" } as const;

/** Gemini function declarations (OpenAPI subset). */
export const FUNCTION_DECLARATIONS = [
  {
    name: "call_engineer",
    description:
      "Start a phone call to Anubhav (The Engineer). Use immediately whenever she wants to call, talk to, or hear him.",
    parameters: { type: "OBJECT", properties: { reason: STR } },
  },
  {
    name: "get_location",
    description:
      "Ask her phone for its current location (she sees a permission prompt). Use before sending a delivery request (chocolates, food, flowers) or when planning something 'near me'. Returns coordinates and an approximate address, or an error if denied.",
    parameters: { type: "OBJECT", properties: { purpose: { ...STR, description: "Short reason shown to her." } } },
  },
  {
    name: "send_to_engineer",
    description:
      "Email Anubhav on her behalf: chocolate or food requests, 'I miss you', hug requests, date requests, SOS, or any message she wants passed on. Only send what she asked to send. For deliveries, include her location if you have it.",
    parameters: {
      type: "OBJECT",
      properties: {
        category: {
          type: "STRING",
          enum: ["chocolate", "food", "flowers", "hug", "miss_you", "date_request", "sos", "message"],
        },
        subject: { ...STR, description: "Short, playful subject line." },
        message: { ...STR, description: "The message for Anubhav, written in Jarvis's voice on her behalf." },
        items: { type: "ARRAY", items: STR, description: "Specific things she wants, if any." },
        urgency: { type: "STRING", enum: ["whenever", "today", "asap"] },
        location: {
          type: "OBJECT",
          properties: { lat: NUM, lng: NUM, address: STR },
          description: "Where to deliver, from get_location or what she said.",
        },
      },
      required: ["category", "subject", "message"],
    },
  },
  {
    name: "web_search",
    description:
      "Search the live web (Tavily). Use for real places, restaurants, cafés, events, opening hours, prices, news, weather, or anything time-sensitive. Prefer specific queries with the city name.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: STR,
        topic: { type: "STRING", enum: ["general", "news"] },
      },
      required: ["query"],
    },
  },
  {
    name: "show_date_plan",
    description:
      "Display a date plan card on her screen. Call after researching real places with web_search. Costs are realistic estimates for two people in INR.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: STR,
        location: { ...STR, description: "City / area the plan is for." },
        vibe: { ...STR, description: "One line: the feel of the date." },
        budget_min_inr: NUM,
        budget_max_inr: NUM,
        stops: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              time: { ...STR, description: "e.g. 5:30 PM" },
              name: { ...STR, description: "Real place name." },
              activity: STR,
              area: STR,
              cost_inr: { ...NUM, description: "Estimated cost for two." },
              why: { ...STR, description: "Why she'll love it, one line." },
            },
            required: ["time", "name", "activity", "cost_inr"],
          },
        },
        tips: { type: "ARRAY", items: STR },
      },
      required: ["title", "location", "vibe", "budget_min_inr", "budget_max_inr", "stops"],
    },
  },
  {
    name: "open_comfort_tool",
    description:
      "Open one of the app's comfort tools on her screen: chocolate (virtual chocolate box), hotbag (hot water bag + timer), stretch (guided cramp stretches), game (Cramp Crusher mini game).",
    parameters: {
      type: "OBJECT",
      properties: { tool: { type: "STRING", enum: ["chocolate", "hotbag", "stretch", "game"] } },
      required: ["tool"],
    },
  },
  {
    name: "log_cycle",
    description:
      "Update her cycle tracker: period started, period ended, or today's pain (0-10 NPRS) / moods. Pain and moods can be included with any action. Use when she tells you any of these.",
    parameters: {
      type: "OBJECT",
      properties: {
        action: { type: "STRING", enum: ["period_started", "period_ended", "log_pain", "log_moods"] },
        date: { ...STR, description: "YYYY-MM-DD; defaults to today." },
        pain: NUM,
        moods: {
          type: "ARRAY",
          items: { type: "STRING", enum: MOOD_IDS },
        },
      },
      required: ["action"],
    },
  },
];

/* ---------- Stream events (newline-delimited JSON) ---------- */

export type JarvisEvent =
  | { type: "status"; text: string }
  | { type: "tool"; call: ToolCall; label: string }
  | { type: "tool_done"; index: number; ok: boolean; summary: string }
  | { type: "action"; call: ToolCall }
  | { type: "ask"; calls: ToolCall[] }
  | { type: "final"; text: string }
  | { type: "error"; message: string };

/**
 * The server keeps the conversation (in Supabase), so the phone only sends her
 * new message, or the answers to an "ask" to resume the paused turn.
 */
export interface JarvisRequest {
  message?: string;
  context: JarvisContext;
  resume?: { answers: Record<number, Record<string, unknown>> };
}
