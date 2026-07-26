import { useEffect, useRef, useState } from 'react'

const SEGMENTS = 28

/** Below this RMS for SILENCE_MS and we say so out loud. */
const SILENCE_LEVEL = 0.035
const SILENCE_MS = 2500

/**
 * Live input meter.
 *
 * This is the single most load-bearing widget in the app and it is not decoration. A dead
 * microphone is silent in every sense: the browser grants the permission, MediaRecorder happily
 * records, the file is the right length, and you find out sixty seconds later that you
 * captured nothing. A running meter turns a two-minute failure into a two-second one.
 *
 * IT DRAWS OUTSIDE REACT, DELIBERATELY. `recorder.level()` is sampled every animation frame;
 * pushing that through setState would be sixty renders a second of a component tree that
 * contains a hundred-word passage. The rAF loop writes to DOM nodes it owns through refs, and
 * React only hears about the one thing that is genuinely state: whether we have gone quiet.
 *
 * The needle is smoothed asymmetrically -- fast attack, slow release -- which is what every
 * hardware meter does, because a meter that tracks RMS exactly looks broken to a human eye.
 */
export function LevelMeter({ recorderRef, active }) {
  const segRefs = useRef([])
  const readoutRef = useRef(null)
  const [silent, setSilent] = useState(false)

  useEffect(() => {
    if (!active) {
      setSilent(false)
      for (const el of segRefs.current) if (el) el.style.opacity = '0.18'
      if (readoutRef.current) readoutRef.current.textContent = '—'
      return undefined
    }

    let raf = 0
    let smoothed = 0
    let lastLoudAt = performance.now()
    let announcedSilence = false

    const tick = () => {
      const level = recorderRef.current?.level?.() ?? 0
      smoothed = level > smoothed ? level : smoothed * 0.86 + level * 0.14

      const lit = Math.round(smoothed * SEGMENTS)
      for (let i = 0; i < SEGMENTS; i++) {
        const el = segRefs.current[i]
        if (!el) continue
        el.style.opacity = i < lit ? '1' : '0.18'
      }
      if (readoutRef.current) readoutRef.current.textContent = `${Math.round(smoothed * 100)}%`

      const now = performance.now()
      if (level > SILENCE_LEVEL) lastLoudAt = now
      const quiet = now - lastLoudAt > SILENCE_MS
      if (quiet !== announcedSilence) {
        announcedSilence = quiet
        setSilent(quiet)
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, recorderRef])

  return (
    <div className="w-full">
      <div className="flex items-center gap-3">
        <span className="field-label">Mic input</span>
        <div
          className="flex h-8 flex-1 items-end gap-[3px] rounded-lg px-3 py-2"
          style={{ background: 'var(--ra-bg)', border: '1px solid var(--ra-border)' }}
          aria-hidden="true"
        >
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span
              key={i}
              ref={(el) => {
                segRefs.current[i] = el
              }}
              className="flex-1 rounded-[1px]"
              style={{
                // Height ramps left to right so the meter reads as a level even for someone
                // who cannot distinguish the two colours.
                height: `${34 + (i / SEGMENTS) * 66}%`,
                opacity: 0.18,
                background: i > SEGMENTS * 0.82 ? 'var(--ra-unsure)' : 'var(--ra-accent)',
                transition: 'opacity 60ms linear',
              }}
            />
          ))}
        </div>
        <span ref={readoutRef} className="w-10 text-right font-mono text-xs tabular-nums" style={{ color: 'var(--ra-muted)' }}>
          —
        </span>
      </div>

      {/* Not aria-live: the meter is a continuous visual, and announcing it would flood a
          screen reader. The silence warning below is the part worth announcing. */}
      <p role="status" aria-live="polite" className="mt-2 min-h-[1.25rem] text-sm">
        {silent && active && (
          <span className="inline-flex items-center gap-2 font-medium" style={{ color: 'var(--ra-miscue)' }}>
            <span aria-hidden="true">▲</span>
            No sound detected. Check that the right microphone is selected and that the reader is close enough.
          </span>
        )}
      </p>
    </div>
  )
}
