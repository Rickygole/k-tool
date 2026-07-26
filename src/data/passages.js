/**
 * Assessment passages. All five are original text written for this project. Nothing is
 * lifted from a published reading program, because those are copyrighted and because a
 * benchmark passage that has already been taught is not a benchmark.
 *
 * Constraints they are written to, which are load-bearing rather than stylistic:
 *
 *   - ~100 words. Long enough that WCPM is not dominated by one stumble, short enough that a
 *     grade-2 reader finishes inside a minute or two.
 *   - No digits. `normalize.expandNumbers` rewrites "5" to "five" before tokenising, so a
 *     numeral in the source would render in the marked-up passage as its spelled-out form and
 *     no longer match the printed page. Spell numbers out here instead.
 *   - No hyphenated compounds. `normalize.tokenize` splits on hyphens (correctly. A reader
 *     says two words), which would drop the hyphen from the marked-up rendering.
 *   - One paragraph. The scorer returns a flat token list, so the marked-up passage reflows as
 *     a single block; a paragraph break in the source would silently disappear on the results
 *     screen.
 *
 * Contractions ARE used deliberately. They expand to two tokens internally ("isn't" -> "is
 * not") and the results view has to regroup them back into one printed word. So keeping one
 * in the set means that path is exercised every time anyone reads passage three.
 *
 * Grade levels are the author's judgement against typical sentence length and vocabulary, not
 * a computed readability score. A shipped product would run Lexile or ATOS on these.
 */

/**
 * @typedef {Object} Passage
 * @property {string} id
 * @property {string} title
 * @property {number} grade      grade level the text is written for; drives norm lookup
 * @property {string} text
 * @property {string} blurb      one line of teacher-facing description
 */

/** @type {Passage[]} */
export const PASSAGES = [
  {
    id: 'p1',
    title: 'The Mitten in the Oak Tree',
    grade: 2,
    blurb: 'Short sentences, common sight words, one small surprise.',
    text:
      'Nora lost her red mitten on the way to school. She looked under the bench and behind ' +
      'the big oak tree, but the mitten was gone. All morning she thought about it. When the ' +
      'bell rang for recess, she ran outside and saw a small brown bird carrying something ' +
      'red up to a branch. The bird was building a nest, and her mitten was part of it. Nora ' +
      'laughed out loud. She did not want to climb the tree. She told her teacher that the ' +
      'bird needed the mitten more than she did, and then she went to play.',
  },
  {
    id: 'p2',
    title: 'Rain on the Roof',
    grade: 2,
    blurb: 'Sensory description, repeated sentence patterns, calm ending.',
    text:
      'Rain came down hard on the roof of the school. Sam did not like the sound. It was too ' +
      'loud, and it made his ears feel tight. His teacher gave him a quiet corner near the ' +
      'window with a soft blue pillow. Sam sat there and watched the water run down the glass ' +
      'in little rivers. He counted the rivers until the noise felt smaller. After a while ' +
      'the rain slowed and then it stopped. The sun came back. Sam went outside with his ' +
      'class and found a puddle shaped exactly like a boat.',
  },
  {
    id: 'p3',
    title: 'The Bakery on Ash Street',
    grade: 3,
    blurb: 'Longer clauses, a contraction, and one tricky word: "o’clock".',
    text:
      'Every Saturday morning, Mateo helps his grandmother at the bakery on Ash Street. He ' +
      'arrives before the sun is up, when the ovens are still cold and the floor is still ' +
      'dark. His job is to weigh the flour and to fold the towels into neat squares. His ' +
      'grandmother says the bread will not rise if the kitchen is a mess. Mateo isn’t sure ' +
      'that is true, but he keeps the counters clean anyway. By seven o’clock the whole ' +
      'street smells like warm butter, and people are waiting outside the door.',
  },
  {
    id: 'p4',
    title: 'The Moth at the Window',
    grade: 3,
    blurb: 'Multisyllable words, a cause-and-effect turn near the end.',
    text:
      'A gray moth landed on the window screen and stayed there all evening. Priya watched it ' +
      'from the kitchen table while she finished her homework. The moth did not move, even ' +
      'when the wind pushed the branches around. Her father said that moths follow the moon, ' +
      'and that porch lights confuse them. Priya turned off the porch light to see what would ' +
      'happen. For a long minute nothing changed. Then the moth lifted away into the dark ' +
      'yard, and Priya felt glad and a little sorry at the same time. She left the light off ' +
      'all night.',
  },
  {
    id: 'p5',
    title: 'Tide Pools at Low Water',
    grade: 4,
    blurb: 'Content vocabulary, embedded clauses, an inference in the last line.',
    text:
      'The tide pools appear only twice a day, when the ocean pulls back and leaves shallow ' +
      'bowls of water behind in the rock. Our teacher told the class to walk slowly and to ' +
      'keep our hands out of the water. In the first pool we found a green anemone folded ' +
      'shut like a fist. In the second we found a crab no bigger than a thumbnail, moving ' +
      'sideways under a curtain of seaweed. Everything living there survives being covered ' +
      'and uncovered twice every single day. That is a harder life than it looks from the ' +
      'path above.',
  },
]

/**
 * DEMO MODE passage. Not shown in the picker.
 *
 * `public/demo/clean-read.wav` is a bundled recording of exactly this text, and demo mode
 * (Ctrl+Shift+D) runs that file through the real decode -> Whisper -> score pipeline. The
 * passage has to match the recording or the demo produces a wall of omissions, so this text
 * and that wav file are a matched pair, change one and you must re-record the other.
 *
 * It is 40 words rather than ~100 because the recording is eleven seconds long. Demo mode is
 * insurance against a dead microphone in a noisy room, not a substitute for a real assessment,
 * and the UI labels every demo result as a bundled recording so no one mistakes it for one.
 */
export const DEMO_PASSAGE = {
  id: 'demo',
  title: 'Little Fox and the Stone',
  grade: 2,
  blurb: 'Bundled demo recording.',
  isDemo: true,
  text:
    'Little Fox lived at the edge of the woods. Every morning she went down to the stream to ' +
    'drink. One day she found a shiny stone in the water. It was smooth and cold and it ' +
    'sparkled in the sun.',
}

/** Word count as the scorer will see it: whitespace-split, punctuation ignored. */
export function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length
}
