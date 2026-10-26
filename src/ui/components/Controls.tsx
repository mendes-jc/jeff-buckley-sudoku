import type { Action, GameState } from '../../game/state';

export function Controls({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  return (
    <div className="controls">
      <button type="button" aria-label="Undo" onClick={() => dispatch({ type: 'undo' })}>Undo</button>
      <button type="button" aria-label="Redo" onClick={() => dispatch({ type: 'redo' })}>Redo</button>
      <button type="button" aria-label="Erase" onClick={() => dispatch({ type: 'erase' })}>Erase</button>
      <button
        type="button"
        aria-label="Notes"
        aria-pressed={state.notesMode}
        className={state.notesMode ? 'active' : ''}
        onClick={() => dispatch({ type: 'toggleNotes' })}
      >
        Notes {state.notesMode ? 'on' : 'off'}
      </button>
      <button
        type="button"
        aria-label={state.paused ? 'Resume' : 'Pause'}
        onClick={() => dispatch({ type: 'togglePause' })}
      >
        {state.paused ? 'Resume' : 'Pause'}
      </button>
    </div>
  );
}
