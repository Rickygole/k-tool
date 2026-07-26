/**
 * ASR worker. Runs the whisper pipeline off the main thread so the UI stays alive
 * (and the input meter keeps animating) while a 60s clip transcribes.
 *
 * Protocol -- main thread posts:
 *   { type: 'load',       device?: 'wasm'|'webgpu', modelId?: string }
 *   { type: 'transcribe', audio: Float32Array (16kHz mono), returnTimestamps?: boolean }
 * Worker posts back:
 *   { type: 'progress', file, progress, loaded, total }
 *   { type: 'ready',    device, modelId, loadMs }
 *   { type: 'result',   text, words: AsrWord[], asrMs }
 *   { type: 'error',    message, stage }
 */
import { pipeline } from '@huggingface/transformers'

// Per-module dtype, not a flat string. A flat `fp32` costs ~291MB of cold download for zero
// speed gain; this split is what HF's own whisper-word-timestamps example ships.
// Never set fp16 on the encoder -- it is broken upstream (transformers.js#894).
const PER_DEVICE_CONFIG = {
  webgpu: { device: 'webgpu', dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' } },
  wasm: { device: 'wasm', dtype: 'q8' },
}

// English-only + timestamp-capable. 77MB at q8. `tiny.en_timestamped` (41MB) is the
// wifi-hostile fallback; swap MODEL_ID via the 'load' message rather than editing this.
const DEFAULT_MODEL_ID = 'onnx-community/whisper-base.en_timestamped'

let pipe = null
let loadedWith = null

async function getPipeline(device, modelId, onProgress) {
  const key = `${device}:${modelId}`
  if (pipe && loadedWith === key) return pipe

  pipe = await pipeline('automatic-speech-recognition', modelId, {
    ...PER_DEVICE_CONFIG[device],
    progress_callback: onProgress,
  })
  loadedWith = key

  // WebGPU compiles shaders on first real inference (~2-4s). Burn that cost during load
  // rather than in front of a judge. One second of silence is enough to trigger it.
  if (device === 'webgpu') {
    await pipe(new Float32Array(16000), { language: 'en' })
  }
  return pipe
}

self.addEventListener('message', async (event) => {
  const msg = event.data

  try {
    if (msg.type === 'load') {
      const device = msg.device || 'wasm'
      const modelId = msg.modelId || DEFAULT_MODEL_ID
      const t0 = performance.now()
      await getPipeline(device, modelId, (p) => {
        if (p.status === 'progress') {
          self.postMessage({
            type: 'progress',
            file: p.file,
            progress: p.progress ?? 0,
            loaded: p.loaded ?? 0,
            total: p.total ?? 0,
          })
        }
      })
      self.postMessage({ type: 'ready', device, modelId, loadMs: Math.round(performance.now() - t0) })
      return
    }

    if (msg.type === 'transcribe') {
      if (!pipe) throw new Error('transcribe called before load')
      const returnTimestamps = msg.returnTimestamps !== false

      const t0 = performance.now()
      // stride_length_s is deliberately omitted -- it defaults to chunk_length_s / 6 = 5,
      // and passing both risks the `chunk_length_s > stride_length_s` throw for no benefit.
      const out = await pipe(msg.audio, {
        language: 'en',
        return_timestamps: returnTimestamps ? 'word' : false,
        chunk_length_s: 30,
      })
      const asrMs = Math.round(performance.now() - t0)

      self.postMessage({ type: 'result', ...toAsrResult(out), asrMs })
      return
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      stage: msg?.type ?? 'unknown',
      message: err?.message ?? String(err),
    })
  }
})

/**
 * Normalise whisper output into the AsrResult word list the scorer expects.
 *
 * Every chunk.text comes back with a LEADING SPACE (" And", " so", ...). Failing to trim it
 * makes every single token mismatch during alignment, which presents as a scorer that thinks
 * a perfect read is 100% errors. This trim is the whole reason this function exists.
 */
function toAsrResult(out) {
  const text = (out?.text ?? '').trim()

  if (Array.isArray(out?.chunks) && out.chunks.length > 0) {
    const words = out.chunks
      .map((c) => ({
        word: (c.text ?? '').trim(),
        start: Array.isArray(c.timestamp) ? c.timestamp[0] : undefined,
        end: Array.isArray(c.timestamp) ? c.timestamp[1] : undefined,
      }))
      .filter((w) => w.word.length > 0)
    return { text, words }
  }

  // No chunks -- either return_timestamps was off or the ONNX export lacks alignment heads.
  // Callers interpolate timestamps from durationSec. ADR-4: this costs polish, not product.
  return {
    text,
    words: text
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => ({ word })),
  }
}
