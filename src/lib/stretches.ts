/**
 * Gentle stretches commonly suggested for period cramps. She knows these far
 * better than the app does — the "physio notes" are the joke.
 */
export interface Stretch {
  id: string;
  name: string;
  /** Hold time in seconds. */
  hold: number;
  how: string;
  note: string;
  /** Which tiny SVG pose to draw. */
  pose: "child" | "catcow" | "knees" | "twist" | "butterfly" | "tilt";
}

export const STRETCHES: Stretch[] = [
  {
    id: "child",
    name: "Child's Pose",
    hold: 45,
    how: "Knees wide, sit back on your heels, arms long, forehead down. Breathe into your lower back.",
    note: "Patient may refuse to get up afterwards. This is expected.",
    pose: "child",
  },
  {
    id: "catcow",
    name: "Cat–Cow",
    hold: 40,
    how: "On all fours. Inhale, drop the belly and look up. Exhale, round the spine. Slow and smooth.",
    note: "Meow optional, but therapeutically encouraged.",
    pose: "catcow",
  },
  {
    id: "knees",
    name: "Knees to Chest",
    hold: 40,
    how: "On your back, hug both knees in. Rock gently side to side to massage the lower back.",
    note: "Also known as the 'I'm a burrito now' position.",
    pose: "knees",
  },
  {
    id: "twist",
    name: "Supine Twist",
    hold: 30,
    how: "On your back, drop both knees to one side, look the other way. Switch halfway.",
    note: "Spinal rotation, approved by a very specific Doctor.",
    pose: "twist",
  },
  {
    id: "butterfly",
    name: "Reclined Butterfly",
    hold: 60,
    how: "On your back, soles of the feet together, knees falling open. Pillows under the knees if needed.",
    note: "Best paired with a hot water bag on the tummy and zero responsibilities.",
    pose: "butterfly",
  },
  {
    id: "tilt",
    name: "Pelvic Tilts",
    hold: 30,
    how: "On your back, knees bent. Gently flatten the lower back to the floor, then release. Repeat slowly.",
    note: "You've taught this 1,000 times. Today the patient is you.",
    pose: "tilt",
  },
];
