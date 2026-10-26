import type { Action, GameState } from '../../game/state';
import { Controls } from './Controls';
import { Grid } from './Grid';
import { Header } from './Header';
import { NumberPad } from './NumberPad';
import './play.css';

export interface PlayScreenProps {
  state: GameState;
  dispatch: (a: Action) => void;
  conflicts: ReadonlySet<number>;
  backgroundPhoto?: string | null;
}

export function PlayScreen({ state, dispatch, conflicts, backgroundPhoto }: PlayScreenProps) {
  return (
    <div className="play-screen">
      {backgroundPhoto && (
        <div
          className="bg-photo"
          data-testid="bg-photo"
          style={{ backgroundImage: `url(${backgroundPhoto})` }}
          aria-hidden="true"
        />
      )}
      <div className="bg-scrim" data-testid="bg-scrim" aria-hidden="true" />
      <div className="play-content">
        <Header state={state} />
        <div className={`board-wrap${state.paused ? ' is-paused' : ''}`}>
          <Grid state={state} conflicts={conflicts} dispatch={dispatch} />
        </div>
        <Controls state={state} dispatch={dispatch} />
        <NumberPad state={state} dispatch={dispatch} />
      </div>
    </div>
  );
}
