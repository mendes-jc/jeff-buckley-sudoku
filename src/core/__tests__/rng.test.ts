import { describe, it, expect } from 'vitest';
import { makeRng, shuffle } from '../rng';

describe('makeRng', () => {
  it('is deterministic for the same seed and differs across seeds', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    const c = makeRng(43);
    const va = Array.from({ length: 5 }, () => a.next());
    const vb = Array.from({ length: 5 }, () => b.next());
    const vc = Array.from({ length: 5 }, () => c.next());
    expect(va).toEqual(vb);
    expect(va).not.toEqual(vc);
    for (const v of va) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  it('returns a permutation without mutating input', () => {
    const out = shuffle(input, makeRng(1));
    expect(out).toHaveLength(9);
    expect(out.slice().sort()).toEqual(input.slice().sort());
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(out).not.toBe(input);
  });
  it('is deterministic for a fixed seed', () => {
    expect(shuffle(input, makeRng(1))).toEqual(shuffle(input, makeRng(1)));
  });
});
