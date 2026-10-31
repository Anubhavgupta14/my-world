/** Deterministic PRNG so decorative layouts render identically on server and client. */
export function mulberry32(seed: number) {
  let s = seed;
  return function next() {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Non-deterministic helpers — only call from event handlers / effects. */
export const between = (min: number, max: number) => min + Math.random() * (max - min);

export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
