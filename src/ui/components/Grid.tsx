import { boxOf, colOf, rowOf } from '../../core/board';
import type { Action, GameState } from '../../game/state';
import { Cell } from './Cell';

export interface GridProps {
  state: GameState;
  conflicts: ReadonlySet<number>;
  dispatch: (a: Action) => void;
}

export function Grid({ state, conflicts, dispatch }: GridProps) {
  const { cells, selected, difficulty, solution } = state;
  const highlight = selected !== null && difficulty !== 'expert';
  const selValue = selected !== null ? cells[selected].value : 0;
  // Easy/Medium: gently flag a filled cell that doesn't match the solution.
  // Red conflicts already shout, so orange only shows when a cell isn't in conflict.
  const flagWrong = difficulty === 'easy' || difficulty === 'medium';
  return (
    <div className="grid" role="grid" aria-label="Sudoku board">
      {cells.map((cell, i) => {
        const isSel = i === selected;
        const peer =
          highlight &&
          !isSel &&
          (rowOf(i) === rowOf(selected!) || colOf(i) === colOf(selected!) || boxOf(i) === boxOf(selected!));
        const sameValue = highlight && !isSel && selValue !== 0 && cell.value === selValue;
        const isConflict = conflicts.has(i);
        const wrong =
          flagWrong && !isConflict && !cell.given && cell.value !== 0 && cell.value !== solution[i];
        return (
          <Cell
            key={i}
            index={i}
            cell={cell}
            selected={isSel}
            peer={peer}
            sameValue={sameValue}
            conflict={isConflict}
            wrong={wrong}
            onSelect={(index) => dispatch({ type: 'select', index })}
          />
        );
      })}
    </div>
  );
}
