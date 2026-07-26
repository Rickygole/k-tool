import { medianWcpm, CITATION, ORF_NORMS } from '../lib/norms.js'
import { formatDuration } from '../util/markup.js'

const SEASON_INDEX = { fall: 0, winter: 1, spring: 2 }

const LEVEL_COPY = {
  independent: { label: 'Independent', detail: '95% accuracy or above — this text can be read alone.' },
  instructional: { label: 'Instructional', detail: '90–94% accuracy — right level for guided instruction.' },
  frustration: { label: 'Frustration', detail: 'Below 90% accuracy — this text is too hard unsupported.' },
}

/**
 * What we are actually allowed to say about a percentile.
 *
 * `percentileBand` returns the highest published percentile the reader meets or exceeds, and
 * the exact meaning of its bottom return value has moved more than once — at one point a
 * returned 10 meant "below the 25th" because the 10th-percentile row was never tested. Printing
 * "at or above the 10th percentile" on that would be a claim the function never made.
 *
 * So the bottom band is not taken on trust. The threshold is read back out of the published
 * table and compared against the score, which makes the sentence on screen true under either
 * reading of the band value. The upper bands are unambiguous and are used as returned.
 *
 * Everything stays a band. A five-row table cannot support "37th percentile" and inventing one
 * is exactly the false precision that makes an assessment tool untrustworthy.
 */
export function percentileCopy(band, wcpm, grade, season) {
  const row = ORF_NORMS[grade]
  const idx = SEASON_INDEX[season]
  const published = row?.[50]?.[idx] != null

  if (!published) {
    return { value: 'No norms', detail: 'No published norms for this grade and benchmark period.' }
  }
  if (band == null || band === 10) {
    const floor = row?.[10]?.[idx]
    if (floor != null && wcpm >= floor) {
      return { value: '10th–25th', detail: `At or above the 10th percentile, below the 25th (${row[25][idx]} WCPM).` }
    }
    return {
      value: 'Below 10th',
      detail: floor != null ? `Below the 10th percentile (${floor} WCPM) for this grade and period.` : 'Below the lowest published band.',
    }
  }
  return { value: `≥ ${band}th`, detail: `At or above the ${band}th percentile for this grade and period.` }
}

const SEASONS = [
  { value: 'fall', label: 'Fall' },
  { value: 'winter', label: 'Winter' },
  { value: 'spring', label: 'Spring' },
]

/**
 * The numbers, and what they are worth.
 *
 * One hero figure — words correct per minute — because that is the number that goes in the
 * gradebook and everything else is context for it. The four supporting tiles are the same
 * size as each other and smaller than the hero, so the hierarchy is readable before a word is.
 *
 * Every tile that expresses a judgement (level, percentile) carries the judgement in words.
 * None of them relies on colour to say whether a result is good.
 */
export function MetricCards({ metrics, passage, season, onSeasonChange }) {
  const median = medianWcpm(passage.grade, season)
  const pct = percentileCopy(metrics.percentile, metrics.wcpm, passage.grade, season)
  const level = LEVEL_COPY[metrics.level]

  return (
    <div className="flex flex-col gap-4">
      <section className="card" aria-labelledby="wcpm-heading">
        <h3 id="wcpm-heading" className="field-label">
          Words correct per minute
        </h3>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="hero-value">{metrics.wcpm}</span>
          <span className="text-sm" style={{ color: 'var(--ra-muted)' }}>
            WCPM
          </span>
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ra-muted)' }}>
          {metrics.wordsCorrect} of {metrics.totalWords} words correct in {formatDuration(metrics.durationSec)}
        </p>

        {median != null && <BenchmarkMeter wcpm={metrics.wcpm} median={median} grade={passage.grade} season={season} />}
      </section>

      <div className="grid grid-cols-2 gap-4">
        <Tile label="Accuracy" value={`${metrics.accuracyPct}%`} detail={`${metrics.errors} errors counted`} />
        <Tile
          label="Self-correction rate"
          // metrics.selfCorrectionDisplay is '—' when there were none. The underlying formula
          // is (E + SC) / SC, which divides by zero in that very common case; printing
          // "Infinity" on a child's reading report would be unforgivable, so we print the
          // engine's dash and say what it means underneath.
          value={metrics.selfCorrectionDisplay}
          detail={
            metrics.selfCorrections === 0
              ? 'No self-corrections observed'
              : `${metrics.selfCorrections} self-correction${metrics.selfCorrections === 1 ? '' : 's'}`
          }
        />
        <Tile label="Instructional level" value={level.label} detail={level.detail} valueSize="text-2xl" />
        <Tile label="Percentile band" value={pct.value} detail={pct.detail} valueSize="text-2xl" />
      </div>

      <div className="card">
        <label htmlFor="season" className="field-label block">
          Benchmark period
        </label>
        <select
          id="season"
          value={season}
          onChange={(e) => onSeasonChange(e.target.value)}
          className="mt-2 w-full rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor"
          style={{ border: '1px solid var(--ra-border)', background: 'var(--ra-surface)', color: 'var(--ra-fg)' }}
        >
          {SEASONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--ra-muted)' }}>
          Norms are reported as bands, not point estimates — a five-row table cannot support a claim
          like &ldquo;37th percentile&rdquo;. {CITATION}
        </p>
      </div>
    </div>
  )
}

function Tile({ label, value, detail, valueSize }) {
  return (
    <section className="card">
      <h3 className="field-label">{label}</h3>
      <p className={`mt-2 metric-value ${valueSize ?? ''}`}>{value}</p>
      <p className="mt-1.5 text-xs leading-snug" style={{ color: 'var(--ra-muted)' }}>
        {detail}
      </p>
    </section>
  )
}

/**
 * One meter, one comparison: this reader against the grade-level median.
 *
 * The scale runs to 1.6x the median so the median tick sits at a consistent place across
 * grades and the bar never pins. The unfilled track is a light step of the fill's own hue, and
 * the direction of the comparison is stated in words above the bar — the colour is the third
 * signal, not the first.
 */
function BenchmarkMeter({ wcpm, median, grade, season }) {
  const scaleMax = Math.max(median * 1.6, wcpm * 1.08, 1)
  const fillPct = Math.min(100, (wcpm / scaleMax) * 100)
  const medianPct = Math.min(100, (median / scaleMax) * 100)
  const above = wcpm >= median

  return (
    <figure className="mt-5">
      <figcaption className="mb-2 flex items-baseline justify-between text-xs">
        <span className="font-medium">
          <span aria-hidden="true">{above ? '▲' : '▼'}</span>{' '}
          {above ? 'At or above' : 'Below'} the grade {grade} {season} median
        </span>
        <span className="tabular-nums" style={{ color: 'var(--ra-muted)' }}>
          median {median}
        </span>
      </figcaption>

      <div
        className="relative h-3 w-full overflow-hidden rounded-full"
        style={{ background: 'color-mix(in srgb, var(--ra-accent) 16%, transparent)' }}
        role="img"
        aria-label={`${wcpm} words correct per minute against a grade ${grade} ${season} median of ${median}.`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-200 ease-out"
          style={{ width: `${fillPct}%`, background: above ? 'var(--ra-accent)' : 'var(--ra-unsure)' }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 w-0.5"
          style={{ left: `${medianPct}%`, background: 'var(--ra-fg)' }}
        />
      </div>
    </figure>
  )
}
