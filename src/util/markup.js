/**
 * Turning a flat ScoredToken[] into something you can print on a page.
 *
 * The scorer's token list is aligner-shaped, not page-shaped, and two things have to be
 * reconciled before it can be rendered as the passage the child actually saw:
 *
 *   1. CONTRACTIONS OCCUPY TWO TOKENS. `normalize.tokenize` expands "isn't" to the normalized
 *      pair ["is", "not"] while repeating the display string, so the token list contains
 *      "isn't" twice in a row. Rendered naively the passage reads "Mateo isn't isn't sure".
 *      We regroup those back into one printed word and take the worst status in the group --
 *      if either half was misread, the printed word is marked.
 *   2. INSERTIONS HAVE NO PLACE ON THE PAGE. They are words the reader said that are not in
 *      the passage (refIndex === null), so they render as a caret marker sitting between the
 *      words they were spoken between, not as passage text.
 *
 * Severity is deliberately separate from status. Status is what the scorer decided; severity
 * is what the teacher sees, and the mapping between them is the whole argument of this product:
 *
 *   ok      green   read correctly, or the teacher overrode our call
 *   note    green   self-correction or repetition. NOT errors under running-record
 *                   convention, but worth marking, so they get a glyph and no colour change
 *   unsure  amber   we suppressed a mismatch, or we are not confident. The word may have been
 *                   read differently than printed and we are declining to call that an error.
 *   miscue  red     a substitution, omission or insertion we are willing to stand behind
 *
 * Colour never travels alone. Every non-green unit carries a glyph (S, O, I, SC, R, ?) that
 * survives a red/green deficiency and a black-and-white printer, which is the only reason the
 * printed report is legible at all.
 */
import { normalizeToken, expandContraction } from '../lib/normalize.js'
import { RULES } from '../lib/dialect.js'

const RULE_BY_ID = Object.fromEntries(RULES.map((r) => [r.id, r]))

/**
 * Copula absence is suppressed in score.js under the rule id 'copula-absence', which is
 * deliberately not in the RULES table (it is syntactic, not phonological). It still needs a
 * teacher-facing label, so it gets one here.
 */
const EXTRA_RULES = {
  'copula-absence': {
    id: 'copula-absence',
    label: 'Copula absence',
    example: '"he is running" → "he running"',
  },
}

export function dialectRuleLabel(id) {
  return (RULE_BY_ID[id] ?? EXTRA_RULES[id])?.label ?? id
}

export function dialectRuleExample(id) {
  return (RULE_BY_ID[id] ?? EXTRA_RULES[id])?.example ?? ''
}

/** Why a mismatch was not counted as an error, in words a teacher would use. */
export const SUPPRESSION_REASON = {
  dialect: 'Dialect feature, not a decoding error',
  homophone: 'Homophone, indistinguishable by ear',
  fuzzy: 'Near-identical word; likely a transcription artifact',
  phonetic: 'Sounds alike; the recogniser may have misheard it',
  contraction: 'Contraction written the other way round',
}

export const STATUS_LABEL = {
  correct: 'Read correctly',
  substitution: 'Substitution',
  omission: 'Omission',
  insertion: 'Insertion',
  self_correction: 'Self-correction',
  repetition: 'Repetition',
}

/** Single-character marks. Chosen to be unambiguous in print, in one colour. */
export const SEVERITY_GLYPH = { miscue: null, unsure: '?', note: null, ok: null }
export const STATUS_GLYPH = {
  substitution: 'S',
  omission: 'O',
  insertion: 'I',
  self_correction: 'SC',
  repetition: 'R',
}

const SEVERITY_RANK = { ok: 0, note: 1, unsure: 2, miscue: 3 }

/** @param {import('../lib/score.js').ScoredToken} t */
export function tokenSeverity(t) {
  if (t.overridden) return 'ok'
  switch (t.status) {
    case 'substitution':
    case 'omission':
    case 'insertion':
      return 'miscue'
    case 'self_correction':
    case 'repetition':
      return 'note'
    default:
      // 'correct'. Suppressed matches and anything the scorer flagged low-confidence are the
      // amber case: we are choosing not to call it an error, and we say so out loud.
      return t.suppressedBy || t.confidence === 'low' ? 'unsure' : 'ok'
  }
}

/**
 * The glyph for a rendered unit: status first (S/O/I/SC/R), falling back to the severity mark.
 * Overridden words get a check, because "the teacher already looked at this" is information.
 */
export function unitGlyph(unit) {
  if (unit.overridden) return '✓'
  const worst = unit.tokens.find((t) => tokenSeverity(t) === unit.severity) ?? unit.tokens[0]
  return STATUS_GLYPH[worst.status] ?? SEVERITY_GLYPH[unit.severity] ?? null
}

