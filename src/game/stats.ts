import type { Difficulty } from '../core/types';
import type { DailyRecord, Stats } from './persistence';

export function recordWin(stats: Stats, difficulty: Difficulty, elapsedMs: number): Stats {
  const prior = stats.bestMsByTier[difficulty];
  const best = prior === undefined || elapsedMs < prior ? elapsedMs : prior;
  return {
    gamesCompleted: stats.gamesCompleted + 1,
    winStreak: stats.winStreak + 1,
    bestMsByTier: { ...stats.bestMsByTier, [difficulty]: best },
  };
}

const DAY_MS = 86_400_000;
const utcDay = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);

export function recordDaily(daily: DailyRecord, isoDate: string): DailyRecord {
  const last = daily.lastCompletedDate;
  if (last === isoDate) return daily;
  if (last !== undefined && utcDay(isoDate) - utcDay(last) === DAY_MS) {
    return { lastCompletedDate: isoDate, streak: daily.streak + 1 };
  }
  return { lastCompletedDate: isoDate, streak: 1 };
}
