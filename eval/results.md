## Miscue detection, by type

| Miscue type | Precision | Recall | F1 | TP | FP | FN |
|---|---|---|---|---|---|---|
| substitution | 69.6% | 80.0% | 74.4% | 16 | 7 | 4 |
| omission | 93.8% | 100.0% | 96.8% | 15 | 1 | 0 |
| insertion | 76.9% | 100.0% | 87.0% | 10 | 3 | 0 |
| self-correction | 100.0% | 40.0% | 57.1% | 2 | 0 | 3 |

## The metric we optimised

| Metric | Value |
|---|---|
| **False positive rate on clean reads** | **0.24%** (1 flags / 421 words) |
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
| fuzzy | 2 |
| phonetic | 4 |
| contraction | 0 |

## Per-passage

| Passage | Grade | Words | Clean FP | Clean accuracy | WCPM reported / true |
|---|---|---|---|---|---|
| fox | 2 | 85 | 1 | 98.8% | 218 / 220 |
| bridge | 3 | 83 | 0 | 100% | 202 / 202 |
| garden | 3 | 83 | 0 | 100% | 197 / 197 |
| whale | 4 | 84 | 0 | 100% | 181 / 181 |
| letter | 4 | 86 | 0 | 100% | 208 / 208 |
