import { useEffect, useState } from "react";
import { GlassTabs } from "@components/enterprise";
import {
  Check,
  Droplets,
  Gauge,
  LayoutDashboard,
  Palette,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { usePersonalization } from "./PersonalizationProvider";

const accents = [
  { id: "blue", label: "Electric blue", color: "#3B82F6" },
  { id: "cyan", label: "Cyan", color: "#0891B2" },
  { id: "green", label: "Emerald", color: "#059669" },
  { id: "orange", label: "Signal orange", color: "#EA580C" },
] as const;

export function WorkspacePersonalizationPanel() {
  const {
    preferences,
    isSaving,
    update,
    savePreset,
    applyPreset,
    deletePreset,
  } = usePersonalization();
  const [presetName, setPresetName] = useState("");
  const [glass, setGlass] = useState(preferences.glassTransparency);
  const [sidebar, setSidebar] = useState(preferences.sidebarWidth);

  useEffect(() => setGlass(preferences.glassTransparency), [preferences.glassTransparency]);
  useEffect(() => setSidebar(preferences.sidebarWidth), [preferences.sidebarWidth]);

  return (
    <section className="workspace-personalization-panel">
      <header>
        <div>
          <span><Sparkles aria-hidden="true" /> Workspace personalization</span>
          <h2>Make the operating system yours.</h2>
          <p>Layout, material, color, and motion preferences persist to your account across sessions.</p>
        </div>
        <small>{isSaving ? "Saving…" : <><Check aria-hidden="true" /> Saved</>}</small>
      </header>

      <div className="personalization-grid">
        <div className="personalization-control">
          <p><LayoutDashboard aria-hidden="true" /> Information density</p>
          <GlassTabs
            tabs={[
              { id: "compact", label: "Compact" },
              { id: "comfortable", label: "Comfort" },
              { id: "spacious", label: "Spacious" },
            ]}
            value={preferences.density}
            onChange={(density) => update({ density: density as typeof preferences.density })}
            ariaLabel="Workspace density"
          />
        </div>

        <div className="personalization-control">
          <p><Gauge aria-hidden="true" /> Motion intensity</p>
          <GlassTabs
            tabs={[
              { id: "reduced", label: "Reduced" },
              { id: "balanced", label: "Balanced" },
              { id: "full", label: "Full" },
            ]}
            value={preferences.motionIntensity}
            onChange={(motionIntensity) => update({
              motionIntensity: motionIntensity as typeof preferences.motionIntensity,
            })}
            ariaLabel="Motion intensity"
          />
        </div>

        <div className="personalization-control">
          <p><Palette aria-hidden="true" /> Accent color</p>
          <div className="accent-picker" role="radiogroup" aria-label="Accent color">
            {accents.map((accent) => (
              <button
                key={accent.id}
                type="button"
                role="radio"
                aria-checked={preferences.accentColor === accent.id}
                aria-label={accent.label}
                onClick={() => update({ accentColor: accent.id })}
                className={preferences.accentColor === accent.id ? "is-active" : undefined}
                style={{ "--accent-swatch": accent.color } as React.CSSProperties}
              >
                <span />{preferences.accentColor === accent.id && <Check aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>

        <div className="personalization-control">
          <label htmlFor="glass-transparency"><Droplets aria-hidden="true" /> Glass transparency</label>
          <div className="personalization-range">
            <input
              id="glass-transparency"
              type="range"
              min="0.45"
              max="0.88"
              step="0.01"
              value={glass}
              onChange={(event) => setGlass(Number(event.target.value))}
              onPointerUp={() => update({ glassTransparency: glass })}
              onKeyUp={() => update({ glassTransparency: glass })}
            />
            <output htmlFor="glass-transparency">{Math.round(glass * 100)}%</output>
          </div>
        </div>

        <div className="personalization-control">
          <label htmlFor="sidebar-width"><LayoutDashboard aria-hidden="true" /> Sidebar width</label>
          <div className="personalization-range">
            <input
              id="sidebar-width"
              type="range"
              min="220"
              max="340"
              step="4"
              value={sidebar}
              onChange={(event) => setSidebar(Number(event.target.value))}
              onPointerUp={() => update({ sidebarWidth: sidebar })}
              onKeyUp={() => update({ sidebarWidth: sidebar })}
            />
            <output htmlFor="sidebar-width">{sidebar}px</output>
          </div>
        </div>
      </div>

      <div className="workspace-presets">
        <div>
          <span>Saved workspace presets</span>
          <p>Capture the current density, color, motion, glass, sidebar, and dashboard layout.</p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            savePreset(presetName);
            setPresetName("");
          }}
        >
          <label className="sr-only" htmlFor="preset-name">Preset name</label>
          <input
            id="preset-name"
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            maxLength={80}
            placeholder="Executive focus"
          />
          <button type="submit" disabled={!presetName.trim() || isSaving}><Save aria-hidden="true" /> Save preset</button>
        </form>
        {preferences.presets.length ? (
          <div className="preset-list">
            {preferences.presets.map((preset) => (
              <article key={preset.id}>
                <button type="button" onClick={() => applyPreset(preset)}>
                  <strong>{preset.name}</strong>
                  <span>{preset.density} · {preset.motionIntensity} motion</span>
                </button>
                <button type="button" onClick={() => deletePreset(preset.id)} aria-label={`Delete ${preset.name}`}>
                  <Trash2 aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="preset-empty"><LayoutDashboard aria-hidden="true" /> No saved presets yet</div>
        )}
      </div>
    </section>
  );
}
