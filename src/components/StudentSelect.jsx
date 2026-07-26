import { STUDENTS } from '../data/students.js'

/**
 * Step 1. Who is reading.
 *
 * Five hardcoded names, no login, no roster sync -- all three are explicit non-goals for this
 * build. What matters here is that the choice is one keyboard-reachable control per student
 * and that the grade is on the card, because the teacher is about to pick a passage and the
 * gap between enrolled grade and passage grade is the assessment decision they are making.
 */
export function StudentSelect({ selectedId, onSelect }) {
  return (
    <section aria-labelledby="student-heading" className="animate-fadeIn">
      <div className="mb-8">
        <h2 id="student-heading" className="font-display text-3xl font-semibold tracking-tight">
          Who is reading today?
        </h2>
        <p className="mt-2 max-w-xl" style={{ color: 'var(--ra-muted)' }}>
          Recording and scoring happen entirely on this device. Nothing is uploaded, and no audio is kept
          after the session ends.
        </p>
      </div>

      <ul className="grid grid-cols-3 gap-4">
        {STUDENTS.map((student) => (
          <li key={student.id}>
            <button
              type="button"
              className="choice-card group flex items-center gap-4"
              aria-current={selectedId === student.id}
              onClick={() => onSelect(student)}
            >
              <span
                aria-hidden="true"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full font-display text-lg font-semibold"
                style={{ background: 'var(--ra-bg)', color: 'var(--ra-accent)', border: '1px solid var(--ra-border)' }}
              >
                {student.initials}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{student.name}</span>
                <span className="block text-sm" style={{ color: 'var(--ra-muted)' }}>
                  Grade {student.grade}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
