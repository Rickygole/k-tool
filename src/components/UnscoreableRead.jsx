/**
 * What the app shows when the engine says the recording cannot be scored.
 *
 * `score()` returns a `validity` verdict for a specific failure mode: a microphone that failed
 * silently. A dead mic does not throw. It returns silence, and silence aligns as a complete
 * read with every word omitted. Rendered normally that produces a confident, printable running
 * record showing 22% accuracy and a bottom-percentile band for a child who never spoke.
 *
 * That is worse than a crash. A crash is obviously wrong; a plausible wrong number gets filed.
 * So when the engine declines to vouch for the input, this screen is the whole result: no
 * metrics, no percentile, and no route to the printable report. The only paths out are to
 * record again or to start over.
 */
export function UnscoreableRead({ student, passage, validity, onReadAgain, onRestart }) {
  return (
    <section aria-labelledby="unscoreable-heading" className="animate-fadeIn">
      <p className="field-label mb-1">
        {student.name} · {passage.title}
      </p>
      <h2 id="unscoreable-heading" className="font-display text-3xl font-semibold tracking-tight">
        This recording can&rsquo;t be scored
      </h2>

      <div
        className="card mt-6 max-w-2xl"
        role="alert"
        style={{ borderColor: 'var(--ra-unsure)', borderWidth: 2 }}
      >
        <p className="text-lg">{validity.message}</p>

        <div className="mt-5">
          <h3 className="field-label">Before recording again</h3>
          <ul className="mt-2 space-y-1.5 text-sm" style={{ color: 'var(--ra-muted)' }}>
            <li>· Check that the input meter moves when the reader speaks — that is the fastest test.</li>
            <li>· Confirm the right microphone is selected in the browser&rsquo;s site settings.</li>
            <li>· Let the reader finish the passage before pressing Stop.</li>
          </ul>
        </div>

        <p className="mt-5 text-sm" style={{ color: 'var(--ra-muted)' }}>
          No score, percentile or report is produced from a recording this tool cannot vouch for. An
          assessment record that looks confident and is wrong is worse than none at all.
        </p>

        <div className="mt-6 flex items-center gap-2">
          <button type="button" className="btn-primary" onClick={onReadAgain}>
            Record again
          </button>
          <button type="button" className="btn-secondary" onClick={onRestart}>
            Start over
          </button>
        </div>
      </div>
    </section>
  )
}
