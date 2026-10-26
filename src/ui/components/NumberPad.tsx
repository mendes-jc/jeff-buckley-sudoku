import { useEffect, useRef } from 'react';
import type { Action, GameState } from '../../game/state';

/** Remaining = 9 - occurrences on the board (occupancy, never correctness; Ruling 2). */
export function remainingCounts(cells: GameState['cells']): number[] {
  const counts = Array(10).fill(0) as number[];
  for (const c of cells) if (c.value !== 0) counts[c.value]++;
  return counts.map((n) => 9 - n);
}

export function NumberPad({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  const remaining = remainingCounts(state.cells);

  // Latest values via ref so the listener is attached once.
  const latest = useRef({ remaining, paused: state.paused, dispatch });
  latest.current = { remaining, paused: state.paused, dispatch };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { remaining: rem, paused, dispatch: d } = latest.current;
      if (paused || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[1-9]$/.test(e.key) && rem[Number(e.key)] > 0) d({ type: 'input', digit: Number(e.key) });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="numberpad">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
        <button
          key={d}
          type="button"
          className={`pad-digit${state.notesMode ? ' notes-active' : ''}`}
          aria-label={`Digit ${d}, ${remaining[d]} remaining`}
          disabled={state.paused || remaining[d] <= 0}
          onClick={() => dispatch({ type: 'input', digit: d })}
        >
          <span className="digit">{d}</span>
          <span className="remaining" data-testid={`remaining-${d}`}>
            {Math.max(0, remaining[d])}
          </span>
        </button>
      ))}
    </div>
  );
}
