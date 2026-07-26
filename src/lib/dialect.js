import { bothCommon } from './lexicon.js'

/**
 * Dialect-sensitive suppression.
 *
 * A dialect-consistent pronunciation of a word is not a reading error. Miscue analysis has a
 * documented history of scoring dialect features as errors, which systematically misclassifies
 * fluent readers of African American English as struggling (Labov & Baker 2010; Charity et al.
 * 2004; Goodman & Buck 1973). For an ASR-based tool the mechanism is compounded: Koenecke et
 * al. (2020, PNAS) measured roughly 2x the word error rate for Black speakers vs white speakers
 * across all five major commercial recognisers. The error we are correcting is at least as much
 * the recogniser's as the reader's.
 *
 * ============================ READ THIS BEFORE TRUSTING IT ============================
 * These rules are phonological. They run on Whisper's *text*, and Whisper is trained to emit
 * standard orthography -- it will usually transcribe "aks" as "ask", "walkin'" as "walking",
 * "dis" as "this". So many of these rules will simply never fire, and a rule that never fires
 * is not a feature. `eval/` reports per-rule firing counts precisely so this claim stays
 * honest. Do not describe this layer as doing work until those counts say it does.
 * ======================================================================================
 *
 * Every rule is a canonicalising transform applied to BOTH sides. If the two words collapse to
 * the same canonical form, the deviation is a pronunciation variant rather than a miscue.
 */

/**
 * @typedef {Object} DialectRule
 * @property {string} id
 * @property {string} label            shown to the teacher
 * @property {string} example
 * @property {(w: string) => string} canon
 * @property {(refWord: string) => boolean} [guard]      refuse to apply based on the reference word alone
 * @property {(ref: string, hyp: string) => boolean} [pairGuard]  refuse based on the pair
 */

const countR = (w) => (w.match(/r/g) ?? []).length

/**
 * Words where the final "ing" belongs to the root rather than being the progressive suffix.
 * Reducing these produces other real words, so g-dropping must not touch them.
 */
/**
 * Explicit r-less pairs, standard spelling -> the r-less form a reader may produce.
 *
 * Hand-listed on purpose. See the r-lessness rule below for why a general canon was removed.
 * Thirty entries a human can audit beat a regex whose output nobody can predict.
 */
const R_LESS_PAIRS = new Map([
  ['four', 'fo'], ['for', 'fo'], ['more', 'mo'], ['your', 'yo'], ['you\'re', 'yo'],
  ['door', 'do'], ['floor', 'flo'], ['poor', 'po'], ['sure', 'sho'], ['before', 'befo'],
  ['store', 'sto'], ['shore', 'sho'], ['their', 'they'], ['there', 'they'],
  ['care', 'ca'], ['air', 'a'], ['hair', 'ha'], ['chair', 'cha'], ['pair', 'pa'],
  ['near', 'nea'], ['year', 'yea'], ['here', 'hea'], ['fire', 'fiya'], ['our', 'ow'],
])

/** English /th/-initial words with the VOICED consonant. A closed class. */
const TH_VOICED_INITIAL = new Set([
  'the', 'this', 'that', 'these', 'those', 'them', 'their', 'there', 'then', 'they',
  'though', 'than', 'thus', 'thee', 'thy', 'theirs', 'themselves',
])

const MONOMORPHEMIC_ING = new Set([
  'thing', 'things', 'king', 'kings', 'ring', 'rings', 'sing', 'wing', 'wings', 'bring',
  'spring', 'string', 'sting', 'swing', 'cling', 'fling', 'wring', 'during', 'ceiling',
  'nothing', 'anything', 'something', 'everything',
])



