# ReadAloud

Browser-only oral reading fluency assessment. A student reads a passage aloud, and the tool
produces a running record — marked-up text, WCPM, accuracy, self-correction rate, instructional
level, and a percentile band against published norms — with a printable one-page teacher report.

Everything runs in the browser. The speech model is downloaded once, cached in IndexedDB, and
runs on-device from then on. **No audio and no transcript ever leaves the machine, and there is
no server to leave it to.** For a tool that records children's voices, that is a design
constraint rather than a feature.

## Running it

```sh
npm install
npm run dev      # http://localhost:5174
npm run test     # scoring engine unit tests
npm run build
```

Port 5174 is fixed (`strictPort`). The model cache is keyed to the origin, so a port change
means re-downloading tens of megabytes of weights.

Desktop only, 1024px and up. Mobile layout is an explicit non-goal.

## Demo mode — `Ctrl` + `Shift` + `D`

Loads `public/demo/clean-read.wav` and runs it through the **real** pipeline: decode to 16kHz
mono, Whisper in the worker, the same scorer, the same screens. The only thing substituted is
where the audio samples came from.

It exists because a live demo depends on hardware nobody controls — a room with three hundred
people in it is loud, laptop microphones get muted by the OS, and permission dialogs get
dismissed by whoever used the machine last. Because it runs the genuine pipeline rather than
replaying a canned result, it cannot quietly drift away from the product.

The hotkey also switches to a bundled passage (`DEMO_PASSAGE` in `src/data/passages.js`), which
is the text that recording actually reads. Pointing the audio at any other passage would produce
a wall of false omissions. **That wav file and that passage are a matched pair — change one and
you must re-record the other.** Anything scored this way is labelled as a demo recording on
screen and on the printed report; a bundled recording never passes as a child's read.

## The screens

| Screen | File | Notes |
|---|---|---|
| Student select | `components/StudentSelect.jsx` | Five mock students. No login, no roster sync, no database — all explicit non-goals. |
| Passage select | `components/PassageSelect.jsx` | Five original passages, grades 2–4, ~100 words each. |
| Read | `components/ReadScreen.jsx` | Passage at 24px serif, one record button, running timer, live input meter. |
| Results | `components/Results.jsx` | Marked passage, metric cards, miscue table with teacher override. |
| Teacher report | `components/TeacherReport.jsx` | `.print-area` one-pager. Survives Cmd+P onto a black-and-white printer. |

## Design decisions worth knowing

**Colour is never the only signal.** Every marked word carries a glyph (`S` substitution, `O`
omission, `I` insertion, `SC` self-correction, `R` repetition, `?` not counted) and an underline
style — solid, wavy, dotted, or strikethrough. Roughly one man in twelve has a red-green
deficiency, and the report prints on the black-and-white printer down the hall from the
classroom. Marking that only worked in colour would only work for some people.

**Amber is the product's epistemic humility, made visible.** A word we heard differently but
declined to count as an error is amber, never silently green. Hover or tab to it and it says what
was heard and why — including the dialect rule that fired, by name. The full list is itemised on
the results screen and on the printed report, so the adjustment can be checked rather than taken
on trust. A silent pass would be worse than no pass at all.

**The teacher can always overrule the machine.** "Not an error" is one click on any miscue, it is
reversible, and every metric recomputes from it immediately. Insertions have no reference index,
so `score()`'s `options.overrides` map cannot address them; the UI applies those positionally and
recomputes through the engine's own `computeMetrics` (see the comment in `App.jsx`).

**An unscoreable recording produces nothing.** A dead microphone does not throw — it returns
silence, which aligns as a complete read with every word omitted and would render a confident,
printable record showing bottom-percentile accuracy for a child who never spoke. When the engine's
validity check fails, there is no score, no percentile, and no route to the report.

**Reading supports persist.** Dyslexia-friendly typeface, three text sizes, and high contrast sit
in the header on every screen and save to `localStorage`. The dyslexia setting is a **font stack**,
not a webfont — fetching one would make an accessibility toggle depend on the network, and this
app has to work in a classroom with no wifi.

## Layout

```
src/
  lib/        scoring engine, ASR worker, audio. Tested and committed — add files, don't edit.
  data/       mock students, original passages
  hooks/      useAsr — the single ASR worker connection
  util/       markup.js — turns aligner-shaped tokens into page-shaped units
  components/ the five screens and their parts
```

Plain JavaScript and JSX. Tailwind for styling, and no other UI dependency of any kind.

## Norms and sources

Every figure in `src/lib/norms.js` was checked digit-by-digit against the primary source, not
copied from a secondary table. Two of the six commonly-quoted spring medians circulate in a
1996-era form; grade 4 is 133 and grade 6 is 146 in the 2017 revision.

**Fluency measurement**
- Hasbrouck, J., & Tindal, G. (2017). *An update to compiled ORF norms* (Technical Report
  No. 1702). Behavioral Research and Teaching, University of Oregon. — the norm table.
- Fuchs, L. S., Fuchs, D., Hosp, M. K., & Jenkins, J. R. (2001). Oral reading fluency as an
  indicator of reading competence. *Scientific Studies of Reading*, 5(3), 239–256. — why words
  correct per minute is a defensible proxy for reading competence at all.

**Why the suppression layer exists** — these sit behind the amber column and the equity claim:
- Labov, W., & Baker, B. (2010). What is a reading error? *Applied Psycholinguistics*, 31(4).
- Charity, A. H., Scarborough, H. S., & Griffin, D. M. (2004). Familiarity with school English
  in African American children. *Child Development*, 75(5).
- Goodman, K. S., & Buck, C. (1973). Dialect barriers to reading comprehension revisited.
  *The Reading Teacher*, 27(1).
- Koenecke, A., et al. (2020). Racial disparities in automated speech recognition. *PNAS*,
  117(14). — roughly double the word error rate for Black speakers across all five major
  commercial recognisers. This is the measured bias the tool is built against.

Percentiles are reported as **bands**, not point estimates. A five-row table cannot support a claim
like "37th percentile", and pretending otherwise is the kind of false precision that makes an
assessment tool untrustworthy. A score below the published 10th percentile reports `below_10`
rather than "10th percentile", and grades outside the published table report no band at all.

Automated scoring is a screening aid. It does not replace teacher judgement — and the teacher can
push in **both** directions: any flagged word can be marked correct, and any word the engine
suppressed can be counted as an error. That symmetry is deliberate. Every other degree of freedom
in the system (four suppression filters) can only lower the error count, and a tool whose every
adjustment pushed the score upward would not deserve to be believed.

`EVAL.md` reports what the evaluation actually measured, including a headline feature that fired
zero times and why.
