import { makeRng } from './rng';
import { generatePuzzle } from './generator';
import type { Puzzle } from './types';

/** FNV-1a 32-bit hash of an ISO date string ("YYYY-MM-DD"). */
export function dateSeed(isoDate: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < isoDate.length; i++) {
    h ^= isoDate.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Same date always yields the same Medium puzzle. */
export function generateDaily(isoDate: string): Puzzle {
  return generatePuzzle(makeRng(dateSeed(isoDate)), 'medium');
}
