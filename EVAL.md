# Evaluation

## Protocol

Five original passages, grades 2–4, 83–86 running words each. Each is rendered twice with macOS
`say`: once read cleanly, once with a scripted set of ten miscues (4 substitutions, 3 omissions,
2 insertions, 1 self-correction). Both clips go through the real pipeline — Whisper
`onnx-community/whisper-base.en_timestamped` at q8, then the scorer.

**Ground truth is constructed, not annotated.** The "as read" text is generated from the
reference by applying the error script, so the correct answer is known with certainty. There is
no human labelling step to disagree about and no opportunity to score our own homework. The
harness asserts that its reference indices agree with the tokenizer before it trusts any number
it prints.

A detection counts as a true positive only if the scorer flagged the **same position** with the
**same miscue type** (±1 word). A scorer that finds ten errors in the wrong ten places should
not score well.

```
npm run eval     # regenerates audio, transcribes, scores, writes results.md + results.json
npm run smoke    # end-to-end check of the real ASR path
```

## Results

| Miscue type | Precision | Recall | F1 |
|---|---|---|---|
| Substitution | 80.0% | 80.0% | 80.0% |
| Omission | 93.8% | 100.0% | 96.8% |
| Insertion | 83.3% | 100.0% | 90.9% |
| Self-correction | 100.0% | 40.0% | 57.1% |

| | |
|---|---|
| **False positive rate on clean reads** | **0.48%** — 2 flags across 421 words |
| Mean absolute WCPM error | 0.4 WCPM |
| Planted miscues | 50 |

The false positive rate is the number we optimised, and it is the number we lead with. Telling a
child who read correctly that they made a mistake is a worse failure than missing an error, and
those two failures do not trade off symmetrically in a classroom.

## Suppression firing counts

| Filter | Fired |
|---|---|
| dialect | **0** |
| homophone | 1 |
| fuzzy | 0 |
| phonetic | 6 |
| contraction | 0 |

**The dialect layer fired zero times, and that is the most interesting result here.**

We built a phonological suppression layer so that AAE pronunciation patterns would not be scored
as reading errors, then measured whether it does anything. It does not — on this data — and the
reason is worth more than the feature was.

We recorded the same sentence twice, once in standard orthography and once spelled to elicit AAE
phonological features, and looked at what Whisper actually emits:

| Spoken | Whisper wrote | |
|---|---|---|
| "aksed" | "asked" | normalised away — rule can never fire |
| "wif" | "with" | normalised away |
| "sista" | "sister" | normalised away |
| "mornin" | "Mornin'" | preserved — rule fires |
| "dis col" | "**Diskal**" | word boundary destroyed |
| "runnin" | "run in" | word boundary destroyed |
| "fo fo" | "**Fofo**" | word boundary destroyed |

Whisper is trained to emit standard orthography, so it usually normalises the dialect feature
away before our rules ever see it. Where it does not normalise, it *mis-segments*: two words
become one, or one becomes two. A layer that compares words cannot repair a broken word boundary.

Scored end to end, a dialect-speaking reader on the mangled transcript is charged 5 errors and
58.3% accuracy on a twelve-word passage — and the dialect layer is structurally blind to all of
it. That is the Koenecke et al. (2020) 2× word-error-rate disparity showing up in our own
measurements, and our feature does not address it.

**The honest claim:** the equity contribution here is not the phonological rule table. It is that
alignment against a *known* 100-word passage collapses the recognition search space from ~40,000
candidates to ~100, which absorbs most accent-driven recognition error structurally rather than
by rule. Plus: no child's voice leaves the laptop.

## Limitations

**We have never run this on a child.** Every clip is macOS speech synthesis — one adult voice at
178–216 WCPM. Grade-2 spring median is 100 WCPM. We have measured the aligner against a fluent
adult robot reading faster than the 90th percentile for grade 6. A seven-year-old at 60 WCPM with
two-second pauses and false starts produces different chunking, different language-model priors,
and different hallucination behaviour. This is the largest unknown in the system.

**The evaluation conflates two things.** Run against text with no ASR in the loop, the scorer
recovers its own ground truth at 100% precision / 92% recall. The gap between that and the table
above is Whisper on synthetic speech. The published numbers are a property of the pair, not of
the alignment layer we built.

**The planted substitutions are the easy ones.** `buckets`→`library`, `that`→`wedded` are
phonologically distant and trivially detectable. Real child substitutions are phonologically
*close* — `house`/`horse`, `from`/`form`, `was`/`saw` — which is exactly the region where a
suppression stack is most likely to forgive them. The eval samples away from its own failure
mode. (Those specific pairs are now scored as errors, verified in `src/lib/attack.test.js`, but
they are not what the reported precision was measured on.)

**Self-correction recall is 40% by construction.** A purely semantic self-correction — saying
"forest", then "woods" — is indistinguishable from an inserted word without a language model, and
we deliberately have no language model. We detect the partial-word and near-miss forms and take
the conservative direction on the rest, scoring them as insertions rather than inventing credit.

**No published norms outside grades 1–6.** Hasbrouck & Tindal 2017 covers grades 1–6, so grade 7+
and kindergarten report "no published norm" rather than a guessed band. A WCPM below the
published 10th percentile reports `below_10`, not "10th percentile".

**Every suppression is an unfalsifiable claim.** There is no adjudicated ground truth for whether
a given suppression was correct. The teacher override moves in one direction only: it can mark a
flagged word correct, but there is no mechanism to mark a suppressed word as an error. That
asymmetry should be closed before anyone treats this as a measurement instrument.

## What would make this real

A validation study against certified human scorers on n≥100 real child readers, stratified by
dialect, measuring inter-rater reliability. That is a semester of work, not a weekend.

## Sources

- Hasbrouck, J., & Tindal, G. (2017). *An update to compiled ORF norms* (Technical Report No.
  1702). Behavioral Research and Teaching, University of Oregon. — every figure in `norms.js`
  was checked digit-by-digit against ED594994.
- Labov, W., & Baker, B. (2010). What is a reading error? *Applied Psycholinguistics*, 31(4).
- Charity, A. H., Scarborough, H. S., & Griffin, D. M. (2004). *Child Development*, 75(5).
- Goodman, K. S., & Buck, C. (1973). Dialect barriers to reading comprehension revisited.
  *The Reading Teacher*, 27(1).
- Koenecke, A., et al. (2020). Racial disparities in automated speech recognition. *PNAS*,
  117(14).
