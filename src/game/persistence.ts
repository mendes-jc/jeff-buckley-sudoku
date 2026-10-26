import type { Difficulty } from '../core/types';
import type { GameState } from './state';

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  soundOn: boolean;
  volume: number;
}

export interface Stats {
  gamesCompleted: number;
  bestMsByTier: Partial<Record<Difficulty, number>>;
  winStreak: number;
}

export interface DailyRecord {
  lastCompletedDate?: string;
  streak: number;
}

const KEYS = {
  game: 'jbs:game',
  settings: 'jbs:settings',
  stats: 'jbs:stats',
  daily: 'jbs:daily',
} as const;

const DIFFICULTIES: readonly string[] = ['easy', 'medium', 'hard', 'expert'];

const defaultSettings = (): Settings => ({ theme: 'system', soundOn: true, volume: 0.7 });
const defaultStats = (): Stats => ({ gamesCompleted: 0, bestMsByTier: {}, winStreak: 0 });
const defaultDaily = (): DailyRecord => ({ streak: 0 });

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked or full: ignore */
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function loadJson<T>(key: string, fallback: () => T): T {
  const raw = safeGet(key);
  if (raw === null) return fallback();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback();
    return { ...fallback(), ...(parsed as object) } as T;
  } catch {
    return fallback();
  }
}

function isGameState(v: unknown): v is GameState {
  if (v === null || typeof v !== 'object') return false;
  const g = v as Record<string, unknown>;
  return (
    Array.isArray(g.cells) &&
    g.cells.length === 81 &&
    Array.isArray(g.solution) &&
    g.solution.length === 81 &&
    typeof g.difficulty === 'string' &&
    DIFFICULTIES.includes(g.difficulty) &&
    (g.status === 'playing' || g.status === 'won') &&
    typeof g.elapsedMs === 'number' &&
    Array.isArray(g.undoStack) &&
    Array.isArray(g.redoStack) &&
    Array.isArray(g.completedUnits) &&
    g.cells.every(
      (c) => c !== null && typeof c === 'object' && Array.isArray((c as { notes?: unknown }).notes),
    )
  );
}

export function saveGame(s: GameState): void {
  safeSet(KEYS.game, JSON.stringify(s));
}

export function loadGame(): GameState | null {
  const raw = safeGet(KEYS.game);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isGameState(parsed)) return parsed;
  } catch {
    /* fall through */
  }
  clearGame();
  return null;
}

export function clearGame(): void {
  safeRemove(KEYS.game);
}

export const saveSettings = (s: Settings): void => safeSet(KEYS.settings, JSON.stringify(s));
export const loadSettings = (): Settings => loadJson(KEYS.settings, defaultSettings);

export const saveStats = (s: Stats): void => safeSet(KEYS.stats, JSON.stringify(s));
export const loadStats = (): Stats => loadJson(KEYS.stats, defaultStats);

export const saveDaily = (d: DailyRecord): void => safeSet(KEYS.daily, JSON.stringify(d));
export const loadDaily = (): DailyRecord => loadJson(KEYS.daily, defaultDaily);
