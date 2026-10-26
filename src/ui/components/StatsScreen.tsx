import type { Difficulty } from '../../core/types';
import { loadDaily, loadStats } from '../../game/persistence';
import { formatTime } from './Header';
import './screens.css';

const TIERS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

export function StatsScreen({ onBack }: { onBack: () => void }) {
  const stats = loadStats();
  const daily = loadDaily();
  return (
    <main className="screen stats-screen">
      <h2>Stats</h2>
      <dl>
        <dt>Games completed</dt>
        <dd data-testid="stat-games">{stats.gamesCompleted}</dd>
        <dt>Win streak</dt>
        <dd data-testid="stat-winstreak">{stats.winStreak}</dd>
        <dt>Daily streak</dt>
        <dd data-testid="stat-daily">{daily.streak}</dd>
      </dl>
      <h3>Best times</h3>
      <dl>
        {TIERS.map((t) => (
          <div key={t} className="best-row">
            <dt>{t.charAt(0).toUpperCase() + t.slice(1)}</dt>
            <dd data-testid={`best-${t}`}>{stats.bestMsByTier[t] === undefined ? '—' : formatTime(stats.bestMsByTier[t]!)}</dd>
          </div>
        ))}
      </dl>
      <button onClick={onBack}>Back</button>
    </main>
  );
}
