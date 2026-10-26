import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { findConflicts } from '../../core/conflicts';
import { generateDaily } from '../../core/daily';
import { generatePuzzle } from '../../core/generator';
import { makeRng } from '../../core/rng';
import type { Difficulty } from '../../core/types';
import { reducer, type Action, type GameState } from '../../game/state';
import {
  clearGame,
  loadDaily,
  loadGame,
  loadSettings,
  loadStats,
  saveDaily,
  saveGame,
  saveStats,
} from '../../game/persistence';
import { recordDaily, recordWin } from '../../game/stats';
import { loadManifest } from '../../media/manifest';
import { MediaController } from '../../media/media';

/**
 * "No active game yet" is represented as `state === null` (UI shows the start screen).
 * Any action other than `newGame` is ignored while null.
 */
export type GameSlot = GameState | null;

function slotReducer(state: GameSlot, action: Action): GameSlot {
  if (state === null) return action.type === 'newGame' ? reducer(state as never, action) : null;
  return reducer(state, action);
}

/** Restore a saved game; clear lastCompleted so resuming never replays moans. */
function initSlot(): GameSlot {
  const saved = loadGame();
  return saved ? { ...saved, lastCompleted: [] } : null;
}

/** Local-timezone-independent "today": UTC date, ISO yyyy-mm-dd. */
const todayIso = (): string => new Date().toISOString().slice(0, 10);

function applySound(media: MediaController): void {
  const s = loadSettings();
  media.setMuted(!s.soundOn);
  media.setVolume(s.volume);
}

/**
 * @param injectedMedia optional MediaController (tests pass a spy). When omitted, one is built
 * from an empty manifest and rebuilt once `loadManifest()` resolves.
 */
export function useGame(injectedMedia?: MediaController) {
  const [state, dispatch] = useReducer(slotReducer, null, initSlot);
  const [backgroundPhoto, setBackgroundPhoto] = useState<string | null>(null);

  const mediaRef = useRef<MediaController>(injectedMedia ?? new MediaController({ photos: [], moans: [] }));
  if (injectedMedia) mediaRef.current = injectedMedia;

  // Production: swap in a manifest-backed controller once loaded; pick a background for a resumed game.
  useEffect(() => {
    if (injectedMedia) {
      applySound(injectedMedia);
      return;
    }
    let cancelled = false;
    loadManifest().then((manifest) => {
      if (cancelled) return;
      const media = new MediaController(manifest);
      applySound(media);
      mediaRef.current = media;
      setBackgroundPhoto((cur) => cur ?? media.pickBackground());
    });
    return () => {
      cancelled = true;
    };
  }, [injectedMedia]);

  const startGame = useCallback((difficulty: Difficulty) => {
    const puzzle = generatePuzzle(makeRng(Date.now()), difficulty);
    dispatch({ type: 'newGame', puzzle });
    setBackgroundPhoto(mediaRef.current.pickBackground());
  }, []);

  const startDaily = useCallback(() => {
    dispatch({ type: 'newGame', puzzle: generateDaily(todayIso()), isDaily: true });
    setBackgroundPhoto(mediaRef.current.pickBackground());
  }, []);

  const conflicts = useMemo(
    () => (state ? findConflicts(state.cells.map((c) => c.value)) : new Set<number>()),
    [state?.cells], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Timer
  const ticking = state !== null && state.status === 'playing' && !state.paused;
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => dispatch({ type: 'tick', ms: 1000 }), 1000);
    return () => clearInterval(id);
  }, [ticking]);

  // Auto-save (won games are cleared by the win effect instead)
  useEffect(() => {
    if (state && state.status === 'playing') saveGame(state);
  }, [state]);

  // Moan: once per transition, keyed on lastCompleted identity; empty arrays skipped.
  const lastCompleted = state?.lastCompleted;
  useEffect(() => {
    if (!lastCompleted || lastCompleted.length === 0) return;
    for (let i = 0; i < lastCompleted.length; i++) mediaRef.current.playMoan();
  }, [lastCompleted]);

  // Win: once per transition to 'won' (ref guards StrictMode effect re-runs).
  const stateRef = useRef(state);
  stateRef.current = state;
  const winHandled = useRef(false);
  const status = state?.status;
  useEffect(() => {
    if (status !== 'won') {
      winHandled.current = false;
      return;
    }
    if (winHandled.current) return;
    winHandled.current = true;
    const s = stateRef.current!;
    saveStats(recordWin(loadStats(), s.difficulty, s.elapsedMs));
    if (s.isDaily) saveDaily(recordDaily(loadDaily(), todayIso()));
    clearGame();
  }, [status]);

  return { state, dispatch, startGame, startDaily, conflicts, backgroundPhoto };
}
