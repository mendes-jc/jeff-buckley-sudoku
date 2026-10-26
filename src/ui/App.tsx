import { useEffect } from 'react';
import { PlayScreen } from './components/PlayScreen';
import { useGame } from './hooks/useGame';

/** Minimal shell: Task 16 replaces this with the start screen, routing and modals. */
export function App() {
  const { state, dispatch, startGame, conflicts, backgroundPhoto } = useGame();

  // Placeholder for the no-active-game case: auto-start an easy game.
  useEffect(() => {
    if (state === null) startGame('easy');
  }, [state, startGame]);

  if (state === null) return null;
  return <PlayScreen state={state} dispatch={dispatch} conflicts={conflicts} backgroundPhoto={backgroundPhoto} />;
}
