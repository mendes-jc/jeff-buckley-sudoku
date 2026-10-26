export type CellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Flat length-81 array, row-major. 0 = empty. */
export type Board = CellValue[];

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface Puzzle {
  givens: Board;
  solution: Board;
  difficulty: Difficulty;
}

export type UnitKind = 'row' | 'col' | 'box';

export interface Unit {
  kind: UnitKind;
  /** 0-8 */
  index: number;
}
