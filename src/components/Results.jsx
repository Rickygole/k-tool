import { MarkupLegend, PassageMarkup } from './PassageMarkup.jsx'
import { MetricCards } from './MetricCards.jsx'
import { MiscueList } from './MiscueList.jsx'
import { SuppressionPanel } from './SuppressionPanel.jsx'
import { miscueRows, suppressedRows } from '../util/markup.js'

/**
 * Step 4. The running record.
 *
 * Split layout, and the split is an argument: the passage is on the left at reading size
 * because the marked text is the evidence, and the numbers are on the right because they are
 * the summary. A teacher who disagrees with a number should be able to look left and see
 * exactly which word produced it.
 */
export function Results({
  student,
  passage,
  read,
  tokens,
  metrics,
  suppressionCounts,
  dialectRuleCounts,
  season,
  onSeasonChange,
  onOverride,
  onReinstate,
  onShowStudent,
  onPrint,
  onReadAgain,
  onRestart,
}) {
  const { errors, events } = miscueRows(tokens)
  const suppressed = suppressedRows(tokens)

  return (
    <section aria-labelledby="results-heading" className="animate-fadeIn">
      <div className="mb-6 flex items-start justify-between gap-8">
        <div>
          <p className="field-label mb-1">
            {student.name} · {passage.title} · {new Date(read.at).toLocaleDateString()}
          </p>
          <h2 id="results-heading" className="font-display text-3xl font-semibold tracking-tight">
            Running record
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button type="button" className="btn-secondary" onClick={onRestart}>
            New assessment
          </button>
          <button type="button" className="btn-secondary" onClick={onReadAgain}>
            Read again
          </button>
          <button type="button" className="btn-secondary" onClick={onShowStudent}>
            Show the student
          </button>
          <button type="button" className="btn-primary" onClick={onPrint}>
            Teacher report
          </button>
        </div>
      </div>

      {read.source === 'demo' && (
        <p
          className="mb-6 rounded-lg px-4 py-2 text-sm"
          style={{ background: 'var(--ra-unsure-bg)', color: 'var(--ra-unsure)' }}
          role="status"
        >
          <strong className="font-semibold">Demo recording.</strong> Scored from the bundled audio file, not
          from a live read. The pipeline is the real one; the voice is not this student&rsquo;s.
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_22rem] items-start gap-6">
        <div className="flex flex-col gap-6">
          <article className="card px-8 py-7" aria-labelledby="marked-heading">
            <h3 id="marked-heading" className="field-label mb-4">
              Marked passage
            </h3>
            <PassageMarkup tokens={tokens} idPrefix="res" />
            <div className="mt-7 border-t pt-5" style={{ borderColor: 'var(--ra-border)' }}>
              <h4 className="sr-only">Key</h4>
              <MarkupLegend />
            </div>
          </article>

          <details className="card">
            <summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor">
              What the recogniser heard
            </summary>
            <p className="mt-3 font-mono text-sm leading-relaxed" style={{ color: 'var(--ra-muted)' }}>
              {read.asr.text || '(empty transcript)'}
            </p>
            <p className="mt-3 text-xs" style={{ color: 'var(--ra-muted)' }}>
              {read.asr.words.length} words recognised in {read.asr.durationSec.toFixed(1)}s
              {read.asr.asrMs != null && ` · transcribed in ${(read.asr.asrMs / 1000).toFixed(1)}s on this device`}
            </p>
          </details>
        </div>

        <MetricCards metrics={metrics} passage={passage} student={student} season={season} onSeasonChange={onSeasonChange} />
      </div>

      <div className="mt-6 flex flex-col gap-6">
        <MiscueList errors={errors} events={events} onOverride={onOverride} />
        <SuppressionPanel
          onReinstate={onReinstate}
          rows={suppressed}
          suppressionCounts={suppressionCounts}
          dialectRuleCounts={dialectRuleCounts}
        />
      </div>
    </section>
  )
}
