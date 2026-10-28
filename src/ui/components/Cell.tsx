import type { GameCell } from '../../game/state';

export interface CellProps {
  index: number;
  cell: GameCell;
  selected: boolean;
  peer: boolean;
  sameValue: boolean;
  conflict: boolean;
  wrong?: boolean;
  onSelect: (index: number) => void;
}

export function Cell({ index, cell, selected, peer, sameValue, conflict, wrong, onSelect }: CellProps) {
  const cls = [
    'cell',
    cell.given ? 'given' : '',
    selected ? 'selected' : '',
    peer ? 'peer' : '',
    sameValue ? 'same-value' : '',
    conflict ? 'conflict' : '',
    wrong ? 'wrong' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={cls}
      data-testid={`cell-${index}`}
      data-value={cell.value}
      aria-label={`Row ${Math.floor(index / 9) + 1}, column ${(index % 9) + 1}${cell.value ? `, ${cell.value}` : ', empty'}`}
      onClick={() => onSelect(index)}
    >
      {cell.value !== 0 ? (
        <span className="value">{cell.value}</span>
      ) : (
        <span className="notes">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
            <span key={d} className="note" data-testid={cell.notes.includes(d) ? `note-${index}-${d}` : undefined}>
              {cell.notes.includes(d) ? d : ''}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
