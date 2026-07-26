## Miscue detection, by type

| Miscue type | Precision | Recall | F1 | TP | FP | FN |
|---|---|---|---|---|---|---|
| substitution | 80.0% | 80.0% | 80.0% | 16 | 4 | 4 |
| omission | 93.8% | 100.0% | 96.8% | 15 | 1 | 0 |
| insertion | 83.3% | 100.0% | 90.9% | 10 | 2 | 0 |
| self-correction | 100.0% | 40.0% | 57.1% | 2 | 0 | 3 |

## The metric we optimised

| Metric | Value |
|---|---|
| **False positive rate on clean reads** | **0.48%** (2 flags / 421 words) |
| Mean absolute WCPM error | 0.4 WCPM |
| Passages evaluated | 5 |
| Planted miscues | 50 |

## Suppression firing counts

Which filter forgave how many deviations. If the dialect row is zero, the dialect
layer is doing nothing on this data and we say so rather than implying otherwise.

| Filter | Fired |
|---|---|
| dialect | 0 |
| homophone | 1 |
| fuzzy | 0 |
| phonetic | 6 |
| contraction | 0 |

## Per-passage

| Passage | Grade | Words | Clean FP | Clean accuracy | WCPM reported / true |
|---|---|---|---|---|---|
| fox | 2 | 85 | 0 | 100% | 216 / 216 |
| bridge | 3 | 83 | 2 | 97.6% | 196 / 198 |
| garden | 3 | 83 | 0 | 100% | 193 / 193 |
| whale | 4 | 84 | 0 | 100% | 178 / 178 |
| letter | 4 | 86 | 0 | 100% | 204 / 204 |
