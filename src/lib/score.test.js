/**
 * The only test suite in this project, and the only one worth writing.
 *
 * These ten cases are the contract for the scoring engine. If they pass, the engine can be
 * wired to the UI; if they fail, no amount of debugging through the DOM will help.
 */
import { describe, it, expect } from 'vitest'
import { score } from './score.js'
import { align } from './align.js'
import { percentileBand, medianWcpm } from './norms.js'
import { soundex } from './phonetic.js'
import { sharesLemma } from './lexicon.js'

const PASSAGE = 'The little fox lived at the edge of the woods'

/** Build an AsrResult from a plain string, the way roles B and C mock role A. */
function asr(text, durationSec = 60) {
  const words = text.split(/\s+/).filter(Boolean).map((word) => ({ word }))
  return { text, words, durationSec }
}

const statuses = (result) => result.tokens.map((t) => t.status)
const countOf = (result, status) => statuses(result).filter((s) => s === status).length

describe('score() — the ten cases', () => {
  it('1. perfect read has zero errors', () => {
    const r = score(PASSAGE, asr(PASSAGE))
    expect(r.metrics.errors).toBe(0)
    expect(r.metrics.totalWords).toBe(10)
    expect(r.metrics.wordsCorrect).toBe(10)
    expect(r.metrics.accuracyPct).toBe(100)
    expect(r.metrics.level).toBe('independent')
    expect(statuses(r).every((s) => s === 'correct')).toBe(true)
  })

  it('2. single substitution', () => {
    const r = score(PASSAGE, asr('The little fox lived at the edge of the forest'))
    expect(countOf(r, 'substitution')).toBe(1)
    expect(r.metrics.errors).toBe(1)
    expect(r.metrics.wordsCorrect).toBe(9)
    expect(r.metrics.accuracyPct).toBe(90)
    expect(r.metrics.level).toBe('instructional')
  })

  it('3. single omission', () => {
    const r = score(PASSAGE, asr('The little fox lived at the edge of woods'))
    expect(countOf(r, 'omission')).toBe(1)
    expect(r.metrics.omissions).toBe(1)
    expect(r.metrics.errors).toBe(1)
  })

  it('4. single insertion', () => {
    const r = score(PASSAGE, asr('The little red fox lived at the edge of the woods'))
    expect(countOf(r, 'insertion')).toBe(1)
    expect(r.metrics.insertions).toBe(1)
    expect(r.metrics.errors).toBe(1)
  })

  it('5. self-correction is tracked but not an error', () => {
    // Reader attempts "wood", hears it is wrong, produces "woods".
    const r = score(PASSAGE, asr('The little fox lived at the edge of the wood woods'))
    expect(countOf(r, 'self_correction')).toBe(1)
    expect(r.metrics.selfCorrections).toBe(1)
    expect(r.metrics.errors).toBe(0)
    // (E + SC) / SC with E=0, SC=1 => 1, displayed as the ratio 1:1.
    expect(r.metrics.selfCorrectionRate).toBe(1)
    expect(r.metrics.selfCorrectionDisplay).toBe('1:1')
  })

  it('6. repetition is not an error', () => {
    const r = score(PASSAGE, asr('The little little fox lived at the edge of the woods'))
    expect(countOf(r, 'repetition')).toBe(1)
    expect(r.metrics.repetitions).toBe(1)
    expect(r.metrics.errors).toBe(0)
    expect(r.metrics.accuracyPct).toBe(100)
  })

  it('7. substitution suppressed by fuzzy match', () => {
    // At the 0.9 threshold the filter only forgives long words with a single edit. Which is
    // what ASR spelling variance actually looks like. "littles" for "little" is 0.857 and is
    // now correctly scored as an error: a child who added a plural read the word wrong.
    const r = score('the restaurant opened', asr('the restaurent opened'))
    expect(r.metrics.errors).toBe(0)
    const t = r.tokens.find((x) => x.suppressedBy === 'fuzzy')
    expect(t).toBeDefined()
    expect(t.status).toBe('correct')
    expect(r.suppressionCounts.fuzzy).toBe(1)

    // And the pair the threshold was raised to catch is now an error, not an amnesty.
    expect(score('the country road', asr('the county road')).metrics.errors).toBe(1)
  })

  it('8. homophone is never flagged', () => {
    const r = score('I can see the sun there', asr('I can sea the son their'))
    expect(r.metrics.errors).toBe(0)
    expect(r.suppressionCounts.homophone).toBe(3)
    expect(r.tokens.filter((t) => t.suppressedBy === 'homophone')).toHaveLength(3)
  })

  it('9. dialect variant is not flagged', () => {
    // th-stopping (this->dis), r-lessness (four->fo), cluster reduction (cold->col),
    // g-dropping (running->runnin), metathesis (ask->aks).
    const r = score('this cold morning I ask for four running dogs',
      asr('dis col morning I aks for fo runnin dogs'))
    expect(r.metrics.errors).toBe(0)
    expect(r.suppressionCounts.dialect).toBeGreaterThanOrEqual(5)

    const rules = r.dialectRuleCounts
    expect(rules['th-stopping']).toBeGreaterThanOrEqual(1)
    expect(rules['r-lessness']).toBeGreaterThanOrEqual(1)
    expect(rules['cluster-reduction']).toBeGreaterThanOrEqual(1)
    expect(rules['g-dropping']).toBeGreaterThanOrEqual(1)
    expect(rules['metathesis']).toBeGreaterThanOrEqual(1)

    // Every suppression is explainable, never a silent pass.
    for (const t of r.tokens.filter((x) => x.suppressedBy === 'dialect')) {
      expect(t.dialectRules.length).toBeGreaterThan(0)
      expect(t.confidence).toBe('low')
    }
  })

  it('10. three consecutive omissions (a skipped line)', () => {
    const r = score(PASSAGE, asr('The little fox lived at the woods'))
    // "edge of the" dropped -> 3 omissions.
    expect(countOf(r, 'omission')).toBe(3)
    expect(r.metrics.errors).toBe(3)
    expect(r.metrics.accuracyPct).toBe(70)
    expect(r.metrics.level).toBe('frustration')
  })
})

