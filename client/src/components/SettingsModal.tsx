import { useState } from 'react';
import { themes, themeNames, TerminalTheme } from '../themes';

interface Settings {
  themeName: string;
  fontFamily: string;
  fontSize: number;
  broadcastInput: boolean;
}

interface Props {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, onSave, onClose }: Props) {
  const [local, setLocal] = useState<Settings>({ ...settings });

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1e1f2e',
          border: '1px solid #3b3d4a',
          borderRadius: 12,
          padding: 24,
          width: 420,
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <h2 style={{ color: '#c0caf5', margin: '0 0 20px', fontSize: 18 }}>Settings</h2>

        <Field label="Theme">
          <select
            value={local.themeName}
            onChange={(e) => update('themeName', e.target.value)}
            style={selectStyle}
          >
            {themeNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <ThemePreview theme={themes[local.themeName]} />
        </Field>

        <Field label="Font Family">
          <input
            value={local.fontFamily}
            onChange={(e) => update('fontFamily', e.target.value)}
            style={inputStyle}
          />
        </Field>

        <Field label="Font Size">
          <input
            type="number"
            min={8}
            max={32}
            value={local.fontSize}
            onChange={(e) => update('fontSize', parseInt(e.target.value) || 14)}
            style={{ ...inputStyle, width: 80 }}
          />
        </Field>

        <Field label="Broadcast Input">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c0caf5', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={local.broadcastInput}
              onChange={(e) => update('broadcastInput', e.target.checked)}
            />
            Type in all terminals simultaneously
          </label>
        </Field>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={btnStyle}>Cancel</button>
          <button onClick={() => { onSave(local); onClose(); }} style={{ ...btnStyle, background: '#7aa2f7', color: '#1a1b26' }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', color: '#7a7e8a', fontSize: 12, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function ThemePreview({ theme }: { theme: TerminalTheme }) {
  const colors = [theme.red, theme.green, theme.yellow, theme.blue, theme.magenta, theme.cyan];
  return (
    <div style={{
      display: 'flex',
      gap: 4,
      marginTop: 6,
      padding: '6px 8px',
      background: theme.background,
      borderRadius: 4,
      alignItems: 'center',
    }}>
      {colors.map((c, i) => (
        <div key={i} style={{ width: 14, height: 14, borderRadius: 3, background: c }} />
      ))}
      <span style={{ color: theme.foreground, fontSize: 12, marginLeft: 8 }}>Preview text</span>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#1a1b26',
  border: '1px solid #3b3d4a',
  borderRadius: 4,
  color: '#c0caf5',
  padding: '6px 10px',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const btnStyle: React.CSSProperties = {
  background: '#2a2b36',
  border: '1px solid #3b3d4a',
  borderRadius: 6,
  color: '#c0caf5',
  padding: '8px 16px',
  fontSize: 13,
  cursor: 'pointer',
};
