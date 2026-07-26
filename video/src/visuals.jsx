import { interpolate, useCurrentFrame, random } from 'remotion'
import { C } from './theme.js'

/** Deterministic pseudo-random, seeded by index, so a re-render is identical. */
const r = (seed, i) => random(`${seed}-${i}`)

/**
 * Warm dawn sky. The gradient sits behind everything and drifts almost imperceptibly, because
 * a completely static background is the fastest way to make an illustrated frame look dead.
 */
export const Sky = ({ dusk = false, shift = 0 }) => {
  const f = useCurrentFrame()
  const drift = Math.sin(f / 220) * 1.5 + shift
  const top = dusk ? C.duskTop : C.skyTop
  const mid = dusk ? C.duskMid : C.skyMid
  const low = dusk ? C.duskLow : C.skyLow
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: `linear-gradient(${172 + drift}deg, ${top} 0%, ${mid} 46%, ${low} 100%)`,
    }} />
  )
}

/** A soft sun bloom. Pure radial gradient, no hard edge anywhere. */
export const Sun = ({ x = 74, y = 20, size = 40, o = 0.55 }) => (
  <div style={{
    position: 'absolute', left: `${x}%`, top: `${y}%`,
    width: `${size}vw`, height: `${size}vw`, transform: 'translate(-50%,-50%)',
    background: `radial-gradient(circle, ${C.sun} 0%, rgba(255,243,214,0.42) 26%, rgba(255,243,214,0) 68%)`,
    opacity: o, filter: 'blur(6px)',
  }} />
)

/**
 * Layered hills. Each band moves at its own rate, which is what produces depth. The shapes are
 * built from overlapping ellipses rather than polygons so no silhouette has a straight edge.
 */
export const Hills = ({ speed = 1 }) => {
  const f = useCurrentFrame()
  const bands = [
    { c: C.hillFar, y: 58, h: 26, amp: 3, rate: 0.14, blobs: 7 },
    { c: C.hillMid, y: 66, h: 28, amp: 5, rate: 0.26, blobs: 6 },
    { c: C.hillNear, y: 75, h: 30, amp: 7, rate: 0.42, blobs: 5 },
    { c: C.hillDark, y: 85, h: 30, amp: 9, rate: 0.62, blobs: 4 },
  ]
  return (
    <>
      {bands.map((b, bi) => (
        <div key={bi} style={{
          position: 'absolute', left: 0, right: 0, top: `${b.y}%`, height: `${b.h}%`,
          transform: `translateX(${-f * b.rate * speed * 0.12}px)`,
        }}>
          <div style={{ position: 'absolute', inset: 0, background: b.c, borderRadius: '50% 50% 0 0 / 14% 14% 0 0' }} />
          {Array.from({ length: b.blobs }).map((_, i) => {
            const w = 22 + r(`w${bi}`, i) * 30
            return (
              <div key={i} style={{
                position: 'absolute',
                left: `${(i / b.blobs) * 118 - 9 + r(`x${bi}`, i) * 8}%`,
                top: `${-b.amp - r(`t${bi}`, i) * b.amp}%`,
                width: `${w}%`, height: `${b.amp * 2.6 + r(`h${bi}`, i) * 8}%`,
                background: b.c, borderRadius: '50%',
              }} />
            )
          })}
        </div>
      ))}
    </>
  )
}

/** Slanted volumetric light through a window. The signature warm shaft. */
export const LightShaft = ({ x = 30, w = 16, angle = 14, o = 0.3 }) => {
  const f = useCurrentFrame()
  const breathe = 0.86 + Math.sin(f / 95) * 0.14
  return (
    <div style={{
      position: 'absolute', left: `${x}%`, top: '-24%', width: `${w}%`, height: '150%',
      transform: `rotate(${angle}deg)`, transformOrigin: 'top center',
      background: `linear-gradient(to bottom, rgba(255,243,214,${o * breathe}) 0%, rgba(255,243,214,${o * 0.5 * breathe}) 46%, rgba(255,243,214,0) 88%)`,
      filter: 'blur(22px)', mixBlendMode: 'screen',
    }} />
  )
}

/** Dust motes drifting in the light. Slow, uneven, never in a grid. */
export const Dust = ({ count = 46, seed = 'd', tint = C.sun }) => {
  const f = useCurrentFrame()
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const bx = r(`${seed}x`, i) * 100
        const by = r(`${seed}y`, i) * 100
        const sp = 0.1 + r(`${seed}s`, i) * 0.32
        const sway = Math.sin(f / (56 + r(`${seed}w`, i) * 90) + i) * (7 + r(`${seed}a`, i) * 16)
        const y = (by - f * sp * 0.055 + 130) % 130 - 15
        const size = 1.6 + r(`${seed}z`, i) * 4.4
        const o = 0.14 + r(`${seed}o`, i) * 0.5
        return (
          <div key={i} style={{
            position: 'absolute', left: `${bx}%`, top: `${y}%`,
            width: size, height: size, borderRadius: '50%',
            background: tint, opacity: o,
            boxShadow: `0 0 ${size * 3}px ${tint}`,
          }} />
        )
      })}
    </>
  )
}

/** Film grain and vignette. Both are what stop CSS gradients looking like CSS gradients. */
export const Grain = ({ amount = 0.045 }) => {
  const f = useCurrentFrame()
  return (
    <div style={{
      position: 'absolute', inset: '-6%', opacity: amount, pointerEvents: 'none',
      transform: `translate(${(f % 4) * 3 - 4}px, ${(f % 3) * 3 - 3}px)`,
      backgroundImage:
        `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E")`,
    }} />
  )
}

export const Vignette = ({ strength = 0.5 }) => (
  <div style={{
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: `radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 42%, rgba(30,22,14,${strength}) 100%)`,
  }} />
)

/** Paper warmth laid over everything, so the whole frame shares one light. */
export const WarmWash = ({ o = 0.16 }) => (
  <div style={{
    position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'soft-light',
    background: `linear-gradient(160deg, ${C.sun} 0%, rgba(255,243,214,0) 58%)`, opacity: o,
  }} />
)

/** Narration caption. Small, warm, never competing with the picture. */
export const Caption = ({ children, frame, dur, dark = false }) => {
  const inO = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' })
  const outO = interpolate(frame, [dur - 16, dur - 2], [1, 0], { extrapolateLeft: 'clamp' })
  const rise = interpolate(frame, [0, 20], [12, 0], { extrapolateRight: 'clamp' })
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: '7.5%', textAlign: 'center',
      opacity: Math.min(inO, outO), transform: `translateY(${rise}px)`, padding: '0 12%',
    }}>
      <span style={{
        fontFamily: 'Georgia, serif', fontSize: 30, lineHeight: 1.42,
        color: dark ? 'rgba(247,241,228,.93)' : 'rgba(58,49,40,.92)',
        textShadow: dark ? '0 2px 18px rgba(0,0,0,.5)' : '0 1px 12px rgba(255,243,214,.7)',
      }}>{children}</span>
    </div>
  )
}