describe('documented limitations — these assert what we CANNOT do', () => {
  it('scores a purely semantic self-correction as an insertion', () => {
    // "forest ... woods" is a real self-correction, but nothing short of a language model can
    // tell it apart from an extra word, and we deliberately have no language model. We take
    // the conservative direction: count it as an insertion rather than invent a credit.
    // This test exists so the limitation is visible in the suite, not discovered on stage.
    const r = score(PASSAGE, asr('The little fox lived at the edge of the forest woods'))
    expect(countOf(r, 'self_correction')).toBe(0)
    expect(countOf(r, 'insertion')).toBe(1)
  })
})

describe('the bugs the spec shipped with', () => {
  it('selfCorrectionRate does not divide by zero', () => {
    const r = score(PASSAGE, asr('The little fox lived at the edge of the forest'))
    expect(r.metrics.selfCorrections).toBe(0)
    expect(r.metrics.selfCorrectionRate).toBeNull()
    expect(r.metrics.selfCorrectionDisplay).toBe('—')
    expect(Number.isFinite(r.metrics.selfCorrectionRate)).toBe(false)
  })

  it('ORF norms use the 2017 table, not 2006', () => {
    expect(medianWcpm(4, 'spring')).toBe(133) // 2006 said 123
    expect(medianWcpm(6, 'spring')).toBe(146) // 2006 said 150
    expect(medianWcpm(1, 'spring')).toBe(60)
    expect(medianWcpm(2, 'spring')).toBe(100)
    expect(medianWcpm(3, 'spring')).toBe(112)
    expect(medianWcpm(5, 'spring')).toBe(146)
    // Grade 1 has no fall administration in the source table.
    expect(medianWcpm(1, 'fall')).toBeNull()
  })

  it('percentile bands are bands, not false precision', () => {
    expect(percentileBand(200, 4, 'spring')).toBe(90)
    expect(percentileBand(133, 4, 'spring')).toBe(50)
    expect(percentileBand(132, 4, 'spring')).toBe(25)
    // Below the published 10th percentile is a distinct answer from "the 10th percentile".
    expect(percentileBand(94, 4, 'spring')).toBe(10)
    expect(percentileBand(50, 4, 'spring')).toBe('below_10')
    expect(percentileBand(120, 7, 'spring'), 'H&T 2017 has no grade 7').toBeNull()
  })
})

describe('dialect layer safety rails', () => {
  it('does not suppress past-tense morphology via cluster reduction', () => {
    // "walked" -> "walk" would be hidden by a naive cluster-reduction rule. It is a real
    // tense error a teacher needs to see.
    const r = score('she walked home', asr('she walk home'))
    expect(r.metrics.errors).toBe(1)
    expect(r.tokens.find((t) => t.status === 'substitution')).toBeDefined()
  })

  it('copula absence is suppressed, generic omission is not', () => {
    const copula = score('he is running fast', asr('he running fast'))
    expect(copula.metrics.errors).toBe(0)
    expect(copula.dialectRuleCounts['copula-absence']).toBe(1)

    const content = score('he ran home fast', asr('he ran fast'))
    expect(content.metrics.errors).toBe(1)
    expect(content.metrics.omissions).toBe(1)
  })

  it('dialect layer can be switched off for comparison', () => {
    const on = score('this cold morning', asr('dis col morning'), { dialectLayer: true })
    const off = score('this cold morning', asr('dis col morning'), { dialectLayer: false })
    expect(on.metrics.errors).toBe(0)
    expect(off.metrics.errors).toBeGreaterThan(0)
  })
})

