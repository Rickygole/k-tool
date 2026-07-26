/**
 * High-frequency English words -- roughly the Dolch and Fry lists, plus the short nouns and
 * function words that form minimal pairs.
 *
 * THIS LIST EXISTS TO STOP SUPPRESSION, NOT TO ENABLE IT.
 *
 * Both the dialect rules and the phonetic (Soundex) filter are lossy enough to bridge real
 * minimal pairs: `thing`/`thin`, `sing`/`sin`, `bad`/`bat`, `bed`/`bet`, `her`/`he`,
 * `your`/`you`, `sad`/`sat`. Every one of those is a plain decoding error, and both filters
 * were erasing them from the report -- silently, which is the worst way for an assessment tool
 * to be wrong. A teacher would never learn that the child read "he" for "her".
 *
 * The guard: if BOTH words are ordinary English, no approximate filter may bridge them. A child
 * substituting one everyday word for another is the single most important thing a running
 * record captures, and no pronunciation-variant or phonetic-similarity argument outweighs it.
 *
 * This costs nothing on the true positives, because the variant side of a genuine dialect pair
 * is never itself a standard word -- "dis", "col", "fo", "aks", "runnin", "wif", "sista" are
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
