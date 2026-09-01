# Localization and licensed-content architecture

## Three independent choices

- UI locale: buttons, onboarding, quests, achievements, notifications, errors, privacy, and curriculum descriptions.
- Bible language: used for discovery/default typography/exercise rules.
- Translation: exact canonical text plus its license/provenance package.

A Swedish UI can therefore memorize a Chinese translation without changing the UI. Locale IDs are BCP 47 tags; script subtags distinguish `zh-Hans` and `zh-Hant`.

## UI localization

- No production user-facing string may be hard-coded. The MVP centralizes strings in `src/lib/i18n.ts`; phase 2 moves them to ICU message catalogs with plural/select/date support and extraction checks.
- Use semantic start/end layout, root `dir`, mirrored directional icons, and an Arabic/Hebrew pseudo-locale in CI even before an RTL Bible ships.
- Test text expansion at 30–50%, dynamic type, truncated German/Swedish labels, and mixed-script references.
- Store notification keys plus parameters, not rendered English text, so delivery renders in the current locale.
- Curriculum titles/descriptions are localization keys; verse text is never passed through UI translation.

## Exercise rules by language

- English/Swedish: Unicode words, locale-aware case folding, punctuation-insensitive comparison, optional diacritic policy configured per translation.
- Simplified/Traditional Chinese: `Intl.Segmenter` word segmentation when available; version and persist tokens at import time for deterministic exercises; character fallback only in private/dev mode.
- Word order uses stored source tokens, never runtime whitespace splitting.
- Speech scoring uses locale-specific ASR and aligns transcript tokens to canonical tokens. Low-confidence segments are “unscored,” not wrong.
- Punctuation, paragraph markers, divine-name spacing, footnotes, and alternate readings are typed metadata, not silently normalized into the canonical verse.

## Translation manifest

Every import must provide:

```json
{
  "translationId": "cuv-s",
  "name": "新标点和合本",
  "languageTag": "zh-Hans",
  "publicationYear": 1919,
  "edition": "cmn-cu89s",
  "copyrightHolder": null,
  "license": "Public Domain (source edition)",
  "jurisdictions": ["release counsel must confirm target markets"],
  "commercialUse": "allowed",
  "digitalUse": "allowed",
  "attribution": "Source: eBible.org, cmn-cu89s",
  "sourceUrl": "https://ebible.org/find/details.php?id=cmn-cu89s",
  "sourceChecksum": "required-at-import",
  "verifiedAt": "2026-08-31",
  "permissionExpiresAt": null,
  "publicBuild": true
}
```

Importer gates:

1. Manifest schema and approved translation ID.
2. Source checksum and immutable raw-source archive.
3. Book/chapter/verse completeness against canon metadata.
4. Duplicate/missing/out-of-range references.
5. Exact normalized hash per verse without altering stored canonical text.
6. Tokenization and round-trip offset validation.
7. License/public-build status and permission expiry.
8. Human spot-check and signed approval record.

An AI model may help write importer code or flag anomalies; it must never fill a missing verse, modernize spelling, or reconstruct protected text.

## Current translation decisions

### Bibel 2000

Svenska Bibelsällskapet’s current copyright page says a special agreement covers apps/services and publication must state permission and the specified attribution. Therefore:

- do not bundle Romans, Proverbs, or any substantial Bibel 2000 text in a public or shareable build without a signed digital license;
- keep only metadata/placeholders and make the unavailable state explicit;
- after permission, archive the signed agreement, exact supplied source, permitted platforms/regions/term, attribution, and renewal date;
- required attribution currently given by the source: `Texter ur Bibel 2000 © Svenska bibelsällskapet`.

Source: [Svenska Bibelsällskapet copyright guidance](https://www.xn--bibelsllskapet-bib.se/om-bibelsallskapet/copyright/).

### Chinese Union Version

The exact eBible.org source editions `cmn-cu89s` (Simplified) and `cmn-cu89t` (Traditional) are marked public domain and provide dated provenance. They are acceptable private-MVP sources, but the release checklist still requires counsel/provenance review for each target jurisdiction and confirmation that the package has not drifted into a later copyrighted revision.

Sources: [Simplified CUV source](https://ebible.org/find/details.php?id=cmn-cu89s), [Traditional CUV source](https://ebible.org/find/details.php?id=cmn-cu89t), [Simplified copyright record](https://ebible.org/cmn-cu89s/copyright.htm), and [Traditional copyright record](https://ebible.org/cmn-cu89t/copyright.htm).

### World English Bible

The bundled English content is the complete 66-book World English Bible protocanon edition, which eBible.org explicitly marks public domain. Its exact VPL source checksum and edition URL are retained. Source: [World English Bible record](https://ebible.org/bible/details.php?id=engwebp).

## Current full imports and adding another version

WEB, Simplified CUV and Traditional CUV are imported as complete 66-book local content packages. Reading, Memorization, Review, Challenge and Paths query these packages through the same `getVerse`/`getPassage` API. B2000 has metadata only and is disabled.

1. Acquire the approved VPL/USFM/USX source directly from the recorded provider.
2. Store raw files outside the app repository in access-controlled content storage.
3. Run the importer into a versioned content database/package.
4. Produce checksums, validation report, verse-count report, token package, manifest, and attribution artifact.
5. Have a human compare samples including headings, punctuation, verse bridges, and known edition markers.
6. Sign the manifest and publish the package only to allowed channels/regions.
7. The app swaps translation packages without changing curricula because curriculum groups reference canonical book/chapter/ranges, not embedded text.
