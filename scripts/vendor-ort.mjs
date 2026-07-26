/**
 * Copy onnxruntime-web's WASM runtime into src/vendor/ so Vite treats it as project source.
 *
 * Runs on predev/prebuild. Why it must live under src/ rather than node_modules or public/:
 *
 *   - node_modules: Vite's dependency pre-bundler claims the .mjs and rewrites the import to
 *     /node_modules/.vite/deps/ort-wasm-glue?url.js, a path it never emits. The worker then
 *     dies with "worker failed to start". optimizeDeps.exclude does not help, because the
 *     alias resolves to a real node_modules path and the scanner works on resolved ids.
 *   - public/: Vite refuses to serve public/ files through the module pipeline, and
 *     onnxruntime loads its glue with a dynamic import(). "This file is in /public ... should
 *     not be imported from source code."
 *
 * Under src/, `?url` does exactly what it says: emit as an asset, hand back a same-origin URL.
 * The files are gitignored -- they are build inputs, reproducible from the lockfile.
 */
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const from = join(root, 'node_modules/@huggingface/transformers/dist')
const to = join(root, 'src/vendor')

mkdirSync(to, { recursive: true })
for (const f of ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']) {
  copyFileSync(join(from, f), join(to, f))
  console.log(`vendored ${f}`)
}
