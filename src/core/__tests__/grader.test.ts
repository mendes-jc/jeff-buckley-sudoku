import { describe, it, expect } from 'vitest';
import { grade, logicalSolve, TIER_CLUES } from '../grader';
import { solve } from '../solver';
import type { Board, CellValue } from '../types';

const parse = (s: string): Board =>
  [...s].map((c) => (c === '.' ? 0 : Number(c)) as CellValue);

const full = solve(new Array(81).fill(0) as Board)!;
const withHoles = (holes: number[]): Board => {
  const b = [...full];
  for (const h of holes) b[h] = 0;
  return b;
};

// Arto Inkala's puzzle: needs far more than the supported ladder.
const HARD = parse(
  '8..........36......7..9.2...5...7.......457.....1...3...1....68..85...1..9....4..',
);

describe('logicalSolve', () => {
  it('solves a naked-single puzzle and reports nakedSingle', () => {
    const board = withHoles([0, 10, 20, 30, 40, 50, 60, 70, 80]);
    const copy = [...board];
    const r = logicalSolve(board);
    expect(r).toEqual({ solved: true, hardest: 'nakedSingle' });
    expect(board).toEqual(copy);
  });

  it('returns solved/null for an already-solved board', () => {
    expect(logicalSolve([...full])).toEqual({ solved: true, hardest: null });
  });

  it('reports advanced and unsolved when logic gets stuck', () => {
    expect(logicalSolve(HARD)).toEqual({ solved: false, hardest: 'advanced' });
  });

  it('does not throw on contradictory boards', () => {
    const bad = new Array(81).fill(0) as Board;
    bad[0] = 5;
    bad[1] = 5;
    expect(() => logicalSolve(bad)).not.toThrow();
    expect(logicalSolve(bad).solved).toBe(false);
  });
});

describe('grade', () => {
  it('grades a clue-rich singles-only puzzle easy', () => {
    expect(grade(withHoles([0, 10, 20, 30, 40, 50, 60, 70, 80]))).toBe('easy');
  });

  it('grades a puzzle requiring search expert', () => {
    expect(grade(HARD)).toBe('expert');
  });

  it('bumps logic-solvable puzzles to medium/hard as clues drop', () => {
    // Greedily dig holes while logic still solves, down to a target clue count.
    const dig = (target: number): Board => {
      const b = [...full];
      let clues = 81;
      for (let i = 0; i < 81 && clues > target; i++) {
        const keep = b[i];
        b[i] = 0;
        if (logicalSolve(b).solved) clues--;
        else b[i] = keep;
      }
      return b;
    };
    const mid = dig(33);
    expect(mid.filter(Boolean).length).toBe(33);
    expect(grade(mid)).toBe('medium');
    const sparse = dig(27);
    expect(sparse.filter(Boolean).length).toBe(27);
    expect(grade(sparse)).toBe('hard');
  });

  it('is total and deterministic, even for garbage input', () => {
    const tiers = ['easy', 'medium', 'hard', 'expert'];
    const bad = new Array(81).fill(0) as Board;
    bad[0] = 5;
    bad[1] = 5;
    expect(tiers).toContain(grade(bad));
    expect(grade(bad)).toBe(grade(bad));
    expect(grade(HARD)).toBe(grade(HARD));
  });
});

describe('TIER_CLUES', () => {
  it('has non-overlapping descending envelopes', () => {
    expect(TIER_CLUES.easy.min).toBeGreaterThan(TIER_CLUES.medium.max);
    expect(TIER_CLUES.medium.min).toBeGreaterThan(TIER_CLUES.hard.max);
    expect(TIER_CLUES.hard.min).toBeGreaterThan(TIER_CLUES.expert.max);
  });
});
