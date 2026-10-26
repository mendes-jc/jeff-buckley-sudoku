import { describe, it, expect } from 'vitest';
import { findConflicts } from '../conflicts';
import type { Board } from '../types';

const empty = (): Board => new Array(81).fill(0) as Board;
const sorted = (s: Set<number>) => [...s].sort((a, c) => a - c);

describe('findConflicts', () => {
  it('returns empty set for an empty board', () => {
    expect(findConflicts(empty()).size).toBe(0);
  });

  it('returns empty set for a valid partial board', () => {
    const b = empty();
    b[0] = 5;
    b[1] = 3;
    b[9] = 4;
    b[80] = 5;
    expect(findConflicts(b).size).toBe(0);
  });

  it('flags both cells of a row duplicate', () => {
    const b = empty();
    b[0] = 5;
    b[8] = 5;
    expect(sorted(findConflicts(b))).toEqual([0, 8]);
  });

  it('flags both cells of a column duplicate', () => {
    const b = empty();
    b[3] = 7;
    b[75] = 7;
    expect(sorted(findConflicts(b))).toEqual([3, 75]);
  });

  it('flags both cells of a box duplicate (different row and column)', () => {
    const b = empty();
    b[0] = 9; // r0c0
    b[20] = 9; // r2c2, same box only
    expect(sorted(findConflicts(b))).toEqual([0, 20]);
  });

  it('flags all cells in a triple duplicate', () => {
    const b = empty();
    b[0] = 2;
    b[4] = 2;
    b[8] = 2;
    expect(sorted(findConflicts(b))).toEqual([0, 4, 8]);
  });

  it('handles multiple separate conflicts and excludes empty and lone cells', () => {
    const b = empty();
    b[0] = 5;
    b[1] = 5; // row/box conflict
    b[40] = 3;
    b[49] = 3; // column conflict
    b[60] = 8; // lone
    const result = findConflicts(b);
    expect(sorted(result)).toEqual([0, 1, 40, 49]);
    expect(result.has(2)).toBe(false);
    expect(result.has(60)).toBe(false);
  });

  it('does not mutate the input', () => {
    const b = empty();
    b[0] = 5;
    b[1] = 5;
    const copy = [...b];
    findConflicts(b);
    expect(b).toEqual(copy);
  });
});
