/**
 * Audio capture + decode. Whisper wants 16kHz mono Float32; MediaRecorder gives webm/opus
 * at whatever rate the device felt like. This module is the bridge.
 */

const TARGET_SAMPLE_RATE = 16000

/**
 * Decode any audio blob/arraybuffer to a 16kHz mono Float32Array.
 *
 * Chrome honours the requested sampleRate on the AudioContext and resamples during decode.
 * We assert it anyway and shout on mismatch: a silent resample failure produces a transcript
 * that reads like a child speaking in tongues, and you will waste an hour blaming the model.
 *
 * @param {Blob|ArrayBuffer} source
 * @returns {Promise<{audio: Float32Array, sampleRate: number, decodedSec: number}>}
 */
export async function decodeTo16kMono(source) {
  const arrayBuf = source instanceof Blob ? await source.arrayBuffer() : source

  const ctx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE })
  try {
    const decoded = await ctx.decodeAudioData(arrayBuf)

    if (decoded.sampleRate !== TARGET_SAMPLE_RATE) {
      console.error(
        `[audio] RESAMPLE FAILED: got ${decoded.sampleRate}Hz, expected ${TARGET_SAMPLE_RATE}Hz. ` +
          `Transcription will be garbage. This is an audio bug, not a model bug.`,
      )
    }

    // Mono. If the source is stereo we take channel 0 rather than mixing -- the capture path
    // requests channelCount: 1 anyway, so a second channel here means a file, not a mic.
    return {
      audio: decoded.getChannelData(0),
      sampleRate: decoded.sampleRate,
      decodedSec: decoded.duration,
    }
  } finally {
    // AudioContexts are a finite resource; Chrome caps them per page and a leaked one here
    // means the recorder silently fails to start on the fourth or fifth read of a session.
    ctx.close()
  }
}

/** Fetch a bundled audio file (demo mode, eval harness) and decode it. */
export async function loadAudioFile(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not load audio: ${url} (${res.status})`)
  return decodeTo16kMono(await res.arrayBuffer())
}

/**
 * Microphone recorder.
 *
 * Noise suppression stays ON. Purists will tell you it distorts the signal for ASR; they are
 * not demoing in a hall full of people.
 *
 * Duration comes from performance.now() around start/stop, NOT from the decoded buffer --
 * trailing silence inflates the buffer length and deflates WCPM.
 */
export function createRecorder() {
  let stream = null
  let recorder = null
  let chunks = []
  let startedAt = 0
  let stoppedAt = 0
  let analyser = null
  let meterCtx = null

  return {
    async start() {
      // Reentrancy guard. A double-click on Record used to leak the previous MediaStream --
      // leaving the browser's mic indicator lit, which is very visible on a projector -- and
      // the previous meter AudioContext, and Chrome caps AudioContexts per page, so a few
      // repeated reads in one session would stop the recorder working at all.
      if (recorder) return

      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      })

      // Live input level, so the reader can see the mic is alive. A dead mic during a judge
      // demo is a slow, silent catastrophe -- this is the cheapest possible insurance.
      meterCtx = new AudioContext()
      analyser = meterCtx.createAnalyser()
      analyser.fftSize = 512
      meterCtx.createMediaStreamSource(stream).connect(analyser)

      chunks = []
      recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      recorder.start()
      startedAt = performance.now()
    },

    /** RMS input level 0..1, for the meter. Cheap enough to call every animation frame. */
    level() {
      if (!analyser) return 0
      const buf = new Uint8Array(analyser.fftSize)
      analyser.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128
        sum += v * v
      }
      // sqrt of mean square, then a gentle boost -- speech RMS sits low and an honest meter
      // looks broken.
      return Math.min(1, Math.sqrt(sum / buf.length) * 3)
    },

    async stop() {
      // Returns null rather than throwing on a second call. MediaRecorder.stop() on an
      // already-inactive recorder raises InvalidStateError, and a double-tapped stop button is
      // an ordinary thing for a person to do -- it should not surface as an exception the UI
      // has to catch.
      if (!recorder) return null

      const active = recorder
      recorder = null // claim it first, so a concurrent stop() cannot re-enter

      const blob = await new Promise((resolve) => {
        active.onstop = () => resolve(new Blob(chunks, { type: active.mimeType }))
        active.stop()
        stoppedAt = performance.now()
      })

      stream?.getTracks().forEach((t) => t.stop())
      if (meterCtx) meterCtx.close()
      stream = null
      analyser = null
      meterCtx = null

      return { blob, durationSec: (stoppedAt - startedAt) / 1000 }
    },

    /** True while a recording is in progress. Lets the UI disable its own buttons honestly. */
    isRecording() {
      return recorder !== null
    },

    elapsedSec() {
      return startedAt ? (performance.now() - startedAt) / 1000 : 0
    },
  }
}
