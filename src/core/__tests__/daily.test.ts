import { describe, it, expect } from 'vitest';
import { dateSeed, generateDaily } from '../daily';
import { countSolutions } from '../solver';

describe('dateSeed', () => {
  it('is stable and differs between dates', () => {
    expect(dateSeed('2026-10-26')).toBe(dateSeed('2026-10-26'));
    expect(dateSeed('2026-10-26')).not.toBe(dateSeed('2026-10-27'));
  });
  it('returns a uint32 integer', () => {
    const s = dateSeed('2026-10-26');
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(2 ** 32);
  });
});

describe('generateDaily', () => {
  it('is deterministic, medium, and uniquely solvable', () => {
    const a = generateDaily('2026-10-26');
    const b = generateDaily('2026-10-26');
    expect(a.givens).toEqual(b.givens);
    expect(a.solution).toEqual(b.solution);
    expect(a.difficulty).toBe('medium');
    expect(countSolutions(a.givens, 2)).toBe(1);
  });
});
