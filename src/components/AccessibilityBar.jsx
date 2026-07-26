import { useEffect, useState } from 'react'

/**
 * Reading-support controls: typeface, text size, contrast.
 *
 * These are not a settings page. A child who needs larger text needs it *now*, mid-passage,
 * without a teacher navigating away from the read -- so the controls sit in the header on
 * every screen and take effect on the next paint.
 *
 * Everything is applied as data-attributes on <html> and resolved in CSS (styles/index.css).
 * No component reads these values, no context provider exists, and adding a fourth control is
 * three lines of CSS. State that only styling consumes should live where styling lives.
 */

const STORAGE_KEY = 'readaloud.prefs.v1'

const DEFAULTS = { font: 'default', size: 'default', contrast: 'default' }

const SIZES = [
  { value: 'default', label: 'A', title: 'Standard text size', className: 'text-xs' },
  { value: 'large', label: 'A', title: 'Large text size', className: 'text-sm' },
  { value: 'xlarge', label: 'A', title: 'Largest text size', className: 'text-base' },
]

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
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
    root.dataset.contrast = prefs.contrast
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

      <ToggleButton
        pressed={prefs.contrast === 'high'}
        onClick={() => set({ contrast: prefs.contrast === 'high' ? 'default' : 'high' })}
        title="High contrast colours"
        wide
      >
        High contrast
      </ToggleButton>
    </div>
  )
}

/**
 * aria-pressed rather than a checkbox: these are toggle buttons whose effect is immediate and
 * global. The pressed state is carried by border + weight + a filled dot, never by colour
 * alone -- these controls are the ones a colour-blind user reaches for first.
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
