export interface RNG {
  next(): number;
}

/** Deterministic PRNG (mulberry32). next() returns a value in [0,1). */
export function makeRng(seed: number): RNG {
  let state = seed >>> 0;
  return {
    next(): number {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** Fisher-Yates shuffle driven by rng; returns a new array. */
export function shuffle<T>(arr: T[], rng: RNG): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
