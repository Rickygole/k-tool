import { PASSAGES, wordCount } from '../data/passages.js'
import { medianWcpm } from '../lib/norms.js'

const gradeName = (g) => (g === 0 ? 'Kindergarten' : `Grade ${g}`)

/**
 * Step 2. What they are reading.
 *
 * The grade-level benchmark is printed on every card. A teacher choosing a passage is choosing
 * which norm the child will be measured against, and burying that in the results screen would
 * be hiding the most consequential decision in the workflow behind the least consequential
 * click.
 *
 * Passages at the student\u2019s own grade come first, and everything else is still offered
 * underneath. The list is deliberately NOT filtered down to the enrolled grade. Dropping a
 * struggling reader back a level or two until you find the text they can actually handle is
 * standard running-record practice, and a picker that hid those passages would be enforcing a
 * rule that no reading specialist follows. The out-of-grade cards are just labelled clearly so
 * the choice is a decision rather than an accident.
 */
export function PassageSelect({ student, selectedId, onSelect, onBack }) {
  const atGrade = PASSAGES.filter((p) => p.grade === student.grade)
  // Nearest levels first, so a grade 8 reader is offered grade 7 before kindergarten.
  const others = PASSAGES.filter((p) => p.grade !== student.grade).sort(
    (a, b) => Math.abs(a.grade - student.grade) - Math.abs(b.grade - student.grade) || a.grade - b.grade,
  )

  return (
    <section aria-labelledby="passage-heading" className="animate-fadeIn">
      <div className="mb-8 flex items-end justify-between gap-8">
        <div>
          <h2 id="passage-heading" className="font-display text-3xl font-semibold tracking-tight">
            Choose a passage for {student.name}
          </h2>
          <p className="mt-2 max-w-2xl" style={{ color: 'var(--ra-muted)' }}>
            {student.name} is enrolled in {gradeName(student.grade).toLowerCase()}. Whichever passage you
            pick, the score is compared against the norms for that passage&rsquo;s grade, not the
            student&rsquo;s. Reading below the enrolled grade on purpose is normal practice.
          </p>
        </div>
        <button type="button" className="btn-quiet shrink-0" onClick={onBack}>
          &larr; Change student
        </button>
      </div>

      {atGrade.length > 0 && (
        <>
          <h3 className="field-label mb-3">At {gradeName(student.grade).toLowerCase()} level</h3>
          <PassageGrid passages={atGrade} student={student} selectedId={selectedId} onSelect={onSelect} />
        </>
      )}

      <h3 className="field-label mb-3 mt-8">
        {atGrade.length > 0 ? 'Other levels' : 'All passages'}
      </h3>
      <PassageGrid passages={others} student={student} selectedId={selectedId} onSelect={onSelect} />
    </section>
  )
}

function PassageGrid({ passages, student, selectedId, onSelect }) {
  return (
    <ul className="grid grid-cols-2 gap-4">
      {passages.map((passage) => {
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
                  {gradeName(passage.grade)}
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
                {median != null ? (
                  <span>{gradeName(passage.grade)} median &middot; {median} WCPM</span>
                ) : (
                  <span>No published norm above grade six</span>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
