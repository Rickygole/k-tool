/**
 * ADVERSARIAL SUITE — assertions a correct oral-reading-fluency assessor MUST satisfy.
 *
 * Unlike score.test.js, nothing here is written to pass. Each `it` states a property the
 * product claims (or implicitly promises) and tries to falsify it. A RED test here is an
 * open defect, not a broken test. Run:  npx vitest run src/lib/attack.test.js
 */
import { describe, it, expect } from 'vitest'
import { score } from './score.js'
import { MAX_TOKENS, align } from './align.js'
import { dialectMatch, isCopulaOmission } from './dialect.js'
import { tokenize } from './normalize.js'
import { hasNorms, percentileBand, instructionalLevel } from './norms.js'

const asr = (text, durationSec = 60) => ({
  text,
  words: text.split(/\s+/).filter(Boolean).map((word) => ({ word })),
  durationSec,
})
const P10 = 'the little fox lived at the edge of the woods'
const P100 = (P10 + ' ').repeat(10).trim()

// ═══════════════ 1. GENUINE READING ERRORS MUST NOT BE SUPPRESSED ═══════════════
describe('A. the suppression stack must not erase real substitutions', () => {
  // Documented high-frequency early-reading miscues (reversals, minimal pairs, morphology).
  const REAL_MISCUES = [
    ['from', 'form'], ['there', 'three'], ['quiet', 'quite'], ['want', 'went'],
    ['where', 'were'], ['then', 'than'], ['through', 'though'], ['bad', 'bat'],
    ['thing', 'think'], ['house', 'horse'], ['head', 'heart'], ['did', 'third'],
    ['dad', 'that'], ['cat', 'card'], ['you', 'year'], ['world', 'would'],
    ['sing', 'sin'], ['sent', 'send'], ['past', 'pass'], ['thank', 'than'],
    ['food', 'foot'], ['not', 'nod'], ['son', 'song'], ['cats', 'cat'],
  ]

  it('every documented miscue pair is scored as an error', () => {
    const forgiven = []
    for (const [ref, hyp] of REAL_MISCUES) {
      const r = score(`the ${ref} is here`, asr(`the ${hyp} is here`))
      const t = r.tokens.find((x) => x.suppressedBy)
      if (r.metrics.errors === 0) forgiven.push(`${ref}->${hyp} (${t?.suppressedBy}/${t?.confidence})`)
    }
    console.log(`FORGIVEN ${forgiven.length}/${REAL_MISCUES.length}:\n  ` + forgiven.join('\n  '))
    expect(forgiven).toEqual([])
  })

  it('the phonetic (Soundex) filter is not a blanket amnesty for reversals', () => {
    // "from"/"form" is THE canonical letter-reversal miscue. Soundex F650 === F650.
    const r = score('a note from mom', asr('a note form mom'))
    expect(r.metrics.errors).toBe(1)
  })

  it('the fuzzy filter at 0.85 does not forgive any 7-letter one-edit pair at HIGH confidence', () => {
    const bad = []
    for (const [a, b] of [['country', 'county'], ['desert', 'dessert'], ['through', 'thorough'], ['thought', 'though']]) {
      const r = score(`the ${a} was here`, asr(`the ${b} was here`))
      const t = r.tokens.find((x) => x.suppressedBy)
      if (r.metrics.errors === 0) bad.push(`${a}->${b} (${t?.suppressedBy}/${t?.confidence})`)
    }
    console.log('FUZZY-FORGIVEN:', bad)
    expect(bad).toEqual([])
  })
})

