/**
 * Homophone groups. Never flagged as an error under any circumstance.
 *
 * This is not leniency, it is physics: these words are acoustically identical, so no speech
 * recogniser can distinguish them from audio alone. Whisper picks one using a language model
 * over the surrounding words. If it guesses "their" where the passage says "there", that tells
 * you about Whisper's prior, not about whether the child decoded the word.
 *
 * A human scorer listening to the same audio would also be unable to tell, and would mark it
 * correct. We do the same.
 */
const GROUPS = [
  ['there', 'their', "they're"],
  ['to', 'too', 'two'],
  ['your', "you're"],
  ['its', "it's"],
  ['knew', 'new'],
  ['here', 'hear'],
  ['for', 'four', 'fore'],
  ['son', 'sun'],
  ['ate', 'eight'],
  ['by', 'buy', 'bye'],
  ['would', 'wood'],
  ['right', 'write', 'rite'],
  ['no', 'know'],
  ['one', 'won'],
  ['be', 'bee'],
  ['see', 'sea'],
  ['road', 'rode'],
  ['tail', 'tale'],
  ['made', 'maid'],
  ['week', 'weak'],
  ['whole', 'hole'],
  ['blew', 'blue'],
  ['flour', 'flower'],
  ['hour', 'our'],
  ['meat', 'meet'],
  ['pair', 'pear'],
  ['plain', 'plane'],
  ['some', 'sum'],
  ['threw', 'through'],
  ['wait', 'weight'],
  ['where', 'wear'],
  ['which', 'witch'],
]

// word -> group id, built once at module load.
const INDEX = new Map()
GROUPS.forEach((group, i) => {
  for (const word of group) INDEX.set(word, i)
})

/** Are these two normalized words members of the same homophone group? */
export function isHomophone(a, b) {
  if (a === b) return false
  const ga = INDEX.get(a)
  return ga !== undefined && ga === INDEX.get(b)
}

export { GROUPS }
