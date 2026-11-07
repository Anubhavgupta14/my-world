/**
 * Single-user app: set these once here. Cycle and period length are only the
 * starting values; she can adjust them on the Calendar tab.
 */
export const DEFAULTS = {
  /** What the app calls her. */
  herName: "Dhruvi",
  /** What the app calls you. */
  partnerName: "Anubhav",
  /** Your phone number with country code, digits only (e.g. 919876543210). */
  partnerPhone: "6386326572",
  cycleLength: 28,
  periodLength: 5,
};

/** Real names, used by Jarvis. */
export const PEOPLE = {
  her: "Dhruvi",
  him: "Anubhav",
  /** Month (1-12) and day. */
  herBirthday: { month: 10, day: 18 },
  hisBirthday: { month: 2, day: 14 },
  /** A few true things Jarvis can use to make it personal. Edit freely. */
  facts: [
    "Dhruvi is a physiotherapist; Anubhav sometimes calls her 'Baby'.",
    "Anubhav is a software engineer; she calls him 'Cutiepie'.",
    "Anubhav lives in Pune and Dhruvi in Panvel, so dates often happen somewhere in between.",
    "Dhruvi loves rasgulla, festivals, and long phone calls that run for hours.",
    "Dhruvi's birthday is 18 October. Anubhav's birthday is 14 February (yes, Valentine's Day).",
  ],
};

export const LIMITS = {
  cycleLength: { min: 21, max: 40 },
  periodLength: { min: 2, max: 10 },
};
