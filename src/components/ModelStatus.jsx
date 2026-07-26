import { useAsrState, overallProgress } from '../hooks/useAsr.js'

/**
 * Speech model state, always visible.
 *
 * The model is tens of megabytes and downloads once, then lives in IndexedDB and never touches
 * the network again. Both halves of that sentence matter to the person watching: during the
 * first load they need to know the app is working and not hung, and afterwards they need to
 * see that it is running locally -- because "the audio never leaves this device" is a claim
 * about student privacy, and a claim like that should be visible in the interface rather than
 * only in the pitch.
 */
export function ModelStatus() {
  const asr = useAsrState()
  const pct = overallProgress(asr.progress)

  if (asr.status === 'ready') {
    return (
      <p className="flex items-center gap-2 text-xs" style={{ color: 'var(--ra-muted)' }}>
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--ra-correct)' }} />
        Speech model ready
        <span className="font-mono uppercase">· {asr.device}</span>
        <span className="sr-only">. Audio is processed on this device and is never uploaded.</span>
      </p>
    )
  }

  if (asr.status === 'error') {
    return (
      <p className="max-w-xs text-xs" style={{ color: 'var(--ra-miscue)' }} role="status">
        Speech model failed to load — {asr.error}
      </p>
    )
  }

  return (
    <p className="flex items-center gap-2 text-xs" style={{ color: 'var(--ra-muted)' }} role="status" aria-live="polite">
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 animate-pulse rounded-full"
        style={{ background: 'var(--ra-unsure)' }}
      />
      Loading speech model
      <span className="inline-block h-1.5 w-24 overflow-hidden rounded-full" style={{ background: 'var(--ra-border)' }}>
        <span
          className="block h-full rounded-full transition-[width] duration-200 ease-out"
          style={{ width: `${pct}%`, background: 'var(--ra-accent)' }}
        />
      </span>
      <span className="font-mono tabular-nums">{pct}%</span>
    </p>
  )
}
