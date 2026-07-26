/**
 * Palette and timing.
 *
 * The colours are pulled toward a warm, slightly desaturated range on purpose. Nothing here is
 * fully saturated and nothing is pure white or pure black, because the moment a frame contains
 * #fff it stops reading as painted and starts reading as a web page.
 */
export const C = {
  skyTop: '#f6e3cf', skyMid: '#f2d9c4', skyLow: '#e8cbb4',
  duskTop: '#26323d', duskMid: '#33414d', duskLow: '#48555f',
  hillFar: '#b9c9ad', hillMid: '#93ac8b', hillNear: '#6c8a6b', hillDark: '#4e6a52',
  paper: '#f7f1e4', paperShade: '#ece2cf', wood: '#c9a883', woodDark: '#a98862',
  ink: '#3a3128', inkSoft: '#6b6153',
  gold: '#e0a545', goldSoft: '#f2cf8f', sun: '#fff3d6',
  green: '#4e8f5f', red: '#c0584c', amber: '#c98a2e',
  cloth: '#7d97ab', clothDark: '#5f7889', skin: '#e8c4a0', hair: '#4a3b30',
}

/** Line durations measured from the generated audio, plus the pause that follows each. */
export const LINES = [
  { id: '01', dur: 4.91, pause: 0.7 },
  { id: '02', dur: 7.76, pause: 0.5 },
  { id: '03', dur: 6.30, pause: 0.6 },
  { id: '04', dur: 5.25, pause: 0.4 },
  { id: '05', dur: 2.35, pause: 1.4 },
  { id: '06', dur: 5.51, pause: 0.4 },
  { id: '07', dur: 7.71, pause: 0.6 },
  { id: '08', dur: 7.34, pause: 0.7 },
  { id: '09', dur: 6.11, pause: 0.5 },
  { id: '10', dur: 2.12, pause: 0.6 },
  { id: '11', dur: 1.02, pause: 2.6 },
  { id: '12', dur: 8.59, pause: 0.5 },
  { id: '13', dur: 10.89, pause: 0.6 },
  { id: '14', dur: 7.42, pause: 0.5 },
  { id: '15', dur: 4.62, pause: 0.9 },
  { id: '16', dur: 4.55, pause: 2.8 },
]

export const FPS = 30
const f = (s) => Math.round(s * FPS)

/** Absolute start frame and length for each line. */
export const TIMELINE = (() => {
  let at = f(1.0)              // a beat of quiet before the first word
  return LINES.map((l) => {
    const from = at
    const durationInFrames = f(l.dur + l.pause)
    at += durationInFrames
    return { ...l, from, durationInFrames, speech: f(l.dur) }
  })
})()

export const TOTAL = TIMELINE[TIMELINE.length - 1].from + TIMELINE[TIMELINE.length - 1].durationInFrames