/**
 * Group a token list into printable units.
 *
 * @param {import('../lib/score.js').ScoredToken[]} tokens
 * @returns {{kind:'word'|'insertion', display:string, tokens:Object[], indexes:number[],
 *            severity:string, overridden:boolean}[]}
 */
export function buildUnits(tokens) {
  const units = []

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]

    if (t.refIndex == null) {
      units.push({
        kind: 'insertion',
        display: t.hypWord ?? '',
        tokens: [t],
        indexes: [i],
        severity: tokenSeverity(t),
        overridden: t.overridden === true,
      })
      continue
    }

    const group = [t]
    const indexes = [i]

    // Pull the rest of an expanded contraction back together. We only ever absorb tokens that
    // print identically and sit immediately adjacent, so a genuinely repeated word ("the the")
    // is never merged, and an interrupted expansion just renders as two units, ugly in a
    // rare case, never wrong.
    const expansion = expandContraction(normalizeToken(t.refWord ?? ''))
    if (expansion) {
      const parts = expansion.split(' ').length
      let j = i + 1
      while (
        group.length < parts &&
        tokens[j] &&
        tokens[j].refIndex != null &&
        tokens[j].refWord === t.refWord
      ) {
        group.push(tokens[j])
        indexes.push(j)
        j++
      }
      i = j - 1
    }

    const severity = group
      .map(tokenSeverity)
      .reduce((a, b) => (SEVERITY_RANK[b] > SEVERITY_RANK[a] ? b : a), 'ok')

    units.push({
      kind: 'word',
      display: t.refWord ?? '',
      tokens: group,
      indexes,
      severity,
      overridden: group.every((g) => g.overridden === true) && group.some((g) => g.overridden),
    })
  }

  return units
}

/**
 * The explanation shown on hover/focus and read out by screen readers. One string, because it
 * is used both as a visible tooltip and as the token's accessible description.
 */
export function explainUnit(unit) {
  const parts = []
  for (const t of unit.tokens) {
    const bits = [STATUS_LABEL[t.status] ?? t.status]

    if (t.status === 'omission') {
      bits.push('word not read')
    } else if (t.status === 'insertion') {
      bits.push(`extra word: “${t.hypWord}”`)
    } else if (t.hypWord && t.hypWord !== t.refWord) {
      bits.push(`heard “${t.hypWord}”`)
    }

    if (t.suppressedBy) {
      const reason = SUPPRESSION_REASON[t.suppressedBy] ?? t.suppressedBy
      const rules = t.dialectRules?.map(dialectRuleLabel) ?? []
      bits.push(rules.length ? `${reason} (${rules.join(', ')})` : reason)
      bits.push('not counted as an error')
    } else if (t.confidence === 'low') {
      bits.push('low confidence')
    }

    if (t.status === 'self_correction') bits.push('not counted as an error')
    if (t.status === 'repetition') bits.push('not counted as an error')
    if (t.overridden) bits.push('marked “not an error” by the teacher')

    parts.push(bits.join(' · '))
  }
  return parts.join(' / ')
}

/** Rows for the miscue table. Errors first; non-error events are listed separately. */
export function miscueRows(tokens) {
  const errors = []
  const events = []

  tokens.forEach((t, index) => {
    const row = {
      index,
      refIndex: t.refIndex,
      expected: t.status === 'insertion' ? '—' : (t.refWord ?? '—'),
      heard: t.status === 'omission' ? '—' : (t.hypWord ?? '—'),
      status: t.status,
      label: STATUS_LABEL[t.status] ?? t.status,
      overridden: t.overridden === true,
      // Insertions carry no refIndex, so score()'s `options.overrides` map. Which is keyed
      // by reference index, cannot address them. Results.jsx overrides those positionally
      // instead; this flag is what tells it which mechanism to use.
      overridableByRefIndex: t.refIndex != null,
      token: t,
    }
    if (t.status === 'substitution' || t.status === 'omission' || t.status === 'insertion') {
      errors.push(row)
    } else if (t.status === 'self_correction' || t.status === 'repetition') {
      events.push(row)
    }
  })

  return { errors, events }
}

/** Words we let through with a reason attached. The amber column of the results screen. */
export function suppressedRows(tokens) {
  return tokens
    .map((t, index) => ({ index, token: t }))
    .filter(({ token }) => token.suppressedBy != null)
    .map(({ index, token }) => ({
      index,
      // The teacher pushes back by reference index, the same key `overrides` uses.
      refIndex: token.refIndex,
      reinstated: token.reinstated === true,
      expected: token.refWord ?? '—',
      heard: token.hypWord ?? '—',
      reason: SUPPRESSION_REASON[token.suppressedBy] ?? token.suppressedBy,
      rules: (token.dialectRules ?? []).map(dialectRuleLabel),
      kind: token.suppressedBy,
    }))
}

/** mm:ss for durations. Assessment durations are minutes, never hours. */
export function formatDuration(sec) {
  const total = Math.max(0, Math.round(sec))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
