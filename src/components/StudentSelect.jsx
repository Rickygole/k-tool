import { useState } from 'react'
import {
  SCHOOL_LEVELS,
  gradeCounts,
  gradeLabel,
  levelForGrade,
  studentsInGrade,
} from '../data/students.js'

/**
 * Step 1. Who is reading.
 *
 * Three levels of drill-down: school level -> grade -> student.
 *
 * The drill-down state lives HERE, not in App. App's step machine stays at five steps on
 * purpose -- every extra step is another place a live demo can get stranded with no way back,
 * and "which grade am I looking at" is a detail of choosing a student, not a stage of the
 * assessment. The breadcrumb provides back-navigation without the router ever knowing.
 *
 * The norms notice on middle and high school is the substantive part of this screen. Published
 * ORF norms cover grades 1-6 only, so an older student can still be assessed -- accuracy and
 * WCPM remain real measurements, and assessing an older struggling reader against a lower-grade
 * passage is ordinary practice -- but no percentile band exists for them. Saying so at the point
 * of selection is better than a teacher discovering an empty field on the report afterwards.
 */
export function StudentSelect({ selectedId, onSelect }) {
  const [levelKey, setLevelKey] = useState(null)
  const [grade, setGrade] = useState(null)

  const level = SCHOOL_LEVELS.find((l) => l.key === levelKey) ?? null

  return (
    <section aria-labelledby="student-heading" className="animate-fadeIn">
      <div className="mb-6">
        <h2 id="student-heading" className="font-display text-3xl font-semibold tracking-tight">
          Who is reading today?
        </h2>
        <p className="mt-2 max-w-xl" style={{ color: 'var(--ra-muted)' }}>
          Recording and scoring happen entirely on this device. Nothing is uploaded, and no audio is kept
          after the session ends.
        </p>
      </div>

      <Breadcrumb
        level={level}
        grade={grade}
        onLevels={() => {
          setLevelKey(null)
          setGrade(null)
        }}
        onGrades={() => setGrade(null)}
      />

      {level === null && <LevelCards onPick={setLevelKey} />}

      {level !== null && grade === null && <GradeCards level={level} onPick={setGrade} />}

      {grade !== null && <StudentCards grade={grade} selectedId={selectedId} onSelect={onSelect} />}
    </section>
  )
}

/** Where you are, and every way back. A nav landmark so it is announced as one unit. */
function Breadcrumb({ level, grade, onLevels, onGrades }) {
  if (!level) return null

  return (
    <nav aria-label="Roster location" className="mb-5 flex flex-wrap items-center gap-2 text-sm">
      <button type="button" className="btn-quiet" onClick={onLevels}>
        All schools
      </button>
      <span aria-hidden="true" style={{ color: 'var(--ra-muted)' }}>›</span>
      {grade === null ? (
        <span className="font-medium">{level.label}</span>
      ) : (
        <>
          <button type="button" className="btn-quiet" onClick={onGrades}>
            {level.label}
          </button>
          <span aria-hidden="true" style={{ color: 'var(--ra-muted)' }}>›</span>
          <span className="font-medium">
            {grade === 0 ? 'Kindergarten' : `Grade ${gradeLabel(grade)}`}
          </span>
        </>
      )}
    </nav>
  )
}

function LevelCards({ onPick }) {
  return (
    <ul className="grid grid-cols-3 gap-4">
      {SCHOOL_LEVELS.map((level) => (
        <li key={level.key}>
          <button
            type="button"
            className="choice-card flex h-full flex-col items-start gap-1"
            onClick={() => onPick(level.key)}
          >
            <span className="font-display text-xl font-semibold">{level.label}</span>
            <span className="text-sm" style={{ color: 'var(--ra-muted)' }}>
              {level.blurb}
            </span>
            {!level.hasOrfNorms && (
              <span
                className="mt-2 rounded-full px-2 py-0.5 text-xs"
                style={{ background: 'var(--ra-unsure-bg)', color: 'var(--ra-unsure)' }}
              >
                Percentile reflects passage grade
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}

function GradeCards({ level, onPick }) {
  const counts = gradeCounts(level.key)

  return (
    <>
      {!level.hasOrfNorms && <NormsNotice level={level} />}

      <ul className="grid grid-cols-4 gap-4">
        {counts.map(({ grade, count }) => (
          <li key={grade}>
            <button
              type="button"
              className="choice-card flex h-full flex-col items-start gap-1 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => onPick(grade)}
              disabled={count === 0}
            >
              <span className="font-display text-xl font-semibold">
                {grade === 0 ? 'Kindergarten' : `Grade ${gradeLabel(grade)}`}
              </span>
              <span className="text-sm" style={{ color: 'var(--ra-muted)' }}>
                {count === 0 ? 'No students' : `${count} ${count === 1 ? 'student' : 'students'}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

function StudentCards({ grade, selectedId, onSelect }) {
  const students = studentsInGrade(grade)
  const level = levelForGrade(grade)

  return (
    <>
      {level && !level.hasOrfNorms && <NormsNotice level={level} />}

      <ul className="grid grid-cols-3 gap-4">
        {students.map((student) => (
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
                  {student.grade === 0 ? 'Kindergarten' : `Grade ${gradeLabel(student.grade)}`}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

/**
 * Told at the point of selection, not discovered on the report.
 *
 * This is a limitation of the published research, not of this tool, and the distinction matters:
 * we are not declining to compute something we could compute.
 */
function NormsNotice({ level }) {
  return (
    <p
      className="mb-5 rounded-xl px-4 py-3 text-sm"
      style={{ background: 'var(--ra-unsure-bg)', color: 'var(--ra-unsure)' }}
    >
      <strong>{level.label}:</strong> everything works — accuracy, words correct per minute, and the
      full miscue analysis. Read the percentile carefully though: it compares this reader against the
      norm for the <strong>passage&rsquo;s</strong> grade, not their own. Published oral reading fluency
      norms stop at grade 6, so there is no way to say how a {level.label.toLowerCase()} student compares
      to their own grade peers. Scoring an older struggling reader against a lower-grade passage is
      ordinary practice; just read the band as &ldquo;reads grade-3 text at a typical grade-3 rate,&rdquo;
      not as a statement about their year group.
    </p>
  )
}
