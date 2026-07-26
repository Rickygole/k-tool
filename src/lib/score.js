/**
 * The scoring engine. This is the product.
 *
 * Pure: no DOM, no audio, no async, no imports outside this lib. That is what lets it be built
 * and tested against hand-written transcripts while the audio path is still being fought with,
 * and it is the only part of the codebase worth unit testing.
 */
import { align, similarity } from './align.js'
import { tokenize, expandContraction, stripTrailingHallucination } from './normalize.js'
import { dialectMatch, isCopulaOmission } from './dialect.js'
import { phoneticMatch } from './phonetic.js'
import { isHomophone } from './homophones.js'
import { bothCommon } from './lexicon.js'
import { instructionalLevel, percentileBand } from './norms.js'

// 0.9, not the spec's 0.85. At 0.85 every 7-letter one-edit pair passes at HIGH confidence --
// `country`/`county`, `desert`/`dessert`, `through`/`though` -- and those are real substitutions
// a running record exists to record, not ASR spelling noise.
const FUZZY_THRESHOLD = 0.9

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

  // ══════════════════════════════════════════════════════════════════════════════════════
  // THE GATE. This runs above ALL four filters, and it is the most important line in the file.
  //
  // Every filter below is approximate, and each one independently zeroes the error. Gating
  // only one of them just moves the label: when the dialect layer stopped forgiving `bad`/`bat`
  // and `thing`/`thin`, Soundex picked them up instead and the error count did not move. An
  // adversarial sweep of a 471-word K-3 lexicon found 116 distinct real-word pairs the stack
  // forgave -- `house`/`horse`, `from`/`form`, `her`/`he`, `food`/`foot`.
  //
  // That inverts the entire premise of the product. The pitch is that we protect dialect-
  // speaking children from being mis-scored; the behaviour was that we hid genuine decoding
  // errors, and hid them most for the children the rules were written for. A child who cannot
  // decode `house` was scored 100% and never referred for intervention.
  //
  // So: if both words are ordinary English, this is a reading event and nothing may forgive it.
  //
  // HOMOPHONES ARE THE ONE EXEMPTION, and they are checked first, above the gate. Nearly every
  // homophone pair is two ordinary words -- see/sea, sun/son, there/their -- so the gate would
  // otherwise swallow the entire table. The exemption is safe because homophony is a fact about
  // acoustics rather than an approximation: no recogniser can tell these apart from audio, and
  // neither could the human scorer we are standing in for. Flagging one would be reporting a
  // decoding error we have no evidence for.
  // ══════════════════════════════════════════════════════════════════════════════════════
  if (isHomophone(refWord, hypWord)) {
    return { suppressedBy: 'homophone', confidence: 'high', dialectRules: [] }
  }

  if (bothCommon(refWord, hypWord)) return null

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
  // Most specific explanation wins. Order is now: homophone (above the gate), dialect,
  // fuzzy, phonetic.

  // 1. Dialect. Narrow, guarded, and the most informative thing we can tell a teacher.
  if (options.dialectLayer !== false) {
    const d = dialectMatch(refWord, hypWord)
    if (d.matched) {
      return { suppressedBy: 'dialect', confidence: 'low', dialectRules: d.ruleIds }
    }
  }

  // 2. Fuzzy. ASR spelling variance and morphological near-misses.
  if (similarity(refWord, hypWord) >= FUZZY_THRESHOLD) {
    return { suppressedBy: 'fuzzy', confidence: 'high', dialectRules: [] }
  }

  // 3. Phonetic. Low confidence by construction -- surfaced amber, never counted as confident.
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

  // Never throw. A raw TypeError here takes the whole React tree down to a white screen, and
  // this function is called with whatever a speech model just produced.
  const asrSafe = asrResult ?? { text: '', words: [], durationSec: 0 }

  const ref = tokenize(referenceText)
  // Strip Whisper's trailing-silence hallucinations before anything else sees them. A child who
  // finishes reading and pauses reliably produces "Thank you. Thanks for watching!", and left in
  // place it costs five insertions and drops a perfect read to frustration level.
  const hypText = stripTrailingHallucination(
    asrSafe.words?.length ? asrSafe.words.map((w) => w.word).join(' ') : (asrSafe.text ?? ''),
  )
  const hyp = tokenize(hypText, { isHypothesis: true })

  const validity = assessValidity(ref.runningWords, hyp.runningWords, asrSafe.durationSec)

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

    // Insertions have no reference index by definition, but they still have a PLACE -- the
    // passage position they interrupt. Without it an insertion is unanchored: the UI cannot
    // draw a marker between two words, and the evaluation cannot check whether an insertion
    // was detected in the right spot (it scored 0% precision until this existed, not because
    // detection was wrong but because every hit was positionally unmatchable).
    const anchorRefIndex =
      op.refIndex != null
        ? op.refIndex
        : (nextRefIndexOf(ops, k) ?? (lastRefIndex(tokens) != null ? lastRefIndex(tokens) + 1 : 0))

    const base = {
      refIndex: op.refIndex,
      anchorRefIndex,
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
      // Copula suppression requires that the child actually said something. On a silent
      // recording every word is an omission, and crediting "is"/"are" as dialect features
      // handed a mute microphone four free correct words.
      if (options.dialectLayer !== false && hyp.normalized.length > 0 && isCopulaOmission(refWord)) {
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
    metrics: withVerdictGuard(
      computeMetrics(tokens, ref.runningWords, asrSafe.durationSec, options),
      validity,
    ),
    validity,
  }
}

