import { cellsOf } from './board';
import type { Board, Unit } from './types';

const KINDS: Unit['kind'][] = ['row', 'col', 'box'];

/** Indices of every filled cell whose value is duplicated within its row, column, or box. */
export function findConflicts(board: Board): Set<number> {
  const conflicts = new Set<number>();
  for (const kind of KINDS) {
    for (let index = 0; index < 9; index++) {
      const seen = new Map<number, number>();
      for (const i of cellsOf({ kind, index } as Unit)) {
        const v = board[i];
        if (v === 0) continue;
        const prev = seen.get(v);
        if (prev !== undefined) {
          conflicts.add(prev);
          conflicts.add(i);
        } else {
          seen.set(v, i);
        }
      }
    }
  }
  return conflicts;
}
