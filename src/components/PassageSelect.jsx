import { PASSAGES, wordCount } from '../data/passages.js'
import { medianWcpm } from '../lib/norms.js'

/**
 * Step 2. What they are reading.
 *
 * The grade-level benchmark is printed on every card. A teacher choosing a passage is choosing
 * which norm the child will be measured against, and burying that in the results screen would
 * be hiding the most consequential decision in the workflow behind the least consequential
 * click.
 */
export function PassageSelect({ student, selectedId, onSelect, onBack }) {
  return (
    <section aria-labelledby="passage-heading" className="animate-fadeIn">
      <div className="mb-8 flex items-end justify-between gap-8">
        <div>
          <h2 id="passage-heading" className="font-display text-3xl font-semibold tracking-tight">
            Choose a passage for {student.name}
          </h2>
          <p className="mt-2 max-w-2xl" style={{ color: 'var(--ra-muted)' }}>
            {student.name} is enrolled in grade {student.grade}. Scores are compared against the norms for
            the passage&rsquo;s grade level, not the student&rsquo;s — so a grade&nbsp;2 passage is scored
            against grade&nbsp;2 expectations whoever reads it.
          </p>
        </div>
        <button type="button" className="btn-quiet shrink-0" onClick={onBack}>
          ← Change student
        </button>
      </div>

      <ul className="grid grid-cols-2 gap-4">
        {PASSAGES.map((passage) => {
          const median = medianWcpm(passage.grade, 'spring')
          const offGrade = passage.grade !== student.grade
          return (
            <li key={passage.id}>
              <button
                type="button"
                className="choice-card h-full"
                aria-current={selectedId === passage.id}
                onClick={() => onSelect(passage)}
              >
                <span className="mb-2 flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ background: 'var(--ra-bg)', color: 'var(--ra-accent)', border: '1px solid var(--ra-border)' }}
                  >
                    Grade {passage.grade}
                  </span>
                  {offGrade && (
                    <span className="text-xs" style={{ color: 'var(--ra-muted)' }}>
                      {passage.grade < student.grade ? 'Below' : 'Above'} enrolled grade
                    </span>
                  )}
                </span>

                <span className="block font-display text-lg font-semibold leading-snug">{passage.title}</span>
                <span className="mt-1 block text-sm" style={{ color: 'var(--ra-muted)' }}>
                  {passage.blurb}
                </span>

                <span
                  className="mt-4 flex items-center gap-4 border-t pt-3 text-xs tabular-nums"
                  style={{ borderColor: 'var(--ra-border)', color: 'var(--ra-muted)' }}
                >
                  <span>{wordCount(passage.text)} words</span>
                  {median != null && <span>Grade {passage.grade} median · {median} WCPM</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
