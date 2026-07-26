/**
 * The ASR call options, in ONE place.
 *
 * This module exists because of a bug that shipped green. The worker passed `language: 'en'`
 * to an English-only whisper checkpoint, which transformers.js rejects outright:
 *
 *   "Cannot specify `task` or `language` for an English-only model."
 *
 * Every transcription in the running app threw. The 27-test suite stayed green and the eval
 * harness produced a respectable table the whole time, because the harness called the pipeline
 * with its OWN hand-written options and never went near the worker's. Two code paths, one of
 * them unexercised, and the unexercised one was the one that runs in front of the judges.
 *
 * So: the worker, the smoke test, and the eval harness all import from here. If these options
 * are wrong now, everything fails at once and loudly, which is the only safe way to be wrong.
 */

/** Model repo. English-only + exports alignment heads, so word timestamps work. 77MB at q8. */
export const MODEL_ID = 'onnx-community/whisper-base.en_timestamped'

/** Wifi-hostile fallback. Noticeably worse, but 41MB and it runs anywhere. */
export const FALLBACK_MODEL_ID = 'onnx-community/whisper-tiny.en_timestamped'

/**
 * Per-module dtype. A flat 'fp32' costs ~291MB of cold download for no speed gain; this split
 * is what HF's own whisper-word-timestamps example ships. Never set fp16 on the encoder --
 * it is broken upstream (transformers.js#894).
 */
export const PER_DEVICE_CONFIG = {
  webgpu: { device: 'webgpu', dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' } },
  wasm: { device: 'wasm', dtype: 'q8' },
}

/**
 * Generation options.
 *
 * NO `language` and NO `task`. See above. Adding either one breaks the entire product.
 * `stride_length_s` is also deliberately absent: it defaults to chunk_length_s / 6 = 5, and
 * passing both risks the `chunk_length_s > stride_length_s` throw for no benefit.
 */
export function transcribeOptions({ returnTimestamps = true } = {}) {
  return {
    return_timestamps: returnTimestamps ? 'word' : false,
    chunk_length_s: 30,
  }
}

/**
 * Normalise whisper output into the AsrResult word list the scorer expects.
 *
 * Every chunk.text comes back with a LEADING SPACE (" And", " so", ...). Failing to trim it
 * makes every token mismatch during alignment, which presents as a scorer that thinks a
 * perfect read is 100% errors.
 */
export function toAsrResult(out, durationSec) {
  const text = (out?.text ?? '').trim()

  if (Array.isArray(out?.chunks) && out.chunks.length > 0) {
    const words = out.chunks
      .map((c) => ({
        word: (c.text ?? '').trim(),
        start: Array.isArray(c.timestamp) ? c.timestamp[0] : undefined,
        end: Array.isArray(c.timestamp) ? c.timestamp[1] : undefined,
      }))
      .filter((w) => w.word.length > 0)
    return { text, words, durationSec }
  }

  // No chunks. Either timestamps were off or the ONNX export lacks alignment heads.
  // Callers interpolate from durationSec. ADR-4: this costs polish, not product.
  return {
    text,
    words: text.split(/\s+/).filter(Boolean).map((word) => ({ word })),
    durationSec,
  }
}