/** @type {DialectRule[]} */
export const RULES = [
  {
    id: 'th-stopping',
    label: 'Th-stopping',
    example: '"this" → "dis"',
    // Initial position only, and only on VOICED /th/ (this, that, them). Stopping is an onset
    // process, and it is voicing-sensitive: AAE stops /ð/ to [d], while voiceless /th/ as in
    // "think" does not become "dink". The original rule fired on both, which is the sort of
    // detail a linguist in the audience names out loud. The set below is closed because the
    // /th/-initial function words of English are a closed class.
    guard: (refWord) => TH_VOICED_INITIAL.has(refWord),
    canon: (w) => w.replace(/^th/, 'd'),
  },
  {
    id: 'th-fronting',
    label: 'Th-fronting',
    example: '"with" → "wif", "bath" → "baf"',
    // Medial and final only -- deliberately NOT initial, which is the stopping environment.
    //
    // Both voicings are modelled. Voiceless /th/ fronts to [f] ("bath" -> "baf"); voiced /th/
    // fronts to [v] ("brother" -> "brovah"), and omitting the [v] half meant the single most
    // recognisable AAE form in the whole list could never match.
    canon: (w) => w.replace(/(.)ther/g, '$1va').replace(/ah$/, 'a').replace(/(.)th/g, '$1f'),
  },
  {
    id: 'r-lessness',
    label: 'Postvocalic r-lessness',
    example: '"four" → "fo", "sister" → "sista"',
    // Drop r after a vowel when not followed by a vowel. Non-rhoticity is a whole-dialect
    // property, not a decoding failure.
    //
    // THIS RULE WAS REWRITTEN AFTER IT FAILED BADLY. Read this before "simplifying" it.
    //
    // The original canon dropped postvocalic r, then collapsed vowel runs, then neutralised the
    // final vowel to a schwa -- a chain lossy enough that `house` and `horse` both became
    // `hosa`. The tool told a teacher that a child who read "horse" for "house" had produced a
    // pronunciation variant and needed no attention. A pair guard on r-count did not save it,
    // because `house`/`horse` genuinely differ in r-count. That is the failure mode this whole
    // module exists to avoid, produced by the module itself.
    //
    // The lesson generalises: a lossy canonicaliser plus a heuristic guard cannot be made safe,
    // because the canon destroys exactly the information the guard would need. So the rule is
    // now two narrow, checkable things instead of one clever one:
    //
    //   1. The -er/-a alternation, which is safe because it requires the -er ending and leaves
    //      the rest of the word untouched: sister/sista, water/wata, brother/brotha.
    //   2. An explicit pair table for the remaining common r-less forms. Thirty entries a human
    //      can read and audit beats a regex nobody can predict.
    pairGuard: (ref, hyp) => countR(ref) !== countR(hyp),
    canon: (w) => R_LESS_PAIRS.get(w) ?? w.replace(/er$/, 'a'),
  },
  {
    id: 'final-devoicing',
    label: 'Final consonant devoicing',
    example: '"bed" → "bet"',
    // Lowest-risk rule in the set: maps voiced/voiceless pairs onto one another at word end.
    canon: (w) => w.replace(/b$/, 'p').replace(/d$/, 't').replace(/g$/, 'k').replace(/v$/, 'f'),
  },
  {
    id: 'cluster-reduction',
    label: 'Consonant cluster reduction',
    example: '"test" → "tes", "cold" → "col"',
    // The most robust AAE feature, and the most dangerous rule here, because word-final
    // clusters are where English keeps its past-tense morphology.
    //
    // GUARD: refuse to fire on regular past-tense forms. Without it, "walked" reduces to
    // "walk" and "passed" to "pass", and the tool would silently hide a genuine tense error --
    // exactly the kind of reading difficulty a teacher needs to see.
    // The -s branch matters as much as the -ed one: the canon strips a final /s/ after a
    // consonant, so "cats" reduces to "cat" and "runs" to "run", hiding plural and third-person
    // agreement errors exactly the way the -ed case hid tense.
    guard: (refWord) => !/(ed|s)$/.test(refWord),
    canon: (w) => w.replace(/([bcdfgklmnpstvz])([tdkps])$/, '$1'),
  },
  {
    id: 'g-dropping',
    label: '-ing reduction',
    example: '"running" → "runnin"',
    // Labelled honestly: g-dropping is near-universal in casual English across every variety.
    // It is NOT an AAE-specific feature and must not be presented as one -- a linguistically
    // literate judge will catch that, and rightly.
    //
    // GUARD: only fires where -ing is a SUFFIX. In "thing", "sing", "king", "ring" the letters
    // are part of the root, and reducing them produces "thin", "sin", "kin" -- all real words,
    // so the rule was quietly forgiving four genuine decoding errors a first-grade teacher
    // very much wants to see.
    guard: (refWord) => !MONOMORPHEMIC_ING.has(refWord),
    canon: (w) => w.replace(/ing$/, 'in'),
  },
  {
    id: 'metathesis',
    label: 'Metathesis (ask/aks)',
    example: '"ask" → "aks"',
    // NOT "regularised past tense" -- that label is simply wrong. /aks/ is transposition of
    // /s/ and /k/, a lexical variant descending from Old English ācsian. It appears in
    // inflected forms ("asked" → "aksed") but the process has nothing to do with tense.
    canon: (w) => w.replace(/^aks/, 'ask'),
  },
]

