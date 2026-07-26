/**
 * Text normalisation, applied identically to reference and hypothesis before alignment.
 *
 * The one asymmetry is disfluency removal, which runs on the hypothesis only -- "um" in the
 * passage is a word the child is supposed to read; "um" in the transcript is throat-clearing.
 */

const DISFLUENCIES = new Set(['um', 'uh', 'er', 'erm', 'mm', 'hmm', 'mmm', 'ah', 'eh'])

// Contractions are kept intact (a reader who says "don't" read "don't"), but we store the
// expansion so "don't" and "do not" align. Both directions are needed: Whisper may write
// either one regardless of what the passage says.
const CONTRACTIONS = {
  "don't": 'do not',
  "doesn't": 'does not',
  "didn't": 'did not',
  "won't": 'will not',
  "can't": 'cannot',
  "couldn't": 'could not',
  "shouldn't": 'should not',
  "wouldn't": 'would not',
  "isn't": 'is not',
  "aren't": 'are not',
  "wasn't": 'was not',
  "weren't": 'were not',
  "haven't": 'have not',
  "hasn't": 'has not',
  "hadn't": 'had not',
  "it's": 'it is',
  "that's": 'that is',
  "there's": 'there is',
  "he's": 'he is',
  "she's": 'she is',
  "what's": 'what is',
  "let's": 'let us',
  "i'm": 'i am',
  "i've": 'i have',
  "i'll": 'i will',
  "you're": 'you are',
  "you'll": 'you will',
  "we're": 'we are',
  "we'll": 'we will',
  "they're": 'they are',
  "they'll": 'they will',
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

/** Integer to English words. Covers 0..999999, which is every number a K-4 passage contains. */
export function numberToWords(n) {
  if (n < 0) return `minus ${numberToWords(-n)}`
  if (n < 20) return ONES[n]
  if (n < 100) {
    const t = TENS[Math.floor(n / 10)]
    const r = n % 10
    return r ? `${t} ${ONES[r]}` : t
  }
  if (n < 1000) {
    const h = `${ONES[Math.floor(n / 100)]} hundred`
    const r = n % 100
    return r ? `${h} ${numberToWords(r)}` : h
  }
  if (n < 1000000) {
    const th = `${numberToWords(Math.floor(n / 1000))} thousand`
    const r = n % 1000
    return r ? `${th} ${numberToWords(r)}` : th
  }
  return String(n)
}

/**
 * Expand digit runs to words. Whisper writes "1965"; passages write "nineteen sixty-five".
 * Skip this and every number in the passage is a false error.
 *
 * Four-digit values in 1100..1999 are read year-style ("nineteen sixty five"), which is how
 * a person actually reads them aloud.
 */
export function expandNumbers(text) {
  return text.replace(/\d+/g, (digits) => {
    const n = Number(digits)
    if (!Number.isFinite(n)) return digits
    if (digits.length === 4 && n >= 1100 && n <= 1999) {
      const hi = Math.floor(n / 100)
      const lo = n % 100
      if (lo === 0) return `${numberToWords(hi)} hundred`
      if (lo < 10) return `${numberToWords(hi)} oh ${numberToWords(lo)}`
      return `${numberToWords(hi)} ${numberToWords(lo)}`
    }
    return numberToWords(n)
  })
}

/**
 * Normalise a single token: lowercase, strip punctuation except intra-word apostrophes.
 *
 * Curly apostrophes are folded to straight ones first -- Whisper emits U+2019 and passages
 * typed in a word processor do too, so without this "don't" and "don’t" are different words.
 */
export function normalizeToken(raw) {
  return raw
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[–—]/g, '-')
    // Drop anything that isn't a letter, digit, apostrophe or internal hyphen.
    .replace(/[^a-z0-9'-]/g, '')
    // Now strip apostrophes/hyphens that ended up leading or trailing (quotes, dashes).
    .replace(/^['-]+|['-]+$/g, '')
}

/**
 * Tokenise text into aligned original/normalized pairs.
 *
 * The `original` array is what the UI renders -- real capitalisation, real punctuation. The
 * `normalized` array is what the aligner sees. They stay index-parallel so a scored token can
 * always be traced back to the exact word on screen.
 *
 * @param {string} text
 * @param {{isHypothesis?: boolean}} [opts]
 * @returns {{original: string[], normalized: string[]}}
 */
export function tokenize(text, opts = {}) {
  const expanded = expandNumbers(text ?? '')

  // Hyphens separate words for reading purposes. A child reading "sixty-five" says two words,
  // and Whisper writes two words -- so without this split every hyphenated compound in the
  // passage scores as a substitution plus an insertion.
  const raw = expanded.split(/[\s–—-]+/).filter(Boolean)

  const original = []
  const normalized = []

  for (const token of raw) {
    const norm = normalizeToken(token)
    if (!norm) continue // pure punctuation, e.g. a stray em-dash
    if (opts.isHypothesis && DISFLUENCIES.has(norm)) continue

    // Contractions expand into their component words on BOTH sides, so "doesn't" and
    // "does not" align naturally instead of colliding as a 1-token vs 2-token mismatch.
    // The display array repeats the source token across the expansion, which keeps
    // original[] and normalized[] index-parallel -- the UI still renders "doesn't".
    const expansion = CONTRACTIONS[norm]
    if (expansion) {
      for (const part of expansion.split(' ')) {
        original.push(token)
        normalized.push(part)
      }
      continue
    }

    original.push(token)
    normalized.push(norm)
  }

  return { original, normalized }
}

/** Expanded form of a contraction, or null. Used by the match relaxation pass. */
export function expandContraction(token) {
  return CONTRACTIONS[token] ?? null
}

export { DISFLUENCIES, CONTRACTIONS }
