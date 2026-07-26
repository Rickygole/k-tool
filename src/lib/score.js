/**
 * The scoring engine. This is the product.
 *
 * Pure: no DOM, no audio, no async, no imports outside this lib. That is what lets it be built
 * and tested against hand-written transcripts while the audio path is still being fought with,
 * and it is the only part of the codebase worth unit testing.
 */
import { align, similarity } from './align.js'
import { tokenize, expandContraction } from './normalize.js'
import { dialectMatch, isCopulaOmission } from './dialect.js'
import { phoneticMatch } from './phonetic.js'
import { isHomophone } from './homophones.js'
import { instructionalLevel, percentileBand } from './norms.js'

const FUZZY_THRESHOLD = 0.85

/**
 * @typedef {Object} ScoredToken
 * @property {number|null} refIndex
 * @property {string|null} refWord                 as printed in the passage
 * @property {string|null} hypWord                 what we heard, null if omitted
 * @property {'correct'|'substitution'|'omission'|'insertion'|'self_correction'|'repetition'} status
 * @property {'high'|'low'} confidence
 * @property {string|null} suppressedBy            'fuzzy'|'phonetic'|'homophone'|'dialect'|'contraction'|null
 * @property {string[]} dialectRules               rule ids, when suppressedBy === 'dialect'
 * @property {boolean} overridden                  teacher marked this "not an error"
 */

/**
 * Decide whether a reference/hypothesis mismatch is a real error.
 * Filters run in strict order; the first to fire wins and is recorded.
 */
function relaxMismatch(refWord, hypWord, options) {
  // Contractions first -- "don't" vs "do not" is a tokenisation artifact, not a reading event.
  if (expandContraction(refWord) === hypWord || expandContraction(hypWord) === refWord) {
    return { suppressedBy: 'contraction', confidence: 'high', dialectRules: [] }
  }

  // ORDERING NOTE. The spec ran these fuzzy -> phonetic -> homophone -> dialect. That order is
  // wrong twice over, and both errors are invisible in the pass/fail totals because the word
  // still gets suppressed either way -- what changes is the REASON we show the teacher, and
  // what the eval reports as each filter's firing count.
  //
  //   - Dialect last meant the general filters stole its cases. "running"/"runnin" is 0.857
  //     similar so fuzzy claimed it; "ask"/"aks" share a Soundex key so phonetic claimed it.
  //     Both are textbook dialect features. The headline feature would have under-reported
  //     itself in our own evaluation.
  //   - Phonetic before homophone made the homophone table nearly dead code, since almost
  //     every homophone pair shares a Soundex key -- and stamped those words confidence 'low'
  //     when they deserve 'high'. "see"/"sea" is not an uncertain call.
  //
  // Most specific explanation wins. Order is now: dialect, homophone, fuzzy, phonetic.

  // 1. Dialect. Narrow, guarded, and the most informative thing we can tell a teacher.
  if (options.dialectLayer !== false) {
    const d = dialectMatch(refWord, hypWord)
    if (d.matched) {
      return { suppressedBy: 'dialect', confidence: 'low', dialectRules: d.ruleIds }
    }
  }

  // 2. Homophones. Acoustically indistinguishable -- a human scorer could not call these
  // either, so this is high confidence, not a hedge.
  if (isHomophone(refWord, hypWord)) {
    return { suppressedBy: 'homophone', confidence: 'high', dialectRules: [] }
  }

  // 3. Fuzzy. ASR spelling variance and morphological near-misses.
  if (similarity(refWord, hypWord) >= FUZZY_THRESHOLD) {
    return { suppressedBy: 'fuzzy', confidence: 'high', dialectRules: [] }
  }

  // 4. Phonetic. Low confidence by construction -- surfaced amber, never counted as confident.
  if (phoneticMatch(refWord, hypWord)) {
    return { suppressedBy: 'phonetic', confidence: 'low', dialectRules: [] }
  }

  return null
}

