/**
 * Gate 1, Node edition. Proves the whisper pipeline loads, downloads, and produces
 * word timestamps -- without needing a browser in the loop.
 *
 * The browser and Node paths share the same transformers.js pipeline and the same ONNX
 * weights, so this verifies the model repo, the option shape, and the output shape. It does
 * NOT verify getUserMedia, AudioContext resampling, or the IndexedDB cache -- those are
 * browser-only and get checked separately.
 *
 *   node eval/verifyAsr.mjs [path/to/audio.wav]
 */
import { pipeline } from '@huggingface/transformers'
import { readFileSync } from 'node:fs'

const MODEL_ID = 'onnx-community/whisper-base.en_timestamped'
const wavPath = process.argv[2] ?? 'public/demo/clean-read.wav'

/** Minimal 16-bit PCM WAV reader. The eval clips are all LEI16@16000 mono by construction. */
function readWav16kMono(path) {
  const buf = readFileSync(path)
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`${path} is not a RIFF/WAVE file`)
  }

  let pos = 12
  let fmt = null
  let dataOffset = null
  let dataLength = 0

  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4)
    const size = buf.readUInt32LE(pos + 4)
    if (id === 'fmt ') {
      fmt = {
        audioFormat: buf.readUInt16LE(pos + 8),
        channels: buf.readUInt16LE(pos + 10),
        sampleRate: buf.readUInt32LE(pos + 12),
        bitsPerSample: buf.readUInt16LE(pos + 22),
      }
    } else if (id === 'data') {
      dataOffset = pos + 8
      dataLength = size
    }
    pos += 8 + size + (size % 2) // chunks are word-aligned
  }

  if (!fmt || dataOffset === null) throw new Error('missing fmt or data chunk')
  if (fmt.bitsPerSample !== 16) throw new Error(`expected 16-bit PCM, got ${fmt.bitsPerSample}`)
  if (fmt.sampleRate !== 16000) throw new Error(`expected 16kHz, got ${fmt.sampleRate}Hz`)

  const sampleCount = Math.floor(dataLength / 2 / fmt.channels)
  const out = new Float32Array(sampleCount)
  for (let i = 0; i < sampleCount; i++) {
    // Take channel 0 only; divide by 32768 to land in [-1, 1).
    out[i] = buf.readInt16LE(dataOffset + i * 2 * fmt.channels) / 32768
  }
  return { audio: out, sampleRate: fmt.sampleRate, durationSec: sampleCount / fmt.sampleRate }
}

const { audio, sampleRate, durationSec } = readWav16kMono(wavPath)
console.log(`audio: ${wavPath}  ${sampleRate}Hz  ${durationSec.toFixed(2)}s  ${audio.length} samples`)

console.log(`loading ${MODEL_ID} ...`)
const tLoad = performance.now()
const asr = await pipeline('automatic-speech-recognition', MODEL_ID, { dtype: 'q8' })
console.log(`model ready in ${Math.round(performance.now() - tLoad)}ms`)

const tAsr = performance.now()
const out = await asr(audio, { return_timestamps: 'word', chunk_length_s: 30 })
const asrMs = Math.round(performance.now() - tAsr)

console.log(`\n--- transcript (${asrMs}ms, ${(asrMs / 1000 / durationSec).toFixed(2)}x realtime) ---`)
console.log(out.text)

console.log(`\n--- chunks ---`)
console.log(`count: ${out.chunks?.length ?? 0}`)
if (out.chunks?.length) {
  console.log('first 6 raw:', JSON.stringify(out.chunks.slice(0, 6)))
  const leading = out.chunks.filter((c) => c.text?.startsWith(' ')).length
  console.log(`leading-space chunks: ${leading}/${out.chunks.length}`)
  const timed = out.chunks.filter((c) => Array.isArray(c.timestamp) && c.timestamp[0] != null).length
  console.log(`chunks with timestamps: ${timed}/${out.chunks.length}`)
}
