/**
 * Evaluation fixtures.
 *
 * Ground truth is CONSTRUCTED, not annotated. Each passage carries an explicit error script,
 * and the "as read" text is generated from the reference by applying that script. This means
 * we know with certainty what the correct answer is -- there is no human labelling step to
 * disagree about, and no chance of scoring our own homework.
 *
 * Edit kinds:
 *   { kind: 'substitution',   refIndex, said }        reader says `said` instead of ref[refIndex]
 *   { kind: 'omission',       refIndex }              reader skips ref[refIndex]
 *   { kind: 'insertion',      refIndex, said }        reader adds `said` BEFORE ref[refIndex]
 *   { kind: 'self_correction', refIndex, said }       reader says `said`, then the correct word
 */

export const PASSAGES = [
  {
    id: 'fox',
    title: 'The Fox and the Stone',
    grade: 2,
    text:
      'The little fox lived at the edge of the woods. Every morning she went down to the stream to drink. ' +
      'One day she found a shiny stone in the water. It was smooth and cold and it sparkled in the sun. ' +
      'She carried it home in her mouth and put it under a tall pine tree. All winter long she kept it safe. ' +
      'When spring came she showed the stone to her brother and he said it was the finest one he had ever seen.',
    errorScript: [
      { kind: 'substitution', refIndex: 2, said: 'dog' },
      { kind: 'substitution', refIndex: 12, said: 'walked' },
      { kind: 'substitution', refIndex: 29, said: 'rock' },
      { kind: 'substitution', refIndex: 45, said: 'short' },
      { kind: 'omission', refIndex: 8 },
      { kind: 'omission', refIndex: 21 },
      { kind: 'omission', refIndex: 55 },
      { kind: 'insertion', refIndex: 5, said: 'big' },
      { kind: 'insertion', refIndex: 34, said: 'very' },
      { kind: 'self_correction', refIndex: 42, said: 'carr' },
    ],
  },
  {
    id: 'bridge',
    title: 'The Bridge in the Rain',
    grade: 3,
    text:
      'The old wooden bridge crossed the river just below the mill. For many years the farmers used it to bring ' +
      'their carts to market. One autumn the rain fell for nine days without stopping and the river rose higher ' +
      'than anyone could remember. The bridge groaned but it held. When the water finally went down the whole ' +
      'town gathered on the bank to see whether it had survived. It had, and the mayor declared that the bridge ' +
      'would stand for another hundred years.',
    errorScript: [
      { kind: 'substitution', refIndex: 1, said: 'gold' },
      { kind: 'substitution', refIndex: 15, said: 'framers' },
      { kind: 'substitution', refIndex: 33, said: 'stoping' },
      { kind: 'substitution', refIndex: 58, said: 'bang' },
      { kind: 'omission', refIndex: 6 },
      { kind: 'omission', refIndex: 27 },
      { kind: 'omission', refIndex: 66 },
      { kind: 'insertion', refIndex: 11, said: 'long' },
      { kind: 'insertion', refIndex: 44, said: 'really' },
      { kind: 'self_correction', refIndex: 42, said: 'reme' },
    ],
  },
  {
    id: 'garden',
    title: 'The Rooftop Garden',
    grade: 3,
    text:
      'Nobody expected a garden to grow on the roof of the library. It started when a librarian carried up ' +
      'four buckets of soil and a packet of bean seeds. She watered them every morning before the doors opened. ' +
      'By July the vines had climbed the railing and the beans hung down in long green ropes. Children came up ' +
      'the narrow stairs to look at them. The librarian said that anything will grow if somebody remembers to ' +
      'come back and take care of it.',
    errorScript: [
      { kind: 'substitution', refIndex: 3, said: 'gordon' },
      { kind: 'substitution', refIndex: 20, said: 'library' },
      { kind: 'substitution', refIndex: 31, said: 'watched' },
      { kind: 'substitution', refIndex: 52, said: 'stars' },
      { kind: 'omission', refIndex: 9 },
      { kind: 'omission', refIndex: 40 },
      { kind: 'omission', refIndex: 61 },
      { kind: 'insertion', refIndex: 14, said: 'small' },
      { kind: 'insertion', refIndex: 47, said: 'up' },
      { kind: 'self_correction', refIndex: 16, said: 'libra' },
    ],
  },
  {
    id: 'whale',
    title: 'The Whale Watchers',
    grade: 4,
    text:
      'The boat left the harbour before sunrise, carrying eleven passengers and a guide who had counted whales ' +
      'in these waters for twenty years. She told them that patience mattered more than luck. For two hours they ' +
      'saw nothing but grey water and gulls. Then, without warning, a humpback rose beside the boat and rolled ' +
      'onto its side, lifting one long fin into the air as though it were waving. Nobody spoke. The guide said ' +
      'afterwards that she had never grown used to that moment.',
    errorScript: [
      { kind: 'substitution', refIndex: 5, said: 'surprise' },
      { kind: 'substitution', refIndex: 16, said: 'waters' },
      { kind: 'substitution', refIndex: 38, said: 'girls' },
      { kind: 'substitution', refIndex: 60, said: 'waiving' },
      { kind: 'omission', refIndex: 11 },
      { kind: 'omission', refIndex: 30 },
      { kind: 'omission', refIndex: 70 },
      { kind: 'insertion', refIndex: 22, said: 'really' },
      { kind: 'insertion', refIndex: 55, said: 'the' },
      { kind: 'self_correction', refIndex: 27, said: 'pati' },
    ],
  },
  {
    id: 'letter',
    title: 'A Letter That Waited',
    grade: 4,
    text:
      'In the back of the drawer, underneath a stack of receipts, my grandmother kept a letter she had never ' +
      'opened. It arrived the summer she turned nineteen and she put it away because she was afraid of what it ' +
      'might say. Sixty years later she handed it to me and asked me to read it aloud. It was an invitation to ' +
      'a wedding that had happened long ago. She laughed until she had to sit down, and then she asked me to ' +
      'read it once more.',
    errorScript: [
      { kind: 'substitution', refIndex: 5, said: 'dresser' },
      { kind: 'substitution', refIndex: 12, said: 'grandfather' },
      { kind: 'substitution', refIndex: 28, said: 'nineteen' },
      { kind: 'substitution', refIndex: 63, said: 'wedded' },
      { kind: 'omission', refIndex: 9 },
      { kind: 'omission', refIndex: 36 },
      { kind: 'omission', refIndex: 72 },
      { kind: 'insertion', refIndex: 18, said: 'old' },
      { kind: 'insertion', refIndex: 50, said: 'out' },
      { kind: 'self_correction', refIndex: 59, said: 'invit' },
    ],
  },
]

