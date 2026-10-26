import { boxOf, colOf, rowOf } from '../../core/board';
import type { Action, GameState } from '../../game/state';
import { Cell } from './Cell';

export interface GridProps {
  state: GameState;
  conflicts: ReadonlySet<number>;
  dispatch: (a: Action) => void;
}

export function Grid({ state, conflicts, dispatch }: GridProps) {
  const { cells, selected, difficulty } = state;
  const highlight = selected !== null && difficulty !== 'expert';
  const selValue = selected !== null ? cells[selected].value : 0;
  return (
    <div className="grid" role="grid" aria-label="Sudoku board">
      {cells.map((cell, i) => {
        const isSel = i === selected;
        const peer =
          highlight &&
          !isSel &&
          (rowOf(i) === rowOf(selected!) || colOf(i) === colOf(selected!) || boxOf(i) === boxOf(selected!));
        const sameValue = highlight && !isSel && selValue !== 0 && cell.value === selValue;
        return (
          <Cell
            key={i}
            index={i}
            cell={cell}
            selected={isSel}
            peer={peer}
            sameValue={sameValue}
            conflict={conflicts.has(i)}
            onSelect={(index) => dispatch({ type: 'select', index })}
          />
        );
      })}
    </div>
  );
}