// ═══════════════ 2. THE DIALECT LAYER'S OWN LINGUISTIC CLAIMS ═══════════════
describe('B. dialect.js — linguistic correctness', () => {
  it('g-dropping applies to the -ing SUFFIX only, never monomorphemic sing/king/thing', () => {
    for (const [a, b] of [['sing', 'sin'], ['king', 'kin'], ['thing', 'thin'], ['ring', 'rin'], ['wing', 'win']]) {
      expect(dialectMatch(a, b).matched, `${a}/${b} must not be a dialect variant`).toBe(false)
    }
    expect(dialectMatch('running', 'runnin').matched).toBe(true)   // this one SHOULD fire
  })

  it('cluster reduction must not hide plural/3sg -s (same class of hazard as the -ed guard)', () => {
    for (const [a, b] of [['cats', 'cat'], ['dogs', 'dog'], ['kids', 'kid'], ['books', 'book']]) {
      expect(dialectMatch(a, b).matched, `${a}/${b}`).toBe(false)
    }
  })

  it('the -ed guard must also cover IRREGULAR past tense', () => {
    for (const [a, b] of [['sent', 'send'], ['built', 'build'], ['spent', 'spend'], ['bent', 'bend'], ['lent', 'lend']]) {
      expect(dialectMatch(a, b).matched, `${a}/${b} is a tense error, not a pronunciation variant`).toBe(false)
    }
  })

  it('final devoicing must not collapse first-grade minimal pairs', () => {
    for (const [a, b] of [['bad', 'bat'], ['bed', 'bet'], ['had', 'hat'], ['hid', 'hit'], ['sad', 'sat'], ['food', 'foot'], ['not', 'nod'], ['son', 'song']]) {
      expect(dialectMatch(a, b).matched, `${a}/${b}`).toBe(false)
    }
  })

  it('r-lessness must not collapse distinct words across the r-count boundary', () => {
    for (const [a, b] of [['her', 'he'], ['your', 'you'], ['house', 'horse'], ['world', 'would'], ['head', 'heart'], ['cat', 'card'], ['you', 'year']]) {
      expect(dialectMatch(a, b).matched, `${a}/${b}`).toBe(false)
    }
    expect(dialectMatch('sister', 'sista').matched).toBe(true)  // this one SHOULD fire
    expect(dialectMatch('four', 'fo').matched).toBe(true)
  })

  it('th-stopping is a /ð/ process: voiceless "think"→"dink" is not the modelled feature', () => {
    expect(dialectMatch('think', 'dink').matched).toBe(false)
    expect(dialectMatch('three', 'dree').matched).toBe(false)
    expect(dialectMatch('this', 'dis').matched).toBe(true)   // voiced: SHOULD fire
  })

  it('th-fronting should model /ð/→[v] medially, which AAE actually does', () => {
    expect(dialectMatch('brother', 'brovah').matched).toBe(true)
    expect(dialectMatch('with', 'wif').matched).toBe(true)
  })

  it('copula absence is restricted to is/are: "am" and "be" are never zero in AAE', () => {
    expect(isCopulaOmission('is')).toBe(true)
    expect(isCopulaOmission('are')).toBe(true)
    expect(isCopulaOmission('am'), '1sg "am" is categorically undeletable (Labov)').toBe(false)
    expect(isCopulaOmission('be'), 'invariant/habitual "be" is ADDED, not deleted').toBe(false)
  })
})

// ═══════════════ 3. THE HEADLINE FEATURE vs THE MEASURED EVIDENCE ═══════════════
describe('C. does the dialect layer do anything on transcripts Whisper actually produces?', () => {
  const REF = 'this cold morning I asked for four running dogs with my sister'

  it('on the IDEALISED transcript (used by score.test.js case 9) the layer changes the score', () => {
    const hyp = 'dis col morning I aks for fo runnin dogs wif my sista'
    const on = score(REF, asr(hyp)).metrics.errors
    const off = score(REF, asr(hyp), { dialectLayer: false }).metrics.errors
    console.log(`idealised: errors on=${on} off=${off} delta=${off - on}`)
    expect(off - on).toBeGreaterThan(0)
  })

  it('on the MEASURED transcript (Whisper normalises dialect away) the layer changes nothing', () => {
    const hyp = 'this cold morning I asked for four running dogs with my sister'
    const on = score(REF, asr(hyp)).metrics.errors
    const off = score(REF, asr(hyp), { dialectLayer: false }).metrics.errors
    console.log(`normalised: errors on=${on} off=${off} delta=${off - on}`)
    expect(off - on).toBe(0)   // the layer is inert here — this test PASSES, and that is the problem
  })

  it('on the MEASURED transcript with MANGLED boundaries the layer also changes nothing', () => {
    // Measured: "dis col"->"Diskal", "runnin"->"run in", "fo fo"->"Fofo".
    const hyp = 'Diskal morning I asked for Fofo run in dogs with my sister'
    const on = score(REF, asr(hyp))
    const off = score(REF, asr(hyp), { dialectLayer: false })
    console.log(`mangled: errors on=${on.metrics.errors} off=${off.metrics.errors} acc=${on.metrics.accuracyPct}%`)
    expect(off.metrics.errors - on.metrics.errors).toBe(0)
    // A dialect speaker is penalised 5 errors by Whisper's segmentation, and the layer is blind
    // to it because it operates on WORDS, not on word BOUNDARIES.
    expect(on.metrics.errors).toBeGreaterThanOrEqual(4)
  })
})

