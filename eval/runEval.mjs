/**
 * Evaluation harness.
 *
 * For each passage it renders two clips. One read cleanly, one read with a scripted set of
 * miscues, transcribes both with the real pipeline, scores them, and compares the scorer's
 * output against ground truth that was constructed rather than annotated.
 *
 * The number that matters most is the FALSE POSITIVE RATE ON CLEAN READS. Telling a child who
 * read correctly that they made a mistake is a worse failure than missing an error, so that is
 * the metric we optimise and the one that leads the slide.
 *
 * HONEST LIMITATION, stated up front and repeated in EVAL.md: the clips are macOS `say` speech
 * synthesis, not children reading. This measures the alignment and classification layer end to
 * end against a real recogniser, which is the part we built. It does NOT measure how well
 * Whisper handles a seven-year-old's voice. That needs human recordings and is the honest
 * next step, not something a weekend can settle.
 *
 *   node eval/runEval.mjs [--skip-audio]
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { pipeline } from '@huggingface/transformers'
import { PASSAGES, applyErrorScript } from './fixtures.js'
import { score } from '../src/lib/score.js'
import { tokenize } from '../src/lib/normalize.js'

const MODEL_ID = 'onnx-community/whisper-base.en_timestamped'
const AUDIO_DIR = new URL('./audio/', import.meta.url).pathname
const SKIP_AUDIO = process.argv.includes('--skip-audio')

mkdirSync(AUDIO_DIR, { recursive: true })

/**
 * Render text to a 16kHz mono WAV via macOS `say`. Deterministic, so reruns are comparable.
 *
 * The 500ms of leading silence is not cosmetic. Whisper truncates speech onset when audio
 * begins at t=0. On the unpadded demo clip it swallowed the word "The" and the scorer
 * correctly reported an omission that the reader never made. That is an audio capture
 * artifact, not a reading event, and padding is the honest fix. The live recorder gets the
 * same treatment for the same reason.
 */
const LEAD_SILENCE_SEC = 0.5

function renderAudio(text, outPath) {
  if (SKIP_AUDIO && existsSync(outPath)) return
  const aiff = `${outPath}.aiff`
  const speechPath = `${outPath}.speech.wav`
  execFileSync('say', ['-v', 'Samantha', '-r', '130', '-o', aiff, text])
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@16000', '-c', '1', aiff, speechPath])

  const speech = readFileSync(speechPath)
  const dataIdx = speech.indexOf(Buffer.from('data', 'ascii'), 12)
  const header = speech.subarray(0, dataIdx + 8)
  const pcm = speech.subarray(dataIdx + 8)
  const pad = Buffer.alloc(Math.round(LEAD_SILENCE_SEC * 16000) * 2)

  const out = Buffer.concat([header, pad, pcm])
  out.writeUInt32LE(pad.length + pcm.length, dataIdx + 4) // data chunk size
  out.writeUInt32LE(out.length - 8, 4) // RIFF size
  writeFileSync(outPath, out)
}

function readWav16kMono(path) {
  const buf = readFileSync(path)
  let pos = 12
  let dataOffset = null
  let dataLength = 0
  let channels = 1
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4)
    const size = buf.readUInt32LE(pos + 4)
    if (id === 'fmt ') channels = buf.readUInt16LE(pos + 10)
    if (id === 'data') {
      dataOffset = pos + 8
      dataLength = size
    }
    pos += 8 + size + (size % 2)
  }
  const n = Math.floor(dataLength / 2 / channels)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = buf.readInt16LE(dataOffset + i * 2 * channels) / 32768
  return { audio: out, durationSec: n / 16000 }
}

console.log(`loading ${MODEL_ID} ...`)
const asr = await pipeline('automatic-speech-recognition', MODEL_ID, { dtype: 'q8' })

async function transcribe(audio, durationSec) {
  const out = await asr(audio, { return_timestamps: 'word', chunk_length_s: 30 })
  const words = (out.chunks ?? [])
    .map((c) => ({
      word: (c.text ?? '').trim(),
      start: c.timestamp?.[0],
      end: c.timestamp?.[1],
    }))
    .filter((w) => w.word)
  return { text: (out.text ?? '').trim(), words, durationSec }
}

