import type { GameState } from '../../game/state';

export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function Header({ state }: { state: GameState }) {
  const label = state.isDaily ? 'Daily' : state.difficulty.charAt(0).toUpperCase() + state.difficulty.slice(1);
  return (
    <header className="play-header">
      <span className="difficulty">{label}</span>
      <span className="timer">{formatTime(state.elapsedMs)}</span>
      {state.paused && <span className="paused-indicator">Paused</span>}
    </header>
  );
}
