import { AbsoluteFill, Audio, Sequence, staticFile, interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion'
import { C, TIMELINE, TOTAL } from './theme.js'
import { Sky, Sun, Hills, LightShaft, Dust, Grain, Vignette, WarmWash, Caption } from './visuals.jsx'
import { ChildReading, Page, Laptop, Word, Tallies } from './figures.jsx'

const T = Object.fromEntries(TIMELINE.map((t) => [t.id, t]))

/** Every scene sits on the same base: sky, sun, hills, light, dust, grain, vignette. */
const Stage = ({ children, dusk = false, sun = true, hills = true, shaftX = 26, dustCount = 44, vig = 0.5 }) => (
  <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: dusk ? C.duskTop : C.skyMid }}>
    <Sky dusk={dusk} />
    {sun && <Sun o={dusk ? 0.18 : 0.55} />}
    {hills && <Hills />}
    <LightShaft x={shaftX} w={17} angle={13} o={dusk ? 0.12 : 0.32} />
    <LightShaft x={shaftX + 22} w={9} angle={16} o={dusk ? 0.08 : 0.19} />
    {children}
    <Dust count={dustCount} tint={dusk ? '#cfe0ea' : C.sun} />
    <WarmWash o={dusk ? 0.06 : 0.16} />
    <Vignette strength={vig} />
    <Grain />
  </AbsoluteFill>
)

/** Slow continuous push in. Nothing in this film is ever completely still. */
const Push = ({ from = 1, to = 1.07, children }) => {
  const f = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()
  const s = interpolate(f, [0, durationInFrames], [from, to], { extrapolateRight: 'clamp' })
  return <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: '50% 55%' }}>{children}</AbsoluteFill>
}

const Big = ({ children, size = 118, color = C.paper, y = 44, delay = 0 }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame: f - delay, fps, config: { damping: 190, mass: 1.1 } })
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, top: `${y}%`, textAlign: 'center',
      fontFamily: 'Georgia, serif', fontSize: size, lineHeight: 1.05, color,
      fontWeight: 600, letterSpacing: '-.02em',
      opacity: s, transform: `translateY(${(1 - s) * 26}px) scale(${0.96 + s * 0.04})`,
      textShadow: '0 6px 40px rgba(0,0,0,.28)', padding: '0 8%',
    }}>{children}</div>
  )
}

const S = ({ id, children }) => (
  <Sequence from={T[id].from} durationInFrames={T[id].durationInFrames} name={id}>
    <Audio src={staticFile(`audio/${id}.mp3`)} />
    {children}
  </Sequence>
)

const Cap = ({ id, children, dark }) => {
  const f = useCurrentFrame()
  return <Caption frame={f} dur={T[id].durationInFrames} dark={dark}>{children}</Caption>
}

