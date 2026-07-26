/**
 * Copy onnxruntime-web's WASM runtime into public/ so it is served from our own origin.
 *
 * Runs automatically before dev and build. See the wasmPaths note in src/lib/asrWorker.js for
 * why this exists: without it the app silently fetches its WASM from cdn.jsdelivr.net, which
 * breaks the "nothing leaves the building / works offline" claim and adds a third domain a
 * school content filter can block.
 */
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const from = join(root, 'node_modules/@huggingface/transformers/dist')
const to = join(root, 'public')

mkdirSync(to, { recursive: true })
for (const f of ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']) {
  copyFileSync(join(from, f), join(to, f))
  console.log(`vendored ${f}`)
}