/**
 * Copula and auxiliary forms whose absence is a documented AAE syntactic feature
 * ("he is running" → "he running").
 *
 * This is deliberately kept OUT of the RULES table above: it is morphosyntactic, not
 * phonological, and it suppresses an *omitted word* rather than a mispronounced one. In a
 * running record an omission is a scored error, so a loose version of this rule would let the
 * tool quietly forgive any dropped word. It is gated to this closed set and nothing else.
 *
 * "am" and "be" are deliberately EXCLUDED, and getting this wrong is the kind of detail a
 * linguist in the audience would catch:
 *   - First-person singular "am" is categorically undeletable in AAE (Labov). "I running" is
 *     not a form of the dialect, so forgiving a dropped "am" forgives a real omission.
 *   - Invariant "be" marks habitual aspect and is ADDED, not deleted ("he be running" = he
 *     habitually runs). Treating a missing "be" as dialect gets the grammar backwards.
 */
const COPULA = new Set(['is', 'are', "'s", "'re"])

/** Would omitting this reference word be a dialect feature rather than a miscue? */
export function isCopulaOmission(refWord) {
  return COPULA.has(refWord)
}

/**
 * Test whether two words differ only by dialect features.
 *
 * @param {string} refWord   normalized reference word
 * @param {string} hypWord   normalized hypothesis word
 * @returns {{matched: boolean, ruleIds: string[]}}
 */
export function dialectMatch(refWord, hypWord) {
  if (refWord === hypWord) return { matched: false, ruleIds: [] }

  // A substitution of one everyday word for another is a reading event, not a pronunciation
  // variant. Without this the rules forgive `thing`/`thin`, `bad`/`bat`, `her`/`he` -- real
  // decoding errors, silently erased from the report. See COMMON_WORDS above.
  if (bothCommon(refWord, hypWord)) return { matched: false, ruleIds: [] }

  const applicable = RULES.filter(
    (r) => (!r.guard || r.guard(refWord)) && (!r.pairGuard || r.pairGuard(refWord, hypWord)),
  )

  // Which individual rules can bridge the gap on their own? Reported to the teacher so the
  // suppression is always explainable, never a silent pass.
  const ruleIds = applicable.filter((r) => r.canon(refWord) === r.canon(hypWord)).map((r) => r.id)

  // EXACTLY ONE RULE MUST BRIDGE THE PAIR. There used to be a fallback that composed every
  // applicable rule and checked the stacked result, on the reasoning that dialect features
  // co-occur in real speech. It was removed, for two reasons:
  //
  //   - It manufactured matches no single feature licenses. Chaining final-devoicing into
  //     cluster-reduction turned "ring" into "rink" into "rin", so the tool forgave a child
  //     reading "rin" for "ring" and called it a dialect variant. Nobody could have predicted
  //     that pair by reading the rule list, which is the problem.
  //   - It could not report honestly. The stacked branch listed every rule that had touched
  //     either word, so a suppression would cite "final consonant devoicing" for a pair where
  //     devoicing did no work -- a wrong explanation shown to a teacher.
  //
  // One rule, named, auditable. A pair that genuinely needs two features is a pair we decline
  // to forgive, and under-forgiving is the safe direction for an assessment tool.
  if (ruleIds.length > 0) return { matched: true, ruleIds }

  return { matched: false, ruleIds: [] }
}

export { COPULA }
