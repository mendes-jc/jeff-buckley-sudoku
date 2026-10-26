import { cellsOf } from './board';
import type { Board, Unit } from './types';

const KINDS: Unit['kind'][] = ['row', 'col', 'box'];

/** Keys ("row-0".."box-8") of every unit whose own 9 cells are filled with a valid 1-9 set. */
export function completedUnitKeys(board: Board): Set<string> {
  const keys = new Set<string>();
  for (const kind of KINDS) {
    for (let index = 0; index < 9; index++) {
      const values = cellsOf({ kind, index }).map((i) => board[i]);
      if (values.every((v) => v !== 0) && new Set(values).size === 9) {
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
