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
    // "lived" -> "lives": similarity 0.8... below threshold. "woods" -> "wood" is 0.8 too.
    // Use a true ASR-style near-miss: "edge" -> "edges" (0.8) is too low, so test "little" ->
    // "littles" (6/7 = 0.857), which is exactly the morphological near-miss this filter is for.
    const r = score(PASSAGE, asr('The littles fox lived at the edge of the woods'))
    expect(r.metrics.errors).toBe(0)
    const t = r.tokens.find((x) => x.suppressedBy === 'fuzzy')
    expect(t).toBeDefined()
    expect(t.status).toBe('correct')
    expect(r.suppressionCounts.fuzzy).toBe(1)
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

    // Every suppression is explainable — never a silent pass.
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
    expect(percentileBand(50, 4, 'spring')).toBe(10)
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
