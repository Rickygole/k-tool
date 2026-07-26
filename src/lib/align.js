/**
 * Needleman-Wunsch global alignment over token sequences.
 *
 * Passages are ~100 words, so the full (m+1)x(n+1) matrix is trivially cheap. Do not get
 * clever here, banded or affine-gap variants buy nothing and cost debugging time.
 */

export const MATCH = 2
export const MISMATCH = -1
export const GAP = -1

/**
 * @typedef {Object} AlignOp
 * @property {'match'|'mismatch'|'omission'|'insertion'} type
 * @property {number|null} refIndex   index into reference tokens, null for insertions
 * @property {number|null} hypIndex   index into hypothesis tokens, null for omissions
 */

/**
 * Align two normalized token arrays.
 *
 * @param {string[]} ref
 * @param {string[]} hyp
 * @returns {AlignOp[]} operations in reference order
 */
// A 100-word passage against a 100-word transcript is a 10k-cell matrix, free. A pasted
// chapter against a Whisper repetition loop is not: the DP matrix is O(m*n) Int32 cells, so
// 12000x12000 is ~576MB and takes the tab down with it.
//
// 1200 caps the matrix at ~5.8MB. Nothing legitimate here comes close: ORF passages run 60-250
// words and the norms are built on one-minute reads. Truncating is the right failure. An
// input this size is already not a reading assessment.
export const MAX_TOKENS = 1200

export function align(ref, hyp) {
  const m = Math.min(ref.length, MAX_TOKENS)
  const n = Math.min(hyp.length, MAX_TOKENS)

  // score[i][j] = best score aligning ref[0..i) against hyp[0..j)
  const score = Array.from({ length: m + 1 }, () => new Int32Array(n + 1))
  for (let i = 1; i <= m; i++) score[i][0] = i * GAP
  for (let j = 1; j <= n; j++) score[0][j] = j * GAP

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const diag = score[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? MATCH : MISMATCH)
      const up = score[i - 1][j] + GAP // consume a reference word => omission
      const left = score[i][j - 1] + GAP // consume a hypothesis word => insertion
      score[i][j] = Math.max(diag, up, left)
    }
  }

  // Backtrace. Diagonal wins ties, which biases toward calling a deviation a substitution
  // rather than an omission+insertion pair. That is how a human marks a running record.
  const ops = []
  let i = m
  let j = n

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const isMatch = ref[i - 1] === hyp[j - 1]
      const diag = score[i - 1][j - 1] + (isMatch ? MATCH : MISMATCH)
      if (score[i][j] === diag) {
        ops.push({ type: isMatch ? 'match' : 'mismatch', refIndex: i - 1, hypIndex: j - 1 })
        i--
        j--
        continue
      }
    }
    if (i > 0 && score[i][j] === score[i - 1][j] + GAP) {
      ops.push({ type: 'omission', refIndex: i - 1, hypIndex: null })
      i--
      continue
    }
    ops.push({ type: 'insertion', refIndex: null, hypIndex: j - 1 })
    j--
  }

  return ops.reverse()
}

/** Levenshtein distance. Used by the fuzzy relaxation filter. */
export function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  let prev = new Uint16Array(b.length + 1)
  let curr = new Uint16Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[b.length]
}

/** Levenshtein similarity in 0..1, normalized by the longer string. */
export function similarity(a, b) {
  if (!a.length && !b.length) return 1
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length)
}
