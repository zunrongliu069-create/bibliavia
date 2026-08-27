# Technical architecture and database schema

## System shape

```text
Expo client (iOS / Android / web)
  ├─ UI + accessibility + i18n
  ├─ deterministic exercise generator
  ├─ adaptive scheduler (pure TypeScript)
  ├─ local content packages
  ├─ local progress/event store
  └─ outbox for future sync
                │ encrypted HTTPS
                ▼
Production API / worker
  ├─ authentication and consent
  ├─ sync/merge and backups
  ├─ authoritative XP/quests/leaderboards
  ├─ content manifest and license gates
  ├─ notification scheduling
  └─ privacy-safe analytics events
                │
                ▼
PostgreSQL + object storage + queue
```

The MVP implements the client layers with AsyncStorage for portable local persistence. Before a content-complete beta, migrate structured content, events, and mastery to SQLite on native and IndexedDB/SQLite-WASM or a repository-compatible web store. Keep the same repository interface so UI and scheduling remain platform-neutral. Expo currently documents SQLite persistence on Android/iOS/web, while noting web support and header requirements; production web hosting must be validated against that constraint.

## Modules in this repository

- `src/data`: license-aware translation metadata, source-linked starter verses, Romans/Proverbs curricula.
- `src/lib/scheduler.ts`: pure adaptive difficulty/stability/retrievability update and risk computation.
- `src/lib/tokenize.ts`: language-aware tokenization, recall comparison, and exercise prompts.
- `src/lib/xp.ts`: learning-linked reward calculation isolated for testing/server reuse.
- `src/store`: versioned local state and append-only review events.
- `src/screens`: daily loop, exercises, campaign, library, and settings.

## Production PostgreSQL schema

Identifiers are UUIDv7 or equivalent time-sortable random IDs. Bible text and user state are separate. Timestamps are UTC; the profile timezone determines learning-day boundaries.

```sql
create type mastery_stage as enum ('new','learning','familiar','strong','mastered');
create type review_grade as enum ('again','hard','good','easy');
create type content_status as enum ('draft','private','cleared','suspended');

create table app_user (
  id uuid primary key,
  created_at timestamptz not null default now(),
  timezone text not null,
  ui_locale text not null,
  bible_locale text,
  active_translation_id uuid,
  active_campaign_id uuid,
  age_band text,
  analytics_consent boolean not null default false,
  deleted_at timestamptz
);

create table translation (
  id uuid primary key,
  slug text unique not null,
  name text not null,
  abbreviation text not null,
  language_tag text not null,
  script_code text,
  publication_year integer,
  copyright_holder text,
  license_name text not null,
  jurisdictions jsonb not null default '[]',
  commercial_use text not null,
  digital_use text not null,
  attribution text,
  source_uri text not null,
  source_checksum text not null,
  verified_at timestamptz not null,
  permission_expires_at timestamptz,
  status content_status not null,
  manifest jsonb not null
);

create table book (
  id uuid primary key,
  osis_id text unique not null,
  canon_order integer not null,
  chapter_count integer not null
);

create table book_name (
  book_id uuid references book(id),
  language_tag text not null,
  name text not null,
  short_name text not null,
  primary key (book_id, language_tag)
);

create table verse (
  id uuid primary key,
  translation_id uuid not null references translation(id),
  book_id uuid not null references book(id),
  chapter integer not null check (chapter > 0),
  verse_start integer not null check (verse_start > 0),
  verse_end integer not null,
  text text not null,
  normalized_hash text not null,
  source_locator text not null,
  unique (translation_id, book_id, chapter, verse_start, verse_end)
);

create table verse_token (
  verse_id uuid references verse(id) on delete cascade,
  token_index integer not null,
  surface text not null,
  normalized text not null,
  token_type text not null,
  start_offset integer not null,
  end_offset integer not null,
  segmenter_version text not null,
  primary key (verse_id, token_index)
);

create table curriculum (
  id uuid primary key,
  slug text unique not null,
  title_key text not null,
  description_key text not null,
  version integer not null,
  published_at timestamptz
);

create table curriculum_unit (
  id uuid primary key,
  curriculum_id uuid references curriculum(id),
  parent_id uuid references curriculum_unit(id),
  unit_type text not null check (unit_type in ('book','chapter','lesson','group','test','boss','final')),
  position integer not null,
  title_key text not null,
  unlock_rule jsonb not null default '{}',
  assessment_rule jsonb not null default '{}'
);

create table curriculum_unit_verse (
  unit_id uuid references curriculum_unit(id),
  book_id uuid references book(id),
  chapter integer not null,
  verse_start integer not null,
  verse_end integer not null,
  position integer not null,
  primary key (unit_id, position)
);

create table user_mastery (
  user_id uuid references app_user(id),
  verse_id uuid references verse(id),
  stage mastery_stage not null,
  difficulty real not null check (difficulty between 1 and 10),
  stability_days real not null check (stability_days > 0),
  retrievability real not null check (retrievability between 0 and 1),
  due_at timestamptz not null,
  last_reviewed_at timestamptz,
  successful_recalls integer not null default 0,
  lapses integer not null default 0,
  hints_used integer not null default 0,
  average_accuracy real not null default 0,
  average_recall_ms real not null default 0,
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, verse_id)
);
create index user_mastery_due on user_mastery(user_id, due_at);

create table review_event (
  id uuid primary key,
  user_id uuid references app_user(id),
  device_id uuid not null,
  verse_id uuid references verse(id),
  client_created_at timestamptz not null,
  received_at timestamptz not null default now(),
  grade review_grade not null,
  exercise_mode text not null,
  accuracy real not null check (accuracy between 0 and 1),
  hints_used integer not null,
  recall_ms integer not null,
  transcript_confidence real,
  content_version text not null,
  idempotency_key text unique not null,
  server_validated boolean not null default false,
  xp_awarded integer not null default 0
);
create index review_event_user_time on review_event(user_id, client_created_at desc);

create table daily_progress (
  user_id uuid references app_user(id),
  learning_date date not null,
  qualifying_reviews integer not null default 0,
  perfect_recalls integer not null default 0,
  new_verses integer not null default 0,
  xp integer not null default 0,
  streak_qualified boolean not null default false,
  primary key (user_id, learning_date)
);

create table sync_device (
  id uuid primary key,
  user_id uuid references app_user(id),
  public_key text,
  last_cursor bigint not null default 0,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);
```

