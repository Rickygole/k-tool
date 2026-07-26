/**
 * End-to-end smoke test of the REAL ASR path.
 *
 * This exists because a fatal bug shipped behind a green test suite: the worker passed
 * `language: 'en'` to an English-only checkpoint, transformers.js threw on every call, and
 * nothing caught it, because the unit tests never touch the model and the eval harness used
 * its own hand-written options rather than the worker's.
 *
 * So this imports the exact same options module the worker imports, and asserts on real model
 * output. If it passes, the shipping transcription path works. Run it before every demo.
 *
 *   npm run smoke
 */
import { readFileSync } from 'node:fs'
import { pipeline } from '@huggingface/transformers'
import { MODEL_ID, transcribeOptions, toAsrResult } from '../src/lib/asrOptions.js'
import { score } from '../src/lib/score.js'

const WAV = process.argv[2] ?? new URL('../public/demo/clean-read.wav', import.meta.url).pathname
const EXPECTED_PASSAGE =
  'The little fox lived at the edge of the woods. Every morning she went down to the stream to drink. ' +
  'One day she found a shiny stone in the water. It was smooth and cold and it sparkled in the sun.'

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

const failures = []
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  -- ${detail}` : ''}`)
  if (!ok) failures.push(label)
}

const { audio, durationSec } = readWav16kMono(WAV)
console.log(`audio ${WAV}  ${durationSec.toFixed(2)}s\nloading ${MODEL_ID} ...\n`)

const asr = await pipeline('automatic-speech-recognition', MODEL_ID, { dtype: 'q8' })

// The exact call the worker makes. If the options are wrong, this throws here.
const raw = await asr(audio, transcribeOptions())
const result = toAsrResult(raw, durationSec)

check('transcription returns non-empty text', result.text.length > 0, `${result.text.length} chars`)
check('word list is populated', result.words.length > 20, `${result.words.length} words`)
check('word timestamps present', result.words[0]?.start !== undefined)
check(
  'no leading spaces survived the trim',
  result.words.every((w) => !w.word.startsWith(' ')),
)
check(
  'first word of the passage was not swallowed',
  result.words[0]?.word.toLowerCase().replace(/[^a-z]/g, '') === 'the',
  `got "${result.words[0]?.word}"`,
)

const scored = score(EXPECTED_PASSAGE, result, { grade: 2 })
check(
  'a clean read scores >= 95% accuracy (independent level)',
  scored.metrics.accuracyPct >= 95,
  `${scored.metrics.accuracyPct}%, ${scored.metrics.errors} errors`,
)
check('wcpm is a finite, sane number', Number.isFinite(scored.metrics.wcpm) && scored.metrics.wcpm > 0 && scored.metrics.wcpm < 400, `${scored.metrics.wcpm}`)
check('self-correction rate never renders as Infinity', scored.metrics.selfCorrectionDisplay !== 'Infinity', scored.metrics.selfCorrectionDisplay)

console.log(`\ntranscript: ${result.text}`)
console.log(`\n${failures.length === 0 ? 'SMOKE TEST PASSED' : `SMOKE TEST FAILED: ${failures.join(', ')}`}`)

// onnxruntime-node aborts during native teardown ("mutex lock failed") after the script is
// otherwise finished, which turns a passing run into exit 134. Flush stdout, then leave via
// the exit event so the abort cannot overwrite our status code.
process.exitCode = failures.length === 0 ? 0 : 1
process.on('exit', (code) => process.reallyExit(code))
