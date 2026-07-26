import { useEffect, useState } from 'react'

/**
 * Reading-support controls: typeface, text size, contrast.
 *
 * These are not a settings page. A child who needs larger text needs it *now*, mid-passage,
 * without a teacher navigating away from the read. So the controls sit in the header on
 * every screen and take effect on the next paint.
 *
 * Everything is applied as data-attributes on <html> and resolved in CSS (styles/index.css).
 * No component reads these values, no context provider exists, and adding a fourth control is
 * three lines of CSS. State that only styling consumes should live where styling lives.
 */

const STORAGE_KEY = 'readaloud.prefs.v1'

const DEFAULTS = { font: 'default', size: 'default', theme: 'light' }

/**
 * Three themes on one control, because they are mutually exclusive states of the same thing.
 *
 * Dark and high contrast are NOT the same feature and neither replaces the other. Dark mode is
 * comfort, for a room with the lights off or a teacher on their fourth hour. High contrast is a
 * low vision affordance: it drops the tinted word backgrounds entirely and leans on the glyphs
 * and underline weights, which is the same reason the printed record survives a monochrome
 * printer.
 */
const THEMES = [
  { value: 'light', label: 'Light', title: 'Light theme' },
  { value: 'dark', label: 'Dark', title: 'Dark theme, easier in a dim room' },
  { value: 'contrast', label: 'Contrast', title: 'High contrast, for low vision' },
]

const SIZES = [
  { value: 'default', label: 'A', title: 'Standard text size', className: 'text-xs' },
  { value: 'large', label: 'A', title: 'Large text size', className: 'text-sm' },
  { value: 'xlarge', label: 'A', title: 'Largest text size', className: 'text-base' },
]

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const saved = JSON.parse(raw)
    // Migration. Contrast used to be its own boolean axis; it is now one of three themes.
    // Somebody who had turned it on is a person who needs it, so carrying that across matters
    // more than the tidiness of dropping the old key.
    if (saved.contrast === 'high' && !saved.theme) saved.theme = 'contrast'
    delete saved.contrast
    return { ...DEFAULTS, ...saved }
  } catch {
    // Private browsing, disabled storage, corrupt JSON. Preferences are a nicety; failing to
    // read them must never stop the app from rendering.
    return DEFAULTS
  }
}

export function AccessibilityBar() {
  const [prefs, setPrefs] = useState(load)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.font = prefs.font
    root.dataset.size = prefs.size
    // 'contrast' is a theme here, not a separate axis, so only one of the two attributes is
    // ever set. Anything reading data-contrast still works for the high contrast case.
    root.dataset.theme = prefs.theme === 'dark' ? 'dark' : ''
    root.dataset.contrast = prefs.theme === 'contrast' ? 'high' : ''
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch {
      /* see load() */
    }
  }, [prefs])

  const set = (patch) => setPrefs((p) => ({ ...p, ...patch }))

  return (
    <div className="no-print flex items-center gap-4">
      <fieldset className="flex items-center gap-1.5">
        <legend className="sr-only">Text size</legend>
        <span aria-hidden="true" className="field-label mr-0.5">
          Size
        </span>
        {SIZES.map((s) => (
          <ToggleButton
            key={s.value}
            pressed={prefs.size === s.value}
            onClick={() => set({ size: s.value })}
            title={s.title}
          >
            <span className={`${s.className} font-semibold leading-none`}>{s.label}</span>
            <span className="sr-only">{s.title}</span>
          </ToggleButton>
        ))}
      </fieldset>

      <span className="h-5 w-px" style={{ background: 'var(--ra-border)' }} aria-hidden="true" />

      <ToggleButton
        pressed={prefs.font === 'dyslexic'}
        onClick={() => set({ font: prefs.font === 'dyslexic' ? 'default' : 'dyslexic' })}
        title="Dyslexia-friendly typeface and spacing"
        wide
      >
        Dyslexia font
      </ToggleButton>

      <fieldset className="flex items-center gap-1.5">
        <legend className="sr-only">Theme</legend>
        <span aria-hidden="true" className="field-label mr-0.5">
          Theme
        </span>
        {THEMES.map((t) => (
          <ToggleButton
            key={t.value}
            pressed={prefs.theme === t.value}
            onClick={() => set({ theme: t.value })}
            title={t.title}
            wide
          >
            {t.label}
          </ToggleButton>
        ))}
      </fieldset>
    </div>
  )
}

/**
 * aria-pressed rather than a checkbox: these are toggle buttons whose effect is immediate and
 * global. The pressed state is carried by border + weight + a filled dot, never by colour
 * alone. These controls are the ones a colour-blind user reaches for first.
 */
function ToggleButton({ pressed, onClick, title, children, wide }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      title={title}
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 rounded-md border transition',
        wide ? 'px-2.5 py-1 text-xs' : 'h-7 w-7 justify-center',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor focus-visible:ring-offset-1',
        pressed ? 'font-semibold' : 'font-normal hover:border-harbor',
      ].join(' ')}
      style={{
        borderColor: pressed ? 'var(--ra-accent)' : 'var(--ra-border)',
        background: pressed ? 'var(--ra-accent)' : 'transparent',
        color: pressed ? 'var(--ra-bg)' : 'var(--ra-muted)',
      }}
    >
      {children}
    </button>
  )
}
