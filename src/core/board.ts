import type { Unit } from './types';

export function rowOf(i: number): number {
  return Math.floor(i / 9);
}

export function colOf(i: number): number {
  return i % 9;
}

export function boxOf(i: number): number {
  return Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);
}

export function cellsOf(unit: Unit): number[] {
  const out: number[] = [];
  const n = unit.index;
  for (let k = 0; k < 9; k++) {
    if (unit.kind === 'row') out.push(n * 9 + k);
    else if (unit.kind === 'col') out.push(k * 9 + n);
    else {
      const r = Math.floor(n / 3) * 3 + Math.floor(k / 3);
      const c = (n % 3) * 3 + (k % 3);
      out.push(r * 9 + c);
    }
  }
  return out;
}

export function peers(i: number): number[] {
  const set = new Set<number>();
  for (const unit of [
    { kind: 'row', index: rowOf(i) },
    { kind: 'col', index: colOf(i) },
    { kind: 'box', index: boxOf(i) },
  ] as Unit[]) {
    for (const c of cellsOf(unit)) if (c !== i) set.add(c);
  }
  return [...set];
}