/**
 * Score a read.
 *
 * @param {string} referenceText  the passage as printed
 * @param {{text: string, words: {word: string, start?: number, end?: number}[], durationSec: number}} asrResult
 * @param {{grade?: number, season?: string, dialectLayer?: boolean, overrides?: Record<number, boolean>}} [options]
 * @returns {{tokens: ScoredToken[], metrics: Object, suppressionCounts: Record<string, number>}}
 */
export function score(referenceText, asrResult, options = {}) {
  const overrides = options.overrides ?? {}

  const ref = tokenize(referenceText)
  const hypText = asrResult.words?.length
    ? asrResult.words.map((w) => w.word).join(' ')
    : (asrResult.text ?? '')
  const hyp = tokenize(hypText, { isHypothesis: true })

  const ops = align(ref.normalized, hyp.normalized)

  /** @type {ScoredToken[]} */
  const tokens = []
  const suppressionCounts = {}
  const dialectRuleCounts = {}

  const bump = (obj, key) => {
    obj[key] = (obj[key] ?? 0) + 1
  }

  for (let k = 0; k < ops.length; k++) {
    const op = ops[k]
    const next = ops[k + 1]

    const refWord = op.refIndex != null ? ref.normalized[op.refIndex] : null
    const hypWord = op.hypIndex != null ? hyp.normalized[op.hypIndex] : null
    const refDisplay = op.refIndex != null ? ref.original[op.refIndex] : null
    const hypDisplay = op.hypIndex != null ? hyp.original[op.hypIndex] : null

    const base = {
      refIndex: op.refIndex,
      refWord: refDisplay,
      hypWord: hypDisplay,
      confidence: /** @type {'high'|'low'} */ ('high'),
      suppressedBy: null,
      dialectRules: [],
      overridden: op.refIndex != null && overrides[op.refIndex] === true,
    }

    if (op.type === 'match') {
      tokens.push({ ...base, status: 'correct' })
      continue
    }

    if (op.type === 'mismatch') {
      // Self-correction: reader produced a wrong word, then immediately produced the right one.
      // That shows up as a mismatch followed by an insertion of the reference word itself.
      if (next?.type === 'insertion' && hyp.normalized[next.hypIndex] === refWord) {
        tokens.push({ ...base, status: 'self_correction' })
        k++ // the insertion is part of this event, not a separate one
        continue
      }

      const relaxed = relaxMismatch(refWord, hypWord, options)
      if (relaxed) {
        bump(suppressionCounts, relaxed.suppressedBy)
        for (const id of relaxed.dialectRules) bump(dialectRuleCounts, id)
        tokens.push({ ...base, ...relaxed, status: 'correct' })
      } else {
        tokens.push({ ...base, status: 'substitution' })
      }
      continue
    }

    if (op.type === 'omission') {
      // Copula absence: "he is running" read as "he running". Documented AAE syntax, gated to
      // a closed set of function words -- never generic omission, or the tool would forgive
      // every dropped word in the passage.
      if (options.dialectLayer !== false && isCopulaOmission(refWord)) {
        bump(suppressionCounts, 'dialect')
        bump(dialectRuleCounts, 'copula-absence')
        tokens.push({
          ...base,
          status: 'correct',
          confidence: 'low',
          suppressedBy: 'dialect',
          dialectRules: ['copula-absence'],
        })
        continue
      }
      tokens.push({ ...base, status: 'omission' })
      continue
    }

    // Insertion.
    // Repetition: the reader re-read a word. Running-record convention says this is not an
    // error -- it is usually a fluency strategy, not a decoding failure.
    //
    // The duplicate can align on either side of the word it repeats (both orderings score
    // identically under Needleman-Wunsch, so which one the backtrace picks is an implementation
    // detail), so check both neighbours rather than assuming.
    const prevRef = lastRefIndex(tokens)
    const nextRef = next?.refIndex != null ? ref.normalized[next.refIndex] : null
    if ((prevRef != null && hypWord === ref.normalized[prevRef]) || hypWord === nextRef) {
      tokens.push({ ...base, status: 'repetition' })
      continue
    }

    // Self-correction: a wrong attempt immediately followed by the correct word.
    //
    // Note this is narrower than the spec's "any insertion followed by the correct reference
    // word", which cannot be right -- under that rule the extra word in "the little red fox"
    // would score as a self-correction, because it too is followed by a correctly read word.
    // We require the attempt to actually resemble the target, which catches partial words
    // ("w— woods") and near-misses ("wood woods").
    //
    // Accepted limitation, stated in EVAL.md: a purely semantic self-correction ("forest ...
    // woods") is indistinguishable from a plain insertion without a language model, and we
    // deliberately do not have one. It scores as an insertion, which is the conservative
    // direction -- we under-credit the reader rather than inventing a self-correction.
    if (next?.type === 'match') {
      const target = ref.normalized[next.refIndex]
      if (target && (target.startsWith(hypWord) || similarity(target, hypWord) >= 0.6)) {
        tokens.push({ ...base, status: 'self_correction' })
        continue
      }
    }

    tokens.push({ ...base, status: 'insertion' })
  }

  return {
    tokens,
    suppressionCounts,
    dialectRuleCounts,
    metrics: computeMetrics(tokens, ref.normalized.length, asrResult.durationSec, options),
  }
}