/**
 * Apply an error script to a passage, producing the text a reader would actually utter plus
 * the ground-truth miscue list keyed by reference index.
 *
 * Reference indices are computed on a whitespace split of the raw text, which matches how
 * `tokenize()` indexes it once punctuation is stripped -- verified by the harness, which
 * asserts the two agree before it trusts any number it prints.
 */
export function applyErrorScript(text, errorScript) {
  const refWords = text.split(/\s+/).filter(Boolean)
  const byIndex = new Map()
  for (const e of errorScript) {
    if (!byIndex.has(e.refIndex)) byIndex.set(e.refIndex, [])
    byIndex.get(e.refIndex).push(e)
  }

  const spoken = []
  const truth = []

  for (let i = 0; i < refWords.length; i++) {
    const edits = byIndex.get(i) ?? []
    const insertion = edits.find((e) => e.kind === 'insertion')
    const omission = edits.find((e) => e.kind === 'omission')
    const substitution = edits.find((e) => e.kind === 'substitution')
    const selfCorrection = edits.find((e) => e.kind === 'self_correction')

    if (insertion) {
      spoken.push(insertion.said)
      truth.push({ kind: 'insertion', refIndex: i, said: insertion.said })
    }

    if (omission) {
      truth.push({ kind: 'omission', refIndex: i, said: null })
      continue
    }

    if (substitution) {
      spoken.push(substitution.said)
      truth.push({ kind: 'substitution', refIndex: i, said: substitution.said })
      continue
    }

    if (selfCorrection) {
      spoken.push(selfCorrection.said)
      spoken.push(refWords[i])
      truth.push({ kind: 'self_correction', refIndex: i, said: selfCorrection.said })
      continue
    }

    spoken.push(refWords[i])
  }

  return { spokenText: spoken.join(' '), truth }
}
