import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// onnxruntime's WASM runtime, aliased so it can be imported with `?url`.
//
// Three approaches were tried before this one, and the first two are traps:
//   1. Copy into public/ and point wasmPaths at '/'. Fails -- onnxruntime loads its glue file
//      with a dynamic import(), and Vite refuses to serve public/ through the module pipeline
//      ("This file is in /public ... should not be imported from source code").
//   2. `import '@huggingface/transformers/dist/ort-...wasm?url'`. Fails -- the package's
//      `exports` map has no subpath entry, so the deep import is blocked at resolution.
//   3. Alias the real file paths. Works: Vite fingerprints them, emits them into the build,
//      and hands back same-origin URLs valid in both dev and production.
const ortAsset = (f) =>
  fileURLToPath(new URL(`./node_modules/@huggingface/transformers/dist/${f}`, import.meta.url))

// Deliberately bare. Both official transformers.js whisper examples run on a plain Vite 5
// config -- no optimizeDeps.exclude for the library itself, no wasm path config, no
// env.allowLocalModels. The onnxruntime-web bundling failure that sank the sibling `myvoice`
// project was a transformers.js v2 problem and does not recur on v3.
//
// No COOP/COEP headers either. Those are required only for WASM *multi-threading* via
// SharedArrayBuffer -- not for WebGPU and not for the single-threaded default. Setting them
// adds a Cross-Origin-Resource-Policy failure mode on any no-cors subresource for no gain.
// If single-threaded WASM turns out too slow, add them then and re-verify the model download.
export default defineConfig({
  plugins: [react()],

  // Array form with regexes, not the object form. The imports carry a `?url` suffix, and object
  // aliases are matched against the whole specifier including the query -- so `ort-wasm-binary`
  // never matches `ort-wasm-binary?url`. A prefix regex rewrites the path and leaves the query
  // attached, which is what makes `?url` still apply.
  resolve: {
    alias: [
      { find: /^ort-wasm-binary/, replacement: ortAsset('ort-wasm-simd-threaded.jsep.wasm') },
      { find: /^ort-wasm-glue/, replacement: ortAsset('ort-wasm-simd-threaded.jsep.mjs') },
    ],
  },

  // strictPort is load-bearing, not tidiness. transformers.js caches tens of MB of model
  // weights in IndexedDB, and IndexedDB is scoped per origin. If Vite silently falls back to
  // the next free port, the model re-downloads from scratch -- which on venue wifi is the
  // difference between a demo and an apology.
  //
  // 5174 rather than the Vite default 5173 because the sibling `myvoice` project owns 5173.
  // The exact number does not matter; that it never changes does. Do not "clean this up".
  server: { port: 5174, strictPort: true },

  // onnxruntime ships a Node backend pulling in `sharp` and `onnxruntime-node`. Neither is
  // reachable from browser code, but Vite's dep scanner tries to resolve them anyway.
  optimizeDeps: { exclude: ['onnxruntime-node', 'sharp'] },
})
