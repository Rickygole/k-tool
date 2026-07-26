/**
 * High-frequency English words, roughly the Dolch and Fry lists, plus the short nouns and
 * function words that form minimal pairs.
 *
 * THIS LIST EXISTS TO STOP SUPPRESSION, NOT TO ENABLE IT.
 *
 * Both the dialect rules and the phonetic (Soundex) filter are lossy enough to bridge real
 * minimal pairs: `thing`/`thin`, `sing`/`sin`, `bad`/`bat`, `bed`/`bet`, `her`/`he`,
 * `your`/`you`, `sad`/`sat`. Every one of those is a plain decoding error, and both filters
 * were erasing them from the report, silently, which is the worst way for an assessment tool
 * to be wrong. A teacher would never learn that the child read "he" for "her".
 *
 * The guard: if BOTH words are ordinary English, no approximate filter may bridge them. A child
 * substituting one everyday word for another is the single most important thing a running
 * record captures, and no pronunciation-variant or phonetic-similarity argument outweighs it.
 *
 * This costs nothing on the true positives, because the variant side of a genuine dialect pair
 * is never itself a standard word, "dis", "col", "fo", "aks", "runnin", "wif", "sista" are
 * all absent from this list by construction.
 */
export const COMMON_WORDS = new Set(
  `a about after again all am an and any are as ask at ate away
   back bad bag band bat be bead bear beat because bed been before began behind being bell bend
   bent best bet better big bin bird bit black blue boat both box boy bring brown bud bug buck
   but buy by cab came can cap car card cart cat chair coal coat cod code cold come cot could cub
   cup cut dad day did dig din do does dog done door down draw drink dud duck ear eat egg eight
   end every fall far fast fat fed feed feet fell fin find fine fire first fish five fly food
   foot for found four fox friend from full fun funny gave get girl give go goad goat goes going
   gold good got green grow had half hand hard has hat have he head hear heard heart help her
   here hi hid high him his hit hold hole home hop hope hot house how hurt i if in into is it its
   jump just keep kept kin kind king know lab lad land lap last late laugh lay leg let light like
   little live long look lot mad made make man many mat may me men mend met might mine miss mom
   more morning most mother much must my myself name near never new next nice night nine no not
   now of off old on once one only open or other our out over own pad pan park part pat pen pet
   pick pig pin place play please pot pull put ran read red ride ring rite rob robe rock rope
   round run sad said sat saw say sea see seed seen send sent set seven shall she show sin sing
   sit six sleep small so some son soon start stone stop sued sun sung sweet swim take talk tall
   tan tell ten than that the their them then there these they thin thing think this those three
   through time tin to today together too took top toy tree try two under up upon us use very
   walk want ward warm was wash water way we well went were what when where which white who why
   will win wind wing wish with wood word work would write yes yet you your
   from form quiet quite past pass thank than nod song world third build built county country
   desert dessert horse house heard head heart card cat send sent bend bent kind king thin thing
   sing sin ran rang sang sung song wrong long lost lot cost coat most moat
   through thorough spend spent lend lent mean meant feel felt keep kept leave left`
    .trim()
    .split(/\s+/),
)

/** Both words are ordinary English? Then a mismatch between them is a reading event. */
export function bothCommon(a, b) {
  return COMMON_WORDS.has(a) && COMMON_WORDS.has(b)
}

const INFLECTIONS = ['s', 'es', 'ed', 'd', 'ing', 'er', 'est', 'ly', 'y']

/**
 * Is one word the other plus a regular inflection?
 *
 * `bothCommon` has a hole it cannot close by growing: it is a membership test, and no word list
 * contains every inflected form. Measured against this project's own eval passages, 100% of
 * inflected forms and 59% of the passage vocabulary are absent from COMMON_WORDS. So the
 * Soundex filter was still forgiving real substitutions on the very text we score:
 *
 *     showed -> said     scored 100% correct
 *     lived  -> left     scored 100% correct
 *     dogs   -> dog      scored 100% correct
 *
 * `showed` read as `said` is a comprehension-breaking substitution, and a plural dropped is the
 * morphology error the cluster-reduction guard in dialect.js exists to protect. Both were being
 * erased from real teachers' reports.
 *
 * This closes it structurally rather than by enumeration: a word and its own inflection are
 * never a phonetic coincidence, so no approximate filter may bridge them.
 */
export function sharesLemma(a, b) {
  if (!a || !b || a === b) return false
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a]
  if (!longer.startsWith(shorter.slice(0, Math.min(shorter.length, 3)))) return false

  for (const suffix of INFLECTIONS) {
    if (longer === shorter + suffix) return true
    // "carry" -> "carried", "happy" -> "happier": y becomes i before the ending.
    if (shorter.endsWith('y') && longer === `${shorter.slice(0, -1)}i${suffix}`) return true
    // "hope" -> "hoping", "live" -> "lived": silent e is dropped.
    if (shorter.endsWith('e') && longer === shorter.slice(0, -1) + suffix) return true
    // "stop" -> "stopped", "run" -> "running": final consonant doubles.
    if (longer === shorter + shorter.slice(-1) + suffix) return true
  }
  return false
}
