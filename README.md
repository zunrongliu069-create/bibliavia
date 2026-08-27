# Scriptora

Scriptora is an offline-first, multilingual Scripture memorization MVP for iOS, Android, and web. It couples active recall and adaptive spaced repetition with a guided Romans/Proverbs campaign and restrained, learning-linked game mechanics.

## What works now

- One Expo/React Native codebase for iOS, Android, and web.
- Offline device persistence for XP, streak, mastery, settings, and review history.
- Read, missing-word, first-letter, and full-recall exercises.
- Adaptive scheduling using difficulty, stability, predicted retrievability, accuracy, hints, speed, and lapses.
- Daily quests, learning-weighted XP, streaks, levels, weak-verse prioritization, boss checkpoints, and chapter plans.
- English, Swedish, Simplified Chinese, and Traditional Chinese UI.
- UI language, Bible language, and translation are independent.
- The complete 433-verse Simplified Chinese CUV Romans text, imported from a verified public-domain source, plus source-linked starter text for other configured translations. Bibel 2000 is excluded pending permission.
- Complete Romans and Proverbs chapter/group/test plans.
- Eight guided reading plans: two Gospel plans, the complete New Testament in 90 days, and five themed plans from 7 to 31 days, with offline progress and pause/resume.

This is a private MVP, not a production release. Accounts, cloud sync, audio/speech, full licensed content, server-authoritative progression, social features, and store submission work remain on the roadmap.

## Run

```bash
npm install
npm run web
```

For device testing, use `npm run android` or `npm run ios` with the appropriate Expo development environment.

## Verify

```bash
npm run typecheck
npm test
```

## Documentation

- [Market and learning research](docs/01_RESEARCH.md)
- [Product specification](docs/02_PRODUCT_SPEC.md)
- [Technical architecture and schema](docs/03_ARCHITECTURE.md)
- [Curriculum model](docs/04_CURRICULUM.md)
- [Localization and content licensing](docs/05_CONTENT_LOCALIZATION.md)
- [MVP plan, roadmap, costs, and release gates](docs/06_ROADMAP.md)

## Content safety

Never paste or reconstruct protected Bible text in source code. All imports must pass the manifest/license/provenance checks in `docs/05_CONTENT_LOCALIZATION.md`. The bundled examples come from eBible.org editions explicitly marked public domain and retain source URLs in each record.
