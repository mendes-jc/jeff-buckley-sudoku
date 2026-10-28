import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../useGame';
import { generatePuzzle } from '../../../core/generator';
import { makeRng } from '../../../core/rng';
import { initGame } from '../../../game/state';
import { saveGame, loadGame, loadStats } from '../../../game/persistence';
import type { MediaController } from '../../../media/media';
import type { Puzzle } from '../../../core/types';

function makeMedia() {
  return {
    playMoan: vi.fn(),
    playEnding: vi.fn(),
    pickBackground: vi.fn(() => '/photo.jpg'),
    setMuted: vi.fn(),
    setVolume: vi.fn(),
  };
}
const asMedia = (m: ReturnType<typeof makeMedia>) => m as unknown as MediaController;

/** Solved grid with cells 0 and 40 blanked (different row/col/box). */
function nearlyDone(): Puzzle {
  const full = generatePuzzle(makeRng(1), 'easy').solution;
  const givens = full.slice();
  givens[0] = 0;
  givens[40] = 0;
  return { givens, solution: full, difficulty: 'easy' };
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('useGame', () => {
  it('has no active game (state null) when nothing is saved', () => {
    const { result } = renderHook(() => useGame(asMedia(makeMedia())));
    expect(result.current.state).toBeNull();
  });

  it('startGame populates a playing game with givens and a background', () => {
    const media = makeMedia();
    const { result } = renderHook(() => useGame(asMedia(media)));
    act(() => result.current.startGame('easy'));
    const s = result.current.state!;
    expect(s.status).toBe('playing');
    expect(s.difficulty).toBe('easy');
    expect(s.cells.some((c) => c.given)).toBe(true);
    expect(result.current.backgroundPhoto).toBe('/photo.jpg');
  });

  it('restores a saved game on mount without replaying moans', () => {
    const saved = initGame(nearlyDone());
    saved.lastCompleted = ['row-3'];
    saveGame(saved);
    const media = makeMedia();
    const { result } = renderHook(() => useGame(asMedia(media)));
    expect(result.current.state?.cells).toEqual(saved.cells);
    expect(media.playMoan).not.toHaveBeenCalled();
  });

  it('plays exactly one moan per move however many units complete, not on undo/redo', () => {
    saveGame(initGame(nearlyDone()));
    const media = makeMedia();
    const { result } = renderHook(() => useGame(asMedia(media)));
    const digit = result.current.state!.solution[0];
    act(() => result.current.dispatch({ type: 'select', index: 0 }));
    act(() => result.current.dispatch({ type: 'input', digit }));
    expect(result.current.state!.lastCompleted).toHaveLength(3); // row + col + box at once
    expect(media.playMoan).toHaveBeenCalledTimes(1); // but only one sound
    act(() => result.current.dispatch({ type: 'undo' }));
    act(() => result.current.dispatch({ type: 'redo' }));
    expect(media.playMoan).toHaveBeenCalledTimes(1);
  });

  it('plays a moan when a move uses up a digit without completing a unit', () => {
    // Blank cell 0 plus a peer in its row, column, and box, so filling cell 0
    // uses up its digit's 9th copy yet finishes no row/col/box.
    const full = generatePuzzle(makeRng(1), 'easy').solution;
    const d = full[0];
    const givens = full.slice();
    for (const b of [0, 1, 9, 10]) givens[b] = 0;
    saveGame(initGame({ givens, solution: full, difficulty: 'easy' }));
    const media = makeMedia();
    const { result } = renderHook(() => useGame(asMedia(media)));
    act(() => result.current.dispatch({ type: 'select', index: 0 }));
    act(() => result.current.dispatch({ type: 'input', digit: d }));
    expect(result.current.state!.lastCompleted).toHaveLength(0);
    expect(result.current.state!.exhaustedDigits).toEqual([d]);
    expect(media.playMoan).toHaveBeenCalledTimes(1);
  });

  it('on win records stats once, clears the save, and plays the finale (not a moan)', () => {
    saveGame(initGame(nearlyDone()));
    const media = makeMedia();
    const { result } = renderHook(() => useGame(asMedia(media)));
    const sol = result.current.state!.solution;
    act(() => result.current.dispatch({ type: 'select', index: 0 }));
    act(() => result.current.dispatch({ type: 'input', digit: sol[0] })); // completes units -> one moan
    expect(media.playMoan).toHaveBeenCalledTimes(1);
    act(() => result.current.dispatch({ type: 'select', index: 40 }));
    act(() => result.current.dispatch({ type: 'input', digit: sol[40] })); // wins
    expect(result.current.state!.status).toBe('won');
    expect(media.playEnding).toHaveBeenCalledTimes(1);
    expect(media.playMoan).toHaveBeenCalledTimes(1); // winning move plays the finale, not a moan
    expect(loadStats().gamesCompleted).toBe(1);
    expect(loadGame()).toBeNull();
    act(() => vi.advanceTimersByTime(3000));
    expect(loadStats().gamesCompleted).toBe(1);
    expect(loadGame()).toBeNull();
  });

  it('ticks every second while playing, and not while paused; autosaves', () => {
    const { result } = renderHook(() => useGame(asMedia(makeMedia())));
    act(() => result.current.startGame('easy'));
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.state!.elapsedMs).toBe(3000);
    expect(loadGame()?.elapsedMs).toBe(3000);
    act(() => result.current.dispatch({ type: 'togglePause' }));
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.state!.elapsedMs).toBe(3000);
  });

  it('derives conflicts from the board', () => {
    const { result } = renderHook(() => useGame(asMedia(makeMedia())));
    act(() => result.current.startGame('easy'));
    expect(result.current.conflicts.size).toBe(0);
  });
});
