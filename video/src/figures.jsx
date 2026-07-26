import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion'
import { C } from './theme.js'

/**
 * A child at a desk, seen from behind and slightly to one side.
 *
 * Drawn as soft overlapping shapes rather than an outlined character. Everything breathes: the
 * shoulders rise and fall, the head tilts a little toward the page. A figure that holds
 * perfectly still reads as a diagram, not a person.
 */
export const ChildReading = ({ scale = 1, x = 50, y = 62, flip = false }) => {
  const f = useCurrentFrame()
  const breath = Math.sin(f / 42) * 1.1
  const tilt = Math.sin(f / 70) * 1.6
  const S = (v) => v * scale

  return (
    <div style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`,
      transform: `translate(-50%,-50%) ${flip ? 'scaleX(-1)' : ''}`,
    }}>
      {/* torso */}
      <div style={{
        position: 'absolute', left: S(-92), top: S(28) + breath,
        width: S(184), height: S(196), background: C.cloth,
        borderRadius: `${S(92)}px ${S(92)}px ${S(26)}px ${S(26)}px`,
        boxShadow: `inset ${S(-24)}px 0 ${S(46)}px ${C.clothDark}`,
      }} />
      {/* arm reaching toward the page */}
      <div style={{
        position: 'absolute', left: S(44), top: S(92) + breath,
        width: S(120), height: S(52), background: C.clothDark,
        borderRadius: S(30), transform: `rotate(${16 + tilt * 0.5}deg)`,
      }} />
      {/* neck */}
      <div style={{
        position: 'absolute', left: S(-22), top: S(2) + breath,
        width: S(44), height: S(44), background: C.skin, borderRadius: S(14),
      }} />
      {/* head */}
      <div style={{
        position: 'absolute', left: S(-58), top: S(-84) + breath,
        width: S(116), height: S(122), background: C.skin,
        borderRadius: '48% 48% 44% 44%',
        transform: `rotate(${8 + tilt}deg)`, transformOrigin: 'bottom center',
      }}>
        {/* hair, sitting over the crown and down the back */}
        <div style={{
          position: 'absolute', left: S(-8), top: S(-12),
          width: S(132), height: S(96), background: C.hair,
          borderRadius: '52% 52% 38% 38%',
        }} />
        <div style={{
          position: 'absolute', left: S(-14), top: S(28),
          width: S(46), height: S(84), background: C.hair, borderRadius: '40%',
        }} />
      </div>
    </div>
  )
}

/** The open book or page in front of the child, catching the light. */
export const Page = ({ x = 50, y = 84, w = 30, tilt = -3, glow = 1 }) => {
  const f = useCurrentFrame()
  const flutter = Math.sin(f / 130) * 0.5
  return (
    <div style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`, width: `${w}%`,
      transform: `translate(-50%,-50%) rotate(${tilt + flutter}deg) perspective(900px) rotateX(58deg)`,
      aspectRatio: '1.45', background: `linear-gradient(178deg, ${C.paper}, ${C.paperShade})`,
      borderRadius: 6, boxShadow: `0 ${18 * glow}px ${52 * glow}px rgba(90,66,40,.28), 0 0 ${60 * glow}px rgba(255,243,214,${0.34 * glow})`,
    }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute', left: '11%', right: `${11 + (i % 3) * 9}%`,
          top: `${17 + i * 10.5}%`, height: '3.4%',
          background: C.inkSoft, opacity: 0.19, borderRadius: 3,
        }} />
      ))}
    </div>
  )
}

/** The laptop, drawn simply so it never becomes the subject of the shot. */
export const Laptop = ({ x = 50, y = 66, w = 26, children }) => (
  <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: `${w}%`, transform: 'translate(-50%,-50%)' }}>
    <div style={{
      position: 'relative', aspectRatio: '1.6', background: '#2b3038',
      borderRadius: 10, padding: '2.2%',
      boxShadow: '0 26px 60px rgba(60,44,26,.34), inset 0 0 0 1px rgba(255,255,255,.08)',
    }}>
      <div style={{
        position: 'absolute', inset: '3.4%', background: C.paper,
        borderRadius: 5, overflow: 'hidden',
      }}>{children}</div>
    </div>
    <div style={{
      width: '124%', height: 12, marginLeft: '-12%', background: '#3a4048',
      borderRadius: '0 0 12px 12px', boxShadow: '0 14px 30px rgba(60,44,26,.3)',
    }} />
  </div>
)

/** A word rendering the way the product renders it, for the screen-inside-the-scene shots. */
export const Word = ({ children, state = 'ok', glyph, delay = 0 }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame: f - delay, fps, config: { damping: 200, mass: 0.5 } })
  const style = {
    ok:    { color: C.ink, background: 'transparent' },
    green: { color: C.green, background: 'rgba(78,143,95,.14)', textDecoration: 'underline dotted 2px' },
    red:   { color: C.red, background: 'rgba(192,88,76,.15)', textDecoration: 'underline solid 2px' },
    om:    { color: C.red, background: 'rgba(192,88,76,.15)', textDecoration: 'line-through 2px' },
    amber: { color: C.amber, background: 'rgba(201,138,46,.18)', textDecoration: 'underline wavy 1.5px' },
  }[state]
  return (
    <span style={{
      ...style, padding: '0 .16em', borderRadius: 3, position: 'relative',
      opacity: state === 'ok' ? 1 : s, display: 'inline-block',
      transform: `translateY(${(1 - s) * 6}px)`,
    }}>
      {children}
      {glyph && <sup style={{ fontSize: '.5em', fontWeight: 700, marginLeft: 1 }}>{glyph}</sup>}
    </span>
  )
}

/** Tally marks accumulating, four and a diagonal, the way a person actually counts. */
export const Tallies = ({ n = 12, x = 50, y = 50, delay = 0, per = 7 }) => {
  const f = useCurrentFrame()
  const shown = Math.max(0, Math.min(n, Math.floor((f - delay) / per)))
  return (
    <div style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)',
      display: 'flex', gap: 26, flexWrap: 'wrap', width: 520, justifyContent: 'center',
    }}>
      {Array.from({ length: Math.ceil(n / 5) }).map((_, g) => (
        <div key={g} style={{ position: 'relative', width: 62, height: 62 }}>
          {Array.from({ length: 5 }).map((_, i) => {
            const idx = g * 5 + i
            if (idx >= shown) return null
            const diag = i === 4
            return (
              <div key={i} style={{
                position: 'absolute', left: diag ? 2 : i * 13, top: diag ? 30 : 4,
                width: diag ? 58 : 3.5, height: diag ? 3.5 : 54,
                background: C.ink, opacity: 0.72, borderRadius: 2,
                transform: diag ? 'rotate(-22deg)' : `rotate(${(idx % 3) - 1}deg)`,
              }} />
            )
          })}
        </div>
      ))}
    </div>
  )
}
