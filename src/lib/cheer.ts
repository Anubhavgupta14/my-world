import type { MoodId, PhaseId } from "./cycle";

/**
 * The "make her smile" engine.
 *
 * Right now it picks from hand-written lines. Later this is the one place to
 * swap for an LLM call (e.g. POST /api/cheer with { phase, pain, moods }) —
 * every screen already goes through `getCheer`, so nothing else has to change.
 */

export interface CheerContext {
  phase: PhaseId;
  pain?: number;
  moods?: MoodId[];
  herName: string;
  partnerName: string;
}

/** While she's on her period. */
const ON_PERIOD = [
  "Even the strongest muscles need a recovery day. You'd tell your patients that. Now listen to yourself, {her}.",
  "Today's treatment plan: couch therapy, grade 5 mobilisation of chocolate from wrapper to mouth.",
  "Prescription: 1 hot water bag, 2 chocolates, 0 chores. Signed, {him}.",
  "Your body is doing a whole workout without asking you. Rest day approved.",
  "Reminder: you're allowed to be grumpy. {him} has been briefed and is fully prepared.",
  "Blanket burrito mode: ON. Expected recovery: 100%. Cuteness throughout: unchanged.",
];

/** Every other day: about her, them, and life. Nothing cycle-related. */
const EVERYDAY = [
  "Your patients are lucky. {him} is luckier.",
  "Good day for a long walk, or a long call with a certain Engineer. Both count as cardio.",
  "Range of motion: full. Attitude: fuller. Smile: clinically excellent.",
  "Your smile could fix a frozen shoulder. Clinically unproven. Personally verified by {him}.",
  "Fun fact: {him} has checked this app more times today than his code. Priorities.",
  "Today's to-do: be amazing (already done), drink water, call {him}.",
  "If anyone corrects your posture today, remind them who the Doctor is.",
  "Five-hour phone call later? {him}'s battery is charged and ready.",
  "Daily reminder that you are someone's favourite notification.",
  "Somewhere between Pune and Panvel, someone is thinking about you right now.",
];

const BY_PAIN: { max: number; lines: string[] }[] = [
  {
    max: 0,
    lines: [
      "Zero pain! Celebrate with a chocolate anyway. Doctor's orders (you're the doctor).",
      "NPRS 0/10. Textbook patient. Gold star. ⭐",
    ],
  },
  {
    max: 3,
    lines: [
      "Mild cramps. A few stretches and a chocolate should handle it. Want the Rx sheet?",
      "Little ache, big hug. Chocolate box is open 24/7.",
    ],
  },
  {
    max: 6,
    lines: [
      "Moderate pain. Hot water bag + child's pose + something sweet. You know the protocol — follow it this time.",
      "That's a proper ache. Heat on the lower tummy, slow breaths, and let {him} know.",
    ],
  },
  {
    max: 10,
    lines: [
      "That's a lot of pain. Heat, rest, and call {him} — he's on call 24/7. If it's often this bad, it's worth getting checked.",
      "Severe pain detected. Cancel the world. Hot bag, blanket, and a phone call with {him}. Right now.",
    ],
  },
];

const BY_MOOD: Partial<Record<MoodId, string[]>> = {
  moody: [
    "Feeling moody is valid. Here's a free compliment: you're the best thing in {him}'s day. Every day.",
    "Grumpy and gorgeous — a rare and powerful combo.",
  ],
  tired: [
    "Tired is your body asking for a rest set. Short nap, no guilt.",
  ],
  cravings: [
    "Cravings are your body's love letters. Answer them. With chocolate.",
    "Craving something? Tap 'Order the real one' and make {him} useful.",
  ],
  bloated: [
    "Bloated? Warm water, gentle walk, knees-to-chest stretch. You'd prescribe exactly that.",
  ],
  happy: [
    "Happy looks really good on you. {him} would like this mood bottled, please.",
    "Love that for you. Spread it around; {him} is first in the queue.",
  ],
  loved: [
    "Correct. You are. Very much. Signed, {him}.",
    "Feeling loved is accurate data. No recalibration needed.",
  ],
  energetic: [
    "Full battery! Perfect day for a workout, a plan, or a spontaneous date.",
    "Energy levels: Doctor-on-a-double-shift. Use it for something fun.",
  ],
  stressed: [
    "Deep breath in for 4, out for 6. You'd tell a patient that. Your turn.",
    "Stress noted. Prescription: one long call with {him}, zero problem-solving unless you ask for it.",
  ],
  missing_him: [
    "He misses you too. Probably more. Want to call him right now?",
    "Distance is temporary. {him} is one tap away; go on, ring him.",
  ],
  great: [
    "Feeling great! {him} would like to take full credit, but won't.",
    "Love this for you. Keep that energy, Dr. Sunshine.",
  ],
};

function pick<T>(xs: T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

function fill(line: string, ctx: CheerContext) {
  return line.replaceAll("{her}", ctx.herName).replaceAll("{him}", ctx.partnerName);
}

export function getCheer(ctx: CheerContext): string {
  const pool: string[] = [];
  if (typeof ctx.pain === "number") {
    const band = BY_PAIN.find((b) => ctx.pain! <= b.max) ?? BY_PAIN[BY_PAIN.length - 1];
    pool.push(...band.lines, ...band.lines);
  }
  ctx.moods?.forEach((m) => pool.push(...(BY_MOOD[m] ?? [])));
  if (!pool.length) pool.push(...(ctx.phase === "period" ? ON_PERIOD : EVERYDAY));
  return fill(pick(pool), ctx);
}

/** Opening lines when she unwraps a treat. */
export const TREAT_NOTES = [
  "This one's a coupon for one full back massage. Non-expiring.",
  "Fun fact: you are {him}'s favourite notification.",
  "Valid for: one long call where {him} only listens and agrees.",
  "This chocolate contains 0% calories and 100% love. Engineer-certified.",
  "Redeem for: your favourite rasgulla, delivered next time you meet.",
  "You are allowed to be dramatic today. Full permission granted.",
  "Coupon: {him} picks the movie. Just kidding. You pick. Always.",
  "If cramps were a patient, you'd have discharged them already.",
];

export function treatNote(ctx: Pick<CheerContext, "herName" | "partnerName">) {
  return fill(pick(TREAT_NOTES), ctx as CheerContext);
}

/* ---------- Messages to him ---------- */

export const SOS_PRESETS = [
  { emoji: "🍫", label: "Send chocolate", text: "🚨 Code Cocoa: chocolate levels critically low. Please deliver ASAP." },
  { emoji: "🫂", label: "Need a hug", text: "Cozy Season update: I need a hug. A big one. Virtual accepted for now." },
  { emoji: "📞", label: "Call me", text: "Call me? I just want to hear your voice 🥺" },
  { emoji: "🥺", label: "Say I'm pretty", text: "Mandatory compliment check: tell me I'm pretty. Right now." },
];

export function whatsappLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function telLink(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits.startsWith("+") ? digits : `+${digits}`}`;
}
