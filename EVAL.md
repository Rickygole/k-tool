# Evaluation

## How it works

Five original passages, grades 2 to 4, 83 to 86 running words each. Each one gets rendered twice
with macOS `say`: once read cleanly, once with a scripted set of ten miscues (4 substitutions, 3
omissions, 2 insertions, 1 self correction). Both clips go through the real pipeline, meaning
Whisper `onnx-community/whisper-base.en_timestamped` at q8, then the scorer.

**Ground truth is constructed, not annotated.** The "as read" text gets generated from the
reference by applying the error script, so we know the right answer with certainty. There's no
human labelling step for anyone to disagree with, and no way to quietly score our own homework. The
harness also checks that its reference indices agree with the tokenizer before it trusts any number
it prints.

A detection only counts as a true positive if the scorer flagged the **same position** with the
**same miscue type** (give or take one word). A scorer that finds ten errors in the wrong ten
places shouldn't get credit for it.

```
npm run eval     # regenerates audio, transcribes, scores, writes results.md and results.json
npm run smoke    # end to end check of the real ASR path
```

## Results

| Miscue type | Precision | Recall | F1 |
|---|---|---|---|
| Substitution | 81.8% | 90.0% | 85.7% |
| Omission | 93.8% | 100.0% | 96.8% |
| Insertion | 83.3% | 100.0% | 90.9% |
| Self correction | 100.0% | 40.0% | 57.1% |

| | |
|---|---|
| **False positive rate on clean reads** | **0.48%**, so 2 flags across 421 words |
| Mean absolute WCPM error | 0.4 WCPM |
| Planted miscues | 50 |

The false positive rate is the number we tuned for, and it's the one we lead with. Telling a kid
who read correctly that they made a mistake is a worse failure than missing an error, and those two
failures don't trade off evenly in a classroom.

## Suppression firing counts

| Filter | Fired |
|---|---|
| dialect | **0** |
| homophone | 1 |
| fuzzy | 0 |
| phonetic | 4 |
| contraction | 0 |

**The dialect layer fired zero times, and honestly that's the most interesting result in here.**

We built a phonological suppression layer so AAE pronunciation patterns wouldn't get scored as
reading errors, then measured whether it does anything. It doesn't, at least not on this data, and
the reason turned out to be worth more than the feature was.

We recorded the same sentence twice, once in standard spelling and once spelled to bring out AAE
phonological features, and looked at what Whisper actually writes:

| Spoken | Whisper wrote | |
|---|---|---|
| "aksed" | "asked" | normalised away, so the rule can never fire |
| "wif" | "with" | normalised away |
| "sista" | "sister" | normalised away |
| "mornin" | "Mornin'" | preserved, rule fires |
| "dis col" | "**Diskal**" | word boundary destroyed |
| "runnin" | "run in" | word boundary destroyed |
| "fo fo" | "**Fofo**" | word boundary destroyed |

Whisper is trained to write standard orthography, so most of the time it normalises the dialect
feature away before our rules ever see it. And where it doesn't normalise, it mis-segments. Two
words become one, or one becomes two. A layer that compares words can't repair a broken word
boundary.

Scored end to end, a dialect speaking reader on the mangled transcript gets charged 5 errors and
58.3% accuracy on a twelve word passage, and the dialect layer is structurally blind to all of it.
That's the Koenecke et al. (2020) word error rate disparity turning up in our own measurements, and
our feature doesn't touch it.

**So here's the honest version of the claim.** The equity contribution isn't the rule table. It's
that aligning against a *known* 100 word passage collapses the recognition search space from
something like 40,000 candidates down to 100, which absorbs most accent driven recognition error
structurally instead of by rule. Plus no kid's voice leaves the laptop.

## What we tried and didn't build

We were going to add a second suppression layer for speech differences, so a kid who stutters
wouldn't get charged for it. We measured first this time.

Across five clips of disfluent speech the proposed layer fired **zero** times. On one clip of a kid
who genuinely couldn't decode the words, it fired **twice** and cut the error count in half. Its
entire marginal coverage turned out to be the exact set it must never touch.

There's a structural reason. Whisper preserves part word repetition ("li li little" comes back as
"Lili"), but that lands as an *insertion*, and the existing self correction logic already scores it
as a non error. Prolongation gets normalised away. Blocks are silent, so they're invisible in text
entirely. And the real penalty for a blocked read isn't in accuracy at all, it's in the clock: one
clip read every word correctly, 100% accuracy, zero miscues, and scored 86 WCPM against 208 for the
clean read. No word pair rule can reach that.

So we didn't build it.

## Limitations

**This has never been run on a child's voice.** Every clip is speech synthesis, one adult voice at
178 to 216 WCPM. Grade 2 spring median is 100 WCPM. We've measured the aligner against a fluent
adult robot reading faster than the 90th percentile for grade 6. A seven year old at 60 WCPM with
two second pauses and false starts is going to produce different chunking, different language model
priors, and different hallucination behaviour. This is the biggest unknown in the whole system.

**The evaluation conflates two things.** Run against text with no ASR in the loop, the scorer
recovers its own ground truth at 100% precision and 92% recall. The gap between that and the table
above is Whisper on synthetic speech. So the published numbers are a property of the pair, not of
the alignment layer we actually wrote.

**The planted substitutions are the easy ones.** `buckets` to `library`, `that` to `wedded`, those
are phonologically distant and trivial to catch. Real kid substitutions are phonologically *close*:
`house` and `horse`, `from` and `form`, `was` and `saw`. Which is exactly where a suppression stack
is most likely to forgive them. The eval samples away from its own failure mode. Those specific
pairs are all scored as errors now, and there are tests for them in `src/lib/attack.test.js`, but
they aren't what the reported precision was measured on.

**Self correction recall is 40% by construction.** A purely semantic self correction, where the kid
says "forest" and then "woods", is indistinguishable from an inserted word without a language
model, and there deliberately isn't one. We catch the partial word and near miss forms and take the
conservative option on the rest, scoring them as insertions rather than inventing credit.

**No published norms outside grades 1 to 6.** Hasbrouck and Tindal covers 1 through 6, so grade 7
and up plus kindergarten report "no published norm" instead of guessing a band. A WCPM below the
published 10th percentile reports `below_10`, not "10th percentile".

## What would make this real

A validation study against certified human scorers, n of at least 100 real child readers,
stratified by dialect, measuring inter rater reliability. That's a semester of work, not a weekend.

## Sources

- Hasbrouck, J., & Tindal, G. (2017). *An update to compiled ORF norms* (Technical Report No.
  1702). Behavioral Research and Teaching, University of Oregon. Every figure in `norms.js` was
  checked digit by digit against ED594994.
- Fuchs, L. S., Fuchs, D., Hosp, M. K., & Jenkins, J. R. (2001). *Scientific Studies of Reading*,
  5(3).
- Labov, W., & Baker, B. (2010). What is a reading error? *Applied Psycholinguistics*, 31(4).
- Charity, A. H., Scarborough, H. S., & Griffin, D. M. (2004). *Child Development*, 75(5).
- Goodman, K. S., & Buck, C. (1973). Dialect barriers to reading comprehension revisited. *The
  Reading Teacher*, 27(1).
- Koenecke, A., et al. (2020). Racial disparities in automated speech recognition. *PNAS*, 117(14).
