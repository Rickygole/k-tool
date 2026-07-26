import { AccessibilityBar } from './AccessibilityBar.jsx'
import { ModelStatus } from './ModelStatus.jsx'

const STEPS = [
  { id: 'student', label: 'Student' },
  { id: 'passage', label: 'Passage' },
  { id: 'read', label: 'Read' },
  { id: 'results', label: 'Results' },
]

/**
 * The one persistent chrome in the app: identity, where you are, and the reading supports.
 *
 * The h1 lives here and only here. Screens use h2. That is not pedantry. A screen reader
 * user navigating by heading needs the document outline to describe the app, and an h1 per
 * screen would tell them they had landed on four different websites.
 */
export function AppHeader({ step, student, passage, onNavigate, onHome }) {
  const index = STEPS.findIndex((s) => s.id === step)

  return (
    <header
      className="no-print sticky top-0 z-30 border-b backdrop-blur"
      style={{ borderColor: 'var(--ra-border)', background: 'color-mix(in srgb, var(--ra-bg) 88%, transparent)' }}
    >
      <div className="mx-auto flex min-w-[1024px] max-w-[1400px] items-center gap-8 px-8 py-3">
        <div className="flex items-baseline gap-3">
          {/* The wordmark goes home, which is what people try first. It runs the same reset that
              "New assessment" runs rather than a second path of its own, so there is only one
              way for a session to end and only one thing to get wrong. Nothing is persisted, so
              there is no saved record for this to discard. */}
          <h1 className="font-display text-xl font-semibold tracking-tight">
            <button
              type="button"
              onClick={onHome}
              className="rounded transition hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor focus-visible:ring-offset-2"
              title="Start a new assessment"
            >
              ReadAloud
              <span className="sr-only">, start over</span>
            </button>
          </h1>
          <p className="text-xs" style={{ color: 'var(--ra-muted)' }}>
            Oral reading fluency
          </p>
        </div>

        {index >= 0 && (
          <nav aria-label="Progress" className="flex-1">
            <ol className="flex items-center gap-1 text-xs">
              {STEPS.map((s, i) => {
                const state = i < index ? 'done' : i === index ? 'current' : 'todo'
                const reachable = i < index && typeof onNavigate === 'function'
                const detail =
                  s.id === 'student' && student ? student.name : s.id === 'passage' && passage ? passage.title : null

                return (
                  <li key={s.id} className="flex items-center gap-1">
                    {i > 0 && (
                      <span aria-hidden="true" style={{ color: 'var(--ra-muted)' }} className="px-1">
                        ›
                      </span>
                    )}
                    <StepChip
                      state={state}
                      reachable={reachable}
                      onClick={reachable ? () => onNavigate(s.id) : undefined}
                      index={i}
                      label={s.label}
                      detail={detail}
                    />
                  </li>
                )
              })}
            </ol>
          </nav>
        )}

        <div className="ml-auto flex items-center gap-6">
          <ModelStatus />
          <AccessibilityBar />
        </div>
      </div>
    </header>
  )
}

function StepChip({ state, reachable, onClick, index, label, detail }) {
  // State is carried by the numeral/check and the weight as well as the colour, so the
  // progress trail still reads in greyscale.
  const mark = state === 'done' ? '✓' : String(index + 1)
  const body = (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-bold leading-none"
        style={{
          borderColor: state === 'todo' ? 'var(--ra-border)' : 'var(--ra-accent)',
          background: state === 'current' ? 'var(--ra-accent)' : 'transparent',
          color: state === 'current' ? 'var(--ra-bg)' : state === 'todo' ? 'var(--ra-muted)' : 'var(--ra-accent)',
        }}
      >
        {mark}
      </span>
      <span className={state === 'current' ? 'font-semibold' : ''}>{label}</span>
      {detail && (
        <span className="max-w-[10rem] truncate" style={{ color: 'var(--ra-muted)' }}>
          · {detail}
        </span>
      )}
    </span>
  )

  if (!reachable) {
    return (
      <span aria-current={state === 'current' ? 'step' : undefined} style={{ color: 'var(--ra-fg)' }}>
        {body}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded px-1 py-0.5 transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor"
    >
      {body}
      <span className="sr-only">, go back to this step</span>
    </button>
  )
}
