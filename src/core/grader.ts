import { boxOf, cellsOf, colOf, peers, rowOf } from './board';
import type { Board, Difficulty, Unit } from './types';

export type Technique =
  | 'nakedSingle'
  | 'hiddenSingle'
  | 'lockedCandidate'
  | 'nakedPair'
  | 'advanced';

const RANK: Record<Technique, number> = {
  nakedSingle: 1,
  hiddenSingle: 2,
  lockedCandidate: 3,
  nakedPair: 4,
  advanced: 5,
};

/** Clue-count envelope per tier (inclusive). */
export const TIER_CLUES: Record<Difficulty, { min: number; max: number }> = {
  easy: { min: 36, max: 45 },
  medium: { min: 30, max: 35 },
  hard: { min: 26, max: 29 },
  expert: { min: 22, max: 25 },
};

const UNITS: Unit[] = [];
for (const kind of ['row', 'col', 'box'] as const) {
  for (let index = 0; index < 9; index++) UNITS.push({ kind, index });
}
const UNIT_CELLS = UNITS.map(cellsOf);
const PEERS = Array.from({ length: 81 }, (_, i) => peers(i));

const bit = (d: number) => 1 << d;
const popcount = (m: number) => {
  let n = 0;
  for (; m; m &= m - 1) n++;
  return n;
};
const lowDigit = (m: number) => 31 - Math.clz32(m & -m);

interface State {
  vals: number[];
  cand: number[]; // bitmask of digits 1..9 for empty cells, 0 for filled
  contradiction: boolean;
}

function place(s: State, i: number, d: number): void {
  s.vals[i] = d;
  s.cand[i] = 0;
  for (const p of PEERS[i]) {
    if (s.vals[p] === d) s.contradiction = true;
    s.cand[p] &= ~bit(d);
  }
}

function nakedSingle(s: State): boolean {
  for (let i = 0; i < 81; i++) {
    if (s.vals[i] === 0 && popcount(s.cand[i]) === 1) {
      place(s, i, lowDigit(s.cand[i]));
      return true;
    }
  }
  return false;
}

function hiddenSingle(s: State): boolean {
  for (const cells of UNIT_CELLS) {
    for (let d = 1; d <= 9; d++) {
      const spots = cells.filter((c) => s.vals[c] === 0 && s.cand[c] & bit(d));
      if (spots.length === 1 && !cells.some((c) => s.vals[c] === d)) {
        place(s, spots[0], d);
        return true;
      }
    }
  }
  return false;
}

/** Pointing (box -> line) and claiming (line -> box). */
function lockedCandidate(s: State): boolean {
  for (let d = 1; d <= 9; d++) {
    const b = bit(d);
    for (let u = 0; u < 27; u++) {
      const isBox = u >= 18;
      const spots = UNIT_CELLS[u].filter((c) => s.vals[c] === 0 && s.cand[c] & b);
      if (spots.length < 2) continue;
      // Other unit kinds that could contain all spots.
      const targets: Array<(c: number) => number> = isBox
        ? [rowOf, colOf]
        : [boxOf];
      for (const key of targets) {
        const k = key(spots[0]);
        if (!spots.every((c) => key(c) === k)) continue;
        const other = isBox
          ? UNIT_CELLS[(key === rowOf ? 0 : 9) + k]
          : UNIT_CELLS[18 + k];
        let changed = false;
        for (const c of other) {
          if (spots.includes(c)) continue;
          if (s.vals[c] === 0 && s.cand[c] & b) {
            s.cand[c] &= ~b;
            changed = true;
          }
        }
        if (changed) return true;
      }
    }
  }
  return false;
}

function nakedPair(s: State): boolean {
  for (const cells of UNIT_CELLS) {
    const empties = cells.filter((c) => s.vals[c] === 0 && popcount(s.cand[c]) === 2);
    for (let a = 0; a < empties.length; a++) {
      for (let b = a + 1; b < empties.length; b++) {
        const m = s.cand[empties[a]];
        if (s.cand[empties[b]] !== m) continue;
        let changed = false;
        for (const c of cells) {
          if (c === empties[a] || c === empties[b] || s.vals[c] !== 0) continue;
          if (s.cand[c] & m) {
            s.cand[c] &= ~m;
            changed = true;
          }
        }
        if (changed) return true;
      }
    }
  }
  return false;
}

const LADDER: Array<[Technique, (s: State) => boolean]> = [
  ['nakedSingle', nakedSingle],
  ['hiddenSingle', hiddenSingle],
  ['lockedCandidate', lockedCandidate],
  ['nakedPair', nakedPair],
];

function init(board: Board): State {
  const s: State = {
    vals: new Array(81).fill(0),
    cand: new Array(81).fill(0x3fe),
    contradiction: false,
  };
  for (let i = 0; i < 81; i++) if (board[i]) place(s, i, board[i]);
  return s;
}

const stuck = (s: State) =>
  s.contradiction || s.vals.some((v, i) => v === 0 && s.cand[i] === 0);

/**
 * Human-technique solver. Applies techniques in ascending difficulty,
 * restarting from the easiest after any progress. Never mutates `board`.
 * `hardest` is the hardest technique that made progress; 'advanced' if
 * the board could not be finished; null if nothing was needed.
 */
export function logicalSolve(board: Board): { solved: boolean; hardest: Technique | null } {
  const s = init(board);
  let hardest: Technique | null = null;
  const note = (t: Technique) => {
    if (hardest === null || RANK[t] > RANK[hardest]) hardest = t;
  };
  for (;;) {
    if (stuck(s)) return { solved: false, hardest: 'advanced' };
    if (s.vals.every((v) => v !== 0)) return { solved: true, hardest };
    let progressed = false;
    for (const [name, fn] of LADDER) {
      if (fn(s)) {
        note(name);
        progressed = true;
        break;
      }
    }
    if (!progressed) return { solved: false, hardest: 'advanced' };
  }
}

/**
 * Tier mapping (total and deterministic; never throws):
 *  - logic cannot finish the puzzle (needs search / advanced)  -> expert
 *  - otherwise take a base tier from the hardest technique:
 *      null / nakedSingle / hiddenSingle -> easy
 *      lockedCandidate / nakedPair       -> medium
 *  - then clue count can only raise the tier: >= TIER_CLUES.easy.min stays,
 *    >= medium.min -> at least medium, fewer -> hard.
 * So `hard` = solvable by the ladder but sparse (< medium.min clues).
 */
export function grade(givens: Board): Difficulty {
  const { solved, hardest } = logicalSolve(givens);
  if (!solved) return 'expert';
  const clues = givens.filter((v) => v !== 0).length;
  const base = hardest === 'lockedCandidate' || hardest === 'nakedPair' ? 1 : 0;
  const byClues = clues >= TIER_CLUES.easy.min ? 0 : clues >= TIER_CLUES.medium.min ? 1 : 2;
  return (['easy', 'medium', 'hard'] as const)[Math.max(base, byClues)];
}
