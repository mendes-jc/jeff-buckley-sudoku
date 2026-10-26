import { useState } from 'react';
import { loadSettings, saveSettings, type Settings as SettingsData } from '../../game/persistence';
import { useTheme, type Theme } from '../hooks/useTheme';
import './screens.css';

export interface SettingsProps {
  onBack: () => void;
  /** Called after sound settings are persisted so the live MediaController can re-read them. */
  onSoundChange: () => void;
}

export function Settings({ onBack, onSoundChange }: SettingsProps) {
  const { theme, setTheme } = useTheme();
  const [soundOn, setSoundOn] = useState(() => loadSettings().soundOn);
  const [volume, setVolume] = useState(() => loadSettings().volume);

  const update = (patch: Partial<SettingsData>) => {
    saveSettings({ ...loadSettings(), ...patch });
    onSoundChange();
  };

  return (
    <main className="screen settings-screen">
      <h2>Settings</h2>
      <label>
        Theme
        <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={soundOn}
          onChange={(e) => {
            setSoundOn(e.target.checked);
            update({ soundOn: e.target.checked });
          }}
        />
        Sound
      </label>
      <label>
        Volume
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVolume(v);
            update({ volume: v });
          }}
        />
      </label>
      <button onClick={onBack}>Back</button>
    </main>
  );
}