// ═══════════════ 4. METRICS THAT DISAGREE WITH THE NORM SOURCE ═══════════════
describe('D. WCPM must be computed the way Hasbrouck & Tindal 2017 computed it', () => {
  it('insertions are NOT errors in the H&T procedure and must not reduce WCPM', () => {
    // ED594994 p.1: errors are "words read or pronounced incorrectly, omitted, read out of
    // order, or words pronounced for the student by the examiner after a 3-second pause".
    // Insertions do not appear.
    const clean = score(P100, asr(P100, 60), { grade: 2 })
    const withIns = score(P100, asr(P100.split(' ').flatMap((w, i) => (i % 10 === 0 ? ['and', w] : [w])).join(' '), 60), { grade: 2 })
    console.log(`WCPM clean=${clean.metrics.wcpm} (p${clean.metrics.percentile}) withInsertions=${withIns.metrics.wcpm} (p${withIns.metrics.percentile})`)
    expect(withIns.metrics.wcpm).toBe(clean.metrics.wcpm)
  })

  it('a contraction is ONE word to a human scorer and must count as one', () => {
    // `normalized` is the ALIGNMENT view -- contractions expand there on purpose so "doesn't"
    // can match "does not". `runningWords` is the SCORING view, counted as a teacher counts.
    expect(tokenize("she doesn't know it isn't there").runningWords).toBe(6)
  })

  it('a hyphenated compound must not double the running-word count', () => {
    expect(tokenize('a well-known ice-cream truck').runningWords).toBe(4)
  })

  it('a WCPM below the published 10th percentile must not be reported AS the 10th percentile', () => {
    // grade 6 spring 10th pct = 91 WCPM. A child at 5 WCPM is not "10th percentile".
    expect(percentileBand(5, 6, 'spring')).not.toBe(10)
    expect(percentileBand(0, 4, 'spring')).not.toBe(10)
  })

  it('grades outside the published table report NO norms rather than a wrong band', () => {
    // H&T 2017 publishes grades 1-6 only. Inventing a grade-7 band would be fabricating a
    // norm, so the contract is: say plainly that there is no published norm for this grade.
    expect(percentileBand(120, 7, 'spring'), 'grade 7 has no published norm').toBeNull()
    expect(hasNorms(7)).toBe(false)
    expect(hasNorms(4)).toBe(true)
    // Kindergarten likewise: H&T begins at grade 1 because sub-grade-1 ORF is not a
    // meaningful measure. No published norm means no band, not a guessed one.
    expect(percentileBand(30, 0, 'spring'), 'kindergarten has no published norm').toBeNull()
  })
})