export const Main = () => (
  <AbsoluteFill style={{ backgroundColor: C.skyMid }}>

    {/* 01 — morning, a child at a desk by the window */}
    <S id="01">
      <Push from={1.1} to={1.0}>
        <Stage shaftX={22}>
          <ChildReading scale={1.15} x={44} y={64} />
          <Page x={62} y={86} w={26} />
        </Stage>
      </Push>
      <Cap id="01">Every morning, a seven year old opens a book.</Cap>
    </S>

    {/* 02 — the teacher's tally marks accumulating */}
    <S id="02">
      <Push>
        <Stage hills={false} shaftX={58} dustCount={30}>
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(247,241,228,.5), rgba(236,226,207,.9))` }} />
          <Page x={50} y={54} w={46} tilt={1} glow={0.6} />
          <Tallies n={17} x={50} y={50} delay={16} per={9} />
        </Stage>
      </Push>
      <Cap id="02">Her teacher sits beside her, and marks every word that goes wrong.</Cap>
    </S>

    {/* 03 — the other children, waiting */}
    <S id="03">
      <Push from={1.0} to={1.06}>
        <Stage shaftX={70} dustCount={38}>
          {Array.from({ length: 9 }).map((_, i) => (
            <ChildReading key={i} scale={0.34 + (i % 3) * 0.04} x={12 + (i % 5) * 19} y={i < 5 ? 58 : 78} flip={i % 2 === 0} />
          ))}
        </Stage>
      </Push>
      <Cap id="03">A minute to read. Four more to score. Twenty seven others waiting.</Cap>
    </S>

    {/* 04 — the laptop on the desk */}
    <S id="04">
      <Push from={1.12} to={1.0}>
        <Stage shaftX={32} dustCount={34}>
          <Laptop x={50} y={58} w={30}>
            <div style={{ padding: '9% 8%', fontFamily: 'Georgia, serif', fontSize: 15, lineHeight: 1.8, color: C.ink }}>
              Nora lost her red mitten on the way to school.
            </div>
          </Laptop>
        </Stage>
      </Push>
      <Cap id="04">So we built something that does the counting.</Cap>
    </S>

    {/* 05 — the wifi goes out. the room dims, then settles. */}
    <S id="05">
      <Stage dusk sun={false} dustCount={26} vig={0.62}>
        <Big y={38} size={104}>offline</Big>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '58%', textAlign: 'center',
          fontFamily: 'Georgia, serif', fontSize: 30, color: 'rgba(247,241,228,.62)',
        }}>and it stays that way</div>
      </Stage>
      <Cap id="05" dark>And the first thing it does is disconnect.</Cap>
    </S>

    {/* 06 — words arriving on the screen */}
    <S id="06">
      <Push>
        <Stage shaftX={30} dustCount={30}>
          <Laptop x={50} y={54} w={44}>
            <div style={{ padding: '7% 7%', fontFamily: 'Georgia, serif', fontSize: 26, lineHeight: 1.9, color: C.ink }}>
              <Word delay={6}>Nora</Word> <Word delay={14}>lost</Word> <Word delay={22}>her</Word>{' '}
              <Word delay={30}>red</Word> <Word delay={38}>mitten</Word> <Word delay={46}>on</Word>{' '}
              <Word delay={54}>the</Word> <Word delay={62}>way</Word> <Word delay={70}>to</Word>{' '}
              <Word delay={78}>school</Word>
            </div>
          </Laptop>
        </Stage>
      </Push>
      <Cap id="06">She reads. Every word is measured against the page she was handed.</Cap>
    </S>

    {/* 07 — green, red, amber */}
    <S id="07">
      <Push from={1.0} to={1.05}>
        <Stage shaftX={26} dustCount={26}>
          <Laptop x={50} y={50} w={50}>
            <div style={{ padding: '6% 6%', fontFamily: 'Georgia, serif', fontSize: 25, lineHeight: 2, color: C.ink }}>
              Nora <Word state="om" glyph="O" delay={10}>lost</Word> her{' '}
              <Word state="amber" glyph="?" delay={46}>red</Word> mitten on the way to{' '}
              <Word state="green" glyph="SC" delay={28}>school</Word>, but the{' '}
              <Word state="red" glyph="S" delay={64}>bell</Word> rang.
            </div>
          </Laptop>
        </Stage>
      </Push>
      <Cap id="07">Green she read it. Red she did not. Amber, we are not sure enough to say.</Cap>
    </S>

    {/* 08 — the teacher's hand, overruling */}
    <S id="08">
      <Push>
        <Stage shaftX={64} dustCount={24}>
          <Laptop x={50} y={48} w={46}>
            <div style={{ padding: '8% 7%', fontFamily: 'Georgia, serif', fontSize: 24, lineHeight: 1.9, color: C.ink }}>
              <Word state="amber" glyph="?" delay={4}>red</Word>
              <div style={{ fontFamily: 'system-ui', fontSize: 15, color: C.inkSoft, marginTop: 22, lineHeight: 1.6 }}>
                Not counted as an error
              </div>
              <div style={{
                marginTop: 14, display: 'inline-block', fontFamily: 'system-ui', fontSize: 14,
                border: `1.5px solid ${C.red}`, color: C.red, borderRadius: 20, padding: '7px 16px',
              }}><Reveal at={80}>Count as an error</Reveal></div>
            </div>
          </Laptop>
        </Stage>
      </Push>
      <Cap id="08">Her teacher can overrule any of it, in either direction.</Cap>
    </S>

    {/* 09 — the dialect layer */}
    <S id="09">
      <Push from={1.0} to={1.05}>
        <Stage dusk dustCount={30} vig={0.56}>
          <Big y={36} size={62}>A layer that refuses to mark a child down<br />for the way their family speaks.</Big>
        </Stage>
      </Push>
      <Cap id="09" dark>We built one more thing.</Cap>
    </S>

    {/* 10 — the question */}
    <S id="10">
      <Stage dusk sun={false} dustCount={20} vig={0.6}>
        <Big y={42} size={70}>Then we measured it.</Big>
      </Stage>
      <Cap id="10" dark>Then we measured whether it ever worked.</Cap>
    </S>

    {/* 11 — the zero. held. */}
    <S id="11">
      <Stage dusk sun={false} hills={false} dustCount={16} vig={0.68}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 44%, rgba(224,165,69,.13), rgba(0,0,0,0) 62%)' }} />
        <Big y={22} size={300} color={C.gold}>0</Big>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '74%', textAlign: 'center',
          fontFamily: 'Georgia, serif', fontSize: 34, color: 'rgba(247,241,228,.8)',
        }}>times, in the entire evaluation</div>
      </Stage>
      <Cap id="11" dark>Not once.</Cap>
    </S>

    {/* 12 — why: the model rewrote her voice */}
    <S id="12">
      <Push>
        <Stage dusk dustCount={26} vig={0.56}>
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '30%', textAlign: 'center',
            fontFamily: 'Georgia, serif', fontSize: 46, color: C.paper, lineHeight: 2,
          }}>
            {[['aksed', 'asked'], ['wif', 'with'], ['sista', 'sister']].map(([a, b], i) => (
              <Row key={i} a={a} b={b} delay={18 + i * 26} />
            ))}
          </div>
        </Stage>
      </Push>
      <Cap id="12" dark>The model had rewritten her voice into standard spelling first.</Cap>
    </S>

    {/* 13 — what was underneath */}
    <S id="13">
      <Push from={1.0} to={1.06}>
        <Stage dusk dustCount={24} vig={0.58}>
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '28%', textAlign: 'center',
            fontFamily: 'Georgia, serif', fontSize: 48, color: C.paper, lineHeight: 2,
          }}>
            <Row a="dis col" b="Diskal" delay={20} bad />
            <Row a="fo fo" b="Fofo" delay={54} bad />
          </div>
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '62%', textAlign: 'center',
            fontFamily: 'Georgia, serif', fontSize: 28, color: 'rgba(247,241,228,.66)',
          }}>the words themselves come apart</div>
        </Stage>
      </Push>
      <Cap id="13" dark>What we found underneath was bigger, and no rule can reach it.</Cap>
    </S>

    {/* 14 — the number */}
    <S id="14">
      <Push from={1.06} to={1.0}>
        <Stage shaftX={40} dustCount={30}>
          <Big y={30} size={190} color={C.green}>0.48%</Big>
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '62%', textAlign: 'center',
            fontFamily: 'Georgia, serif', fontSize: 32, color: C.inkSoft,
          }}>of correctly read words are wrongly flagged</div>
        </Stage>
      </Push>
      <Cap id="14">Four times in every thousand words. That is the number we care about.</Cap>
    </S>

    {/* 15 — why that number */}
    <S id="15">
      <Push>
        <Stage shaftX={20} dustCount={36}>
          <ChildReading scale={1.3} x={52} y={62} />
          <Page x={70} y={88} w={24} />
        </Stage>
      </Push>
      <Cap id="15">Telling a child who read it perfectly that she got it wrong is worse.</Cap>
    </S>

    {/* 16 — close */}
    <S id="16">
      <Push from={1.0} to={1.05}>
        <Stage dusk sun={false} dustCount={22} vig={0.6}>
          <Big y={30} size={62} delay={4}>No subscription. No account.<br />No child&rsquo;s voice leaving the room.</Big>
          <Big y={62} size={92} color={C.gold} delay={40}>ReadAloud</Big>
        </Stage>
      </Push>
      <Cap id="16" dark>It runs on the laptop already on her desk.</Cap>
    </S>

  </AbsoluteFill>
)

/** One "spoken → written" pair, fading in as a unit. */
function Row({ a, b, delay, bad }) {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame: f - delay, fps, config: { damping: 200 } })
  return (
    <div style={{ opacity: s, transform: `translateY(${(1 - s) * 14}px)` }}>
      <span style={{ opacity: 0.62 }}>{a}</span>
      <span style={{ opacity: 0.4, margin: '0 28px', fontSize: '.7em' }}>becomes</span>
      <span style={{ color: bad ? C.red : C.paper, fontWeight: bad ? 700 : 400 }}>{b}</span>
    </div>
  )
}

/** Fades its children in at a given frame within the current sequence. */
function Reveal({ at, children }) {
  const f = useCurrentFrame()
  const o = interpolate(f, [at, at + 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return <span style={{ opacity: o }}>{children}</span>
}
