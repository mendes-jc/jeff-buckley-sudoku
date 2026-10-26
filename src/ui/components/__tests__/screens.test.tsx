import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { WinModal } from '../WinModal';
import { StatsScreen } from '../StatsScreen';
import { generatePuzzle } from '../../../core/generator';
import { makeRng } from '../../../core/rng';
import { initGame } from '../../../game/state';
import { loadSettings, saveDaily, saveStats } from '../../../game/persistence';

vi.mock('../../../media/manifest', () => ({
  loadManifest: () => Promise.resolve({ photos: [], moans: [] }),
}));

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('screens', () => {
  it('start screen tier button starts a game at that difficulty', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /^hard$/i }));
    expect(screen.getByText('Hard')).toBeTruthy();
    expect(screen.getByTestId('cell-0')).toBeTruthy();
  });

  it('Daily button starts the daily game', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /daily/i }));
    expect(screen.getByText('Daily')).toBeTruthy();
    expect(screen.getByTestId('cell-0')).toBeTruthy();
  });

  it('shows no Resume without a saved game', () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: /resume/i })).toBeNull();
  });

  it('WinModal shows the formatted time and new-game button', async () => {
    const won = { ...initGame(generatePuzzle(makeRng(3), 'easy')), status: 'won' as const, elapsedMs: 125_000 };
    const onNew = vi.fn();
    render(<WinModal state={won} onNewGame={onNew} onPlayAgain={vi.fn()} />);
    const dlg = screen.getByRole('dialog');
    expect(dlg.textContent).toContain('02:05');
    await userEvent.click(screen.getByRole('button', { name: /new game/i }));
    expect(onNew).toHaveBeenCalled();
  });

  it('sound toggle persists across reload', async () => {
    const { unmount } = render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /settings/i }));
    const toggle = screen.getByRole('checkbox', { name: /sound/i }) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    await userEvent.click(toggle);
    expect(loadSettings().soundOn).toBe(false);
    unmount();
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /settings/i }));
    expect((screen.getByRole('checkbox', { name: /sound/i }) as HTMLInputElement).checked).toBe(false);
    await userEvent.click(screen.getByRole('checkbox', { name: /sound/i }));
    expect(loadSettings().soundOn).toBe(true);
  });

  it('StatsScreen renders stored stats', () => {
    saveStats({ gamesCompleted: 7, winStreak: 3, bestMsByTier: { easy: 65_000, hard: 600_000 } });
    saveDaily({ streak: 4, lastCompletedDate: '2026-10-25' });
    render(<StatsScreen onBack={vi.fn()} />);
    expect(screen.getByTestId('stat-games').textContent).toBe('7');
    expect(screen.getByTestId('stat-winstreak').textContent).toBe('3');
    expect(screen.getByTestId('stat-daily').textContent).toBe('4');
    expect(screen.getByTestId('best-easy').textContent).toBe('01:05');
    expect(screen.getByTestId('best-hard').textContent).toBe('10:00');
    expect(screen.getByTestId('best-medium').textContent).toBe('—');
  });
});
