import { describe, it, expect } from 'vitest';
import { findConflicts } from '../conflicts';
import { completedUnitKeys, newlyCompleted } from '../completion';
import type { Board, CellValue } from '../types';

const SOLVED: CellValue[] = [
  5,3,4,6,7,8,9,1,2,
  6,7,2,1,9,5,3,4,8,
  1,9,8,3,4,2,5,6,7,
  8,5,9,7,6,1,4,2,3,
  4,2,6,8,5,3,7,9,1,
  7,1,3,9,2,4,8,5,6,
  9,6,1,5,3,7,2,8,4,
  2,8,7,4,1,9,6,3,5,
  3,4,5,2,8,6,1,7,9,
];

function empty(): Board {
  return new Array(81).fill(0) as Board;
}

function withCells(indices: number[]): Board {
  const b = empty();
  for (const i of indices) b[i] = SOLVED[i];
  return b;
}

describe('completedUnitKeys', () => {
  it('reports a fully correct row and nothing else', () => {
    const keys = completedUnitKeys(withCells([0, 1, 2, 3, 4, 5, 6, 7, 8]));
    expect(keys.has('row-0')).toBe(true);
    expect(keys.has('row-1')).toBe(false);
    expect(keys.size).toBe(1);
  });

  it('does not report a filled row containing a duplicate', () => {
    const b = withCells([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    b[8] = b[0];
    expect(completedUnitKeys(b).has('row-0')).toBe(false);
  });

  it('regression: valid row stays complete when a cell clashes in its column with a stray cell', () => {
    const b = withCells([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    b[27] = b[0]; // same column as cell 0, outside row 0 and its box
    expect(findConflicts(b).has(0)).toBe(true);
    expect(completedUnitKeys(b).has('row-0')).toBe(true);
  });

  it('reports all 27 units for a solved board', () => {
    expect(completedUnitKeys(SOLVED).size).toBe(27);
  });

  it('does not mutate its input', () => {
    const b = withCells([0, 1, 2]);
    const copy = [...b];
    completedUnitKeys(b);
    expect(b).toEqual(copy);
  });
});

describe('newlyCompleted', () => {
  it('returns only added keys and does not re-report existing ones', () => {
    const prev = new Set(['row-0']);
    const next = new Set(['row-0', 'col-2']);
    expect(newlyCompleted(prev, next)).toEqual(['col-2']);
    expect(newlyCompleted(next, next)).toEqual([]);
  });

  it('[Review Focus] one placement completes both a row and a box', () => {
    const cells = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20];
    const before = withCells(cells);
    const after = [...before] as Board;
    after[0] = SOLVED[0];
    const result = newlyCompleted(completedUnitKeys(before), completedUnitKeys(after));
    expect(result).toHaveLength(2);
    expect(result).toContain('row-0');
    expect(result).toContain('box-0');
  });
});