describe('normalisation', () => {
  it('expands numerals so digits are not false errors', () => {
    // Whisper writes "1965"; the passage writes it out.
    const r = score('in nineteen sixty-five the town grew', asr('in 1965 the town grew'))
    expect(r.metrics.errors).toBe(0)
  })

  it('strips disfluencies from the hypothesis only', () => {
    const r = score(PASSAGE, asr('The little um fox uh lived at the edge of the woods'))
    expect(r.metrics.errors).toBe(0)
  })

  it('matches contractions against their expansions', () => {
    const r = score("she does not know", asr("she doesn't know"))
    expect(r.metrics.errors).toBe(0)
  })

  it('is insensitive to case and punctuation', () => {
    const r = score('The fox, quietly, lived.', asr('the fox quietly lived'))
    expect(r.metrics.errors).toBe(0)
  })

  it('handles the real Whisper output from our test clip', () => {
    // Whisper genuinely dropped the leading "The" on public/demo/clean-read.wav.
    const passage = 'The little fox lived at the edge of the woods.'
    const r = score(passage, asr('Little Fox lived at the edge of the woods.'))
    expect(r.metrics.omissions).toBe(1)
    expect(r.metrics.errors).toBe(1)
  })
})

describe('alignment primitives', () => {
  it('prefers substitution over omission+insertion on ties', () => {
    const ops = align(['a', 'b', 'c'], ['a', 'x', 'c'])
    expect(ops.map((o) => o.type)).toEqual(['match', 'mismatch', 'match'])
  })

  it('handles an empty hypothesis as all omissions', () => {
    const ops = align(['a', 'b'], [])
    expect(ops.map((o) => o.type)).toEqual(['omission', 'omission'])
  })

  it('soundex keys agree for phonetic near-misses', () => {
    expect(soundex('robert')).toBe(soundex('rupert'))
    expect(soundex('tymczak')).toBe('T522')
  })
})

describe('metrics arithmetic', () => {
  it('wcpm scales with duration, not word count', () => {
    const fast = score(PASSAGE, asr(PASSAGE, 30))
    const slow = score(PASSAGE, asr(PASSAGE, 60))
    expect(fast.metrics.wcpm).toBe(20)
    expect(slow.metrics.wcpm).toBe(10)
  })

  it('a teacher override removes the error and recomputes', () => {
    const hyp = asr('The little fox lived at the edge of the forest')
    const before = score(PASSAGE, hyp)
    expect(before.metrics.errors).toBe(1)

    const flagged = before.tokens.find((t) => t.status === 'substitution')
    const after = score(PASSAGE, hyp, { overrides: { [flagged.refIndex]: true } })
    expect(after.metrics.errors).toBe(0)
    expect(after.metrics.accuracyPct).toBe(100)
  })
})

