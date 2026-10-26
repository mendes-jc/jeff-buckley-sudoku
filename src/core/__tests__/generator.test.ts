import { describe, it, expect } from 'vitest';
import { generatePuzzle, generateSolvedGrid } from '../generator';
import { grade } from '../grader';
import { countSolutions, solve } from '../solver';
import { makeRng } from '../rng';
import { cellsOf } from '../board';
import type { Board, Difficulty, Unit } from '../types';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

/** Every row/col/box is a permutation of 1..9 and no cell is empty. */
function isValidFullGrid(b: Board): boolean {
  if (b.length !== 81 || b.some((v) => v === 0)) return false;
  const units: Unit[] = [];
  for (const kind of ['row', 'col', 'box'] as const)
    for (let index = 0; index < 9; index++) units.push({ kind, index });
  for (const u of units) {
    const seen = new Set(cellsOf(u).map((c) => b[c]));
    if (seen.size !== 9) return false;
  }
  return true;
}

describe('generateSolvedGrid', () => {
  it('produces a full, conflict-free grid', () => {
    const grid = generateSolvedGrid(makeRng(1));
    expect(grid).toHaveLength(81);
    expect(grid.filter((v) => v !== 0)).toHaveLength(81);
    expect(isValidFullGrid(grid)).toBe(true);
  });

  it('is deterministic for a fixed seed and varies across seeds', () => {
    expect(generateSolvedGrid(makeRng(5))).toEqual(generateSolvedGrid(makeRng(5)));
    expect(generateSolvedGrid(makeRng(1))).not.toEqual(generateSolvedGrid(makeRng(2)));
  });
});

describe('generatePuzzle', () => {
  for (const d of DIFFICULTIES) {
    it(`produces a unique, correctly-graded ${d} puzzle`, () => {
      for (const seed of [1, 7]) {
        const puzzle = generatePuzzle(makeRng(seed), d);
        expect(puzzle.difficulty).toBe(d);
        expect(isValidFullGrid(puzzle.solution)).toBe(true);
        // givens are a subset of the solution
        for (let i = 0; i < 81; i++) {
          if (puzzle.givens[i] !== 0) expect(puzzle.givens[i]).toBe(puzzle.solution[i]);
        }
        // uniqueness + the solution is THE solution of the givens
        expect(countSolutions(puzzle.givens, 2)).toBe(1);
        expect(solve(puzzle.givens)).toEqual(puzzle.solution);
        // exact tier match (CONTROLLER RULING 1)
        expect(grade(puzzle.givens)).toBe(d);
      }
    });
  }

  it('is deterministic for a fixed seed', () => {
    const a = generatePuzzle(makeRng(3), 'hard');
    const b = generatePuzzle(makeRng(3), 'hard');
    expect(a).toEqual(b);
  });
});

describe('[Review Focus] uniqueness + grade over seeds 1..30 x 4 tiers', () => {
  it('every generated puzzle has exactly one solution and the requested grade', () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const d of DIFFICULTIES) {
        const { givens } = generatePuzzle(makeRng(seed), d);
        expect(countSolutions(givens, 2)).toBe(1);
        expect(grade(givens)).toBe(d);
      }
    }
  }, 60000);
});
