import { describe, it, expect } from 'vitest';
import { solve, countSolutions } from '../solver';
import { cellsOf } from '../board';
import type { Board, CellValue } from '../types';

const parse = (s: string): Board => [...s].map((c) => Number(c) as CellValue);

const PUZZLE = parse(
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
);
const SOLUTION = parse(
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
);

function hasNoConflicts(b: Board): boolean {
  for (const kind of ['row', 'col', 'box'] as const) {
    for (let index = 0; index < 9; index++) {
      const vals = cellsOf({ kind, index }).map((i) => b[i]);
      if (new Set(vals).size !== 9 || vals.includes(0)) return false;
    }
  }
  return true;
}

const contradictory = (): Board => {
  const b = new Array(81).fill(0) as Board;
  b[0] = 5;
  b[1] = 5;
  return b;
};

describe('solve', () => {
  it('solves a known puzzle to its known solution', () => {
    const result = solve(PUZZLE);
    expect(result).toEqual(SOLUTION);
    expect(result!.includes(0)).toBe(false);
    expect(hasNoConflicts(result!)).toBe(true);
  });

  it('does not mutate the input', () => {
    const copy = [...PUZZLE];
    solve(PUZZLE);
    expect(PUZZLE).toEqual(copy);
  });

  it('returns null for a contradictory board', () => {
    expect(solve(contradictory())).toBeNull();
  });
});

describe('countSolutions', () => {
  it('returns 1 for a unique puzzle', () => {
    expect(countSolutions(PUZZLE)).toBe(1);
  });

  it('stops at the limit for a near-empty board', () => {
    const b = new Array(81).fill(0) as Board;
    b[0] = 1;
    expect(countSolutions(b, 2)).toBe(2);
  });

  it('returns 0 for a contradictory board', () => {
    expect(countSolutions(contradictory())).toBe(0);
  });
});