/** Reference index of the most recent token that consumed a reference word. */
function lastRefIndex(tokens) {
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (tokens[i].refIndex != null) return tokens[i].refIndex
  }
  return null
}

/**
 * Metrics, running-record convention.
 *
 * Errors are substitutions, omissions and insertions. Repetitions and self-corrections are
 * explicitly NOT errors -- a self-correction is evidence of monitoring, which is a positive
 * signal, and is counted separately for exactly that reason.
 */
export function computeMetrics(tokens, totalWords, durationSec, options = {}) {
  const counts = { substitution: 0, omission: 0, insertion: 0, self_correction: 0, repetition: 0 }

  for (const t of tokens) {
    // A teacher override converts a flagged word to correct. The teacher is the assessor;
    // we are the stopwatch.
    if (t.overridden) continue
    if (counts[t.status] !== undefined) counts[t.status]++
  }

  const errors = counts.substitution + counts.omission + counts.insertion
  const selfCorrections = counts.self_correction
  const wordsCorrect = Math.max(0, totalWords - errors)

  const accuracyPct = totalWords > 0 ? (wordsCorrect / totalWords) * 100 : 0
  const wcpm = durationSec > 0 ? (wordsCorrect / durationSec) * 60 : 0

  // Standard formula is (E + SC) / SC, reported as the ratio 1:N. It divides by zero when
  // there are no self-corrections -- which is the common case, not an edge case. null means
  // "no self-monitoring observed", which is a different statement from a numeric rate, and
  // the UI renders it as an em dash rather than Infinity.
  const selfCorrectionRate = selfCorrections === 0 ? null : (errors + selfCorrections) / selfCorrections

  const grade = options.grade ?? null
  const roundedWcpm = Math.round(wcpm)

  return {
    totalWords,
    wordsCorrect,
    errors,
    substitutions: counts.substitution,
    omissions: counts.omission,
    insertions: counts.insertion,
    repetitions: counts.repetition,
    selfCorrections,
    durationSec,
    wcpm: roundedWcpm,
    accuracyPct: Math.round(accuracyPct * 10) / 10,
    selfCorrectionRate,
    selfCorrectionDisplay: selfCorrectionRate === null ? '—' : `1:${Math.round(selfCorrectionRate)}`,
    level: instructionalLevel(accuracyPct),
    percentile: grade ? percentileBand(roundedWcpm, grade, options.season ?? 'spring') : null,
  }
}
