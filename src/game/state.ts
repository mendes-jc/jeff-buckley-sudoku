import { completedUnitKeys, newlyCompleted } from '../core/completion';
import { findConflicts } from '../core/conflicts';
import type { Board, CellValue, Difficulty, Puzzle } from '../core/types';

export interface GameCell {
  value: CellValue;
  notes: number[];
  given: boolean;
}

/** Minimum needed to restore a move: the full cell array (cells are treated as immutable). */
export interface Snapshot {
  cells: GameCell[];
}

export interface GameState {
  cells: GameCell[];
  solution: Board;
  difficulty: Difficulty;
  isDaily: boolean;
  selected: number | null;
  notesMode: boolean;
  elapsedMs: number;
  paused: boolean;
  status: 'playing' | 'won';
  completedUnits: string[];
  lastCompleted: string[];
  undoStack: Snapshot[];
  redoStack: Snapshot[];
}

export type Action =
  | { type: 'newGame'; puzzle: Puzzle; isDaily?: boolean }
  | { type: 'select'; index: number }
  | { type: 'input'; digit: number }
  | { type: 'erase' }
  | { type: 'toggleNotes' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'togglePause' }
  | { type: 'tick'; ms: number };

const toBoard = (cells: GameCell[]): Board => cells.map((c) => c.value);

export function initGame(puzzle: Puzzle, isDaily = false): GameState {
  const cells: GameCell[] = puzzle.givens.map((v) =>
    v !== 0 ? { value: v, notes: [], given: true } : { value: 0, notes: [], given: false },
  );
  return {
    cells,
    solution: puzzle.solution,
    difficulty: puzzle.difficulty,
    isDaily,
    selected: null,
    notesMode: false,
    elapsedMs: 0,
    paused: false,
    status: 'playing',
    completedUnits: [...completedUnitKeys(toBoard(cells))],
    lastCompleted: [],
    undoStack: [],
    redoStack: [],
  };
}

/**
 * Apply a new cell array produced by a user move. Pushes the previous cells to undo,
 * clears redo, and recomputes completed units / win status.
 * Win test: board full and conflict-free (unique-solution puzzles => correct).
 */
function commit(state: GameState, cells: GameCell[]): GameState {
  const board = toBoard(cells);
  const prev = new Set(state.completedUnits);
  const next = completedUnitKeys(board);
  const full = board.every((v) => v !== 0);
  const won = full && findConflicts(board).size === 0;
  return {
    ...state,
    cells,
    undoStack: [...state.undoStack, { cells: state.cells }],
    redoStack: [],
    completedUnits: [...next],
    lastCompleted: newlyCompleted(prev, next),
    status: won ? 'won' : state.status,
  };
}

/** Restore cells from undo/redo: recompute units, never report lastCompleted. */
function restore(state: GameState, cells: GameCell[], undoStack: Snapshot[], redoStack: Snapshot[]): GameState {
  const board = toBoard(cells);
  const full = board.every((v) => v !== 0);
  const won = full && findConflicts(board).size === 0;
  return {
    ...state,
    cells,
    undoStack,
    redoStack,
    completedUnits: [...completedUnitKeys(board)],
    lastCompleted: [],
    status: won ? 'won' : 'playing',
  };
}

const noop = (state: GameState): GameState => ({ ...state, lastCompleted: [] });

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'newGame':
      return initGame(action.puzzle, action.isDaily ?? false);

    case 'select':
      return { ...state, selected: action.index, lastCompleted: [] };

    case 'input': {
      const i = state.selected;
      if (i === null || state.status === 'won') return noop(state);
      const cell = state.cells[i];
      if (cell.given) return noop(state);
      let updated: GameCell;
      if (state.notesMode) {
        const notes = cell.notes.includes(action.digit)
          ? cell.notes.filter((n) => n !== action.digit)
          : [...cell.notes, action.digit].sort((a, b) => a - b);
        updated = { ...cell, notes };
      } else {
        updated = { ...cell, value: action.digit as CellValue, notes: [] };
      }
      const cells = state.cells.map((c, idx) => (idx === i ? updated : c));
      return commit(state, cells);
    }

    case 'erase': {
      const i = state.selected;
      if (i === null || state.status === 'won') return noop(state);
      const cell = state.cells[i];
      if (cell.given || (cell.value === 0 && cell.notes.length === 0)) return noop(state);
      const cells = state.cells.map((c, idx) => (idx === i ? { ...c, value: 0 as CellValue, notes: [] } : c));
      return commit(state, cells);
    }

    case 'toggleNotes':
      return { ...state, notesMode: !state.notesMode, lastCompleted: [] };

    case 'undo': {
      if (state.undoStack.length === 0) return noop(state);
      const snap = state.undoStack[state.undoStack.length - 1];
      return restore(state, snap.cells, state.undoStack.slice(0, -1), [...state.redoStack, { cells: state.cells }]);
    }

    case 'redo': {
      if (state.redoStack.length === 0) return noop(state);
      const snap = state.redoStack[state.redoStack.length - 1];
      return restore(state, snap.cells, [...state.undoStack, { cells: state.cells }], state.redoStack.slice(0, -1));
    }

    case 'togglePause':
      return { ...state, paused: !state.paused, lastCompleted: [] };

    case 'tick':
      if (state.paused || state.status !== 'playing') return noop(state);
      return { ...state, elapsedMs: state.elapsedMs + action.ms, lastCompleted: [] };
  }
}