// ---------------------------------------------------------------------------------------
// Ground-truth comparison.
//
// A detection counts as a true positive if the scorer flagged the SAME reference index with
// the SAME miscue kind. Matching on index and not merely on totals is what makes this an
// evaluation rather than a tally. A scorer that finds ten errors in the wrong ten places
// should not score well.
// ---------------------------------------------------------------------------------------
const KINDS = ['substitution', 'omission', 'insertion', 'self_correction']

function detectedMiscues(result) {
  return result.tokens
    .filter((t) => KINDS.includes(t.status))
    // anchorRefIndex, not refIndex: insertions carry no reference index but do have a place
    // in the passage, and position is the whole basis of this comparison.
    .map((t) => ({ kind: t.status, refIndex: t.anchorRefIndex ?? t.refIndex }))
}

function tally(truth, detected) {
  const stats = {}
  for (const kind of KINDS) {
    const want = truth.filter((t) => t.kind === kind)
    const got = detected.filter((d) => d.kind === kind)

    // Index alignment is approximate by +/-1: an insertion "before word 5" and a scorer that
    // anchors it at word 4 are the same event, and penalising that would measure bookkeeping
    // rather than detection.
    const used = new Set()
    let tp = 0
    for (const w of want) {
      const hit = got.findIndex(
        (g, i) => !used.has(i) && g.refIndex != null && Math.abs(g.refIndex - w.refIndex) <= 1,
      )
      if (hit >= 0) {
        used.add(hit)
        tp++
      }
    }
    const fp = got.length - tp
    const fn = want.length - tp
    const precision = tp + fp === 0 ? null : tp / (tp + fp)
    const recall = tp + fn === 0 ? null : tp / (tp + fn)
    const f1 = precision && recall ? (2 * precision * recall) / (precision + recall) : 0
    stats[kind] = { tp, fp, fn, precision, recall, f1, expected: want.length, found: got.length }
  }
  return stats
}

const results = []
const suppressionTotals = {}
const dialectRuleTotals = {}

for (const passage of PASSAGES) {
  // Sanity check: the fixture indexes reference words on a whitespace split; the scorer uses
  // tokenize(). If those ever disagree, every ground-truth index is silently off and the whole
  // table is fiction. Fail loudly rather than report a wrong number.
  const rawCount = passage.text.split(/\s+/).filter(Boolean).length
  const tokCount = tokenize(passage.text).normalized.length
  if (rawCount !== tokCount) {
    throw new Error(`[${passage.id}] index mismatch: raw=${rawCount} tokenized=${tokCount}`)
  }

  const { spokenText, truth } = applyErrorScript(passage.text, passage.errorScript)

  const cleanPath = `${AUDIO_DIR}${passage.id}-clean.wav`
  const errorPath = `${AUDIO_DIR}${passage.id}-errors.wav`
  renderAudio(passage.text, cleanPath)
  renderAudio(spokenText, errorPath)

  const clean = readWav16kMono(cleanPath)
  const errored = readWav16kMono(errorPath)

  const cleanAsr = await transcribe(clean.audio, clean.durationSec)
  const errorAsr = await transcribe(errored.audio, errored.durationSec)

  const cleanScore = score(passage.text, cleanAsr, { grade: passage.grade })
  const errorScore = score(passage.text, errorAsr, { grade: passage.grade })

  // Hand-counted WCPM for the clean read: every word is correct by construction, so the true
  // value is totalWords / duration * 60. Any gap is the pipeline's error, not the reader's.
  const trueWcpm = Math.round((tokCount / clean.durationSec) * 60)

  for (const [k, v] of Object.entries(errorScore.suppressionCounts)) {
    suppressionTotals[k] = (suppressionTotals[k] ?? 0) + v
  }
  for (const [k, v] of Object.entries(errorScore.dialectRuleCounts)) {
    dialectRuleTotals[k] = (dialectRuleTotals[k] ?? 0) + v
  }

  results.push({
    id: passage.id,
    grade: passage.grade,
    totalWords: tokCount,
    stats: tally(truth, detectedMiscues(errorScore)),
    cleanFalsePositives: cleanScore.metrics.errors,
    cleanAccuracy: cleanScore.metrics.accuracyPct,
    wcpmReported: cleanScore.metrics.wcpm,
    wcpmTrue: trueWcpm,
    transcriptClean: cleanAsr.text,
  })

  console.log(
    `${passage.id.padEnd(8)} words=${String(tokCount).padStart(3)}  ` +
      `cleanFP=${cleanScore.metrics.errors}  wcpm=${cleanScore.metrics.wcpm}/${trueWcpm}`,
  )
}

