# Minimal-token development policy

For every new request:

1. Reduce the request to one active subsystem. Process broad requests sequentially; never mix systems.
2. Search with `rg` first. Read only matching sections, normally no more than 120 lines per file.
3. Keep command output small (usually 4,000 tokens or less). Never dump whole large files.
4. Reuse known project context; do not reread specifications or files unless the relevant code changed.
5. Patch only the smallest relevant hunks. Do not refactor, reformat, or document unrelated code.
6. Run Prettier only on files actually edited and only when formatting is needed.
7. Run the smallest relevant test file first. Run `npm run verify` only once, at final handoff.
8. Use browser inspection only when visual behavior cannot be verified from code and tests.
9. Keep rules and probabilities in typed configuration objects, not JSX.
10. Keep progress updates and final responses extremely short unless details are requested.

Before any potentially large operation, choose the lower-token alternative. Avoid repeated checks, failed speculative patches, broad file dumps, duplicate components, and full-project formatting.