## Scheduling algorithm

The client implements a transparent D/S/R-inspired scheduler:

- Difficulty `D ∈ [1,10]` rises with failures/hints and falls with easy unaided recalls.
- Stability `S` approximates how long the memory decays slowly. Successful effortful retrieval increases it; failure sharply regresses it without deleting history.
- Retrievability `R(t,S) = (1 + t/S)^-1` estimates current recall probability.
- Quality blends grade, normalized text accuracy, and hint penalty. Recall time is stored now and can be calibrated by verse/token length later.
- Target retention determines the due interval. Production should replace the MVP interval transform with the current tested FSRS implementation and optimize parameters only after enough clean history; the schema already carries compatible state.
- Mastery is presentation derived from stability plus successful recalls. Production promotion adds minimum delayed, unaided events.

The open FSRS project documents the same difficulty/stability/retrievability concepts and trainable forgetting curve: [FSRS algorithm](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm).

## Offline sync and conflict resolution

1. Review events are immutable and globally idempotent. The client writes locally before updating UI.
2. The outbox uploads events in order when online; retries reuse the idempotency key.
3. Server validates timestamps, content versions, XP limits, and impossible event rates.
4. Server deterministically replays all unseen events per verse to produce authoritative mastery. It does not last-write-win derived mastery.
5. Profile/settings use field-level last-write-wins with server timestamp; destructive preference conflicts are surfaced.
6. A signed server snapshot and event cursor return to every device. Clients retain unsynced events until acknowledged.
7. Nightly encrypted backups plus user JSON/CSV export protect long-lived history.

## Security and privacy

- Passkeys/OIDC or magic links; short-lived access tokens; refresh tokens in OS secure storage.
- Row-level authorization on every user table. Service keys never ship in the client.
- Server-authoritative XP, streak qualification, achievements, purchases, and leaderboards.
- Rate limits, device/session revocation, audit logs for privileged content operations, signed content manifests, checksum verification, and dependency scanning.
- Data minimization: no denomination, prayer content, contacts, precise location, or advertising ID by default.
- GDPR flows: purpose-specific consent, access/export, correction, deletion, retention schedule, processor register, breach process, EU hosting preference, and child/teen age-band design.
- Social ships only with private-by-default profiles, invitation controls, block/report, moderation queue, abuse rate limits, and a completed child-safety review.

## Testing strategy

- Unit: scheduler invariants, grade/hint effects, XP farming, timezones/streaks, tokenization, exact import hashes.
- Property-based: event replay determinism, interval bounds, no NaN/negative state, monotonic time.
- Integration: migrations, offline outbox, duplicate events, conflict replay, corrupted/missing content, deletion/export.
- Contract: content manifest validation, auth boundaries, API idempotency, analytics consent.
- UI/E2E: four locales, Chinese scripts, RTL test locale, dynamic type, screen reader, keyboard, reduced motion, small/large devices, offline launch.
- Release: restore a multi-year synthetic account from backup and reproduce its mastery checksum before every schema/scheduler migration.
