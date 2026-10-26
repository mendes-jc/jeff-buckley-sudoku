import { useEffect, useRef } from 'react';
import type { GameState } from '../../game/state';
import { formatTime } from './Header';
import './screens.css';

export interface WinModalProps {
  state: GameState;
  onNewGame: () => void;
  onPlayAgain: () => void;
}

export function WinModal({ state, onNewGame, onPlayAgain }: WinModalProps) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), []);
  return (
    <div className="modal-backdrop">
      <div className="modal win-modal" role="dialog" aria-modal="true" aria-label="You won">
        <div className="celebrate" aria-hidden="true">
          ♪ ♫ ♪
        </div>
        <h2>Hallelujah, solved!</h2>
        <p className="win-time">{formatTime(state.elapsedMs)}</p>
        <div className="row">
          <button ref={first} onClick={onNewGame}>
            New game
          </button>
          {!state.isDaily && <button onClick={onPlayAgain}>Play again</button>}
        </div>
      </div>
    </div>
  );
}
