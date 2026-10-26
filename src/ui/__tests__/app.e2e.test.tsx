import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generatePuzzle } from '../../core/generator';
import { makeRng } from '../../core/rng';
import type { MediaController } from '../../media/media';
import { App } from '../App';

/**
 * Deterministic approach: startGame seeds the puzzle with Date.now(), so a faked system
 * time makes the Easy puzzle reproducible; the test recomputes the same puzzle (and its
 * solution) with generatePuzzle(makeRng(NOW), 'easy'). It fills one row through the real
 * UI (click cell, click NumberPad digit). Only the last digit completes the row, so exactly
 * one moan must play. The media spy is injected via the App `media` prop -> useGame(media).
 */
const NOW = 1_700_000_000_000;

function makeMedia() {
  return {
    playMoan: vi.fn(),
    pickBackground: vi.fn(() => null),
    setMuted: vi.fn(),
    setVolume: vi.fn(),
  };
}

const cellValue = (i: number) => screen.getByTestId(`cell-${i}`).getAttribute('data-value');
const click = (el: HTMLElement) => {
  act(() => {
    fireEvent.click(el);
  });
};

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('app end-to-end', () => {
  it('start -> play -> row completion moans once -> theme toggle -> reload resumes', () => {
    const media = makeMedia();
    const puzzle = generatePuzzle(makeRng(NOW), 'easy');

    render(<App media={media as unknown as MediaController} />);
    click(screen.getByRole('button', { name: 'Easy' }));

    // Pick the row with the fewest blanks; fill every blank from the solution.
    let row = 0;
    let best = 10;
    for (let r = 0; r < 9; r++) {
      const n = puzzle.givens.slice(r * 9, r * 9 + 9).filter((v) => v === 0).length;
      if (n > 0 && n < best) {
        best = n;
        row = r;
      }
    }
    const blanks = [...Array(9).keys()].map((c) => row * 9 + c).filter((i) => puzzle.givens[i] === 0);
    blanks.forEach((i, n) => {
      click(screen.getByTestId(`cell-${i}`));
      click(screen.getByRole('button', { name: new RegExp(`^Digit ${puzzle.solution[i]},`) }));
      if (n < blanks.length - 1) expect(media.playMoan).not.toHaveBeenCalled();
    });
    expect(media.playMoan).toHaveBeenCalledTimes(1);

    // Settings: theme toggle applies to <html>.
    click(screen.getByRole('button', { name: 'Menu' }));
    click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'dark' } });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    click(screen.getByRole('button', { name: 'Back' }));

    // Simulated reload: tear down, keep localStorage, mount fresh.
    cleanup();
    document.documentElement.removeAttribute('data-theme');
    const media2 = makeMedia();
    render(<App media={media2 as unknown as MediaController} />);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    click(screen.getByRole('button', { name: 'Resume' }));
    blanks.forEach((i) => expect(cellValue(i)).toBe(String(puzzle.solution[i])));
    expect(media2.playMoan).not.toHaveBeenCalled();
  });
});
