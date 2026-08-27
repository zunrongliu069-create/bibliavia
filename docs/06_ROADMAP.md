# MVP plan, roadmap, costs, and release gates

## Delivered private MVP

- Cross-platform Expo application with daily home, campaign, library, settings, and review flows.
- Persistent local XP, streak, settings, mastery, and review events.
- Adaptive scheduler and four progressive exercise modes.
- At-risk prioritization and daily learning quests.
- Complete executable Romans/Proverbs chapter plans and boss/final checkpoints.
- Four UI locales and independent translation selection.
- License manifests and public-domain source-linked starter content; protected Swedish text excluded.
- Complete verified Simplified Chinese CUV Romans content from 1:1 through 16:27 with a reproducible VPL importer.
- Automated scheduler, tokenization, Chinese segmentation, recall-accuracy, and XP tests.

## Prioritized roadmap

### Phase 1 — finish the private MVP

1. Import full verified CUV Traditional Romans and Simplified/Traditional Proverbs through the manifest pipeline; Simplified Chinese Romans is complete.
2. Obtain Bibel 2000 permission and supplier text; keep unavailable if permission is not granted.
3. Replace MVP key-value persistence with repository-backed structured storage; add migrations, export/import, and local encrypted backup.
4. Complete fill-blank slot inputs, word order, reference reversal, mixed session queue, completion feedback, streak calendar, and enforced chapter/boss unlocks.
5. Add dynamic font sizing, screen-reader passes, reduced motion, keyboard navigation, and RTL pseudo-locale.
6. Add E2E tests and restore/corruption tests.

### Phase 2 — polished private beta

1. Accounts, append-only sync/outbox, device recovery, backup restore, and conflict replay.
2. Audio loop and OS text-to-speech; optional recording stored locally by default.
3. Speech recitation with transparent transcript/confidence and human correction.
4. Achievements, combos, streak repair/protection, effort profiles, and personalized D/S/R parameters.
5. Notifications with quiet hours, user controls, and no guilt copy.
6. Consent-gated product analytics and a 30-day recall cohort report.

### Phase 3 — public beta

1. Server-authoritative progression, abuse limits, audit/event monitoring, incident response, and penetration review.
2. GDPR DPIA/records, privacy policy, terms, data export/deletion, processor agreements, retention jobs, and age-band/child-safety assessment.
3. App Store privacy nutrition, Google Play data safety, account-deletion links, age ratings, accessibility declarations, and copyright complaint workflow.
4. Production translation licenses, signed content manifests, expiry monitoring, and takedown switches.
5. Crash/error monitoring with redaction and opt-in analytics.

### Phase 4 — scale

1. Curated paths across all 66 books and additional licensed/open translations.
2. Privacy-first friends, co-op goals, groups, block/report/moderation, and optional non-spiritual-status leaderboards.
3. Premium audio/personalization/convenience features while preserving free core memorization.
4. Parameter optimization, review-load forecasting, and controlled experiments judged by delayed recall.

## MVP infrastructure recommendation

Keep phase 1 local-only. For phase 2, one EU-region managed Postgres/Auth/Storage provider plus serverless API/worker is enough. Avoid AI in the core loop; deterministic local tokenization/scheduling is cheaper, faster, private, and auditable.

Approximate planning ranges, not vendor quotes:

| Item | Private MVP | Small public beta | Notes |
|---|---:|---:|---|
| Expo development/build | €0–€25/month | €25–€100/month | Depends on cloud build frequency; local builds reduce cost |
| API + Postgres + auth | €0 local | €25–€150/month | EU region; grow vertically before adding services |
| Object storage/CDN | €0 | €5–€40/month | Mostly content packages and optional user recordings |
| Error monitoring | €0 | €0–€30/month | Aggressive PII scrubbing |
| Privacy-safe analytics | €0 | €0–€50/month | Self-host or low-volume EU service; consent gated |
| Push notifications | €0 | €0–€20/month | APNs/FCM transport is generally free; orchestration may cost |
| Transactional email | €0 | €5–€30/month | Recovery and security only |
| TTS | Device-local | Device-local first | Paid cloud TTS only for licensed, high-quality audio assets |
| Speech recognition | Device/local prototype | €0–€200/month | Cost/accuracy/privacy evaluation required before defaulting cloud |
| AI | €0 | €0 | Not required for canonical text, scheduling, or starter analytics |
| Apple Developer Program | — | annual fee | Verify current local-currency fee at enrollment |
| Google Play Console | — | registration fee | Verify at submission time |
| Legal/privacy/copyright | project-specific | likely largest early cost | Translation permission and counsel cannot be replaced by automation |

## Business model

- Free forever: core import/curated path, all review modes needed for mastery, offline progress, basic backup/export, accessibility, and a useful public-domain translation catalog.
- Optional premium: advanced audio packs, deeper personal analytics, family/group administration, cosmetic themes, extra backup history, and convenience—not higher mastery scores.
- Consider a fair one-time purchase plus optional subscription for ongoing cloud/group costs. Never sell spiritual status, streak rescue pressure, or basic Scripture access.

## Store and public-release gates

- Translation permission and attribution validated for every build/region.
- Privacy policy/terms/support URL/account deletion/export live and tested.
- Data inventory matches Apple/Google declarations exactly.
- Account recovery, multi-device restore, and multi-year backup restore tested.
- Child/teen decision documented; social disabled until moderation is operational.
- Accessibility audit, small/large device matrix, four launch locales, offline/corrupt-content behavior, and security review pass.
- Server rejects replayed/impossible XP and leaderboard events.
- 30-day recall dashboard works; engagement experiments cannot ship without retention guardrails.
- App has an emergency content-disable mechanism that does not erase user learning history.

## Definition of product-complete

The product is not complete merely because every listed screen exists. Completion requires evidence that a new user can start a guided path immediately, recall material after 30 days, finish Romans/Proverbs without planning the curriculum, practice offline, restore years of progress, understand content provenance, and use the app without XP grinding or licensing ambiguity.
