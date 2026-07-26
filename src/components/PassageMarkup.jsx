import { Fragment, useMemo } from 'react'
import { buildUnits, explainUnit, unitGlyph } from '../util/markup.js'

const SEVERITY_CLASS = {
  ok: 'word-ok',
  note: 'word-note',
  unsure: 'word-unsure',
  miscue: 'word-miscue',
}

/**
 * The marked-up passage. The running record, rendered.
 *
 * Three commitments here, in order of how much they matter:
 *
 * 1. COLOUR IS NEVER ALONE. Every non-green word carries a glyph (S, O, I, SC, R, ?) and an
 *    underline style (solid / wavy / dotted / strikethrough). Roughly one man in twelve has a
 *    red-green deficiency, and the printed report comes off a black-and-white classroom
 *    printer. If the marking only worked in colour it would only work for some people, which
 *    for an equity tool is the same as not working.
 *
 * 2. AMBER IS EXPLAINED, ALWAYS. A word we declined to count as an error is a claim about the
 *    reader, and a claim with no reason attached is just a colour. Hover or tab to any marked
 *    word and it says what was heard and why we let it through, including which dialect rule
 *    fired, by name.
 *
 * 3. THE MARKING IS REACHABLE BY KEYBOARD. Marked words are focusable and carry the same text
 *    as an accessible description, so the explanation is available without a mouse and without
 *    sight. `aria-describedby` resolves through the hidden tooltip node, so assistive tech gets
 *    the text whether or not it is visually shown.
 *
 * <mark> rather than <span> is the honest element: this is text marked for reference in
 * another context, which is precisely what HTML says <mark> is for.
 */
export function PassageMarkup({ tokens, interactive = true, idPrefix = 'w' }) {
  const units = useMemo(() => buildUnits(tokens), [tokens])

  return (
    <p className="passage-text">
      {units.map((unit, i) => {
        const glyph = unitGlyph(unit)
        const isPlain = unit.severity === 'ok' && !glyph

        if (isPlain) {
          return (
            <span key={`${idPrefix}${unit.indexes[0]}`} className="word word-ok">
              {unit.display}{' '}
            </span>
          )
        }

        const omitted = unit.tokens.some((t) => t.status === 'omission' && !t.overridden)
        const inserted = unit.kind === 'insertion'
        const description = explainUnit(unit)
        const tooltipId = `${idPrefix}-tip-${unit.indexes[0]}`

        return (
          // The nowrap wrapper holds the word together with its superscript glyph so they can
          // never be split across a line. The separating space lives OUTSIDE it, below, and that
          // placement is the whole point: with the space inside, a run of consecutive marked
          // words had no break opportunity anywhere in it (JSX drops the whitespace between
          // sibling elements), so a heavily marked passage rendered as one unbreakable chain and
          // ran straight off the edge of the card.
          <Fragment key={`${idPrefix}${unit.indexes[0]}`}>
            <span className="whitespace-nowrap">
                <mark
                className={[
                  'word',
                  'relative inline-block',
                  SEVERITY_CLASS[unit.severity],
                  omitted ? 'word-omitted' : '',
                  interactive ? 'word-interactive' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                tabIndex={interactive ? 0 : undefined}
                aria-describedby={interactive ? tooltipId : undefined}
              >
                {inserted && (
                  <span aria-hidden="true" className="opacity-60">
                    ^
                  </span>
                )}
                {unit.display}
                {glyph && (
                  <span className="word-glyph" aria-hidden="true">
                    {glyph}
                  </span>
                )}
                {/* aria-hidden AND referenced by aria-describedby, which is not a contradiction:
                    the accessible-description computation deliberately reads hidden nodes when
                    they are directly referenced. So the explanation is announced when the word
                    takes focus, and is NOT read again as part of the passage when a screen
                    reader user reads straight through it. */}
                {interactive && (
                  <span id={tooltipId} className="tooltip" aria-hidden="true">
                    <span className="font-semibold">{unit.display || '(extra word)'}</span>: {description}
                  </span>
                )}
              </mark>
            </span>{' '}
          </Fragment>
        )
      })}
    </p>
  )
}

const LEGEND = [
  {
    severity: 'ok',
    glyph: null,
    title: 'Read correctly',
    detail: 'Matched the passage, or the teacher marked it correct.',
  },
  {
    severity: 'note',
    glyph: 'SC',
    title: 'Self-correction / repetition',
    detail: 'Not an error. Evidence the reader is monitoring their own reading.',
  },
  {
    severity: 'unsure',
    glyph: '?',
    title: 'Not counted as an error',
    detail: 'A dialect feature, a homophone, or a call we are not confident enough to make.',
  },
  {
    severity: 'miscue',
    glyph: 'S',
    title: 'Counted as an error',
    detail: 'Substitution (S), omission (O, struck through), or an inserted word (^I).',
  },
]

/** Printed alongside every marked passage, on screen and on paper. A key that only exists in
 *  the designer's head is not a key. */
export function MarkupLegend({ compact = false }) {
  return (
    <ul className={compact ? 'flex flex-wrap gap-x-6 gap-y-2 text-xs' : 'grid grid-cols-2 gap-x-8 gap-y-3 text-sm'}>
      {LEGEND.map((item) => (
        <li key={item.severity} className="flex items-start gap-2">
          <mark className={`word ${SEVERITY_CLASS[item.severity]} shrink-0 font-passage`}>
            Aa
            {item.glyph && (
              <span className="word-glyph" aria-hidden="true">
                {item.glyph}
              </span>
            )}
          </mark>
          <span className="min-w-0">
            <span className="font-medium">{item.title}</span>
            {!compact && (
              <span className="block" style={{ color: 'var(--ra-muted)' }}>
                {item.detail}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}
