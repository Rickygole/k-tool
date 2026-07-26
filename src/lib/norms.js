/**
 * Oral reading fluency norms.
 *
 * Hasbrouck, J., & Tindal, G. (2017). An update to compiled ORF norms
 * (Technical Report No. 1702). Behavioral Research and Teaching, University of Oregon.
 * https://files.eric.ed.gov/fulltext/ED594994.pdf
 *
 * These are the 2017 figures, NOT the widely-copied 2006 ones. The two editions differ, and
 * mixing them is easy: grade 4 spring is 133 in 2017 but 123 in 2006, and grade 6 spring is
 * 146 in 2017 but 150 in 2006. Judges from a K-12 program know these numbers.
 *
 * Grade 1 has no fall administration in the source table. Reading Rockets' HTML rendering of
 * this table shifts the grade 1 row to compensate and is wrong as a result, do not copy from
 * it. `null` below is that genuine absence, not a missing datum.
 */

/** Percentile -> [fall, winter, spring] WCPM, by grade. */
export const ORF_NORMS = {
  1: { 90: [null, 97, 116], 75: [null, 59, 91], 50: [null, 29, 60], 25: [null, 16, 34], 10: [null, 9, 18] },
  2: { 90: [111, 131, 148], 75: [84, 109, 124], 50: [50, 84, 100], 25: [36, 59, 72], 10: [23, 35, 43] },
  3: { 90: [134, 161, 166], 75: [104, 137, 139], 50: [83, 97, 112], 25: [59, 79, 91], 10: [40, 62, 63] },
  4: { 90: [153, 168, 184], 75: [125, 143, 160], 50: [94, 120, 133], 25: [75, 95, 105], 10: [60, 71, 83] },
  5: { 90: [179, 183, 195], 75: [153, 160, 169], 50: [121, 133, 146], 25: [87, 109, 119], 10: [64, 84, 102] },
  6: { 90: [185, 195, 204], 75: [159, 166, 173], 50: [132, 145, 146], 25: [112, 116, 122], 10: [89, 91, 91] },
}

const SEASON_INDEX = { fall: 0, winter: 1, spring: 2 }

export const CITATION =
  'Hasbrouck, J., & Tindal, G. (2017). An update to compiled ORF norms (Technical Report No. 1702). ' +
  'Behavioral Research and Teaching, University of Oregon.'

/**
 * Approximate percentile band for a WCPM score.
 *
 * Returns the highest published percentile the reader meets or exceeds, or 10 if they fall
 * below the 10th. Deliberately a band, not an interpolated point estimate. A table with five
 * rows cannot support a claim like "37th percentile", and pretending otherwise is the kind of
 * false precision that makes an assessment tool untrustworthy.
 *
 * @returns {number|null} 90 | 75 | 50 | 25 | 10, or null if this grade/season has no norms
 */
export function percentileBand(wcpm, grade, season = 'spring') {
  const row = ORF_NORMS[grade]
  const idx = SEASON_INDEX[season]
  // null means "no published norms for this grade/season", H&T 2017 covers grades 1-6 only,
  // so grade 7+ and kindergarten legitimately have no answer and must not be given one.
  if (!row || idx === undefined || !Number.isFinite(wcpm)) return null

  for (const p of [90, 75, 50, 25, 10]) {
    const target = row[p]?.[idx]
    if (target != null && wcpm >= target) return p
  }
  // Below the published 10th percentile is NOT the 10th percentile. A grade-6 reader at 5 WCPM
  // against a 91 WCPM floor is off the bottom of the table, and reporting them as "10th
  // percentile" overstates them enormously, in the direction that lets a struggling reader go
  // unnoticed, which is the worst direction for this tool to be wrong in.
  //
  // 'below_10' is a distinct value rather than null, because null already means "this grade has
  // no published norms" and those are different statements a teacher needs told apart.
  return 'below_10'
}

/** Does the published table cover this grade at all? H&T 2017 is grades 1-6 only. */
export function hasNorms(grade, season = 'spring') {
  return ORF_NORMS[grade]?.[50]?.[SEASON_INDEX[season]] != null
}

/** The 50th-percentile benchmark, for "typical for this grade is N WCPM" copy. */
export function medianWcpm(grade, season = 'spring') {
  return ORF_NORMS[grade]?.[50]?.[SEASON_INDEX[season]] ?? null
}

/**
 * Instructional level from accuracy. Standard running-record bands.
 * Clay calls the bottom band "Difficult"; "Frustration" is Betts' term. Either is fine --
 * just stay consistent with whatever the report prints.
 */
export function instructionalLevel(accuracyPct) {
  // NaN falls through every comparison, so a naive chain returns the LAST branch, meaning a
  // missing accuracy silently reported "frustration", the most consequential label the tool
  // can attach to a child. Absent data must read as absent.
  if (!Number.isFinite(accuracyPct)) return null
  if (accuracyPct >= 95) return 'independent'
  if (accuracyPct >= 90) return 'instructional'
  return 'frustration'
}
