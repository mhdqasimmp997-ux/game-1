import React, { useState } from 'react';
import { Gamepad2, Monitor, Sliders, Volume2, X } from 'lucide-react';
import { AllSettings, GraphicsPreset } from '../types/game';
import { GRAPHICS_PRESETS } from '../data/gameData';

interface SettingsModalProps {
  settings: AllSettings;
  onChange: (next: AllSettings) => void;
  onClose: () => void;
}

const PRESET_LABELS: Record<GraphicsPreset, string> = {
  very_low: 'Very Low',
  low: 'Low (Default)',
  medium: 'Medium',
  high: 'High',
  ultra: 'Ultra',
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onChange, onClose }) => {
  const [tab, setTab] = useState<'graphics' | 'audio' | 'controls'>('graphics');

  const applyPreset = (preset: GraphicsPreset) => {
    onChange({
      ...settings,
      graphics: { ...GRAPHICS_PRESETS[preset], fullscreen: settings.graphics.fullscreen },
    });
  };

  const updateGfx = <K extends keyof AllSettings['graphics']>(key: K, val: AllSettings['graphics'][K]) => {
    onChange({
      ...settings,
      graphics: { ...settings.graphics, [key]: val },
    });
  };

  const updateAudio = <K extends keyof AllSettings['audio']>(key: K, val: AllSettings['audio'][K]) => {
    onChange({
      ...settings,
      audio: { ...settings.audio, [key]: val },
    });
  };

  const updateControls = <K extends keyof AllSettings['controls']>(key: K, val: AllSettings['controls'][K]) => {
    onChange({
      ...settings,
      controls: { ...settings.controls, [key]: val },
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => {});
      updateGfx('fullscreen', true);
    } else {
      void document.exitFullscreen().catch(() => {});
      updateGfx('fullscreen', false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-4xl rounded-lg border border-stone-700 bg-stone-900 text-stone-100 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950">
          <div className="flex items-center gap-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-lg font-display font-bold">Graphics, Audio & Control Settings</h2>
              <p className="text-[11px] text-stone-400">
                Optimized Low Graphics preset tuned for Intel UHD Graphics 610 and integrated GPUs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded border border-stone-700 hover:bg-stone-800 text-stone-300 cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 px-6 py-3 border-b border-stone-800 bg-stone-950/60">
          <button
            onClick={() => setTab('graphics')}
            className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-medium cursor-pointer ${
              tab === 'graphics' ? 'bg-amber-500 text-stone-950 font-semibold' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" /> Graphics & Display
          </button>
          <button
            onClick={() => setTab('audio')}
            className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-medium cursor-pointer ${
              tab === 'audio' ? 'bg-amber-500 text-stone-950 font-semibold' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" /> Audio Mixer
          </button>
          <button
            onClick={() => setTab('controls')}
            className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-medium cursor-pointer ${
              tab === 'controls' ? 'bg-amber-500 text-stone-950 font-semibold' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" /> Mouse & Controls
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {tab === 'graphics' && (
            <>
              <div>
                <div className="text-xs font-semibold text-stone-300 mb-2">Graphics Quality Preset</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(['very_low', 'low', 'medium', 'high', 'ultra'] as GraphicsPreset[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => applyPreset(p)}
                      className={`py-2 px-3 rounded border text-xs font-semibold tracking-wide cursor-pointer ${
                        settings.graphics.preset === p
                          ? 'bg-amber-500 border-amber-400 text-stone-950'
                          : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700'
                      }`}
                    >
                      {PRESET_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="flex items-center justify-between bg-stone-950 border border-stone-800 rounded p-3">
                  <span>Display Mode</span>
                  <button
                    onClick={toggleFullscreen}
                    className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 font-medium cursor-pointer"
                  >
                    {document.fullscreenElement ? 'Windowed' : 'Fullscreen'}
                  </button>
                </div>

                <div className="flex items-center justify-between bg-stone-950 border border-stone-800 rounded p-3">
                  <span>Resolution Scale ({Math.round(settings.graphics.resolutionScale * 100)}%)</span>
                  <input
                    type="range"
                    min={0.5}
                    max={1.0}
                    step={0.05}
                    value={settings.graphics.resolutionScale}
                    onChange={(e) => updateGfx('resolutionScale', parseFloat(e.target.value))}
                    className="w-32 accent-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between bg-stone-950 border border-stone-800 rounded p-3">
                  <span>Shadow Quality</span>
                  <select
                    value={settings.graphics.shadowQuality}
                    onChange={(e) => updateGfx('shadowQuality', e.target.value as AllSettings['graphics']['shadowQuality'])}
                    className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-100"
                  >
                    <option value="off">Off</option>
                    <option value="low">Low (512px)</option>
                    <option value="medium">Medium (1024px)</option>
                    <option value="high">High (2048px)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between bg-stone-950 border border-stone-800 rounded p-3">
                  <span>Anti-Aliasing</span>
                  <select
                    value={settings.graphics.antiAliasing}
                    onChange={(e) => updateGfx('antiAliasing', e.target.value as AllSettings['graphics']['antiAliasing'])}
                    className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-100"
                  >
                    <option value="off">Off (Fastest)</option>
                    <option value="fxaa">FXAA</option>
                  </select>
                </div>

                <div className="flex items-center justify-between bg-stone-950 border border-stone-800 rounded p-3">
                  <span>Render Distance ({settings.graphics.renderDistance}m)</span>
                  <input
                    type="range"
                    min={90}
                    max={300}
                    step={10}
                    value={settings.graphics.renderDistance}
                    onChange={(e) => updateGfx('renderDistance', parseInt(e.target.value, 10))}
                    className="w-32 accent-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between bg-stone-950 border border-stone-800 rounded p-3">
                  <span>Field of View ({settings.graphics.fov}°)</span>
                  <input
                    type="range"
                    min={62}
                    max={96}
                    step={2}
                    value={settings.graphics.fov}
                    onChange={(e) => updateGfx('fov', parseInt(e.target.value, 10))}
                    className="w-32 accent-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between bg-stone-950 border border-stone-800 rounded p-3">
                  <span>Texture & Lighting Quality</span>
                  <div className="flex gap-2">
                    <select
                      value={settings.graphics.textureQuality}
                      onChange={(e) => updateGfx('textureQuality', e.target.value as 'low' | 'medium' | 'high')}
                      className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-100"
                    >
                      <option value="low">Tex: Low</option>
                      <option value="medium">Tex: Med</option>
                      <option value="high">Tex: High</option>
                    </select>
                    <select
                      value={settings.graphics.lightingQuality}
                      onChange={(e) => updateGfx('lightingQuality', e.target.value as 'low' | 'medium' | 'high')}
                      className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-100"
                    >
                      <option value="low">Light: Low</option>
                      <option value="medium">Light: Med</option>
                      <option value="high">Light: High</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-stone-950 border border-stone-800 rounded p-3">
                  <span>Vegetation & Particles</span>
                  <div className="flex gap-2">
                    <select
                      value={settings.graphics.vegetationQuality}
                      onChange={(e) => updateGfx('vegetationQuality', e.target.value as 'low' | 'medium' | 'high')}
                      className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-100"
                    >
                      <option value="low">Trees: Low</option>
                      <option value="medium">Trees: Med</option>
                      <option value="high">Trees: High</option>
                    </select>
                    <select
                      value={settings.graphics.particleQuality}
                      onChange={(e) => updateGfx('particleQuality', e.target.value as 'off' | 'low' | 'medium')}
                      className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-100"
                    >
                      <option value="off">Rain: Off</option>
                      <option value="low">Rain: Low</option>
                      <option value="medium">Rain: Med</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-stone-950 border border-stone-800 rounded p-3">
                  <span>Reflection & Post-FX</span>
                  <div className="flex items-center gap-3">
                    <select
                      value={settings.graphics.reflectionQuality}
                      onChange={(e) => updateGfx('reflectionQuality', e.target.value as 'off' | 'low' | 'medium')}
                      className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-100"
                    >
                      <option value="off">Refl: Off</option>
                      <option value="low">Refl: Low</option>
                      <option value="medium">Refl: Med</option>
                    </select>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.graphics.postProcessing}
                        onChange={(e) => updateGfx('postProcessing', e.target.checked)}
                        className="accent-amber-500"
                      />
                      Post-FX
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-stone-950 border border-stone-800 rounded p-3">
                  <span>FPS Target</span>
                  <select
                    value={settings.graphics.fpsLimit}
                    onChange={(e) => updateGfx('fpsLimit', parseInt(e.target.value, 10) as 0 | 30 | 60)}
                    className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-100"
                  >
                    <option value={30}>30 FPS (Battery/UHD 610)</option>
                    <option value={60}>60 FPS (Balanced)</option>
                    <option value={0}>Uncapped</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {tab === 'audio' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {(
                [
                  ['master', 'Master Volume'],
                  ['notifications', 'Arrival Alarm & Alerts'],
                  ['dialogue', 'Driver & Police Voice Cues'],
                  ['sfx', 'Doors, Gates & Weighbridge'],
                  ['engine', 'Vehicle Engines'],
                  ['ambient', 'Wind & Weather'],
                  ['music', 'Checkpoint Ambience'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between bg-stone-950 border border-stone-800 rounded p-3.5">
                  <span>{label} ({Math.round(settings.audio[key] * 100)}%)</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.audio[key]}
                    onChange={(e) => updateAudio(key, parseFloat(e.target.value))}
                    className="w-36 accent-amber-500"
                  />
                </div>
              ))}
            </div>
          )}

          {tab === 'controls' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between bg-stone-950 border border-stone-800 rounded p-3.5">
                  <span>Mouse Look Sensitivity ({settings.controls.mouseSensitivity.toFixed(1)}x)</span>
                  <input
                    type="range"
                    min={0.3}
                    max={2.2}
                    step={0.1}
                    value={settings.controls.mouseSensitivity}
                    onChange={(e) => updateControls('mouseSensitivity', parseFloat(e.target.value))}
                    className="w-36 accent-amber-500"
                  />
                </div>
                <div className="flex items-center justify-between bg-stone-950 border border-stone-800 rounded p-3.5">
                  <span>Head Bob & Invert Y</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.controls.headBob}
                        onChange={(e) => updateControls('headBob', e.target.checked)}
                        className="accent-amber-500"
                      />
                      Head Bob
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.controls.invertY}
                        onChange={(e) => updateControls('invertY', e.target.checked)}
                        className="accent-amber-500"
                      />
                      Invert Y
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded border border-stone-800 bg-stone-950 p-4">
                <div className="font-semibold text-amber-400 mb-3">
                  First-Person Controls (Granny-Style Center-Aim Interaction)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-stone-300">
                  <div><span className="font-mono text-stone-100">Left Mouse Click</span> — Interact with Aimed Object</div>
                  <div><span className="font-mono text-stone-100">Mouse</span> — Free Look (Center White Dot)</div>
                  <div><span className="font-mono text-stone-100">W A S D</span> — Walk Around Checkpoint</div>
                  <div><span className="font-mono text-stone-100">Shift / Space / C</span> — Sprint / Jump / Crouch</div>
                  <div><span className="font-mono text-stone-100">L</span> — Toggle 3D Inspection Lens Mode</div>
                  <div><span className="font-mono text-stone-100">E</span> — Secondary Interact / Stand Up</div>
                  <div><span className="font-mono text-stone-100">Esc</span> — Exit CCTV / Pause Menu</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
