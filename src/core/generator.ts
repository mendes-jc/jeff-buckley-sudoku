import { peers } from './board';
import { grade, logicalSolve, type Technique } from './grader';
import { countSolutions } from './solver';
import { shuffle, type RNG } from './rng';
import type { Board, CellValue, Difficulty, Puzzle } from './types';

const PEERS: number[][] = Array.from({ length: 81 }, (_, i) => peers(i));

/** Digits (1..9) not already used by a peer of cell `i`. */
function allowed(b: Board, i: number): CellValue[] {
  const used = new Array(10).fill(false);
  for (const p of PEERS[i]) used[b[p]] = true;
  const out: CellValue[] = [];
  for (let d = 1; d <= 9; d++) if (!used[d]) out.push(d as CellValue);
  return out;
}

/** Randomized backtracking fill of the first empty cell. */
function fill(b: Board, rng: RNG): boolean {
  let i = -1;
  for (let k = 0; k < 81; k++)
    if (b[k] === 0) {
      i = k;
      break;
    }
  if (i === -1) return true;
  for (const d of shuffle(allowed(b, i), rng)) {
    b[i] = d;
    if (fill(b, rng)) return true;
  }
  b[i] = 0;
  return false;
}

/** A complete, valid solution grid, driven entirely by `rng`. */
export function generateSolvedGrid(rng: RNG): Board {
  const b: Board = new Array(81).fill(0) as Board;
  fill(b, rng);
  return b;
}

const singlesOnly = (t: Technique | null): boolean =>
  t === null || t === 'nakedSingle' || t === 'hiddenSingle';

interface DigSpec {
  /** Stop removing once the clue count reaches this floor. */
  target: number;
  /** May the just-cleared board stand? (`b` already has the cell removed.) */
  accept: (b: Board) => boolean;
}

/**
 * How we dig toward each tier (see grader mapping in the task brief):
 *  - easy:   keep it singles-only; never go below 36 clues.
 *  - medium: keep it ladder-solvable; aim for 30 clues (30..35 all grade medium).
 *  - hard:   keep it ladder-solvable; aim for 26 clues (26..29 grade hard; the
 *            dig may get stuck >=30, which grades medium -> caller retries).
 *  - expert: keep it uniquely solvable only; aim low (~22). A minimal puzzle at
 *            that density is almost always past the ladder -> grades expert.
 */
function specFor(d: Difficulty): DigSpec {
  switch (d) {
    case 'easy':
      return {
        target: 36,
        accept: (b) => {
          const r = logicalSolve(b);
          return r.solved && singlesOnly(r.hardest);
        },
      };
    case 'medium':
      return { target: 30, accept: (b) => logicalSolve(b).solved };
    case 'hard':
      return { target: 26, accept: (b) => logicalSolve(b).solved };
    case 'expert':
      return { target: 22, accept: (b) => countSolutions(b, 2) === 1 };
  }
}

/** Remove cells in `order` while `spec.accept` holds, down to `spec.target`. */
function dig(solution: Board, order: number[], spec: DigSpec): Board {
  const b = [...solution] as Board;
  let clues = 81;
  for (const i of order) {
    if (clues <= spec.target) break;
    if (b[i] === 0) continue;
    const keep = b[i];
    b[i] = 0;
    if (spec.accept(b)) clues--;
    else b[i] = keep;
  }
  return b;
}

const ATTEMPT_CAP = 5000;

/**
 * Generate a puzzle with a GUARANTEED unique solution whose grade EXACTLY
 * matches `difficulty` (CONTROLLER RULING 1). Deterministic in `rng`: grid
 * fill, dig order, and every retry draw only from it. Throws if the (generous)
 * attempt cap is exhausted rather than return a mismatched puzzle.
 */
export function generatePuzzle(rng: RNG, difficulty: Difficulty): Puzzle {
  const spec = specFor(difficulty);
  const indices = Array.from({ length: 81 }, (_, i) => i);
  for (let attempt = 0; attempt < ATTEMPT_CAP; attempt++) {
    const solution = generateSolvedGrid(rng);
    const order = shuffle(indices, rng);
    const givens = dig(solution, order, spec);
    if (grade(givens) === difficulty && countSolutions(givens, 2) === 1) {
      return { givens, solution, difficulty };
    }
  }
  throw new Error(
    `generatePuzzle: exhausted ${ATTEMPT_CAP} attempts for difficulty "${difficulty}"`,
  );
}
