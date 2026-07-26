/**
 * ASR worker. Runs the whisper pipeline off the main thread so the UI stays alive
 * (and the input meter keeps animating) while a 60s clip transcribes.
 *
 * Protocol, main thread posts:
 *   { type: 'load',       device?: 'wasm'|'webgpu', modelId?: string }
 *   { type: 'transcribe', audio: Float32Array (16kHz mono), durationSec, returnTimestamps? }
 * Worker posts back:
 *   { type: 'progress', file, progress, loaded, total }
 *   { type: 'ready',    device, modelId, loadMs }
 *   { type: 'result',   text, words: AsrWord[], durationSec, asrMs }
 *   { type: 'error',    message, stage }
 *
 * Every option this file uses comes from asrOptions.js, shared with the smoke test and the
 * eval harness. Do not inline options here. That divergence is what let a fatal bug sit
 * behind a green test suite.
 */
import { pipeline, env } from '@huggingface/transformers'
import { MODEL_ID, PER_DEVICE_CONFIG, transcribeOptions, toAsrResult } from './asrOptions.js'

// `?url` hands these to Vite as ASSETS rather than as modules: it fingerprints them, emits them
// into the build output, and gives us back a real same-origin URL that works identically in dev
// and in production.
//
// These live under src/ (copied there by scripts/vendor-ort.mjs on predev/prebuild) rather
// than being imported from node_modules or served from public/. Both of those were tried and
// both fail, see the header of scripts/vendor-ort.mjs for exactly how.
import ortWasmUrl from '../vendor/ort-wasm-simd-threaded.jsep.wasm?url'
import ortMjsUrl from '../vendor/ort-wasm-simd-threaded.jsep.mjs?url'

// transformers.js unconditionally points onnxruntime-web's WASM loader at
// https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/ during its own init, and
// does so BEFORE onnxruntime's "use the locally bundled asset" branch can run (that branch only
// fires when wasmPaths is unset). Vite emits the .wasm into our own output and it then goes
// unused, so the running app quietly depends on a third CDN nobody mentioned.
//
// That matters beyond tidiness: "nothing leaves the building, works offline" is a claim this
// project makes out loud about a tool handling children's voices. Pointing this back at our own
// origin makes the claim literally true and removes a domain a school filter is likely to block.
//
// ORT accepts either a string prefix or an explicit {mjs, wasm} pair; the pair is what lets us
// hand it Vite's fingerprinted asset URLs instead of a directory it would have to guess at.
env.backends.onnx.wasm.wasmPaths = { mjs: ortMjsUrl, wasm: ortWasmUrl }

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

  // WebGPU compiles shaders on first real inference (~2-4s). Burn that cost during load rather
  // than in front of a judge. One second of silence is enough to trigger it.
  if (device === 'webgpu') {
    await pipe(new Float32Array(16000), transcribeOptions({ returnTimestamps: false }))
  }
  return pipe
}

self.addEventListener('message', async (event) => {
  const msg = event.data

  try {
    if (msg.type === 'load') {
      const device = msg.device || 'wasm'
      const modelId = msg.modelId || MODEL_ID
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

      const t0 = performance.now()
      const out = await pipe(
        msg.audio,
        transcribeOptions({ returnTimestamps: msg.returnTimestamps !== false }),
      )
      const asrMs = Math.round(performance.now() - t0)

      self.postMessage({ type: 'result', ...toAsrResult(out, msg.durationSec), asrMs })
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
