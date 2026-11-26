---
type: evidence
title: Listening verdicts
description: The owner's listening judgements on Danny Boy builds and experiments, used to calibrate feasibility thresholds and compromise costs.
---

# Listening verdicts

Feasibility thresholds and compromise costs are set from listening verdicts, not chosen once by eye. Each verdict is recorded with the plan measures for its line, so a threshold change can be checked against every earlier judgement. Recording the plan measures beside each verdict is not yet built.

Build and experiment labels (E1, E2, G1, G2, V1, `dbfix`, `dboh`) name renders made during the experiments.

## Danny Boy at 1.75×

- Lines 1, 2 and 7 good; lines 4, 12 and 13 unintelligible.
- Forcing the warm colour on every line (E2) did not help.
- With the model corrections (G1, G2): lines 4, 12 and 13 intelligible, with or without `keepcons`.
- The clipping on "mountain side" was fixed by `fit`.
- Line 4, default voice:
  - "bide" lacked its D until `relcoda` and `finallen`;
  - "I" sounded "Ar" until the diphthong onset rule;
  - "'tis you" had a hiss-click until `siblip` (0.5 better than 0.7) and `fricrel`;
  - "and I" sounded hurried until `td-prevocalic`;
  - "I must" sounded clipped until short diphthongs glided on (V1, judged fine).

## Danny Boy at 1.0×

- E1: lines 4, 12 and 13 good.
- Full female build with the five model corrections (`dbfix`): intelligibility fell verse by verse, and the last verse was hardly intelligible. The original female build was acceptable. Cause not yet isolated; see [open questions](../open-questions.md).
