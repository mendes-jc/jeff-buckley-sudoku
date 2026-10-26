import { useReducer } from 'react';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { PlayScreen } from '../PlayScreen';
import { findConflicts } from '../../../core/conflicts';
import { generatePuzzle } from '../../../core/generator';
import { makeRng } from '../../../core/rng';
import { peers } from '../../../core/board';
import { initGame, reducer } from '../../../game/state';
import type { Difficulty, Puzzle } from '../../../core/types';

afterEach(cleanup);

function Harness({ puzzle, photo }: { puzzle: Puzzle; photo?: string | null }) {
  const [state, dispatch] = useReducer(reducer, initGame(puzzle));
  const conflicts = findConflicts(state.cells.map((c) => c.value));
  return <PlayScreen state={state} dispatch={dispatch} conflicts={conflicts} backgroundPhoto={photo ?? null} />;
}

const puzzleOf = (d: Difficulty, seed = 7) => generatePuzzle(makeRng(seed), d);
const cell = (i: number) => screen.getByTestId(`cell-${i}`);
const has = (el: HTMLElement, cls: string) => el.classList.contains(cls);
const firstBlank = (p: Puzzle) => p.givens.findIndex((v) => v === 0);
const digitBtn = (d: number) => screen.getByRole('button', { name: new RegExp(`^digit ${d}\\b`, 'i') }) as HTMLButtonElement;

describe('play screen', () => {
  it('click a cell then a digit shows the digit in the cell', async () => {
    const p = puzzleOf('easy');
    const i = firstBlank(p);
    render(<Harness puzzle={p} />);
    await userEvent.click(cell(i));
    await userEvent.click(digitBtn(5));
    expect(cell(i).textContent).toContain('5');
    expect(cell(i).getAttribute('data-value')).toBe('5');
  });

  it('remaining = 9 - occurrences on board; disables at 0', async () => {
    const p = puzzleOf('easy');
    const ones = p.solution.map((v, i) => (v === 1 ? i : -1)).filter((i) => i >= 0);
    const givens = p.solution.map((v) => (v === 1 ? 1 : 0));
    givens[ones[0]] = 0;
    render(<Harness puzzle={{ givens, solution: p.solution, difficulty: 'easy' }} />);
    expect(screen.getByTestId('remaining-1').textContent).toBe('1');
    expect(digitBtn(1).disabled).toBe(false);
    await userEvent.click(cell(ones[0]));
    await userEvent.click(digitBtn(1));
    expect(screen.getByTestId('remaining-1').textContent).toBe('0');
    expect(digitBtn(1).disabled).toBe(true);
  });

  it('a wrong digit still decrements remaining (no correctness oracle)', async () => {
    const p = puzzleOf('easy');
    const i = firstBlank(p);
    const wrong = (p.solution[i] % 9) + 1;
    render(<Harness puzzle={p} />);
    const before = Number(screen.getByTestId(`remaining-${wrong}`).textContent);
    await userEvent.click(cell(i));
    await userEvent.click(digitBtn(wrong));
    expect(Number(screen.getByTestId(`remaining-${wrong}`).textContent)).toBe(before - 1);
  });

  it('peer highlight on non-expert, absent on expert', async () => {
    for (const [d, expected] of [['easy', true], ['expert', false]] as const) {
      const p = puzzleOf(d);
      const sel = 40;
      render(<Harness puzzle={p} />);
      await userEvent.click(cell(sel));
      expect(has(cell(sel), 'selected')).toBe(true);
      for (const q of peers(sel)) expect(has(cell(q), 'peer')).toBe(expected);
      if (!expected) {
        for (let i = 0; i < 81; i++) {
          expect(has(cell(i), 'same-value')).toBe(false);
          expect(has(cell(i), 'peer')).toBe(false);
        }
      }
      cleanup();
    }
  });

  it('same-value cells highlighted on non-expert', async () => {
    const p = puzzleOf('easy');
    const g = p.givens.findIndex((v) => v !== 0);
    const other = p.givens.findIndex((v, i) => i !== g && v === p.givens[g]);
    expect(other).toBeGreaterThanOrEqual(0);
    render(<Harness puzzle={p} />);
    await userEvent.click(cell(g));
    expect(has(cell(other), 'same-value')).toBe(true);
  });

  it('duplicate entry gets the conflict class', async () => {
    const p = puzzleOf('easy');
    const i = firstBlank(p);
    const rowStart = Math.floor(i / 9) * 9;
    const dupIdx = [...Array(9).keys()].map((k) => rowStart + k).find((k) => p.givens[k] !== 0)!;
    render(<Harness puzzle={p} />);
    await userEvent.click(cell(i));
    await userEvent.click(digitBtn(p.givens[dupIdx]));
    expect(has(cell(i), 'conflict')).toBe(true);
    expect(has(cell(dupIdx), 'conflict')).toBe(true);
  });

  it('notes mode renders a pencil mark, not a value', async () => {
    const p = puzzleOf('easy');
    const i = firstBlank(p);
    render(<Harness puzzle={p} />);
    await userEvent.click(screen.getByRole('button', { name: /notes/i }));
    expect(has(digitBtn(3), 'notes-active')).toBe(true);
    await userEvent.click(cell(i));
    await userEvent.click(digitBtn(3));
    expect(within(cell(i)).getByTestId(`note-${i}-3`)).toBeTruthy();
    expect(cell(i).getAttribute('data-value')).toBe('0');
  });

  it('undo reverts the last placement', async () => {
    const p = puzzleOf('easy');
    const i = firstBlank(p);
    render(<Harness puzzle={p} />);
    await userEvent.click(cell(i));
    await userEvent.click(digitBtn(5));
    expect(cell(i).getAttribute('data-value')).toBe('5');
    await userEvent.click(screen.getByRole('button', { name: /undo/i }));
    expect(cell(i).getAttribute('data-value')).toBe('0');
  });

  it('header shows mm:ss and difficulty; photo sits under a scrim', () => {
    render(<Harness puzzle={puzzleOf('hard')} photo="/p.jpg" />);
    expect(screen.getByText('00:00')).toBeTruthy();
    expect(screen.getByText('Hard')).toBeTruthy();
    expect(screen.getByTestId('bg-photo')).toBeTruthy();
    expect(screen.getByTestId('bg-scrim')).toBeTruthy();
  });
});
