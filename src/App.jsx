import { useCallback, useEffect, useMemo, useState } from 'react'
import { score, computeMetrics } from './lib/score.js'
import { startModelLoad } from './hooks/useAsr.js'
import { STUDENTS } from './data/students.js'
import { DEMO_PASSAGE } from './data/passages.js'
import { AppHeader } from './components/AppHeader.jsx'
import { StudentSelect } from './components/StudentSelect.jsx'
import { PassageSelect } from './components/PassageSelect.jsx'
import { ReadScreen } from './components/ReadScreen.jsx'
import { Results } from './components/Results.jsx'
import { TeacherReport } from './components/TeacherReport.jsx'
import { StudentResult } from './components/StudentResult.jsx'
import { UnscoreableRead } from './components/UnscoreableRead.jsx'

/**
 * ReadAloud, browser-only oral reading fluency assessment.
 *
 * Four steps and a printable report. All state is here and it is plain `useState`: the whole
 * app is one student, one passage, one recording and one set of teacher overrides, and any
 * amount of state-management machinery on top of that would be ceremony.
 *
 * ---------------------------------------------------------------------------------------
 * DEMO MODE, Ctrl+Shift+D
 * ---------------------------------------------------------------------------------------
 * Loads `public/demo/clean-read.wav` and pushes it through the *real* pipeline: decode to
 * 16kHz mono, Whisper in the worker, the same scorer, the same screens. The only thing
 * substituted is the source of the samples.
 *
 * It exists because a demo depends on hardware you do not control. A hall with three hundred
 * people in it is loud, laptop microphones get muted by the OS, and permission dialogs get
 * dismissed by whoever used the machine last. Any of those turns a two-minute demo into an
 * apology. This is the fallback, and because it runs the genuine pipeline it cannot drift away
 * from the product the way a canned screenshot would.
 *
 * The hotkey also swaps in DEMO_PASSAGE, because the bundled recording is a reading of that
 * specific text, pointing it at a passage the audio does not match would produce a wall of
 * false omissions. Results scored this way are labelled as a demo on screen and on the printed
 * report; the tool never lets a bundled recording pass as a child's read.
 * ---------------------------------------------------------------------------------------
 */
