import { SUPPRESSION_REASON, dialectRuleLabel, dialectRuleExample } from '../util/markup.js'

const ORDER = ['dialect', 'homophone', 'fuzzy', 'phonetic', 'contraction']

/**
 * What we chose not to count, and why.
 *
 * This panel is the product's argument, written out. A reading assessor that only reports
 * errors is making an implicit claim that every deviation it found was a reading failure — and
 * for a child who speaks African American English, or for any child a recogniser mishears, that
 * claim is often false. Miscue analysis has scored dialect features as errors for decades, and
 * ASR compounds it: Koenecke et al. (PNAS 2020) measured roughly double the word error rate for
 * Black speakers across all five major commercial recognisers.
 *
 * So the suppressions are shown, itemised, named, and countable. A teacher who disagrees can
 * see exactly which words we let through and override any of them. A silent pass would be
 * worse than no pass at all.
 *
 * Honesty note, which the engine's own comments insist on: these rules run on Whisper's *text*,
 * and Whisper is trained to emit standard orthography. It usually writes "ask" even when the
 * reader said "aks". Many of these rules will therefore show a count of zero, and that zero is
 * reported rather than hidden.
 */
export function SuppressionPanel({ rows, suppressionCounts, dialectRuleCounts, onReinstate }) {
  const total = rows.length

  return (
    <section aria-labelledby="suppressed-heading" className="card">
      <div className="flex items-baseline justify-between gap-4">
        <h3 id="suppressed-heading" className="font-display text-xl font-semibold">
          Not counted as errors
        </h3>
        <p className="text-sm tabular-nums" style={{ color: 'var(--ra-muted)' }}>
          {total} {total === 1 ? 'word' : 'words'}
        </p>
      </div>

      <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--ra-muted)' }}>
        These words did not match the passage exactly, and we declined to score them as errors. Each
        one is listed with its reason, and any of them can be counted as an error with one click.
        The scoring runs in both directions on purpose: if the only control a teacher had were the
        power to forgive, every adjustment this tool offers would push the score upward. The
        teacher is the assessor; we are the stopwatch.
      </p>

      {total === 0 ? (
        <p className="mt-4 text-sm" style={{ color: 'var(--ra-muted)' }}>
          Nothing was suppressed on this read. Every word either matched the passage or was scored as
          a miscue.
        </p>
      ) : (
        <>
          <ul className="mt-4 flex flex-wrap gap-2">
            {ORDER.filter((k) => suppressionCounts[k]).map((k) => (
              <li
                key={k}
                className="rounded-full px-3 py-1 text-xs"
                style={{ background: 'var(--ra-unsure-bg)', color: 'var(--ra-unsure)' }}
              >
                <span className="font-semibold tabular-nums">{suppressionCounts[k]}</span> · {SUPPRESSION_REASON[k]}
              </li>
            ))}
          </ul>

          <table className="mt-4 w-full text-sm">
            <caption className="sr-only">Words that did not match the passage and were not counted as errors.</caption>
            <thead>
              <tr className="text-left" style={{ color: 'var(--ra-muted)' }}>
                <th scope="col" className="pb-2 font-medium">In the passage</th>
                <th scope="col" className="pb-2 font-medium">Heard</th>
                <th scope="col" className="pb-2 font-medium">Why it was not counted</th>
                <th scope="col" className="pb-2 font-medium">
                  <span className="sr-only">Count this word as an error</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.index} className="border-t" style={{ borderColor: 'var(--ra-border)' }}>
                  <td className="py-2 pr-4 font-passage text-base">{row.expected}</td>
                  <td className="py-2 pr-4 font-passage text-base" style={{ color: 'var(--ra-muted)' }}>
                    {row.heard}
                  </td>
                  <td className="py-2">
                    {row.reason}
                    {row.rules.length > 0 && (
                      <span className="ml-1" style={{ color: 'var(--ra-unsure)' }}>
                        ({row.rules.join(', ')})
                      </span>
                    )}
                  </td>
                  <td className="py-2 pl-2 text-right">
                    {row.refIndex != null && onReinstate && (
                      <button
                        type="button"
                        onClick={() => onReinstate(row, !row.reinstated)}
                        aria-pressed={row.reinstated}
                        className="btn-quiet whitespace-nowrap"
                        style={row.reinstated ? { color: 'var(--ra-miscue)', fontWeight: 600 } : undefined}
                      >
                        {row.reinstated ? '✓ Counted as an error' : 'Count as an error'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {Object.keys(dialectRuleCounts ?? {}).length > 0 && (
        <div className="mt-6 rounded-xl p-4" style={{ background: 'var(--ra-unsure-bg)' }}>
          <h4 className="field-label" style={{ color: 'var(--ra-unsure)' }}>
            Dialect features observed
          </h4>
          <ul className="mt-2 space-y-1 text-sm" style={{ color: 'var(--ra-unsure)' }}>
            {Object.entries(dialectRuleCounts).map(([id, count]) => (
              <li key={id}>
                <span className="font-semibold tabular-nums">{count}×</span> {dialectRuleLabel(id)}{' '}
                <span className="opacity-80">{dialectRuleExample(id)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--ra-unsure)' }}>
            A dialect-consistent pronunciation is not a reading error. These are reported so the
            decision is visible and reviewable, never silent.
          </p>
        </div>
      )}
    </section>
  )
}
