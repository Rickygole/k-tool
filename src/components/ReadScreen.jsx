import { useCallback, useEffect, useRef, useState } from 'react'
import { createRecorder, decodeTo16kMono, loadAudioFile } from '../lib/audio.js'
import { transcribe, whenModelReady, useAsrState } from '../hooks/useAsr.js'
import { LevelMeter } from './LevelMeter.jsx'
import { formatDuration } from '../util/markup.js'

/** Anything shorter than this is a misclick, not a reading sample. */
const MIN_READ_SEC = 1.5

/**
 * Step 3. The read itself.
 *
 * Everything on this screen serves one of two people. The child gets the passage: 24px serif,
 * double-leaded, high contrast, nothing else competing for the eye. The teacher gets the
 * controls: one button, a clock, and a meter that proves the microphone is alive.
 *
 * The passage is rendered from the source string rather than from tokens, because at this
 * point nothing has been scored and the child should see the text exactly as written --
 * punctuation, capitals, and all.
 */
export function ReadScreen({ student, passage, onComplete, onBack, demoToken }) {
  const asrState = useAsrState()
  const recorderRef = useRef(null)
  const activeRef = useRef(false)

  const [phase, setPhase] = useState('idle') // idle | recording | processing | error
  const [elapsed, setElapsed] = useState(0)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState(null)

  // Running clock. 200ms is fast enough to feel live and slow enough to cost nothing; the
  // authoritative duration comes from the recorder itself, not from this counter.
  useEffect(() => {
    if (phase !== 'recording') return undefined
    const id = setInterval(() => setElapsed(recorderRef.current?.elapsedSec() ?? 0), 200)
    return () => clearInterval(id)
  }, [phase])

  // Leaving the screen mid-record must release the microphone. A live getUserMedia stream keeps
  // the browser's recording indicator lit and holds the device against the next attempt.
  useEffect(
    () => () => {
      if (activeRef.current && recorderRef.current) {
        activeRef.current = false
        recorderRef.current.stop().catch(() => {})
      }
    },
    [],
  )

  const runPipeline = useCallback(
    async (audio, durationSec, source) => {
      setBusy(asrState.status === 'ready' ? 'Transcribing' : 'Waiting for the speech model')
      await whenModelReady()
      setBusy('Transcribing')
      const asr = await transcribe(audio, durationSec)

      if (!asr.words?.length) {
        throw new Error('No speech was found in that recording. Check the microphone and try again.')
      }
      // The worker echoes durationSec back; fall back to ours if an older worker does not.
      onComplete({ asr: { ...asr, durationSec: asr.durationSec ?? durationSec }, source })
    },
    [asrState.status, onComplete],
  )

  const start = useCallback(async () => {
    setError(null)
    const recorder = createRecorder()
    try {
      await recorder.start()
    } catch (err) {
      setPhase('error')
      setError(
        err?.name === 'NotAllowedError'
          ? 'Microphone access was blocked. Allow the microphone for this site in your browser settings, then try again.'
          : `Could not open the microphone: ${err?.message ?? err}`,
      )
      return
    }
    recorderRef.current = recorder
    activeRef.current = true
    setElapsed(0)
    setPhase('recording')
  }, [])

  const stop = useCallback(async () => {
    if (!recorderRef.current) return
    setPhase('processing')
    setBusy('Saving audio')
    try {
      activeRef.current = false
      const { blob, durationSec } = await recorderRef.current.stop()

      if (durationSec < MIN_READ_SEC) {
        setPhase('error')
        setError(`That recording was only ${durationSec.toFixed(1)} seconds. Record the full passage before stopping.`)
        return
      }

      setBusy('Decoding audio')
      const { audio } = await decodeTo16kMono(blob)
      await runPipeline(audio, durationSec, 'mic')
    } catch (err) {
      setPhase('error')
      setError(err?.message ?? String(err))
    }
  }, [runPipeline])

  /**
   * DEMO MODE. Ctrl+Shift+D (handled in App.jsx) bumps `demoToken`, which lands here.
   *
   * The bundled wav goes through the *same* decode -> worker -> score path as the microphone;
   * the only thing swapped out is where the samples came from. That is the whole point: it is
   * insurance against a dead mic or a loud room, not a canned screenshot, and if the pipeline
   * were broken the demo would break with it.
   */
  useEffect(() => {
    if (!demoToken) return
    let cancelled = false
    ;(async () => {
      setError(null)
      setPhase('processing')
      setBusy('Loading the bundled recording')
      try {
        const { audio, decodedSec } = await loadAudioFile('/demo/clean-read.wav')
        if (cancelled) return
        await runPipeline(audio, decodedSec, 'demo')
      } catch (err) {
        if (cancelled) return
        setPhase('error')
        setError(`Demo recording failed: ${err?.message ?? err}`)
      }
    })()
    return () => {
      cancelled = true
    }
    // runPipeline is intentionally omitted: it changes identity when the model finishes
    // loading, and re-running the demo on that would be a surprise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoToken])

  const recording = phase === 'recording'
  const processing = phase === 'processing'

  return (
    <section aria-labelledby="read-heading" className="animate-fadeIn pb-44">
      <div className="mb-6 flex items-start justify-between gap-8">
        <div>
          <p className="field-label mb-1">
            {student.name} · Grade {passage.grade} passage
          </p>
          <h2 id="read-heading" className="font-display text-3xl font-semibold tracking-tight">
            {passage.title}
          </h2>
        </div>
        <button type="button" className="btn-quiet shrink-0" onClick={onBack} disabled={recording || processing}>
          ← Change passage
        </button>
      </div>

      {passage.isDemo && (
        <p
          className="mb-6 rounded-lg px-4 py-2 text-sm"
          style={{ background: 'var(--ra-unsure-bg)', color: 'var(--ra-unsure)' }}
        >
          <strong className="font-semibold">Demo mode.</strong> This passage is matched to the bundled recording in{' '}
          <code className="font-mono">public/demo/clean-read.wav</code>. Results will be labelled as a demo.
        </p>
      )}

      <article
        className="card passage-text max-w-[46rem] px-10 py-9"
        // The passage is the reading task, not prose about the app. Announcing it as a single
        // region lets a screen-reader user get the whole text without landmark hopping.
        aria-label={`Passage: ${passage.title}`}
      >
        {passage.text}
      </article>

      {/* Controls sit in a fixed tray so the record button never scrolls away from a child
          who has scrolled to the end of the passage. */}
      <div
        className="no-print fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur"
        style={{ borderColor: 'var(--ra-border)', background: 'color-mix(in srgb, var(--ra-bg) 92%, transparent)' }}
      >
        <div className="mx-auto flex min-w-[1024px] max-w-[1400px] items-center gap-8 px-8 py-4">
          <RecordButton phase={phase} onStart={start} onStop={stop} />

          <div className="flex w-32 shrink-0 flex-col">
            <span className="field-label">Reading time</span>
            <span className="font-mono text-2xl tabular-nums leading-tight">{formatDuration(elapsed)}</span>
          </div>

          <div className="min-w-0 flex-1">
            {processing ? (
              <p role="status" aria-live="polite" className="flex items-center gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 animate-pulse rounded-full"
                  style={{ background: 'var(--ra-accent)' }}
                />
                {busy}…
                <span style={{ color: 'var(--ra-muted)' }}>Everything runs on this device.</span>
              </p>
            ) : (
              <LevelMeter recorderRef={recorderRef} active={recording} />
            )}
          </div>
        </div>

        {error && (
          <div className="mx-auto min-w-[1024px] max-w-[1400px] px-8 pb-4">
            <div className="alert-error flex items-center justify-between gap-4" role="alert">
              <span>{error}</span>
              <button
                type="button"
                className="btn-secondary shrink-0 py-1.5 text-sm"
                onClick={() => {
                  setError(null)
                  setPhase('idle')
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * One button, two states. It is 96px because it is pressed by a teacher standing over a
 * child's shoulder, and because the cost of missing it is a lost reading sample.
 */
function RecordButton({ phase, onStart, onStop }) {
  const recording = phase === 'recording'
  const processing = phase === 'processing'

  return (
    <button
      type="button"
      onClick={recording ? onStop : onStart}
      disabled={processing}
      aria-label={recording ? 'Stop recording' : 'Start recording'}
      className="group inline-flex shrink-0 items-center gap-4 rounded-full py-2 pl-2 pr-7 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor focus-visible:ring-offset-2 disabled:opacity-50"
      style={{ border: '1px solid var(--ra-border)', background: 'var(--ra-surface)' }}
    >
      {/* Circle -> square is the state signal. The pulsing ring is a second, redundant one;
          under prefers-reduced-motion the ring stops and the shape still carries it. */}
      <span
        aria-hidden="true"
        className={`grid h-16 w-16 place-items-center rounded-full transition-transform duration-150 ease-out group-active:scale-95 ${
          recording ? 'animate-pulse ring-4 ring-offset-2' : ''
        }`}
        style={{
          background: 'var(--ra-miscue)',
          '--tw-ring-color': 'var(--ra-miscue-bg)',
          '--tw-ring-offset-color': 'var(--ra-surface)',
        }}
      >
        {recording ? (
          <span className="block h-5 w-5 rounded-[3px] bg-white" />
        ) : (
          <span className="block h-6 w-6 rounded-full bg-white" />
        )}
      </span>
      <span className="text-left">
        <span className="block text-lg font-semibold leading-tight">
          {processing ? 'Working…' : recording ? 'Stop' : 'Start recording'}
        </span>
        <span className="block text-xs" style={{ color: 'var(--ra-muted)' }}>
          {recording ? 'Recording — audio stays on this device' : 'Then read the passage aloud'}
        </span>
      </span>
    </button>
  )
}