describe('hardening — findings from the review gate', () => {
  it('never throws on a null or malformed ASR result', () => {
    // A raw TypeError here takes the React tree down to a white screen mid-demo.
    expect(() => score(PASSAGE, null)).not.toThrow()
    expect(() => score(PASSAGE, undefined)).not.toThrow()
    expect(() => score(PASSAGE, {})).not.toThrow()
    expect(() => score('', asr(''))).not.toThrow()
  })

  it('refuses to score a silent recording instead of inventing a report', () => {
    // A dead mic returns silence, and silence aligns as "every word omitted". Which rendered
    // a confident, printable running record for a child who never spoke.
    const silent = score(PASSAGE, { text: '', words: [], durationSec: 60 })
    expect(silent.validity.ok).toBe(false)
    expect(silent.validity.reason).toBe('no_speech')

    const clipped = score(PASSAGE, asr('The', 60))
    expect(clipped.validity.ok).toBe(false)
    expect(clipped.validity.reason).toBe('mostly_silent')

    const stubby = score(PASSAGE, asr(PASSAGE, 0.4))
    expect(stubby.validity.ok).toBe(false)
    expect(stubby.validity.reason).toBe('too_short')

    expect(score(PASSAGE, asr(PASSAGE)).validity.ok).toBe(true)
  })

  it('cannot report a physically impossible WCPM', () => {
    // A double-tapped stop button reported 600,000 WCPM at the 90th percentile. Now the read is
    // refused outright and carries no verdict at all, null, not a smaller wrong number.
    for (const d of [0.001, 0.5, 1.9, 0]) {
      const m = score(PASSAGE, asr(PASSAGE, d)).metrics
      expect(m.scoreable).toBe(false)
      expect(m.wcpm).toBeNull()
      expect(m.level).toBeNull()
      expect(m.percentile).toBeNull()
    }
  })

  it('an unscoreable read carries no verdict a UI could render', () => {
    // Whisper's two commonest failures both produce EXCESS output: a repetition loop on poor
    // audio, and "Thanks for watching!" hallucinated onto trailing silence. Both used to turn a
    // perfect read into 0% accuracy at frustration level, reported confidently.
    const loop = score(PASSAGE, asr(`${PASSAGE} ${Array(60).fill('woods').join(' ')}`))
    expect(loop.validity.ok).toBe(false)
    expect(loop.validity.reason).toBe('transcript_too_long')
    expect(loop.metrics.accuracyPct).toBeNull()
    expect(loop.metrics.level).toBeNull()

    const hallucination = score(PASSAGE, asr(`${PASSAGE} Thank you. Thanks for watching!`))
    expect(hallucination.metrics.level).not.toBe('frustration')

    const readTwice = score(PASSAGE, asr(`${PASSAGE} ${PASSAGE}`))
    expect(readTwice.validity.ok).toBe(false)
  })

  it('does not forgive real minimal pairs as dialect variation', () => {
    // Each of these is a plain decoding error that the phonological rules used to erase.
    const pairs = [
      ['thing', 'thin'], ['sing', 'sin'], ['wing', 'win'],
      ['bad', 'bat'], ['her', 'he'], ['your', 'you'], ['cold', 'coal'],
    ]
    for (const [ref, hyp] of pairs) {
      const r = score(`the ${ref} came`, asr(`the ${hyp} came`))
      expect(r.metrics.errors, `"${ref}" read as "${hyp}" must be scored`).toBe(1)
    }
  })

  it('still forgives genuine dialect variants after that guard', () => {
    const r = score('this cold morning I ask for four running dogs',
      asr('dis col morning I aks for fo runnin dogs'))
    expect(r.metrics.errors).toBe(0)
    expect(r.suppressionCounts.dialect).toBeGreaterThanOrEqual(5)
  })

  it('folds diacritics instead of deleting them', () => {
    // "café" was becoming "caf" and "piñata" "piata", silently mis-scoring loanwords that
    // appear routinely in elementary readers.
    const r = score('we ate at the café near the piñata', asr('we ate at the cafe near the pinata'))
    expect(r.metrics.errors).toBe(0)
  })

  it('survives pathological input without hanging or returning NaN', () => {
    // 300 repetitions of one word is not a read; it is refused rather than scored.
    const long = score('the fox ran', asr(Array(300).fill('fox').join(' ')))
    expect(long.validity.ok).toBe(false)
    expect(long.metrics.accuracyPct).toBeNull()

    const emoji = score('the fox ran', asr('🦊 🦊 🦊'))
    expect(emoji.metrics.accuracyPct === null || Number.isFinite(emoji.metrics.accuracyPct)).toBe(true)

    const oneWord = score('fox', asr('fox'))
    expect(oneWord.metrics.accuracyPct).toBe(100)
  })
})

describe('the phonetic filter no longer erases real substitutions', () => {
  // Soundex ignores vowels and most suffixes, so it was bridging pairs that are plainly
  // different words. Two of these are PLANTED substitutions in our own eval fixtures. The
  // filter was lowering our substitution recall while appearing to help.
  const mustFlag = [
    ['showed', 'said', 'comprehension-breaking substitution'],
    ['lived', 'left', 'different word entirely'],
    ['every', 'ever', 'dropped syllable'],
    ['farmers', 'framers', 'planted in eval/fixtures.js'],
    ['garden', 'gordon', 'planted in eval/fixtures.js'],
    ['dogs', 'dog', 'dropped plural'],
    ['books', 'book', 'dropped plural'],
    ['stopped', 'stop', 'dropped tense'],
    ['hoped', 'hope', 'dropped tense'],
    ['carried', 'carry', 'dropped tense'],
  ]

  it.each(mustFlag)('"%s" read as "%s" is an error (%s)', (ref, hyp) => {
    expect(score(`the ${ref} came`, asr(`the ${hyp} came`)).metrics.errors).toBe(1)
  })

  it('an inflection is never a phonetic coincidence', () => {
    expect(sharesLemma('dog', 'dogs')).toBe(true)
    expect(sharesLemma('live', 'lived')).toBe(true)
    expect(sharesLemma('stop', 'stopped')).toBe(true)
    expect(sharesLemma('carry', 'carried')).toBe(true)
    expect(sharesLemma('run', 'running')).toBe(true)
    // Unrelated words that merely share letters must not be swept up.
    expect(sharesLemma('cat', 'dog')).toBe(false)
    expect(sharesLemma('showed', 'said')).toBe(false)
  })

  it('still forgives a genuine ASR spelling variant', () => {
    // The filter keeps its job: same onset, same shape, same sound.
    expect(score('the restaurant opened', asr('the restaurent opened')).metrics.errors).toBe(0)
  })
})