// ═══════════════ 5. HOSTILE / DEGENERATE INPUT ═══════════════
describe('E. degenerate input must not produce a confident report', () => {
  it('an empty passage is refused, not scored at "frustration"', () => {
    const r = score('', asr('the child read beautifully', 60), { grade: 3 })
    console.log('EMPTY PASSAGE →', JSON.stringify(r.metrics), 'validity', JSON.stringify(r.validity))
    expect(r.validity?.ok).toBe(false)
  })

  it('a silent recording never produces copula credit', () => {
    const p = 'the sun is bright and the birds are loud because the day is warm and we are glad'
    const r = score(p, { text: '', words: [], durationSec: 60 }, { grade: 2 })
    console.log('SILENCE →', JSON.stringify(r.metrics), 'validity', JSON.stringify(r.validity))
    expect(r.metrics.wordsCorrect).toBe(0)
    expect(r.dialectRuleCounts['copula-absence'] ?? 0).toBe(0)
  })

  it('a Whisper repetition loop does not turn a perfect read into 0%', () => {
    const r = score(P10, asr(P10 + ' ' + Array(60).fill('woods').join(' '), 60), { grade: 2 })
    console.log('REPETITION LOOP →', JSON.stringify(r.metrics))
    expect(r.metrics.scoreable, 'must be refused, not scored').toBe(false)
    expect(r.metrics.accuracyPct, 'no verdict on a read we do not believe').toBeNull()
  })

  it('a Whisper end-of-audio hallucination does not cost half the passage', () => {
    const r = score(P10, asr(P10 + ' Thank you. Thanks for watching!', 60), { grade: 2 })
    console.log('TRAILING HALLUCINATION →', JSON.stringify(r.metrics))
    expect(r.metrics.level).not.toBe('frustration')
  })

  it('a recorder left running (passage read twice) does not score 0%', () => {
    const r = score(P10, asr(P10 + ' ' + P10, 60), { grade: 2 })
    console.log('READ TWICE →', JSON.stringify(r.metrics))
    expect(r.metrics.scoreable, 'must be refused, not scored').toBe(false)
    expect(r.metrics.accuracyPct, 'no verdict on a read we do not believe').toBeNull()
  })

  it('a physically impossible WCPM is refused', () => {
    const r = score(P100, asr(P100, 2.0), { grade: 2 })
    console.log('100 WORDS IN 2s →', JSON.stringify(r.metrics), JSON.stringify(r.validity))
    expect(r.metrics.scoreable).toBe(false)
    expect(r.metrics.wcpm).toBeNull()
  })

  it('a non-string passage does not throw', () => {
    expect(() => score(12345, asr('hi'))).not.toThrow()
    expect(() => score(['a', 'b'], asr('hi'))).not.toThrow()
  })

  it('instructionalLevel(NaN) is not "frustration"', () => {
    expect(instructionalLevel(NaN)).not.toBe('frustration')
  })

  it('numerals inside words are not mangled into nonsense tokens', () => {
    console.log('3.14 →', tokenize('3.14').normalized, ' 1st →', tokenize('1st').normalized, ' 1,000 →', tokenize('1,000').normalized)
    expect(tokenize('1st').normalized).not.toEqual(['onest'])
  })
})

// ═══════════════ 6. SCALE ═══════════════
describe('F. input size is bounded', () => {
  it('a pasted 12,000-word passage does not allocate half a gigabyte', () => {
    // The DP matrix is O(m*n) Int32 cells. Uncapped, 12k x 12k is ~576MB and OOMs the tab.
    // align() truncates to MAX_TOKENS, so the matrix is bounded no matter what is pasted in.
    const huge = Array(12000).fill('word')
    const t0 = Date.now()
    const ops = align(huge, huge)
    const elapsed = Date.now() - t0

    const worstCaseBytes = (MAX_TOKENS + 1) ** 2 * 4
    expect(worstCaseBytes, 'bounded matrix allocation').toBeLessThan(50e6)
    expect(ops.length).toBeLessThanOrEqual(MAX_TOKENS * 2)
    expect(elapsed, 'must not hang the tab').toBeLessThan(5000)
  })

  it('score() survives a pasted chapter without throwing', () => {
    const huge = Array(12000).fill('word').join(' ')
    expect(() => score(huge, { text: huge, words: [], durationSec: 60 })).not.toThrow()
  })
})
