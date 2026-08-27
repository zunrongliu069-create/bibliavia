# Romans and Proverbs curriculum

The executable source of truth is `src/data/curriculum.ts`. It contains all 16 Romans chapters, all 31 Proverbs chapters, semantic verse ranges covering every verse, daily targets, chapter-test definitions, section boss checkpoints, and final mastery tests.

## Shared cadence

Each listed semantic group is a learning unit, not necessarily one exercise card. Long groups are subdivided at sentence/clause boundaries at import time while retaining a parent range for sequential recall.

For a four-group chapter:

1. Day 1: read, explain the boundary, then retrieve group A.
2. Day 2: due review A; learn B.
3. Day 3: mixed review A/B; learn C.
4. Day 4: due review; learn D.
5. Day 5: sequential linking and reference reversal.
6. Day 6+: scheduler-controlled repair; chapter test when every group clears the minimum predicted retention.

For longer chapters, add one consolidation day after every three groups. Daily new material is capped when due reviews would exceed the chosen effort profile.

## Review schedule

- Same day: short relearning only after failure; it does not count as durable mastery evidence.
- Early learning: commonly minutes → roughly one day → several days, adapted to grade/accuracy/hints.
- Familiar/strong: interval follows predicted retention and can expand to weeks/months.
- A lapse triggers a short repair review and reduced stability, then the prior history helps recovery.
- Weekly campaign session samples adjacent-group transitions so learners can recite a passage, not only isolated fragments.
- Monthly cumulative session samples old groups across chapters and both reference directions.

## Romans structure

- Boss 1 after chapters 1–4: The Gospel Case.
- Boss 2 after chapters 5–8: Alive in Christ.
- Boss 3 after chapters 9–11: Mercy for All.
- Boss 4 after chapters 12–16: Living the Gospel.
- Final: sequential, random-reference, spoken, and delayed recall across four sessions in seven days.

The plan intentionally uses smaller units for dense argument pivots such as 3:21–26, 5:12–21, 8:26–39, and 11:25–36, while keeping short rhetorical units together.

## Proverbs structure

- Boss 1 after chapters 1–9: Wisdom’s Invitation.
- Boss 2 after chapters 10–15: The Wise Life.
- Boss 3 after chapters 16–22: Words and Work.
- Boss 4 after chapters 23–27: Faithful Character.
- Boss 5 after chapters 28–31: Collected Wisdom.
- Final: themed sayings, random references, chapter sequences, spoken recall, and delayed whole-book retrieval across ten days.

Proverbs 1–9 and 30–31 preserve discourse/poem sections. The collected sayings in 10–29 use shorter semantic clusters for campaign navigation, but import-time learning cards can split into individual sayings where adjacent verses are not a single thought.

## Test rules

- Chapter unlock: every group has at least two successful retrievals on different learning days and predicted recall ≥ 85%.
- Chapter pass: ≥ 90% token accuracy, no more than one user-requested hint, correct reference direction, repair every missed group.
- Boss unlock: all section chapters passed and no group below 80% predicted recall.
- Boss pass: ≥ 92% aggregate, no automatic hints, every sampled group ≥ 80%.
- Book mastery: all bosses passed plus a final delayed session at least seven days after the penultimate test.

These thresholds are planned production rules; the MVP renders the path/checkpoints but does not yet enforce complete unlock logic because only verified starter verses are bundled.
