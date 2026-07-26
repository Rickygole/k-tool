/**
 * Assessment passages. Every one is original text written for this project. Nothing is
 * lifted from a published reading program, because those are copyrighted and because a
 * benchmark passage that has already been taught is not a benchmark.
 *
 * There is at least one passage per grade from kindergarten through twelve. Length scales with
 * the grade for a reason: the whole measure is words read correctly in about a minute, so a
 * kindergarten passage of a hundred words would just be a hundred words the child never reaches.
 * Thirty odd words at K, around a hundred and thirty by high school.
 *
 * Constraints they are written to, which are load-bearing rather than stylistic:
 *
 *   - Length matched to the grade. Long enough that WCPM is not dominated by one stumble,
 *     short enough that the reader actually gets through most of it inside a minute.
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
  {
    id: 'k',
    title: 'My Cat Naps',
    grade: 0,
    blurb: 'Sight words and short sentences. About thirty words.',
    text:
      'The cat sat on my bed. She is soft and warm. I pet her back. She likes that a lot. Then ' +
      'she went to nap in the sun by the big red chair.',
  },
  {
    id: 'g1',
    title: 'Sam and Pip',
    grade: 1,
    blurb: 'Simple sentences, common words. Around fifty five words.',
    text:
      'Sam has a little dog named Pip. Every day after school they run to the park. Pip likes to ' +
      'chase the ball, but he will not bring it back. Sam has to run after him. When they get ' +
      'home, Sam gives Pip water and a snack. Then they both sit down on the step and rest.',
  },
  {
    id: 'g5',
    title: "The Keeper's Journal",
    grade: 5,
    blurb: 'Longer clauses and multisyllable vocabulary. Around one hundred and fifteen words.',
    text:
      'The lighthouse keeper kept a journal for thirty years, and every entry began with the ' +
      'weather. Most days were ordinary. Fog rolled in from the north, or the wind picked up by ' +
      'afternoon, or nothing happened at all worth recording. But on one page in the middle of ' +
      'the third volume, the handwriting changes. It becomes hurried and much larger. A ship had ' +
      'come too close to the rocks during a storm, and the keeper had rowed out twice in the ' +
      'dark to bring the crew ashore. He wrote four pages that night. The next morning he ' +
      'returned to his usual habit, noting the temperature and the tide, as though nothing ' +
      'unusual had happened.',
  },
  {
    id: 'g6',
    title: 'The Ice Trade',
    grade: 6,
    blurb: 'Expository text with technical vocabulary. Around one hundred and thirty words.',
    text:
      'Before refrigeration, entire towns depended on ice cut from frozen lakes in winter. Crews ' +
      'worked through January with saws and horses, carving the surface into enormous blocks and ' +
      'hauling them to icehouses packed with sawdust. If the insulation was done properly, a ' +
      'block cut in February would still be solid the following August. The whole industry ' +
      'rested on an unlikely property of sawdust, which traps air so effectively that ice ' +
      'surrounded by it melts astonishingly slowly. Fortunes were made and lost on the thickness ' +
      'of a lake in a single cold season. When mechanical refrigeration arrived, the trade ' +
      'vanished within a generation, and the icehouses were pulled down or converted into barns. ' +
      'Almost nothing remains of it now except the occasional stone foundation near a shoreline.',
  },
  {
    id: 'g7',
    title: 'What the Maps Left Out',
    grade: 7,
    blurb: 'Abstract argument and subordinate clauses. Around one hundred and thirty five words.',
    text:
      'For most of the eighteenth century, mapmakers filled unknown territory with decoration. ' +
      'Coastlines that had actually been surveyed were drawn with precision, and everything ' +
      'beyond them was populated with mountains nobody had climbed and rivers nobody had ' +
      'followed. This was not dishonesty so much as convention. A blank space looked like ' +
      'carelessness, and a decorated one looked like knowledge. The shift came when a handful of ' +
      'cartographers began leaving the interior deliberately empty, marking only what had been ' +
      'measured. Contemporaries found the new maps unsettling and considerably less beautiful. ' +
      'But an empty space is an argument. It tells the reader precisely where the evidence ' +
      'stops, and it invites somebody to go and fill it in properly rather than trusting an ' +
      'illustration.',
  },
  {
    id: 'g8',
    title: 'The Longitude Problem',
    grade: 8,
    blurb: 'Historical exposition with abstract reasoning. Around one hundred and thirty five words.',
    text:
      'Determining latitude at sea was straightforward for centuries, requiring only the angle ' +
      'of the sun at noon. Longitude was another matter entirely, and it killed a great many ' +
      'sailors. The underlying problem was time. Since the earth rotates at a predictable rate, ' +
      'a navigator who knew the hour at a fixed reference point could calculate how far east or ' +
      'west the ship had travelled. But no clock existed that could keep accurate time aboard a ' +
      'rolling vessel through changes in temperature and humidity. Astronomers proposed ' +
      'elaborate solutions involving the moons of Jupiter. The eventual answer came instead from ' +
      'a carpenter with no formal scientific training, who spent decades building a sequence of ' +
      'clocks until one of them finally kept time well enough to be trusted.',
  },
  {
    id: 'g9',
    title: 'The Overlooked Variable',
    grade: 9,
    blurb: 'Complex syntax and abstract argument. Around one hundred and forty words.',
    text:
      'In the middle of the nineteenth century a physician in Vienna noticed that women ' +
      'delivering babies in one ward of his hospital died at several times the rate of those in ' +
      'another. The wards were otherwise identical in ventilation, diet, and crowding, which ' +
      'were the explanations medicine favoured at the time. The difference he eventually ' +
      'isolated was that one ward was staffed by physicians who arrived directly from performing ' +
      'autopsies, and the other by midwives who did not. His proposed remedy, washing hands in a ' +
      'chlorine solution, reduced mortality dramatically and was rejected by nearly all of his ' +
      'colleagues. The theory that would eventually explain why it worked was still decades ' +
      'away, and a correct observation without a mechanism to justify it turns out to persuade ' +
      'almost nobody.',
  },
  {
    id: 'g10',
    title: 'The Cost of Precision',
    grade: 10,
    blurb: 'Analytical prose with embedded clauses. Around one hundred and forty five words.',
    text:
      'Every measurement carries an error, and a great deal of scientific practice consists of ' +
      'deciding how much error is tolerable. This is less obvious than it sounds. A quantity ' +
      'measured to an unnecessary number of decimal places consumes resources that could have ' +
      'been spent measuring something else, and it can create a false impression of certainty in ' +
      'results that remain fundamentally approximate. The reverse failure is more familiar and ' +
      'more dangerous. Instruments calibrated too coarsely will report consistent numbers that ' +
      'are consistently wrong, and because they are consistent, the error is difficult to ' +
      'detect. Experienced researchers therefore treat the question of precision as a design ' +
      'decision rather than a technical detail, and they answer it before collecting anything at ' +
      'all rather than afterwards when the data is already in hand.',
  },
  {
    id: 'g11',
    title: 'Reading the Rings',
    grade: 11,
    blurb: 'Sustained reasoning and technical vocabulary. Around one hundred and forty five words.',
    text:
      'A cross section of an old tree contains a climate record that can be read with reasonable ' +
      'confidence, because a tree in a favourable year lays down a wider ring than a tree in a ' +
      'poor one. The technique becomes powerful when samples overlap. A living tree provides a ' +
      'sequence extending back through its own lifetime, and timber from an old building whose ' +
      'outer rings match the inner rings of the living sample extends the record further. ' +
      'Chained carefully, such sequences reach back thousands of years. What makes the method ' +
      'persuasive is not any single sample but the requirement that independent sequences agree ' +
      'with one another. A pattern appearing in one tree might be local circumstance. The same ' +
      'pattern appearing in hundreds, across a region, is a climate.',
  },
  {
    id: 'g12',
    title: 'The Limits of the Instrument',
    grade: 12,
    blurb: 'Sophisticated abstraction and layered syntax. Around one hundred and fifty words.',
    text:
      'Any instrument shapes the questions that can be asked of it, and this is not a defect to ' +
      'be engineered away but a permanent condition of measurement. A telescope sensitive to ' +
      'visible light will produce an account of the universe composed entirely of objects that ' +
      'emit visible light, and for a long period that account was mistaken for the universe ' +
      'itself. The correction did not come from building better optical telescopes. It came from ' +
      'instruments responding to radio waves, and later to other wavelengths, each revealing a ' +
      'population of objects the previous generation of equipment had been structurally ' +
      'incapable of detecting. The lesson generalises well beyond astronomy. Whenever a field ' +
      'appears to have converged on a stable description of its subject, it is worth asking ' +
      'which properties the available instruments cannot register at all.',
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
