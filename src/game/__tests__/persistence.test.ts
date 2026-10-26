import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initGame } from '../state';
import {
  clearGame, loadDaily, loadGame, loadSettings, loadStats,
  saveDaily, saveGame, saveSettings, saveStats,
} from '../persistence';
import type { Board } from '../../core/types';

const solution = Array.from({ length: 81 }, (_, i) => (i % 9) + 1) as Board;
const givens = solution.map((v, i) => (i % 2 ? v : 0)) as Board;
const game = () => initGame({ givens, solution, difficulty: 'medium' });

const DEFAULT_SETTINGS = { theme: 'system', soundOn: true, volume: 0.7 };
const DEFAULT_STATS = { gamesCompleted: 0, bestMsByTier: {}, winStreak: 0 };

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('round trips', () => {
  it('game', () => {
    const g = game();
    saveGame(g);
    expect(loadGame()).toEqual(g);
    clearGame();
    expect(loadGame()).toBeNull();
  });
  it('settings/stats/daily', () => {
    saveSettings({ theme: 'dark', soundOn: false, volume: 0.2 });
    saveStats({ gamesCompleted: 4, bestMsByTier: { easy: 1 }, winStreak: 2 });
    saveDaily({ lastCompletedDate: '2026-01-01', streak: 5 });
    expect(loadSettings()).toEqual({ theme: 'dark', soundOn: false, volume: 0.2 });
    expect(loadStats()).toEqual({ gamesCompleted: 4, bestMsByTier: { easy: 1 }, winStreak: 2 });
    expect(loadDaily()).toEqual({ lastCompletedDate: '2026-01-01', streak: 5 });
  });
  it('defaults when absent or unparseable', () => {
    localStorage.setItem('jbs:settings', '{nope');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(loadStats()).toEqual(DEFAULT_STATS);
    expect(loadDaily()).toEqual({ streak: 0 });
  });
});

describe('[Review Focus] storage blocked', () => {
  it('returns defaults and does not throw', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(loadStats()).toEqual(DEFAULT_STATS);
    expect(loadDaily()).toEqual({ streak: 0 });
    expect(loadGame()).toBeNull();
    expect(() => saveGame(game())).not.toThrow();
    expect(() => saveSettings(loadSettings())).not.toThrow();
    expect(() => clearGame()).not.toThrow();
  });
  it('survives localStorage being undefined', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(loadDaily()).toEqual({ streak: 0 });
    expect(() => saveGame(game())).not.toThrow();
  });
});

describe('[Review Focus] corrupt save', () => {
  it('malformed JSON -> null', () => {
    localStorage.setItem('jbs:game', '{not json');
    expect(loadGame()).toBeNull();
  });
  it('missing or invalid fields -> null', () => {
    const g = game();
    const put = (v: unknown) => localStorage.setItem('jbs:game', JSON.stringify(v));
    put({ difficulty: 'easy' });
    expect(loadGame()).toBeNull();
    put({ ...g, cells: g.cells.slice(0, 80) });
    expect(loadGame()).toBeNull();
    put({ ...g, difficulty: 'nope' });
    expect(loadGame()).toBeNull();
    put({ ...g, status: undefined });
    expect(loadGame()).toBeNull();
    put(null);
    expect(loadGame()).toBeNull();
  });
});