/**
 * Is this recording scoreable at all?
 *
 * A failed microphone does not throw -- it returns silence, and silence scores as a complete
 * read with every word omitted. Left alone the tool renders a confident, printable running
 * record reporting 22% accuracy and a 10th-percentile band for a child who never spoke. In
 * front of assessment-literate judges that is a worse failure than a crash, and in a classroom
 * it is a false record attached to a real student.
 *
 * So the engine reports whether it believes the input, and the UI refuses to show a report when
 * it does not.
 */
export function assessValidity(refWordCount, hypWordCount, durationSec) {
  if (refWordCount === 0) {
    return { ok: false, reason: 'no_passage', message: 'This passage has no text to score.' }
  }

  // Too MUCH transcript, which the original gate missed entirely.
  //
  // Whisper's two best-documented failure modes both produce excess output: a repetition loop
  // on low-quality audio (the same word emitted dozens of times) and a trailing hallucination
  // on silence ("Thank you. Thanks for watching!"). Child speech -- slow, quiet, full of long
  // pauses -- is exactly the regime that triggers them. Left ungated, a perfect read plus a
  // repetition loop scored 0% accuracy at frustration level, and reported it confidently.
  //
  // A reader whose recorder was left running also lands here, which is correct: a passage read
  // twice is not a scoreable one-minute sample.
  if (refWordCount > 0 && hypWordCount > refWordCount * 1.5) {
    return {
      ok: false,
      reason: 'transcript_too_long',
      message: 'The transcript is much longer than the passage. The recording may have kept running, or the audio was too quiet to transcribe cleanly. Re-record.',
    }
  }

  if (!Number.isFinite(durationSec) || durationSec < 2) {
    return { ok: false, reason: 'too_short', message: 'That recording was too short to score. Try again.' }
  }
  if (hypWordCount === 0) {
    return { ok: false, reason: 'no_speech', message: 'No speech was detected. Check the microphone and try again.' }
  }
  // Under a fifth of the passage usually means the mic cut out or the reader stopped, not a
  // reader who omitted eighty words. Scoreable, but not silently.
  if (refWordCount > 0 && hypWordCount < refWordCount * 0.2) {
    return {
      ok: false,
      reason: 'mostly_silent',
      message: 'Only a few words were heard. Check the microphone, or re-record.',
    }
  }
  // A rate no human produces. 100 words in 2.0s is 3000 WCPM; the duration floor caps the
  // absurdity without making it plausible. The published norms top out around 200.
  const rate = durationSec > 0 ? (refWordCount / durationSec) * 60 : 0
  if (rate > 400) {
    return {
      ok: false,
      reason: 'implausible_rate',
      message: 'That timing is too fast to be a real read. Check the recording and try again.',
    }
  }

  return { ok: true, reason: null, message: null }
}

/**
 * Strip the judgements from an unscoreable read.
 *
 * The raw counts stay, because they are useful for diagnosing what went wrong. The three fields
 * that constitute a verdict about a child -- accuracy, instructional level, percentile -- are
 * nulled, so that no caller can render a confident assessment from a recording we have already
 * decided we do not believe. A UI that forgets to check `validity` now shows blanks rather than
 * "frustration level, 10th percentile" for a child whose microphone was muted.
 */
function withVerdictGuard(metrics, validity) {
  if (validity.ok) return { ...metrics, scoreable: true }
  return {
    ...metrics,
    scoreable: false,
    accuracyPct: null,
    wcpm: null,
    level: null,
    percentile: null,
    selfCorrectionRate: null,
    selfCorrectionDisplay: '—',
  }
}

/** Reference index of the most recent token that consumed a reference word. */
function lastRefIndex(tokens) {
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (tokens[i].refIndex != null) return tokens[i].refIndex
  }
  return null
}

/** Reference index of the next op that consumes a reference word, looking forward from k. */
function nextRefIndexOf(ops, k) {
  for (let i = k + 1; i < ops.length; i++) {
    if (ops[i].refIndex != null) return ops[i].refIndex
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

  // WCPM and accuracy do NOT use the same error count, and conflating them is a real
  // methodological error rather than a rounding difference.
  //
  // Clay's running record counts insertions as errors, so they belong in `accuracyPct`.
  // Hasbrouck & Tindal's ORF procedure does not: their errors are "words read or pronounced
  // incorrectly, omitted, read out of order, or words pronounced for the student by the
  // examiner after a 3-second pause" (TR#1702, p.1). An inserted word is none of those -- it is
  // not a passage word at all. Subtracting it from words-correct-per-minute would make our
  // WCPM incomparable with the very norm table we then look the child up in.
  const rateErrors = counts.substitution + counts.omission
  const wordsCorrectForRate = Math.max(0, totalWords - rateErrors)

  const accuracyPct = totalWords > 0 ? (wordsCorrect / totalWords) * 100 : 0

  // Floor the denominator. `durationSec` is a performance.now() delta around MediaRecorder
  // start/stop with nothing stopping it being tiny -- a double-tapped stop button produced
  // "600000 WCPM, 90th percentile", which is the kind of number that gets laughed at on stage.
  // Two seconds is below any real read and keeps the arithmetic in the realm of the possible.
  const MIN_DURATION_SEC = 2
  const safeDuration = Number.isFinite(durationSec) && durationSec > 0 ? Math.max(durationSec, MIN_DURATION_SEC) : 0
  const wcpm = safeDuration > 0 ? (wordsCorrectForRate / safeDuration) * 60 : 0

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
