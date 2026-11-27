import { ZONES } from '../world/layout.js';

export const PRESET_BAR = {
  /** @type {Record<string, string>} */
  labels: {
    Entrance: 'प्रवेश',
    Counter: 'काउन्टर',
    'Back Rack': 'ताक',
    'Front Pedi': 'पेडी',
    Corner: 'कुनो',
    Overview: 'सबै',
  },
  tourLabel: 'भ्रमण · Tour',
  tourStopLabel: 'रोक्नुहोस् · Stop',
};

/**
 * Camera preset navigation + guided tour toggle, visible only in explore mode
 * (hidden on landing via `body[data-mode]`).
 * @param {HTMLElement} host
 * @param {{ presets: Array<{ name: string }>, onPreset: (name: string) => void, onTourToggle: () => void }} spec
 * @returns {{ setTourActive: (active: boolean) => void, dispose: () => void }}
 */
export function createPresetBar(host, { presets, onPreset, onTourToggle }) {
  if (typeof onPreset !== 'function' || typeof onTourToggle !== 'function') {
    throw new Error('presetBar requires onPreset and onTourToggle');
  }
  const bar = document.createElement('div');
  bar.className = 'preset-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'दृश्य · Camera presets');

  for (const preset of presets) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset-btn';
    button.dataset.preset = preset.name;
    button.setAttribute('lang', 'ne');
    button.textContent = PRESET_BAR.labels[preset.name] ?? preset.name;
    button.addEventListener('click', () => onPreset(preset.name));
    bar.appendChild(button);
  }

  const tourButton = document.createElement('button');
  tourButton.type = 'button';
  tourButton.className = 'preset-btn preset-tour';
  tourButton.setAttribute('lang', 'ne');
  tourButton.setAttribute('aria-pressed', 'false');
  tourButton.textContent = PRESET_BAR.tourLabel;
  tourButton.addEventListener('click', onTourToggle);
  bar.appendChild(tourButton);

  host.appendChild(bar);

  return {
    setTourActive(active) {
      tourButton.setAttribute('aria-pressed', String(active));
      tourButton.textContent = active ? PRESET_BAR.tourStopLabel : PRESET_BAR.tourLabel;
    },
    dispose() {
      bar.remove();
    },
  };
}

export { ZONES };
