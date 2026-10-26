import { useState } from 'react';
import { PlayScreen } from './components/PlayScreen';
import { Settings } from './components/Settings';
import { StartScreen } from './components/StartScreen';
import { StatsScreen } from './components/StatsScreen';
import { WinModal } from './components/WinModal';
import type { MediaController } from '../media/media';
import { useGame } from './hooks/useGame';
import { useTheme } from './hooks/useTheme';
import './theme.css';
import './components/screens.css';

type Route = 'start' | 'play' | 'stats' | 'settings';

/** Router between start / play / stats / settings; the win modal overlays the play screen. */
export function App({ media }: { media?: MediaController } = {}) {
  useTheme(); // apply the persisted theme at startup, not only when Settings is opened
  const { state, dispatch, startGame, startDaily, conflicts, backgroundPhoto, refreshSound } = useGame(media);
  const [route, setRoute] = useState<Route>('start');
  const toStart = () => setRoute('start');

  if (route === 'stats') return <StatsScreen onBack={toStart} />;
  if (route === 'settings') return <Settings onBack={toStart} onSoundChange={refreshSound} />;

  if (route === 'play' && state) {
    return (
      <>
        <PlayScreen state={state} dispatch={dispatch} conflicts={conflicts} backgroundPhoto={backgroundPhoto} />
        <button className="play-menu" onClick={toStart}>
          Menu
        </button>
        {state.status === 'won' && (
          <WinModal
            state={state}
            onNewGame={toStart}
            onPlayAgain={() => startGame(state.difficulty)}
          />
        )}
      </>
    );
  }

  return (
    <StartScreen
      onStart={(d) => {
        startGame(d);
        setRoute('play');
      }}
      onDaily={() => {
        startDaily();
        setRoute('play');
      }}
      onResume={() => setRoute('play')}
      onStats={() => setRoute('stats')}
      onSettings={() => setRoute('settings')}
    />
  );
}
