# ReadAloud

Oral reading fluency assessment that runs entirely in the browser. A student reads a passage out
loud, and you get a running record back: the marked up text, words correct per minute, accuracy,
self correction rate, instructional level, and a percentile band. Plus a one page report you can
print and hand to someone.

The speech model downloads once, gets cached, and runs on the device after that. **No audio and no
transcript ever leaves the machine, and there's no server for it to leave to.** For something that
records kids reading out loud, that felt less like a feature and more like the only acceptable way
to build it.

## Running it

```sh
npm install
npm run dev      # http://localhost:5174
npm run test     # scoring engine unit tests
npm run build
```

Port 5174 is pinned on purpose (`strictPort`). The model cache is keyed to the origin, so if the
port changes you're re-downloading tens of megabytes of weights. If `npm run dev` refuses to start,
something else has the port: `lsof -ti :5174 | xargs kill`.

Desktop only, 1024px and up. Mobile layout was never a goal here.

## Demo mode: Ctrl + Shift + D

Loads `public/demo/clean-read.wav` and pushes it through the **real** pipeline. Same decode to
16kHz mono, same Whisper worker, same scorer, same screens. The only thing that changes is where
the audio samples came from.

It's there because live demos depend on hardware you don't control. Rooms are loud, laptop mics get
muted by the OS, and permission dialogs get dismissed by whoever used the machine last. Since it
runs the actual pipeline instead of replaying a saved result, it can't quietly drift away from what
the product really does.

The hotkey also swaps in a bundled passage (`DEMO_PASSAGE` in `src/data/passages.js`), because that
wav is a recording of that specific text. Point the audio at any other passage and you get a wall
of false omissions. **The wav and the passage are a matched pair. Change one, re-record the other.**
Anything scored this way gets labelled as a demo recording on screen and on the printout, so a
bundled recording never passes as a kid's actual read.

## The screens

| Screen | File | Notes |
|---|---|---|
| Student select | `components/StudentSelect.jsx` | Drills down school level, then grade, then student. 65 mock students. No login, no roster sync, no database. |
| Passage select | `components/PassageSelect.jsx` | Sixteen original passages, one per grade from K to 12. At-grade ones come first, the rest are still offered. |
| Read | `components/ReadScreen.jsx` | Passage at 24px serif, one record button, running timer, live input meter. |
| Results | `components/Results.jsx` | Marked passage, metric cards, miscue table with teacher override. |
| Student view | `components/StudentResult.jsx` | Same read, shown to the kid. No percentile, no instructional level. |
| Teacher report | `components/TeacherReport.jsx` | `.print-area` one pager. Survives Cmd+P onto a black and white printer. |

## Decisions worth knowing about

**Colour is never the only signal.** Every marked word gets a glyph too (`S` substitution, `O`
omission, `I` insertion, `SC` self correction, `R` repetition, `?` not counted) plus an underline
style: solid, wavy, dotted, or struck through. Roughly one man in twelve has some red green
deficiency, and the report is going to come out of the black and white printer down the hall.
Marking that only works in colour only works for some people.

**Amber means we're not sure, and we're saying so.** If we heard a word differently but decided not
to count it as an error, it goes amber, never silently green. Hover or tab to it and it tells you
what was heard and why, including which dialect rule fired, by name. The whole list is itemised on
the results screen and on the printout so you can check the call instead of trusting it. A silent
pass would be worse than no pass at all.

**The teacher can always overrule the machine, in both directions.** "Not an error" is one click on
any miscue, it's reversible, and every number recomputes right away. You can also go the other way
and count a word the engine let through as an error. That second direction matters more than it
looks: there are four filters in here that can only ever *remove* errors, so if the only control a
teacher had was the power to forgive, every adjustment the tool offered would push the score up.
That's not a tool anyone should believe.

**An unscoreable recording produces nothing at all.** A dead mic doesn't throw an error, it returns
silence. Silence lines up as a complete read with every word omitted, which would render a
confident, printable record showing bottom percentile accuracy for a kid who never said anything.
So when the validity check fails there's no score, no percentile, and no way through to the report.

**Reading supports stick around.** Dyslexia friendly typeface, three text sizes, high contrast.
They live in the header on every screen and save to `localStorage`. The dyslexia setting is a
**font stack**, not a webfont, because fetching one would make an accessibility toggle depend on
the network and this thing has to work in a classroom with no wifi.

## Layout

```
src/
  lib/        scoring engine, ASR worker, audio. Tested and committed. Add files, don't edit.
  data/       mock roster, original passages
  hooks/      useAsr, the single ASR worker connection
  util/       markup.js, turns aligner shaped tokens into page shaped units
  components/ the screens and their parts
```

Plain JavaScript and JSX. Tailwind for styling and no other UI dependency of any kind.

## Norms and sources

Every number in `src/lib/norms.js` got checked digit by digit against the actual source instead of
copied off a secondary table, which turned out to matter. Two of the six commonly quoted spring
medians still float around in a 1996 era form. Grade 4 is 133 and grade 6 is 146 in the 2017
revision.

**Fluency measurement**
- Hasbrouck, J., & Tindal, G. (2017). *An update to compiled ORF norms* (Technical Report No.
  1702). Behavioral Research and Teaching, University of Oregon. This is the norm table itself.
- Fuchs, L. S., Fuchs, D., Hosp, M. K., & Jenkins, J. R. (2001). Oral reading fluency as an
  indicator of reading competence. *Scientific Studies of Reading*, 5(3), 239 to 256. This is why
  words correct per minute is a defensible thing to measure in the first place.

**Why there's a suppression layer at all.** These are what sit behind the amber column:
- Labov, W., & Baker, B. (2010). What is a reading error? *Applied Psycholinguistics*, 31(4).
- Charity, A. H., Scarborough, H. S., & Griffin, D. M. (2004). Familiarity with school English in
  African American children. *Child Development*, 75(5).
- Goodman, K. S., & Buck, C. (1973). Dialect barriers to reading comprehension revisited. *The
  Reading Teacher*, 27(1).
- Koenecke, A., et al. (2020). Racial disparities in automated speech recognition. *PNAS*, 117(14).
  Roughly double the word error rate for Black speakers across all five major commercial
  recognisers. That's the measured bias this thing is built against.

Percentiles come back as **bands**, not point estimates. A five row table can't support a claim
like "37th percentile", and pretending it can is the kind of false precision that makes an
assessment tool untrustworthy. Below the published 10th percentile reports `below_10` instead of
"10th percentile", and grades outside the table report no band at all rather than a guess.

One more thing on the percentile: it's calculated from the **passage** grade, not the student's. So
a grade 8 kid reading a grade 3 passage at the 50th percentile means they read grade 3 text at a
typical grade 3 pace. It does not mean typical for grade 8. The results screen says so directly
whenever the two grades don't match, because that's an easy number to misread.

Automated scoring is a screening aid. It doesn't replace teacher judgement.

`EVAL.md` has what the evaluation actually measured, including a headline feature that fired zero
times and why we published that anyway.
