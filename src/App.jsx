import { useEffect, useRef, useState } from 'react'
import { loadAudioFile } from './lib/audio.js'

/**
 * GATE 1 HARNESS -- temporary. Proves the whisper pipeline loads and transcribes in-browser
 * before any UI exists. Replaced by the real screens once this goes green.
 */
export default function App() {
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState({})
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const workerRef = useRef(null)

  useEffect(() => {
    const worker = new Worker(new URL('./lib/asrWorker.js', import.meta.url), { type: 'module' })
    workerRef.current = worker

    worker.onmessage = async (e) => {
      const m = e.data
      if (m.type === 'progress') {
        setProgress((p) => ({ ...p, [m.file]: Math.round(m.progress) }))
      } else if (m.type === 'ready') {
        console.log(`[GATE1] model ready device=${m.device} model=${m.modelId} loadMs=${m.loadMs}`)
        setStatus('transcribing')
        const { audio, sampleRate, decodedSec } = await loadAudioFile('/demo/clean-read.wav')
        console.log(`[GATE1] decoded sampleRate=${sampleRate} sec=${decodedSec.toFixed(2)} samples=${audio.length}`)
        worker.postMessage({ type: 'transcribe', audio }, [audio.buffer])
      } else if (m.type === 'result') {
        console.log(`[GATE1] TRANSCRIPT (${m.asrMs}ms): ${m.text}`)
        console.log(`[GATE1] words=${m.words.length} firstWord=${JSON.stringify(m.words[0])}`)
        console.log(`[GATE1] hasTimestamps=${m.words[0]?.start !== undefined}`)
        setResult(m)
        setStatus('done')
      } else if (m.type === 'error') {
        console.error(`[GATE1] ERROR at ${m.stage}: ${m.message}`)
        setError(`${m.stage}: ${m.message}`)
        setStatus('error')
      }
    }

    worker.onerror = (e) => {
      console.error('[GATE1] WORKER ERROR', e.message)
      setError(`worker: ${e.message}`)
      setStatus('error')
    }

    setStatus('loading model')
    worker.postMessage({ type: 'load', device: 'wasm' })
    return () => worker.terminate()
  }, [])

  return (
    <main className="min-h-screen bg-mist text-ink font-sans p-10">
      <h1 className="font-display text-3xl mb-2">ReadAloud — Gate 1</h1>
      <p className="mb-6 text-ink/70">status: <strong>{status}</strong></p>

      {Object.entries(progress).map(([file, pct]) => (
        <div key={file} className="text-sm font-mono">{file}: {pct}%</div>
      ))}

      {error && <div className="alert-error mt-4 max-w-2xl">{error}</div>}

      {result && (
        <div className="card mt-6 max-w-3xl">
          <p className="text-xs uppercase tracking-wide text-ink/50 mb-2">
            transcript · {result.asrMs}ms · {result.words.length} words ·
            timestamps: {result.words[0]?.start !== undefined ? 'yes' : 'no'}
          </p>
          <p className="font-passage text-lg leading-relaxed">{result.text}</p>
        </div>
      )}
    </main>
  )
}
