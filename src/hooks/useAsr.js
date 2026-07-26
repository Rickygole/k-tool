/**
 * The app's single connection to the ASR worker.
 *
 * MODULE-LEVEL SINGLETON, ON PURPOSE. The obvious shape is a `useEffect` that creates a worker
 * on mount and terminates it on unmount, and it is wrong here for two reasons:
 *
 *   - React StrictMode mounts every effect twice in development. With a per-component worker
 *     that means two whisper pipelines racing to download the same 77MB of weights on a cold
 *     IndexedDB cache. You would notice this exactly once, on venue wifi, at the worst moment.
 *   - The model should start loading the instant the app opens and stay loaded while the
 *     teacher picks a student and a passage. Tying its lifetime to a screen throws that away.
 *
 * So: one worker for the page lifetime, state published through `useSyncExternalStore` so any
 * component can watch the download without prop-drilling.
 */
import { useSyncExternalStore } from 'react'

/**
 * @typedef {Object} AsrState
 * @property {'idle'|'loading'|'ready'|'error'} status
 * @property {'webgpu'|'wasm'|null} device
 * @property {string|null} modelId
 * @property {Record<string, {progress:number, loaded:number, total:number}>} progress
 * @property {number|null} loadMs
 * @property {string|null} error
 */

/** @type {AsrState} */
let snapshot = {
  status: 'idle',
  device: null,
  modelId: null,
  progress: {},
  loadMs: null,
  error: null,
}

const listeners = new Set()
let worker = null
let pending = null
let readyWaiters = []
let triedWasmFallback = false

function publish(patch) {
  snapshot = { ...snapshot, ...patch }
  for (const l of listeners) l()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return snapshot
}

function settleReadyWaiters(err) {
  const waiters = readyWaiters
  readyWaiters = []
  for (const w of waiters) (err ? w.reject(err) : w.resolve())
}

function handleMessage(msg) {
  switch (msg.type) {
    case 'progress':
      publish({
        progress: {
          ...snapshot.progress,
          [msg.file]: { progress: msg.progress ?? 0, loaded: msg.loaded ?? 0, total: msg.total ?? 0 },
        },
      })
      return

    case 'ready':
      publish({ status: 'ready', device: msg.device, modelId: msg.modelId, loadMs: msg.loadMs, error: null })
      settleReadyWaiters(null)
      return

    case 'result': {
      const p = pending
      pending = null
      p?.resolve({ text: msg.text, words: msg.words, durationSec: msg.durationSec, asrMs: msg.asrMs })
      return
    }

    case 'error': {
      // WebGPU is the fast path and also the flaky one, driver blocklists, Linux, older
      // Chrome. One silent retry on WASM is the difference between a slower demo and no demo.
      if (msg.stage === 'load' && snapshot.device === 'webgpu' && !triedWasmFallback) {
        triedWasmFallback = true
        console.warn(`[asr] WebGPU load failed (${msg.message}); falling back to WASM.`)
        // `error: null` matters. Without it the WebGPU message stays in the snapshot, and the
        // banner keeps reading "Speech model failed to load" for the whole WASM load and beyond
        //, reporting a failure to the teacher while the fallback is quietly succeeding.
        publish({ status: 'loading', device: 'wasm', progress: {}, error: null })
        worker.postMessage({ type: 'load', device: 'wasm' })
        return
      }

      const err = new Error(msg.message)
      if (msg.stage === 'transcribe' && pending) {
        const p = pending
        pending = null
        p.reject(err)
        return
      }
      publish({ status: 'error', error: msg.message })
      settleReadyWaiters(err)
      return
    }

    default:
      return
  }
}

/** Start loading the model. Idempotent, safe to call from every mount. */
export function startModelLoad() {
  if (worker) return

  worker = new Worker(new URL('../lib/asrWorker.js', import.meta.url), { type: 'module' })
  worker.onmessage = (e) => handleMessage(e.data)
  worker.onerror = (e) => {
    const message = e.message || 'worker failed to start'
    publish({ status: 'error', error: message })
    const err = new Error(message)
    settleReadyWaiters(err)
    if (pending) {
      const p = pending
      pending = null
      p.reject(err)
    }
  }

  // WASM FIRST, DELIBERATELY. This looks like leaving performance on the table and is the
  // opposite.
  //
  // Measured on transformers.js v3 with this model, 60s of audio on an M2: WASM 4.9-5.9s versus
  // WebGPU 9.5-9.6s. WebGPU is roughly twice as SLOW here. The v4 runtime rewrite is where it
  // gets faster, and v4 has an open Whisper regression we are not shipping into. WebGPU also
  // carries a documented memory-leak history across repeated inferences, which is exactly what a
  // session of back-to-back reads does.
  //
  // And `navigator.gpu` existing does not mean a GPU adapter can be acquired, headless, VMs,
  // driver blocklists and locked-down school machines all expose the API and then fail at
  // adapter request, after which the fallback has to unwind a half-initialised backend. Starting
  // on the path that is both faster and more reliable removes that failure mode entirely.
  //
  // Opt in with `?device=webgpu` if you want to benchmark it on a specific machine.
  const forced = new URLSearchParams(globalThis.location?.search ?? '').get('device')
  const device = forced === 'webgpu' ? 'webgpu' : 'wasm'
  publish({ status: 'loading', device, progress: {}, error: null })
  worker.postMessage({ type: 'load', device })
}

/** Resolves when the model is loaded; rejects if loading has failed for good. */
export function whenModelReady() {
  if (snapshot.status === 'ready') return Promise.resolve()
  if (snapshot.status === 'error') return Promise.reject(new Error(snapshot.error ?? 'model failed to load'))
  startModelLoad()
  return new Promise((resolve, reject) => readyWaiters.push({ resolve, reject }))
}

/**
 * Transcribe 16kHz mono audio. The buffer is transferred, not copied, do not touch the
 * Float32Array after calling this, it is detached.
 *
 * `durationSec` is passed through the worker and echoed back on the result rather than being
 * derived from the sample count. Trailing silence inflates the buffer and would deflate WCPM,
 * so the authoritative duration is the wall-clock one the recorder measured.
 *
 * @param {Float32Array} audio
 * @param {number} durationSec
 * @returns {Promise<{text:string, words:{word:string,start?:number,end?:number}[], durationSec:number, asrMs:number}>}
 */
export function transcribe(audio, durationSec) {
  if (!worker) return Promise.reject(new Error('ASR worker has not been started'))
  if (pending) return Promise.reject(new Error('A transcription is already in progress'))
  return new Promise((resolve, reject) => {
    pending = { resolve, reject }
    worker.postMessage({ type: 'transcribe', audio, durationSec }, [audio.buffer])
  })
}

/** Subscribe a component to model-load state. */
export function useAsrState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Overall download percentage across every file the pipeline is fetching.
 *
 * Averaging the per-file percentages would be a lie. The tokenizer JSON is a few KB and the
 * decoder weights are tens of MB, and weighting them equally makes the bar sprint to 50% and
 * then stop dead. Weight by bytes.
 */
export function overallProgress(progress) {
  const files = Object.values(progress)
  if (files.length === 0) return 0
  const total = files.reduce((s, f) => s + (f.total || 0), 0)
  if (total > 0) {
    const loaded = files.reduce((s, f) => s + (f.loaded || 0), 0)
    return Math.min(100, Math.round((loaded / total) * 100))
  }
  return Math.round(files.reduce((s, f) => s + f.progress, 0) / files.length)
}
