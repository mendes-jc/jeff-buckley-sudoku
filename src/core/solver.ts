import { peers } from './board';
import type { Board, CellValue } from './types';

const PEERS: number[][] = Array.from({ length: 81 }, (_, i) => peers(i));

function candidates(b: Board, i: number): CellValue[] {
  const used = new Set<number>();
  for (const p of PEERS[i]) used.add(b[p]);
  const out: CellValue[] = [];
  for (let d = 1; d <= 9; d++) if (!used.has(d)) out.push(d as CellValue);
  return out;
}

/** True if no filled cell shares its value with a peer. */
function consistent(b: Board): boolean {
  for (let i = 0; i < 81; i++) {
    if (b[i] === 0) continue;
    for (const p of PEERS[i]) if (b[p] === b[i]) return false;
  }
  return true;
}

/**
 * Backtracking search with MRV cell selection. Calls onSolution for each
 * solution found; stops when it returns true.
 */
function search(b: Board, onSolution: (b: Board) => boolean): boolean {
  let best = -1;
  let bestCands: CellValue[] = [];
  for (let i = 0; i < 81; i++) {
    if (b[i] !== 0) continue;
    const c = candidates(b, i);
    if (best === -1 || c.length < bestCands.length) {
      best = i;
      bestCands = c;
      if (c.length === 0) return false;
      if (c.length === 1) break;
    }
  }
  if (best === -1) return onSolution(b);
  for (const d of bestCands) {
    b[best] = d;
    if (search(b, onSolution)) {
      b[best] = 0;
      return true;
    }
  }
  b[best] = 0;
  return false;
}

export function solve(board: Board): Board | null {
  const work = [...board];
  if (!consistent(work)) return null;
  let result: Board | null = null;
  search(work, (b) => {
    result = [...b];
    return true;
  });
  return result;
}

export function countSolutions(board: Board, limit = 2): number {
  const work = [...board];
  if (!consistent(work)) return 0;
  let count = 0;
  search(work, () => {
    count++;
    return count >= limit;
  });
  return count;
}
