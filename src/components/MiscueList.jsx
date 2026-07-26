import { STATUS_GLYPH } from '../util/markup.js'

/**
 * The miscue table, and the override.
 *
 * The override button is the most important control in the product, and it is one click for a
 * reason. An ASR-based scorer is a stopwatch with opinions; the teacher is the assessor. When
 * the machine calls "sun" for "son" an error and the teacher heard otherwise, the fix has to be
 * cheaper than arguing with it. So "Not an error" is a single click, it is reversible, and
 * every metric on the screen recomputes from it immediately.
 *
 * Errors and non-errors are two tables rather than one with a type column. Self-corrections and
 * repetitions are *not* scored as errors under running-record convention, and putting them in
 * the same list as substitutions invites exactly the misreading the convention exists to
 * prevent.
 */
export function MiscueList({ errors, events, onOverride }) {
  const active = errors.filter((r) => !r.overridden).length

  return (
    <section aria-labelledby="miscues-heading" className="card">
      <div className="flex items-baseline justify-between gap-4">
        <h3 id="miscues-heading" className="font-display text-xl font-semibold">
          Miscues
        </h3>
        <p className="text-sm" style={{ color: 'var(--ra-muted)' }}>
          {active} counted as {active === 1 ? 'an error' : 'errors'}
          {errors.length !== active && ` · ${errors.length - active} overridden`}
        </p>
      </div>

      {errors.length === 0 ? (
        <p className="mt-4 rounded-lg px-4 py-6 text-center text-sm" style={{ background: 'var(--ra-correct-bg)', color: 'var(--ra-correct)' }}>
          No miscues. Every word in the passage was read as printed.
        </p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <caption className="sr-only">
            Words scored as errors, with the option to mark each one correct.
          </caption>
          <thead>
            <tr className="text-left" style={{ color: 'var(--ra-muted)' }}>
              <th scope="col" className="pb-2 font-medium">Expected</th>
              <th scope="col" className="pb-2 font-medium">Heard</th>
              <th scope="col" className="pb-2 font-medium">Type</th>
              <th scope="col" className="pb-2 text-right font-medium">Teacher override</th>
            </tr>
          </thead>
          <tbody>
            {errors.map((row) => (
              <tr key={row.index} className="border-t" style={{ borderColor: 'var(--ra-border)' }}>
                <td className={`py-2 pr-4 font-passage text-base ${row.overridden ? 'opacity-50' : ''}`}>
                  {row.expected}
                </td>
                <td className={`py-2 pr-4 font-passage text-base ${row.overridden ? 'opacity-50' : ''}`} style={{ color: 'var(--ra-muted)' }}>
                  {row.heard}
                </td>
                <td className="py-2 pr-4">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={
                      row.overridden
                        ? { background: 'var(--ra-correct-bg)', color: 'var(--ra-correct)' }
                        : { background: 'var(--ra-miscue-bg)', color: 'var(--ra-miscue)' }
                    }
                  >
                    <span aria-hidden="true" className="font-bold">
                      {row.overridden ? '✓' : STATUS_GLYPH[row.status]}
                    </span>
                    {row.overridden ? 'Not an error' : row.label}
                  </span>
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    className="btn-quiet"
                    onClick={() => onOverride(row, !row.overridden)}
                    style={row.overridden ? undefined : { color: 'var(--ra-accent)' }}
                  >
                    {row.overridden ? 'Undo' : 'Not an error'}
                    <span className="sr-only">
                      {' '}
                      {row.label} of “{row.expected}”
                    </span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {events.length > 0 && (
        <div className="mt-8">
          <h4 className="field-label">Not scored as errors</h4>
          <p className="mt-1 text-xs" style={{ color: 'var(--ra-muted)' }}>
            Running-record convention. Self-corrections are evidence that the reader is monitoring
            their own reading, and are counted separately for that reason.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {events.map((row) => (
              <li
                key={row.index}
                className="rounded-full px-3 py-1 text-xs"
                style={{ background: 'var(--ra-correct-bg)', color: 'var(--ra-correct)' }}
              >
                <span aria-hidden="true" className="font-bold">
                  {STATUS_GLYPH[row.status]}
                </span>{' '}
                {row.label}: <span className="font-passage">{row.expected !== '—' ? row.expected : row.heard}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
