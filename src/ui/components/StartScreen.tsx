import type { Difficulty } from '../../core/types';
import { loadGame } from '../../game/persistence';
import './screens.css';

const TIERS: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
  { id: 'expert', label: 'Expert' },
];

export interface StartScreenProps {
  onStart: (d: Difficulty) => void;
  onDaily: () => void;
  onResume: () => void;
  onStats: () => void;
  onSettings: () => void;
}

export function StartScreen({ onStart, onDaily, onResume, onStats, onSettings }: StartScreenProps) {
  const canResume = loadGame() !== null;
  return (
    <main className="screen start-screen">
      <h1>Jeff Buckley Sudoku</h1>
      <div className="stack">
        {canResume && <button onClick={onResume}>Resume</button>}
        {TIERS.map((t) => (
          <button key={t.id} onClick={() => onStart(t.id)}>
            {t.label}
          </button>
        ))}
        <button onClick={onDaily}>Daily</button>
      </div>
      <div className="row">
        <button onClick={onStats}>Stats</button>
        <button onClick={onSettings}>Settings</button>
      </div>
      <footer className="start-footer">
        made with <span className="love">love</span> for thatazini
      </footer>
    </main>
  );
}
