import { describe, expect, it } from 'vitest';
import { recordDaily, recordWin } from '../stats';
import type { DailyRecord, Stats } from '../persistence';

describe('recordWin', () => {
  const base: Stats = { gamesCompleted: 2, bestMsByTier: { easy: 5000 }, winStreak: 1 };
  it('increments counts and sets first best', () => {
    const r = recordWin(base, 'hard', 9000);
    expect(r).toEqual({ gamesCompleted: 3, bestMsByTier: { easy: 5000, hard: 9000 }, winStreak: 2 });
  });
  it('updates best only when faster', () => {
    expect(recordWin(base, 'easy', 4000).bestMsByTier.easy).toBe(4000);
    expect(recordWin(base, 'easy', 6000).bestMsByTier.easy).toBe(5000);
  });
  it('does not mutate input', () => {
    const copy = JSON.parse(JSON.stringify(base));
    recordWin(base, 'easy', 1);
    expect(base).toEqual(copy);
  });
});

describe('recordDaily', () => {
  it('consecutive day increments (across month boundary)', () => {
    expect(recordDaily({ lastCompletedDate: '2026-02-28', streak: 3 }, '2026-03-01')).toEqual({
      lastCompletedDate: '2026-03-01',
      streak: 4,
    });
  });
  it('gap resets to 1', () => {
    expect(recordDaily({ lastCompletedDate: '2026-03-01', streak: 3 }, '2026-03-05').streak).toBe(1);
  });
  it('no prior date starts at 1', () => {
    expect(recordDaily({ streak: 0 }, '2026-03-05')).toEqual({ lastCompletedDate: '2026-03-05', streak: 1 });
  });
  it('same date is a no-op and input is not mutated', () => {
    const d: DailyRecord = { lastCompletedDate: '2026-03-05', streak: 2 };
    expect(recordDaily(d, '2026-03-05')).toEqual({ lastCompletedDate: '2026-03-05', streak: 2 });
    expect(d).toEqual({ lastCompletedDate: '2026-03-05', streak: 2 });
  });
});
