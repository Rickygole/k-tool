import { MarkupLegend, PassageMarkup } from './PassageMarkup.jsx'
import { miscueRows, suppressedRows, formatDuration } from '../util/markup.js'
import { CITATION, medianWcpm } from '../lib/norms.js'
import { percentileCopy } from './MetricCards.jsx'

/**
 * Step 5. The one-pager that goes in the folder.
 *
 * This is the artifact that outlives the software. It gets printed, stapled to a running record
 * folder, handed to a parent at a conference, or filed for an IEP meeting. So it is designed
 * for paper first and a screen second.
 *
 * What that means concretely:
 *   - Everything lives inside `.print-area`. The print stylesheet hides the rest of the
 *     document, so the toolbar, the header and the app chrome cannot leak onto the page.
 *   - No colour is required to read it. The marked passage uses the same glyph-and-underline
 *     system as the screen, and the print stylesheet drops the colour entirely. School printers
 *     are black and white.
 *   - There is a notes line. A teacher will write on this the moment it comes off the printer,
 *     and leaving them nowhere to do it is how a form gets ignored.
 *   - Every suppression is disclosed on the page, not just on screen. If the score was adjusted,
 *     the paper says so and says why. A parent reading this deserves the same explanation the
 *     teacher got.
 */
export function TeacherReport({ student, passage, read, tokens, metrics, season, onBack }) {
  const { errors, events } = miscueRows(tokens)
  const suppressed = suppressedRows(tokens)
  const median = medianWcpm(passage.grade, season)
  const overrides = errors.filter((r) => r.overridden).length
  const date = new Date(read.at)

  return (
    <>
      <div className="no-print mb-6 flex items-center justify-between gap-6">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">Teacher report</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--ra-muted)' }}>
            One page. Prints in black and white; the colour is never the only signal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary" onClick={onBack}>
            ← Back to results
          </button>
          <button type="button" className="btn-primary" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>

      {/* The printed sheet. On screen it is shown at roughly letter proportions so what you
          see is what comes out of the printer. */}
      <div
        className="print-area mx-auto max-w-[52rem] rounded-lg p-10 shadow-sm"
        style={{ background: '#ffffff', color: '#000000' }}
      >
        <header className="flex items-end justify-between border-b-2 border-black pb-3">
          <div>
            <h3 className="font-display text-2xl font-semibold leading-tight">Oral Reading Fluency Record</h3>
            <p className="mt-1 text-sm">
              <strong>{student.name}</strong> · Grade {student.grade}
            </p>
          </div>
          <dl className="text-right text-xs leading-relaxed">
            <div>
              <dt className="inline font-semibold">Passage: </dt>
              <dd className="inline">
                {passage.title} (grade {passage.grade})
              </dd>
            </div>
            <div>
              <dt className="inline font-semibold">Date: </dt>
              <dd className="inline">{date.toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Duration: </dt>
              <dd className="inline">{formatDuration(metrics.durationSec)}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Benchmark: </dt>
              <dd className="inline capitalize">{season}</dd>
            </div>
          </dl>
        </header>

        {read.source === 'demo' && (
          <p className="mt-3 border border-black px-3 py-1.5 text-xs font-semibold">
            DEMO RECORDING. Scored from a bundled audio file, not from this student&rsquo;s voice.
          </p>
        )}

        <section aria-label="Scores" className="mt-5 grid grid-cols-5 gap-3">
          <ReportStat label="WCPM" value={metrics.wcpm} note={median != null ? `grade median ${median}` : '—'} />
          <ReportStat label="Accuracy" value={`${metrics.accuracyPct}%`} note={`${metrics.errors} errors`} />
          <ReportStat label="Self-corr. rate" value={metrics.selfCorrectionDisplay} note={`${metrics.selfCorrections} observed`} />
          <ReportStat label="Level" value={capitalize(metrics.level)} note={`${metrics.wordsCorrect}/${metrics.totalWords} correct`} />
          <ReportStat
            label="Percentile"
            value={percentileCopy(metrics.percentile, metrics.wcpm, passage.grade, season).value}
            note="band, not a point estimate"
          />
        </section>

        <section aria-label="Marked passage" className="mt-6">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider">Marked passage</h4>
          <div className="text-[0.95rem]">
            <PassageMarkup tokens={tokens} interactive={false} idPrefix="rep" />
          </div>
          <div className="mt-3 border-t border-black/30 pt-2">
            <MarkupLegend compact />
          </div>
        </section>

        <section aria-label="Miscues" className="mt-6">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider">
            Miscues ({errors.length - overrides} counted{overrides > 0 ? `, ${overrides} overridden by teacher` : ''})
          </h4>
          {errors.length === 0 ? (
            <p className="text-sm">No miscues recorded.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left">
                  <th scope="col">Expected</th>
                  <th scope="col">Heard</th>
                  <th scope="col">Type</th>
                  <th scope="col">Counted</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((row) => (
                  <tr key={row.index}>
                    <td>{row.expected}</td>
                    <td>{row.heard}</td>
                    <td>{row.label}</td>
                    <td>{row.overridden ? 'No, teacher override' : 'Yes'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {events.length > 0 && (
            <p className="mt-2 text-xs">
              <strong>Not scored as errors:</strong>{' '}
              {events.map((e) => `${e.label.toLowerCase()} (${e.expected !== '—' ? e.expected : e.heard})`).join(', ')}.
            </p>
          )}
        </section>

        {suppressed.length > 0 && (
          <section aria-label="Adjustments" className="mt-5">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider">
              Words not counted as errors ({suppressed.length})
            </h4>
            <p className="text-xs leading-relaxed">
              {suppressed
                .map((s) => `“${s.expected}” heard as “${s.heard}”, ${s.reason.toLowerCase()}${s.rules.length ? ` (${s.rules.join(', ')})` : ''}`)
                .join('; ')}
              .
            </p>
            <p className="mt-1 text-xs italic">
              A dialect-consistent pronunciation is not a reading error. These adjustments are listed so
              the score can be checked rather than taken on trust.
            </p>
          </section>
        )}

        <section aria-label="Notes" className="mt-6">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider">Teacher notes</h4>
          <div aria-hidden="true">
            <div className="h-7 border-b border-black/50" />
            <div className="h-7 border-b border-black/50" />
            <div className="h-7 border-b border-black/50" />
          </div>
        </section>

        <footer className="mt-6 border-t border-black/30 pt-2 text-[0.65rem] leading-snug">
          <p>Norms: {CITATION}</p>
          <p className="mt-0.5">
            Scored on-device by ReadAloud. Audio was processed locally and was not uploaded or stored.
            Automated scoring is a screening aid and does not replace teacher judgement.
          </p>
        </footer>
      </div>
    </>
  )
}

function ReportStat({ label, value, note }) {
  return (
    <div className="border border-black px-2 py-1.5">
      <p className="text-[0.6rem] font-bold uppercase tracking-wider">{label}</p>
      <p className="text-xl font-semibold leading-tight">{value}</p>
      <p className="text-[0.6rem] leading-tight">{note}</p>
    </div>
  )
}

function capitalize(s) {
  return typeof s === 'string' && s.length ? s[0].toUpperCase() + s.slice(1) : s
}