export default function App() {
  const [step, setStep] = useState('student')
  const [student, setStudent] = useState(null)
  const [passage, setPassage] = useState(null)
  const [read, setRead] = useState(null)
  const [season, setSeason] = useState('spring')
  const [demoToken, setDemoToken] = useState(null)

  // Teacher overrides. Two maps, because score() addresses overrides by reference index and
  // insertions have no reference index, see applyInsertionOverrides below.
  const [overrides, setOverrides] = useState({})
  const [insertionOverrides, setInsertionOverrides] = useState(() => new Set())
  // The other direction: words the engine forgave and the teacher wants counted. Keeping the
  // two maps separate means a word can never be simultaneously overridden and reinstated.
  const [reinstated, setReinstated] = useState({})
  // 'teacher' | 'student'. An AUDIENCE, not a step: the student view is a second rendering of
  // the same record, so it must not be able to drift from it or add a state the demo can get
  // stranded in. The step machine stays at five.
  const [audience, setAudience] = useState('teacher')

  // Start the model download the moment the app opens, not when the record button is pressed.
  // By the time a teacher has picked a student and a passage it is usually already cached.
  useEffect(() => {
    startModelLoad()
  }, [])

  const startDemo = useCallback(() => {
    setStudent((s) => s ?? STUDENTS[0])
    setPassage(DEMO_PASSAGE)
    setRead(null)
    setOverrides({})
    setInsertionOverrides(new Set())
    setStep('read')
    setDemoToken(Date.now())
  }, [])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault()
        startDemo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [startDemo])

  /**
   * Scoring is a pure function of (passage, transcript, overrides), so it is derived state and
   * lives in a memo rather than in a variable someone has to remember to update. Pressing "Not
   * an error" changes the overrides object; every number on screen follows from that in the
   * same render.
   */
  const scored = useMemo(() => {
    if (!passage || !read) return null
    return score(passage.text, read.asr, {
      grade: passage.grade,
      season,
      overrides,
      reinstated,
    })
  }, [passage, read, season, overrides, reinstated])

  /**
   * Insertions cannot be overridden through score(). `options.overrides` is keyed by reference
   * index, and an insertion is a word that is not in the passage, refIndex is null, so there
   * is no key to use. Rather than reach into the tested engine to change that contract, the UI
   * applies those overrides itself and recomputes with the engine's own `computeMetrics`.
   *
   * This is safe because token positions are stable under overrides: `overridden` is a flag on
   * a token, and setting it changes no alignment decision and adds or removes no token. The
   * indexes we hold stay pointing at the words they pointed at.
   */
  const { tokens, metrics } = useMemo(() => {
    if (!scored) return { tokens: [], metrics: null }
    if (insertionOverrides.size === 0) return { tokens: scored.tokens, metrics: scored.metrics }

    const patched = scored.tokens.map((t, i) => (insertionOverrides.has(i) ? { ...t, overridden: true } : t))
    return {
      tokens: patched,
      metrics: computeMetrics(patched, scored.metrics.totalWords, scored.metrics.durationSec, {
        grade: passage.grade,
        season,
      }),
    }
  }, [scored, insertionOverrides, passage, season])

  const handleOverride = useCallback((row, value) => {
    if (row.overridableByRefIndex) {
      setOverrides((prev) => {
        const next = { ...prev }
        if (value) next[row.refIndex] = true
        else delete next[row.refIndex]
        return next
      })
    } else {
      setInsertionOverrides((prev) => {
        const next = new Set(prev)
        if (value) next.add(row.index)
        else next.delete(row.index)
        return next
      })
    }
  }, [])

  const handleComplete = useCallback(({ asr, source }) => {
    setOverrides({})
    setInsertionOverrides(new Set())
    setReinstated({})
    setAudience('teacher')
    setRead({ asr, source, at: Date.now() })
    setDemoToken(null)
    setStep('results')
  }, [])

  const handleReinstate = useCallback((row, value) => {
    if (row.refIndex == null) return
    setReinstated((prev) => {
      const next = { ...prev }
      if (value) next[row.refIndex] = true
      else delete next[row.refIndex]
      return next
    })
  }, [])

  const handleNavigate = useCallback((target) => {
    setStep(target)
    setAudience('teacher')
    setDemoToken(null)
  }, [])

  const restart = useCallback(() => {
    setStep('student')
    setAudience('teacher')
    setStudent(null)
    setPassage(null)
    setRead(null)
    setDemoToken(null)
    setOverrides({})
    setInsertionOverrides(new Set())
    setReinstated({})
  }, [])

  // The header's step trail only knows about the four assessment steps; the printable report
  // is a view of the results rather than a fifth step.
  const headerStep = step === 'report' ? 'results' : step

  // The engine refuses to vouch for silence or a two-word transcript. When it does, no score,
  // no percentile and no printable report are produced from it, see UnscoreableRead.
  const unscoreable = scored?.validity && scored.validity.ok === false ? scored.validity : null
  const showResults = step === 'results' && student && passage && read && metrics
  const showReport = step === 'report' && student && passage && read && metrics && !unscoreable

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="no-print sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-harbor focus:px-4 focus:py-2 focus:text-mist"
      >
        Skip to main content
      </a>

      <AppHeader
        step={headerStep}
        student={student}
        passage={passage}
        onNavigate={handleNavigate}
        onHome={restart}
      />

      <main id="main" className="mx-auto min-w-[1024px] max-w-[1400px] px-8 py-10">
        {step === 'student' && (
          <StudentSelect
            selectedId={student?.id}
            onSelect={(s) => {
              setStudent(s)
              setStep('passage')
            }}
          />
        )}

        {step === 'passage' && student && (
          <PassageSelect
            student={student}
            selectedId={passage?.id}
            onSelect={(p) => {
              setPassage(p)
              setRead(null)
              setStep('read')
            }}
            onBack={() => setStep('student')}
          />
        )}

        {step === 'read' && student && passage && (
          <ReadScreen
            student={student}
            passage={passage}
            demoToken={demoToken}
            onComplete={handleComplete}
            onBack={() => setStep('passage')}
          />
        )}

        {showResults && unscoreable && (
          <UnscoreableRead
            student={student}
            passage={passage}
            validity={unscoreable}
            onReadAgain={() => setStep('read')}
            onRestart={restart}
          />
        )}

        {showResults && !unscoreable && audience === 'student' && (
          <StudentResult
            student={student}
            tokens={tokens}
            metrics={metrics}
            onBack={() => setAudience('teacher')}
          />
        )}

        {showResults && !unscoreable && audience === 'teacher' && (
          <Results
            student={student}
            passage={passage}
            read={read}
            tokens={tokens}
            metrics={metrics}
            suppressionCounts={scored.suppressionCounts}
            dialectRuleCounts={scored.dialectRuleCounts}
            season={season}
            onSeasonChange={setSeason}
            onOverride={handleOverride}
            onReinstate={handleReinstate}
            onShowStudent={() => setAudience('student')}
            onPrint={() => setStep('report')}
            onReadAgain={() => setStep('read')}
            onRestart={restart}
          />
        )}

        {showReport && (
          <TeacherReport
            student={student}
            passage={passage}
            read={read}
            tokens={tokens}
            metrics={metrics}
            season={season}
            onBack={() => setStep('results')}
          />
        )}
      </main>

      <footer className="no-print mx-auto min-w-[1024px] max-w-[1400px] px-8 pb-10 pt-4 text-xs" style={{ color: 'var(--ra-muted)' }}>
        <p>
          Audio is recorded, transcribed and scored entirely in this browser. Nothing is uploaded, and no
          recording is retained after the session. Automated scoring is a screening aid, not a substitute
          for teacher judgement.
        </p>
      </footer>
    </div>
  )
}