// ---------------------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------------------
const agg = {}
for (const kind of KINDS) {
  const tp = results.reduce((s, r) => s + r.stats[kind].tp, 0)
  const fp = results.reduce((s, r) => s + r.stats[kind].fp, 0)
  const fn = results.reduce((s, r) => s + r.stats[kind].fn, 0)
  const precision = tp + fp === 0 ? null : tp / (tp + fp)
  const recall = tp + fn === 0 ? null : tp / (tp + fn)
  agg[kind] = {
    tp, fp, fn, precision, recall,
    f1: precision && recall ? (2 * precision * recall) / (precision + recall) : 0,
  }
}

const totalCleanWords = results.reduce((s, r) => s + r.totalWords, 0)
const totalCleanFP = results.reduce((s, r) => s + r.cleanFalsePositives, 0)
const fpRate = (totalCleanFP / totalCleanWords) * 100
const wcpmErrors = results.map((r) => Math.abs(r.wcpmReported - r.wcpmTrue))
const meanWcpmError = wcpmErrors.reduce((a, b) => a + b, 0) / wcpmErrors.length

const pct = (v) => (v === null ? 'n/a' : `${(v * 100).toFixed(1)}%`)

const lines = []
lines.push('## Miscue detection, by type\n')
lines.push('| Miscue type | Precision | Recall | F1 | TP | FP | FN |')
lines.push('|---|---|---|---|---|---|---|')
for (const kind of KINDS) {
  const a = agg[kind]
  lines.push(
    `| ${kind.replace('_', '-')} | ${pct(a.precision)} | ${pct(a.recall)} | ${pct(a.f1)} | ${a.tp} | ${a.fp} | ${a.fn} |`,
  )
}

lines.push('\n## The metric we optimised\n')
lines.push('| Metric | Value |')
lines.push('|---|---|')
lines.push(`| **False positive rate on clean reads** | **${fpRate.toFixed(2)}%** (${totalCleanFP} flags / ${totalCleanWords} words) |`)
lines.push(`| Mean absolute WCPM error | ${meanWcpmError.toFixed(1)} WCPM |`)
lines.push(`| Passages evaluated | ${results.length} |`)
lines.push(`| Planted miscues | ${PASSAGES.reduce((s, p) => s + p.errorScript.length, 0)} |`)

lines.push('\n## Suppression firing counts\n')
lines.push('Which filter forgave how many deviations. If the dialect row is zero, the dialect')
lines.push('layer is doing nothing on this data and we say so rather than implying otherwise.\n')
lines.push('| Filter | Fired |')
lines.push('|---|---|')
for (const k of ['dialect', 'homophone', 'fuzzy', 'phonetic', 'contraction']) {
  lines.push(`| ${k} | ${suppressionTotals[k] ?? 0} |`)
}
if (Object.keys(dialectRuleTotals).length) {
  lines.push('\n| Dialect rule | Fired |')
  lines.push('|---|---|')
  for (const [k, v] of Object.entries(dialectRuleTotals)) lines.push(`| ${k} | ${v} |`)
}

lines.push('\n## Per-passage\n')
lines.push('| Passage | Grade | Words | Clean FP | Clean accuracy | WCPM reported / true |')
lines.push('|---|---|---|---|---|---|')
for (const r of results) {
  lines.push(
    `| ${r.id} | ${r.grade} | ${r.totalWords} | ${r.cleanFalsePositives} | ${r.cleanAccuracy}% | ${r.wcpmReported} / ${r.wcpmTrue} |`,
  )
}

const report = lines.join('\n')
console.log(`\n${report}\n`)
writeFileSync(new URL('./results.md', import.meta.url), `${report}\n`)
writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify({ results, agg, suppressionTotals, dialectRuleTotals, fpRate, meanWcpmError }, null, 2))
console.log('wrote eval/results.md and eval/results.json')
