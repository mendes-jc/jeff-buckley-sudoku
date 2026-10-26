import { cellsOf } from './board';
import { findConflicts } from './conflicts';
import type { Board, Unit } from './types';

const KINDS: Unit['kind'][] = ['row', 'col', 'box'];

/** Keys ("row-0".."box-8") of every unit that is fully filled and has no duplicates. */
export function completedUnitKeys(board: Board): Set<string> {
  const conflicts = findConflicts(board);
  const keys = new Set<string>();
  for (const kind of KINDS) {
    for (let index = 0; index < 9; index++) {
      const cells = cellsOf({ kind, index });
      if (cells.every((i) => board[i] !== 0 && !conflicts.has(i))) {
        keys.add(`${kind}-${index}`);
      }
    }
  }
  return keys;
}

/** Keys present in `next` but not in `prev`, in insertion order of `next`. */
export function newlyCompleted(prev: Set<string>, next: Set<string>): string[] {
  return [...next].filter((k) => !prev.has(k));
}
