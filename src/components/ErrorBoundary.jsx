import { Component } from 'react'

/**
 * The last line of defence between a thrown exception and a white screen in front of judges.
 *
 * The scoring engine is written never to throw, and the test suite holds it to that. React
 * rendering is not covered by those tests: any new component that reads a field that turned out
 * to be null takes the entire tree down, and the failure mode is a blank page with no way back.
 *
 * A boundary does not fix the bug. It converts the worst possible presentation of the bug into
 * a recoverable one, which is the only thing that matters while a room is watching.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Kept in the console rather than shown: the recovery path is for the person demoing, the
    // stack trace is for the person debugging afterwards.
    console.error('[ReadAloud] render error', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="mx-auto mt-16 max-w-xl card text-center">
        <h1 className="font-display text-2xl font-semibold">Something went wrong on this screen</h1>
        <p className="mt-3" style={{ color: 'var(--ra-muted)' }}>
          The recording and the scoring are unaffected. Reloading returns to the start.
        </p>
        <button type="button" className="btn-primary mt-6" onClick={() => window.location.reload()}>
          Reload
        </button>
        <p className="mt-4 font-mono text-xs" style={{ color: 'var(--ra-muted)' }}>
          {String(this.state.error?.message ?? this.state.error)}
        </p>
      </div>
    )
  }
}
