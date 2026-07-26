import { PassageMarkup, MarkupLegend } from './PassageMarkup.jsx'

/**
 * The same read, shown to the child.
 *
 * ------------------------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ------------------------------------------------------------------------------------------
 * Until this screen, ReadAloud measured a child and then addressed only the adult. The child
 * read aloud for a minute, and the entire output of that minute went to somebody else. A
 * sibling project put the critique precisely: in this whole category of software, "the student
 * is the subject of the plan, never its owner."
 *
 * This is a RENDERING, not a mode. Same read, same tokens, same numbers, one toggle away from
 * the teacher's view. It computes nothing, stores nothing, and can change nothing, everything
 * here is derived from props the teacher's screen already received. That is deliberate: a
 * second scoring path would be a second thing that can disagree with the first.
 *
 * ------------------------------------------------------------------------------------------
 * WHAT THIS SCREEN MUST NEVER SHOW, AND WHY
 * ------------------------------------------------------------------------------------------
 * No percentile band. No instructional level. No "frustration."
 *
 * Those are adult constructs for adult decisions. `MetricCards` renders "Frustration, below 90%
 * accuracy. This text is too hard unsupported" and "Below 10th", and putting either in front of
 * a seven-year-old is not child-appropriate language, it is a child-appropriate font wrapped
 * around an adult verdict. A child told they are below the tenth percentile learns something
 * about their identity, not about their reading.
 *
 * What a child can act on: the words they got right, how many they fixed themselves, and one
 * thing to practise. That is the whole screen.
 */
export function StudentResult({ student, tokens, metrics, onBack }) {
  // Same two-part gate the teacher's route uses. `metrics` is never null, withVerdictGuard
  // returns an object with the judgement fields nulled. So checking `metrics` alone is not
  // enough, and a naive render would print "You read null words!" to a child.
  if (!metrics || metrics.scoreable === false) {
    return (
      <section className="card mx-auto max-w-2xl text-center">
        <h2 className="font-display text-2xl font-semibold">Let's try that again</h2>
        <p className="mt-3" style={{ color: 'var(--ra-muted)' }}>
          We couldn't hear that recording clearly enough to look at it together.
        </p>
        <button type="button" onClick={onBack} className="btn-primary mt-6">
          Back
        </button>
      </section>
    )
  }

  const correct = metrics.wordsCorrect
  const total = metrics.totalWords
  const fixed = metrics.selfCorrections

  // One thing to practise. Deliberately a small number of words and never a diagnosis.
  const toPractise = tokens
    .filter((t) => t.status === 'substitution' || t.status === 'omission')
    .map((t) => t.refWord)
    .filter(Boolean)
    .slice(0, 3)

  return (
    <section aria-labelledby="student-result-heading" className="mx-auto max-w-4xl">
      <h2 id="student-result-heading" className="font-display text-3xl font-semibold">
        Nice reading, {student?.name?.split(' ')[0] ?? 'reader'}.
      </h2>

      <div className="mt-6 grid grid-cols-[1fr_auto] items-center gap-6 card">
        <div>
          <p className="font-display text-2xl">
            You read <strong className="tabular-nums">{correct}</strong> of{' '}
            <strong className="tabular-nums">{total}</strong> words just right.
          </p>
          {fixed > 0 && (
            <p className="mt-2 text-lg" style={{ color: 'var(--ra-correct)' }}>
              And you fixed <strong className="tabular-nums">{fixed}</strong>{' '}
              {fixed === 1 ? 'word' : 'words'} all by yourself — that's the hardest part of reading.
            </p>
          )}
        </div>

        {/* A proportion, not a score. No percentage, no band, no comparison to other children. */}
        <div
          className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full text-center"
          style={{ background: 'var(--ra-correct-bg)', color: 'var(--ra-correct)' }}
          aria-hidden="true"
        >
          <span className="font-display text-3xl font-semibold tabular-nums">
            {correct}/{total}
          </span>
        </div>
      </div>

      {toPractise.length > 0 && (
        <div className="card mt-4">
          <h3 className="font-display text-xl font-semibold">One thing to practise</h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--ra-muted)' }}>
            Try these {toPractise.length === 1 ? 'word' : 'words'} again next time.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {toPractise.map((w, i) => (
              <li key={`${w}-${i}`} className="font-passage text-xl rounded-lg px-3 py-1"
                  style={{ background: 'var(--ra-unsure-bg)', color: 'var(--ra-unsure)' }}>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card mt-4">
        <h3 className="font-display text-xl font-semibold">Your reading</h3>
        {/* The same marked passage the teacher sees, non-interactive. Showing the child a
            different picture from the adult would defeat the point of the screen. */}
        <div className="mt-3">
          <PassageMarkup tokens={tokens} interactive={false} idPrefix="sw" />
        </div>
        <div className="mt-4">
          <MarkupLegend compact />
        </div>
      </div>

      <button type="button" onClick={onBack} className="btn-secondary mt-6 no-print">
        Back to the teacher view
      </button>
    </section>
  )
}
