import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deliberately close to bare. Both official transformers.js whisper examples run on a plain
// Vite 5 config, and the onnxruntime bundling failure that sank the sibling `myvoice` project
// was a transformers.js v2 problem that does not recur on v3.
//
// No COOP/COEP headers. Those are required only for WASM *multi-threading* via SharedArrayBuffer
// -- not for WebGPU and not for the single-threaded default. Setting them adds a
// Cross-Origin-Resource-Policy failure mode on any no-cors subresource for no gain. If
// single-threaded WASM turns out too slow, add them then and re-verify the model download.
export default defineConfig({
  plugins: [react()],

  // strictPort is load-bearing, not tidiness. transformers.js caches tens of MB of model weights
  // in IndexedDB, and IndexedDB is scoped per origin. If Vite silently falls back to the next
  // free port, the model re-downloads from scratch -- which on venue wifi is the difference
  // between a demo and an apology.
  //
  // 5174 rather than the Vite default 5173 because the sibling `myvoice` project owns 5173. The
  // exact number does not matter; that it never changes does. Do not "clean this up".
  server: { port: 5174, strictPort: true },

  // onnxruntime ships a Node backend pulling in `sharp` and `onnxruntime-node`. Neither is
  // reachable from browser code, but Vite's dep scanner tries to resolve them anyway.
  //
  // The WASM runtime itself is NOT handled here. It is copied into src/vendor/ by
  // scripts/vendor-ort.mjs and imported with `?url` -- see that file for why neither
  // node_modules nor public/ works.
  optimizeDeps: { exclude: ['onnxruntime-node', 'sharp'] },
})
