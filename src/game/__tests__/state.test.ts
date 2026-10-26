import { describe, it, expect } from 'vitest';
import { initGame, reducer, type GameState } from '../state';
import type { Board, CellValue, Puzzle } from '../../core/types';

const SOLUTION = (
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179'
).split('').map(Number) as CellValue[];

function puzzleWithBlanks(blanks: number[]): Puzzle {
  const givens = [...SOLUTION] as Board;
  for (const b of blanks) givens[b] = 0;
  return { givens, solution: [...SOLUTION] as Board, difficulty: 'easy' };
}

const sel = (s: GameState, i: number) => reducer(s, { type: 'select', index: i });
const input = (s: GameState, d: number) => reducer(s, { type: 'input', digit: d });

describe('game reducer', () => {
  it('newGame seeds given flags', () => {
    const p = puzzleWithBlanks([0, 1]);
    const s = reducer(initGame(puzzleWithBlanks([5])), { type: 'newGame', puzzle: p, isDaily: true });
    expect(s.cells[0]).toEqual({ value: 0, notes: [], given: false });
    expect(s.cells[2]).toEqual({ value: 4, notes: [], given: true });
    expect(s.isDaily).toBe(true);
    expect(s.status).toBe('playing');
    expect(s.undoStack).toEqual([]);
  });

  it('input sets value, clears notes, pushes undo', () => {
    let s = initGame(puzzleWithBlanks([0, 1]));
    s = sel(s, 0);
    s = reducer(s, { type: 'toggleNotes' });
    s = input(s, 2);
    s = reducer(s, { type: 'toggleNotes' });
    s = input(s, 5);
    expect(s.cells[0].value).toBe(5);
    expect(s.cells[0].notes).toEqual([]);
    expect(s.undoStack.length).toBe(2);
  });

  it('input on a given cell is a no-op', () => {
    const s = sel(initGame(puzzleWithBlanks([0])), 2);
    const n = input(s, 9);
    expect(n.cells).toEqual(s.cells);
    expect(n.undoStack.length).toBe(0);
    expect(n.lastCompleted).toEqual([]);
  });

  it('input does not mutate the previous state', () => {
    const s = sel(initGame(puzzleWithBlanks([0, 1])), 0);
    const frozen = JSON.stringify(s);
    input(s, 5);
    reducer(reducer(s, { type: 'toggleNotes' }), { type: 'input', digit: 3 });
    expect(JSON.stringify(s)).toBe(frozen);
  });

  it('notes mode toggles notes', () => {
    let s = sel(initGame(puzzleWithBlanks([0])), 0);
    s = reducer(s, { type: 'toggleNotes' });
    s = input(s, 4);
    expect(s.cells[0].notes).toEqual([4]);
    expect(s.cells[0].value).toBe(0);
    s = input(s, 4);
    expect(s.cells[0].notes).toEqual([]);
  });

  it('erase clears value and notes', () => {
    let s = sel(initGame(puzzleWithBlanks([0, 1])), 0);
    s = input(s, 5);
    s = reducer(s, { type: 'erase' });
    expect(s.cells[0]).toEqual({ value: 0, notes: [], given: false });
    expect(s.completedUnits).not.toContain('row-0');
    const g = reducer(sel(s, 2), { type: 'erase' });
    expect(g.cells[2].value).toBe(4);
  });

  it('undo reverts, redo re-applies, new input clears redo', () => {
    let s = sel(initGame(puzzleWithBlanks([0, 1])), 0);
    s = input(s, 5);
    s = reducer(s, { type: 'undo' });
    expect(s.cells[0].value).toBe(0);
    expect(s.redoStack.length).toBe(1);
    expect(s.lastCompleted).toEqual([]);
    s = reducer(s, { type: 'redo' });
    expect(s.cells[0].value).toBe(5);
    s = reducer(s, { type: 'undo' });
    s = input(s, 7);
    expect(s.redoStack).toEqual([]);
  });

  it('reports newly completed units; undo/redo do not replay', () => {
    let s = sel(initGame(puzzleWithBlanks([0])), 0);
    s = input(s, 5);
    expect([...s.lastCompleted].sort()).toEqual(['box-0', 'col-0', 'row-0']);
    expect(s.status).toBe('won');
    s = reducer(s, { type: 'undo' });
    expect(s.lastCompleted).toEqual([]);
    expect(s.completedUnits).not.toContain('row-0');
    s = reducer(s, { type: 'redo' });
    expect(s.lastCompleted).toEqual([]);
    expect(s.completedUnits).toContain('row-0');
  });

  it('re-completing after breaking re-reports', () => {
    let s = sel(initGame(puzzleWithBlanks([0, 80])), 0);
    s = input(s, 5);
    expect(s.lastCompleted.length).toBe(3);
    s = input(s, 6);
    expect(s.completedUnits).not.toContain('row-0');
    s = input(s, 5);
    expect([...s.lastCompleted].sort()).toEqual(['box-0', 'col-0', 'row-0']);
    expect(s.status).toBe('playing');
  });

  it('wins only on full conflict-free board', () => {
    let s = sel(initGame(puzzleWithBlanks([0])), 0);
    s = input(s, 1);
    expect(s.status).toBe('playing');
    s = input(s, 5);
    expect(s.status).toBe('won');
  });

  it('tick only when playing and unpaused', () => {
    let s = initGame(puzzleWithBlanks([0]));
    s = reducer(s, { type: 'tick', ms: 1000 });
    expect(s.elapsedMs).toBe(1000);
    s = reducer(s, { type: 'togglePause' });
    expect(reducer(s, { type: 'tick', ms: 1000 }).elapsedMs).toBe(1000);
    s = reducer(s, { type: 'togglePause' });
    s = input(sel(s, 0), 5);
    expect(reducer(s, { type: 'tick', ms: 1000 }).elapsedMs).toBe(1000);
  });
});
