import { describe, it, expect } from 'vitest';
import { rowOf, colOf, boxOf, cellsOf, peers } from '../board';

describe('board indexing', () => {
  it('rowOf', () => {
    expect(rowOf(0)).toBe(0);
    expect(rowOf(80)).toBe(8);
  });
  it('colOf', () => {
    expect(colOf(9)).toBe(0);
    expect(colOf(80)).toBe(8);
  });
  it('boxOf', () => {
    expect(boxOf(0)).toBe(0);
    expect(boxOf(80)).toBe(8);
    expect(boxOf(20)).toBe(0);
    expect(boxOf(30)).toBe(4);
  });
});

describe('cellsOf', () => {
  it('row 0', () => {
    expect(cellsOf({ kind: 'row', index: 0 })).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it('col 0', () => {
    expect(cellsOf({ kind: 'col', index: 0 })).toEqual([0, 9, 18, 27, 36, 45, 54, 63, 72]);
  });
  it('box 0', () => {
    expect(cellsOf({ kind: 'box', index: 0 })).toEqual([0, 1, 2, 9, 10, 11, 18, 19, 20]);
  });
});

describe('peers', () => {
  it('peers(0)', () => {
    const p = peers(0);
    expect(p).toHaveLength(20);
    expect(p).not.toContain(0);
    for (const c of [1, 4, 9, 10]) expect(p).toContain(c);
    const expected = [1, 2, 3, 4, 5, 6, 7, 8, 9, 18, 27, 36, 45, 54, 63, 72, 10, 11, 19, 20];
    expect([...p].sort((a, b) => a - b)).toEqual(expected.sort((a, b) => a - b));
  });
  it('every cell has 20 distinct peers excluding itself', () => {
    for (let i = 0; i < 81; i++) {
      const p = peers(i);
      expect(new Set(p).size).toBe(20);
      expect(p).not.toContain(i);
    }
  });
});
