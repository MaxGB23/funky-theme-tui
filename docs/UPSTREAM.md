# Upstream theme watch

Pi is the only agent with a volatile upstream (`gentle-pi` on npm). This document defines what we
diff against it, how often, and how a tweak tested live in an install dir gets promoted into the
repo. Short rules live in AGENTS.md; the process lives here.

## What we watch, per agent

| Agent | Upstream source | What we diff | Tripwire | Cadence | Last revision |
| --- | --- | --- | --- | --- | --- |
| Pi | `gentle-pi` npm package, `themes/` inside `node_modules` | `Gentleman-Cute.json` **only** | `node scripts/check-upstream.mjs` after every package update (`VERSION DRIFT` / `DRIFT`) | on-update, no calendar | 2026-10-15 → 4.2.0 |
| OpenCode | none — our themes are ours. The official repo may add theme keys over time (exact source TBD, not asserted here) | keys only, against official defaults | calendar | quarterly, first pending | — |
| Claude Code | none — our themes are ours. Built-in themes (exact path TBD, not asserted here) | keys only, against built-ins | calendar | quarterly, first pending | — |

> Priority runtime: **gentle-shell** (Gentleman Programming's Pi-based shell). It shares Pi's
> theme keys as of 4.2.0 — recorded as the user's standing statement, not a verified fact. Watch
> item: if gentle-shell ever ships its own theme keys or format, it gains its own table row and its
> files land under `upstream/gentle-shell/`.
>
> `Gentleman` (non-Cute) is diffed **nowhere** — retired 2026-10-15, see below. TBD cells are gaps to
> fill on first review, never claims.

## Pi flow (the primary one)

1. **Detect.** After any `npm update gentle-pi` (or weekly if untouched), run
   `node scripts/check-upstream.mjs`. `VERSION DRIFT` or an upstream `DRIFT` row means a new generation
   landed. The hashing logic is described in SOURCES.md: every pinned file is hashed each run, so
   silence means nothing moved.
2. **Diff.** Old pinned content vs new on-disk files: added/renamed `vars`, changed `colors`
   indirections, `export` keys. Record bytes + SHA-256.
3. **Decide.** Which new keys matter to our mapping. Most upstream churn does not touch what the
   emitter consumes — 4.2.0 added 36 bytes upstream and changed **zero** emitted bytes. Default to
   no repo change; promote deliberately.
4. **Edit the source, never the output.** Palette tokens and `MAPPING` rows in
   `prototypes/build-prototypes.mjs`. Emitted `prototypes/*/*.json` are build outputs; hand-editing
   them is reverted on the next build (proven: build + clean `git status`).
5. **Rebuild + validate.** `node prototypes/build-prototypes.mjs`, then
   `node prototypes/validate-prototypes.mjs` (42 checks). Read the `git diff` to confirm exactly
   what moved.
6. **Install + live test.** Copy the rebuilt files into the install dirs and look at a real
   terminal. Checker warnings on a testing machine are legal; the manifest is truthful again before
   commit.

## Promotion flow (installed → repo)

The install dirs are the **lab**; the repo is the **truth**. Live testing means editing the
installed `funky-*.json` directly — the same flow as VS Code theme development — and that is
legitimate, with one load-bearing rule: **the lab has no memory**.

1. Before anything is overwritten, the assistant diffs each installed file against its repo-built
   counterpart **key by key** and reports every diff as `(slot, repo value, installed value)`.
2. The user says which diffs to promote ("pasa X al repo"). Nothing is promoted by default.
3. Each promoted diff is mapped back to its repo source — a palette token or a `MAPPING` row —
   implemented there, rebuilt, validated, and reinstalled for verification.
4. Non-promoted diffs stay in the lab and die on the next re-copy. This is stated out loud each
   time, so no experiment is lost by surprise.
5. Only the repo side is committed. Install dirs are never committed (and mostly gitignored).

## Retired: `Gentleman` (non-Cute) — 2026-10-15

Only Pi `Gentleman-Cute.json` is diffed. `Gentleman` is out of the review process everywhere:

- It was never upstream: `gentle-pi` ships `Gentle.json`, and our `Gentleman.json` was a renamed
  derivative (the on-disk copy is now byte-identical to `Gentle` 4.2.0 and stays as reference).
- Nothing reads it: no script references any `gentleman.json`, and the build never read any of
  them.
- The single `check-upstream.mjs` failure (`Gentleman installed MISSING`, exit 1) came from the
  manifest saying `installed:true` about a file deleted from the live machine. Resolved by
  recording the deletion (`installed:false`); the checker is green since (exit 0). If the file
  ever returns, the flag flips back — the row still exists, it just says `false`.
- Evidence stays: gitignored, hash-pinned in `sources.json`, reported as excluded. A clone lacking
  it is normal.

This closes the recurring "scripts error on gentleman" debt: there is nothing left to review
there.

## Proposed AGENTS.md rules

- Pi upstream is the only diff that matters, and only `Gentleman-Cute.json`. `Gentleman` is
  retired (see above).
- Install dirs are the lab, the repo is the truth. The assistant reports installed diffs
  key-by-key; the user picks what gets promoted; only the repo side commits.
- After every `gentle-pi` update: run the checker, re-pin on drift, record the date in the table
  above.
- OpenCode / Claude Code: quarterly key-checks against official sources only; update
  `Last revision` each time.
