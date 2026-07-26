/**
 * Soundex, for the phonetic relaxation filter.
 *
 * The spec allows Double Metaphone or Soundex. Soundex is ~30 lines and has no failure modes
 * worth debugging at midnight; Double Metaphone is several hundred and buys accuracy we then
 * downgrade to `confidence: 'low'` anyway. If the eval shows phonetic matching is producing
 * false suppressions, the fix is to tighten the gate below, not to swap the algorithm.
 */

import { bothCommon, sharesLemma } from './lexicon.js'
import { similarity } from './align.js'

const CODES = {
  b: '1', f: '1', p: '1', v: '1',
  c: '2', g: '2', j: '2', k: '2', q: '2', s: '2', x: '2', z: '2',
  d: '3', t: '3',
  l: '4',
  m: '5', n: '5',
  r: '6',
}

/** Standard four-character Soundex key. */
export function soundex(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return ''

  const first = w[0]
  let prev = CODES[first] ?? ''
  let out = first.toUpperCase()

  for (let i = 1; i < w.length && out.length < 4; i++) {
    const ch = w[i]
    const code = CODES[ch] ?? ''

    if (code) {
      // Adjacent identical codes collapse, unless separated by a vowel (h and w are
      // transparent and do NOT break the run. That is the classic Soundex subtlety).
      if (code !== prev) out += code
      prev = code
    } else if (ch !== 'h' && ch !== 'w') {
      prev = ''
    }
  }

  return out.padEnd(4, '0')
}

/**
 * Phonetic match gate.
 *
 * Soundex alone is far too permissive for scoring a child's reading. It happily equates
 * "rest" and "roast". Two extra conditions do most of the work of a better algorithm:
 *   - same first letter (already implied by Soundex, kept explicit for readability)
 *   - similar length, so "cat" cannot match "acquainted"
 *
 * Anything passing this is marked confidence: 'low' and shown in amber, never counted as a
 * confident correct.
 */
export function phoneticMatch(a, b) {
  if (!a || !b) return false

  // Two ordinary English words that happen to share a Soundex key are a coincidence, not
  // evidence. Soundex maps d and t to the same code, so "bad"/"bat", "bed"/"bet", "sad"/"sat",
  // "hard"/"heart" were all being forgiven as phonetic near-misses. Those are exactly the
  // first-grade decoding errors a running record exists to catch.
  if (bothCommon(a, b)) return false

  // A word and its own inflection are never a phonetic coincidence. Soundex ignores most
  // suffixes, so `dogs`/`dog`, `lived`/`left` and `showed`/`said` were all passing, erasing
  // plural, tense and comprehension-breaking substitutions from real reports. `bothCommon`
  // could not catch these: no word list contains every inflected form, and on this project's
  // own eval passages 100% of inflected forms were missing from it.
  if (sharesLemma(a, b)) return false

  if (Math.abs(a.length - b.length) > 2) return false

  // Soundex alone is far too coarse to carry this filter. It ignores vowels entirely, so
  // `showed`/`said`, `lived`/`left`, `garden`/`gordon` and `farmers`/`framers` all share a key
  //. And the last two are PLANTED SUBSTITUTIONS in our own eval, being forgiven as phonetic
  // near-misses. The filter was lowering our substitution recall, not raising it.
  //
  // Two extra conditions do the work Soundex cannot. The first two letters must agree, which is
  // where a real ASR spelling variant preserves the onset and a genuine substitution usually
  // does not; and the words must actually look alike.
  if (a.slice(0, 2) !== b.slice(0, 2)) return false
  if (similarity(a, b) < 0.7) return false

  return soundex(a) === soundex(b)
}
