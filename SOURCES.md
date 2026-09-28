# Gentleman theme sources

## Read this first

This repo holds **our own copies** of the Gentleman themes. It is the working source of truth we
edit. It is **not** a mirror of any upstream, and for two of the three agents there is no upstream
at all.

Of the three agents, only **Pi** has a real upstream (`gentle-pi` on npm). The Claude Code and
OpenCode themes are entirely our own work.

> **Where the artifacts actually live.** All six of our theme files are under **`material-trabajo\`**,
> not at the repo root:
>
> | Agent | Path |
> | --- | --- |
> | Claude Code | `material-trabajo\claude-code\gentleman.json`, `…\gentleman-cute.json` |
> | OpenCode | `material-trabajo\opencode\gentleman.json`, `…\gentleman-cute.json` |
> | Pi | `material-trabajo\pi\Gentleman.json`, `…\Gentleman-Cute.json` |
>
> The **hashes in this document were always correct.** What was wrong was the *paths*: the
> manifest pointed at the pre-`material-trabajo` locations, so the checker reported 6 spurious
> `MISSING` rows and this document carried a false "the artifacts are gone" section. Both are
> fixed as of 2026-09-27. `node check-upstream.mjs` is green — currently **28 ok, 0 warnings,
> 0 failures** (19 → 24 when D8 added the prototype build's own inputs, 24 → 28 when the vendored
> base templates were reclassified as excluded references). See *Resolved: the spurious MISSING
> reports* and *D8* below.
>
> **Those six files are IGNORED, not deleted.** They stay on disk. `.gitignore` keeps them out of
> every commit and `sources.json` hash-pins all six, so the exclusion is auditable — a clone that
> lacks them is normal and the checker says so instead of going red. See *D8*.

> **Pi resolves themes from two paths,** and a stale copy used to collide with the maintained
> upstream one. Resolved by deletion. See *Two theme search paths* and *Installed copy of
> `Gentleman-Cute` — DELETED 2026-09-27*.

---

## Agent: Claude Code

| Field | Value |
| --- | --- |
| Runtime | `@anthropic-ai/claude-code` |
| Version | `2.1.280` |
| Upstream | **none** — no official Gentleman theme exists for Claude Code |
| Search path | `~\.claude\themes\<slug>.json` (one file per theme) |
| Install dir exists | **yes** — created 2026-09-27 |
| Requested theme | `custom:funky-dark-prototype` — was `gentleman` until 2026-09-27 07:00, changed by the user |

### Identity and format

The theme format for `2.1.280` is a nested object with an `overrides` map:

```json
{ "name": "gentleman", "base": "dark", "overrides": { "<slot>": "rgb(r,g,b)" } }
```

- The base theme has **72 slots**. Our files set all 72 with `rgb()` values, zero hex.
- Legal `base` values: `dark`, `light`, `light-daltonized`, `dark-daltonized`, `light-ansi`,
  `dark-ansi`.
- Per-file cap: 256 KB.
- Unknown slots and malformed colors are **silently dropped** — no warning.

A **flat map is wrong here.** The loader reads only `overrides`. A flat map parses without error,
yields `overrides: undefined`, and renders as default dark with zero diagnostics.

### Install state — live, and the dangling reference is now moot

> **RESOLVED by the user, not by maintenance.** This section previously reported an unresolved
> dangling reference: `settings.json` requested `gentleman` while no `gentleman.json` was installed.
> As of 2026-09-27 07:00 `settings.json` requests `custom:funky-dark-prototype` instead, so the
> `gentleman` copy below is **not** required for Claude Code to render a real theme — and
> `gentleman.json` is still **not** installed here.
>
> ```powershell
> Copy-Item .\material-trabajo\claude-code\gentleman.json "$env:USERPROFILE\.claude\themes\gentleman.json"
> ```
>
> That copy has deliberately **not** been done. If you want `gentleman` back as an option, run the
> line above; it is a one-file change and touches no setting.

- `~\.claude\plugins\` does not exist.
- `~\.claude.json` contains no plugin, marketplace, or theme keys.
- In-app references are `custom:gentleman` and `custom:gentleman-cute`.

### Our artifacts

| File | Bytes | SHA256 (first 16) |
| --- | --- | --- |
| `material-trabajo\claude-code\gentleman.json` | 3105 | `ED90D7AF3C097DBB7` |
| `material-trabajo\claude-code\gentleman-cute.json` | 3138 | `F8BDBF818033C26E` |

The binary is a native Bun/SEA executable at
`M:\.pnpm-global\v11\...\node_modules\@anthropic-ai\claude-code\bin\claude.exe`. There is no
`cli.js` in the package.

---

## Agent: OpenCode

| Field | Value |
| --- | --- |
| Install path | `~\.config\opencode\themes\` (exists) |
| Config | `~\.config\opencode\opencode.json` (171377 bytes) |
| Upstream | **none** — no `gentle-*` package installed |
| Project-level theme | none — `M:\vscode-themes\funky-theme-tui\.opencode` does not exist |
| Requested theme | `gentleman` (`opencode.json` line 366) |

### Identity and format

Flat map of about 50 color tokens with hex values, wrapped in a `theme` key:

```json
{ "$schema": "https://opencode.ai/theme.json", "theme": { "<token>": "#RRGGBB" } }
```

- Our files set **50 tokens**. Representative tokens: `accent`, `backgroundElement`,
  `backgroundPanel`, `primary`, `secondary`, `text`, `textMuted`, `error`, `warning`, `success`,
  `info`, `border`, `borderActive`, `borderSubtle`, `syntax*`, `markdown*`, `diff*`.
- `opencode.json` has top-level keys `$schema, agent, default_agent, mcp, permission, share,
  theme`. There is **no** `plugin` key. `opencode.jsonc` does not exist.
- `~/.config/opencode/package.json` dependencies are `@opencode-ai/plugin`,
  `opencode-sdd-engram-manage`, `opencode-subagent-statusline`, `unique-names-generator`. The
  `plugins\` directory (7 `.ts` files) and `tui-plugins/gentle-logo.tsx` ship no themes.

### Install state

Both themes are installed and **byte-identical to our `material-trabajo\opencode\` copies**.

| File | Bytes | SHA256 (first 16) |
| --- | --- | --- |
| `gentleman.json` | 1660 | `1F09532AC91B066A` |
| `gentleman-cute.json` | 1660 | `B681E9860137BB48` |

---

## Agent: Pi

| Field | Value |
| --- | --- |
| Executable | `Get-Command pi` -> `M:\.pnpm-global\bin\pi.ps1` |
| `gentle-pi` on PATH | not found |
| Installed themes | `~\.pi\agent\themes\` (exists) |
| Settings | `~\.pi\agent\settings.json` -> `"theme": "funky-dark-prototype"` (was `Gentleman-Cute` until 2026-09-27 07:15, changed by the user) |
| Packages | includes `npm:gentle-pi` |
| Upstream | **yes** — `gentle-pi` `3.7.0` |

### Upstream — VOLATILE

> **VOLATILE.** The upstream themes live inside `node_modules` at
> `~\.pi\agent\npm\node_modules\gentle-pi\themes\`. `npm update gentle-pi` silently
> **replaces** that directory. The durable citation is the git URL plus tag, not this path.

| Field | Value |
| --- | --- |
| Package | `gentle-pi` |
| Version on disk | `3.7.0` |
| Repository | `git+https://github.com/Gentleman-Programming/gentle-shell.git` |
| Themes path | `~\.pi\agent\npm\node_modules\gentle-pi\themes\` |
| Ships via | the package `files` field includes `themes/` |
| Loaded by | `settings.json` -> `"packages": ["npm:gentle-pi", ...]` plus `gentle-shell`'s explicit `--theme <packageRoot>/themes` |

Upstream files present on disk (mtime 2026-09-27, installed with `gentle-pi` 3.7.0):

| File | Bytes | SHA256 (first 16) |
| --- | --- | --- |
| `Gentle.json` | 2840 | `64BF2F75DEACBFEC` |
| `Gentleman-Cute.json` | 2635 | `8BCDCB7E21463AC5` |
| `Gentleman-Sexy.json` | 2615 | `F1E97AB82B38C675` |

`gentle-pi`'s postinstall script (`scripts/install-gentle-ai.mjs`) contains no theme logic — it
never writes to `~/.pi/agent/themes/`. A package update **will not** restore the deleted
`Gentleman-Cute.json` there; it **will** replace these reference copies.

### Two theme search paths

Pi resolves themes from **both** of these, and both were live until 2026-09-27:

1. `~/.pi/agent/themes/` — the agent's own theme directory.
2. `<package>/themes/` for every package declared in `settings.json` — so
   `~/.pi/agent/npm/node_modules/gentle-pi/themes/`.

They are **additive, not shadowing**. A name present in both is ambiguous, which is how a stale
copy ends up rendering while the maintained one sits untouched in `node_modules`. Keep
`~/.pi/agent/themes/` free of names that upstream already ships.

### Identity and format

Top-level keys `$schema`, `name`, `vars`, `colors`, `export`:

- `vars` — the hex palette. Entry count varies per file: 19 to 36. Example entries:
  `bg=#060407`, `bgPanel=#100A0F`, `bgElement=#100A0F`, `bgSubtle=#100A0F`.

> **Correction — the elevation ladder is 2 steps, not 3.** In `gentle-pi` 3.7.0 `bgPanel`,
> `bgElement` **and** `bgSubtle` are all `#100A0F`; only `bg` `#060407` differs. So Gentleman-Cute
> offers exactly **one** usable elevation shift, and `bgSubtle` is a misleading name because it
> equals `bgPanel`. Any plan that needs a second surface level has to invent it. By contrast Gentle
> has `bg == bgPanel == bgElement`, i.e. **zero** shifts — which is the real reason Gentleman-Cute
> was chosen as the base, and a weaker reason than "it has a ladder".
- `colors` — semantic slots whose values are **var-NAME indirections, not colors**. Example:
  `accent=accent`, `borderAccent=primary`, `borderMuted=borderSubtle`, `success=mint`. This
  indirection layer is unique to Pi. Entry count varies per file: 51 to 56.
- `export` — 3 keys: `pageBg`, `cardBg`, `infoBg`.
- `$schema` — `https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/src/modes/interactive/theme/theme-schema.json`
- Values are `#RRGGBB`; zero `rgb()`.

**Thinking-intensity slots are named, not numbered:** `thinkingText`, `thinkingOff`,
`thinkingMinimal`, `thinkingLow`, `thinkingMedium`, `thinkingHigh`, `thinkingXhigh`, `thinkingMax`.
Any earlier note in this project claiming `thinking1` through `thinking8` is **wrong** — do not
repeat it.

The intensity ramp is an ordered indirection chain through `vars`. Upstream `Gentleman-Sexy.json`
uses:

```
borderSubtle -> dim -> muted -> powderBlue -> violet -> activePink -> accent
  thinkingOff   Minimal     Low       Medium       High      Xhigh       Max
```

### Installed copy of `Gentleman-Cute` — DELETED 2026-09-27

`~/.pi/agent/themes/Gentleman-Cute.json` was **deleted on 2026-09-27** so the maintained upstream
copy is the only `Gentleman-Cute` in the search path. Do not reinstall it.

| | Value |
| --- | --- |
| Deleted file | `~/.pi/agent/themes/Gentleman-Cute.json` |
| Bytes | 2435 |
| SHA256 | `F1B89B56E9DB3BA481F77B7E4F7F35F2693BA2C72B1C563029BF05C22D16EA77` |
| mtime | 2026-09-25 14:56 |
| Replaced by | `gentle-pi/themes/Gentleman-Cute.json` — `8BCDCB7E…`, mtime 2026-09-27 |

**Why it was safe to delete:** `~/.pi/agent/themes/` and `node_modules/gentle-pi/themes/` are two
independent search paths, not one shadowing the other. `settings.json` declares `npm:gentle-pi`, and
`gentle-shell` injects `--theme <packageRoot>/themes` explicitly
(`lib/gentle-shell-launcher.ts:878`). The name still resolves after the delete.

**What the deleted file actually was — corrected.** It was **not** our re-authoring. It was an
**older generation of the upstream theme itself**, hand-copied two days before `gentle-pi` 3.7.0
landed. Evidence: its `vars` still use the previous generation's functional slot names (`panel`,
`element`, `success`, `info`, `heading`, `code`, `synFunction`, `synOperator`, `addBg`, `removeBg`,
`accentBright`), which upstream no longer ships. Only **two values** differed from current upstream:
`border` `#342230` → `#563040` and `borderSubtle` `#241822` → `#2A1720`. Text, muted, dim, accent
and the warning/error family were identical.

> **Two `Gentleman-Cute` files used to collide** across those two search paths. That is the same
> failure class as the backlog quoting Gentle hexes while naming Gentleman-Cute: reading the wrong
> file and trusting it. Always resolve the maintained copy inside `node_modules` first.

### `material-trabajo\pi\Gentleman.json` — provenance unknown

| File | Bytes | SHA256 (first 16) |
| --- | --- | --- |
| `material-trabajo\pi\Gentleman.json` | 2629 | `7C3B8C584585955F` |

> **Provenance unknown / not verified.** There is **no upstream `Gentleman.json`** — upstream ships
> `Gentle.json`, not `Gentleman.json`. Our `material-trabajo\pi\Gentleman.json` is a renamed
> derivative of unknown provenance. Do not guess at its origin.

Upstream and ours differ by **vocabulary**, not just values. Upstream uses semantic names
(`deepPink`, `champagne`, `violet`, `pearl`, `softRose`, `powderBlue`); ours use functional names
(`primary`, `secondary`, `hunk`, `emph`, `str`, `num`, `synType`). Ours are **re-authored, not
re-colored**.

---

## What is ours vs what is upstream

| Agent | File | Origin | Upstream? |
| --- | --- | --- | --- |
| Claude Code | `material-trabajo\claude-code\gentleman.json` | ours | no upstream exists |
| Claude Code | `material-trabajo\claude-code\gentleman-cute.json` | ours | no upstream exists |
| OpenCode | `material-trabajo\opencode\gentleman.json` | ours | no upstream exists |
| OpenCode | `material-trabajo\opencode\gentleman-cute.json` | ours | no upstream exists |
| Pi | `material-trabajo\pi\Gentleman.json` | ours | renamed derivative, **origin unverified** |
| Pi | `material-trabajo\pi\Gentleman-Cute.json` | **stale upstream generation** | was a collision, not our work |
| Pi | `gentle-pi/themes/Gentle.json` | upstream | yes |
| Pi | `gentle-pi/themes/Gentleman-Cute.json` | upstream | yes — **this is what Pi rendered until 2026-09-27 07:15; since then Pi renders `funky-dark-prototype`** |
| Pi | `gentle-pi/themes/Gentleman-Sexy.json` | upstream | yes |

The two installed OpenCode files are SHA256-identical to our `material-trabajo\opencode\` copies. The
one remaining installed Pi file, `~/.pi/agent/themes/Gentleman.json`, is a renamed derivative of
unknown provenance. Pi's theme setting now points at `funky-dark-prototype`, so **no Gentleman
theme is currently rendering in any agent** — the live theme is the Funky `dark` prototype in Claude
Code and Pi, and `gentleman` in OpenCode.

---

## Funky prototypes — INSTALLED for live testing 2026-09-27

Eight generated prototypes are copied into the live agent theme directories so they can be looked at
in a real terminal. **These are prototypes, not deliverables.** The `-prototype` suffix is
load-bearing: it makes cleanup a single glob and stops anyone mistaking one for a theme we intend
to ship.

| Agent | Install dir | Variants |
| --- | --- | --- |
| Claude Code | `~\.claude\themes\` (**created** for this) | `dark`, `darker` |
| OpenCode | `~\.config\opencode\themes\` | `dark`, `darker`, `dark-transparent`, `darker-transparent` |
| Pi | `~\.pi\agent\themes\` | `dark`, `darker` |

| File | Bytes | SHA256 (first 16) |
| --- | --- | --- |
| Claude `funky-dark-prototype.json` | 3137 | `ECCC2561910EC05C3` |
| Claude `funky-darker-prototype.json` | 3131 | `730AC892DF827AFC` |
| OpenCode `funky-dark-prototype.json` | 1663 | `66D2200E51BBA43D` |
| OpenCode `funky-darker-prototype.json` | 1663 | `EF31E40A0E38D0A4` |
| OpenCode `funky-dark-transparent-prototype.json` | 1660 | `9826A8416995B90E` |
| OpenCode `funky-darker-transparent-prototype.json` | 1660 | `072FB82C03F98771` |
| Pi `funky-dark-prototype.json` | 2640 | `1C10B9A9BDE8AE8D` |
| Pi `funky-darker-prototype.json` | 2642 | `C52E268A39C25D08` |

Re-hashed 2026-09-27 after the D7 re-tiering; every hash above changed, because D7 changes a
canvas value in all 8 files. All eight were re-verified SHA256-identical to the `prototypes\`
output at copy time. **No pre-existing file was overwritten** — the two OpenCode themes and Pi's
`Gentleman.json` were re-hashed after the copy and are unchanged.

These names do **not** collide with upstream: `gentle-pi` ships `Gentle`, `Gentleman-Cute` and
`Gentleman-Sexy`, none of which is called `funky-*-prototype`.

### D8 - the prototypes build no longer reads a vendored template

`prototypes/build-prototypes.mjs` used to read two files from `material-trabajo/` as generator
input. Those files are another project's work and are not being committed, so **the build's
dependency on them is gone** — replaced by structural stubs that live in the repo.

| | Path | Bytes | SHA256 |
| --- | --- | --- | --- |
| Stub (build input) | `prototypes\templates\claude-code.json` | 2749 | `64050de6a8943997` |
| Stub (build input) | `prototypes\templates\opencode.json` | 1660 | `f87a7015f4b63db3` |
| Excluded reference | `material-trabajo\claude-code\gentleman-cute.json` | 3138 | `f8bdbf818033c26e` |
| Excluded reference | `material-trabajo\opencode\gentleman-cute.json` | 1660 | `b681e9860137bb48` |
| Excluded reference | `material-trabajo\claude-code\gentleman.json` | 3105 | `ed90d7af3c097dbb` |
| Excluded reference | `material-trabajo\opencode\gentleman.json` | 1660 | `1f09532ac91b066a` |
| Excluded reference | `material-trabajo\pi\Gentleman-Cute.json` | 2435 | `f1b89b56e9db3ba4` |
| Excluded reference | `material-trabajo\pi\Gentleman.json` | 2629 | `7c3b8c584585955f` |

**What a stub is.** Derived from the real template by walking the parsed JSON and replacing every
*colour literal* with a sentinel. Every key, every nesting level, every array length and every
non-colour string is preserved, and key order is preserved too — both emitters iterate the
template's keys and write the output in that order, so a reordered stub would reorder the emitted
JSON. The stubs were **derived programmatically, never hand-written**, and the derivation asserts
structural identity against the real template rather than assuming it.

**The proof that they are equivalent.** Baseline build, then stub build, then byte-for-byte
comparison of all 8 emitted files: **8/8 byte-for-byte identical.** No token diverged. The
vendored templates contributed slot vocabulary and **zero colour**. Run under two sentinel forms —
`#000000` everywhere, and format-preserving (`rgb(0,0,0)` for Claude Code, `#000000` for
OpenCode) — and identical under both. The committed form is the format-preserving one, because a
stub showing hex where Claude Code uses `rgb(r,g,b)` would be a false claim about the format.

**Two strings survive the rewrite on purpose**, because they are not colours and both are load
bearing: OpenCode's `$schema` (copied verbatim into every emitted file) and `background: "none"`
(the terminal pass-through token the transparent variants emit unchanged).

**The 7 background-bearing slots.** Exactly 7 of Claude Code's 72 slots are near-black surfaces in
the real template; in the stub all 72 are one sentinel. The build resolves every one of them by KEY
from `MAPPING`, which is why the swap changed nothing — and `criterion-template-provenance` now
asserts both halves permanently (the keys survive **and** the builder names all 7 in `MAPPING`).

**Pi is untouched.** It still reads real upstream from
`~/.pi/agent/npm/node_modules/gentle-pi/themes/Gentleman-Cute.json`. Stubbing genuine upstream would
be theatre, not independence.

#### All six vendored templates are one category, and they are ignored, not deleted

The first version of D8 reclassified **two** of the six vendored files and left the other four
tracked as `artifacts`. That was the inconsistency: an artifact row hard-fails when its file is
missing, so on any clone that did not have the vendored copies the checker went red on four files
whose absence was perfectly legal — and it looked like the fix was to delete them. **The files were
never to be deleted.** The fix is the classification.

All six are now `excluded-reference` in `excludedFromBuild`, each with its hash, so:

- **absence is expected, not a failure** — the row says `absent`, names why the file is not a
  build input, and names the stub or upstream path that took its place;
- **the exclusion stays auditable** — every file is hash-pinned, so a vendored file that is edited
  locally reports `EVIDENCE DRIFT` rather than silently changing meaning;
- **`.gitignore` keeps all six out of every commit** while they stay on disk, and
  `material-trabajo/vscode-themes/maxiano-*.json` (146,622 bytes of compiled upstream output that
  no part of the pipeline reads) with them.

Only **three of the six have a real replacement**, and the other three say `replacedBy: null`
explicitly rather than leaving it implied:

| Excluded reference | Replaced by | Why it is absent-tolerant |
| --- | --- | --- |
| `claude-code/gentleman-cute.json` | `prototypes/templates/claude-code.json` | was a build input; the stub proved equivalent |
| `opencode/gentleman-cute.json` | `prototypes/templates/opencode.json` | was a build input; the stub proved equivalent |
| `pi/Gentleman-Cute.json` | `~/.pi/.../gentle-pi/themes/Gentleman-Cute.json` | a stale copy; the build reads the live upstream |
| `claude-code/gentleman.json` | **nothing** | the build never read it |
| `opencode/gentleman.json` | **nothing** | the build never read it |
| `pi/Gentleman.json` | **nothing** | the build never read it; upstream ships `Gentle.json`, not this |

> **Presence, required-ness and committed-ness are three different facts, and so is `installed`.**
> The `installed` flag on each of these six rows describes the **user's live machine**, read from
> `installPath` — it is never derived from `repoPath`. So `opencode/gentleman` and `pi/Gentleman`,
> both `installed: true`, keep reporting `ok` on a clone that has neither vendored file, and an
> absent reference can never contradict a true `installed` flag. All six flags are unchanged from
> before this pass; none was dropped or flipped. The two sections record the same file, so the
> checker **cross-checks that both copies of the hash agree** and fails loudly if they ever diverge.

**The manifest separates three kinds of file**, because D8 introduced one whose absence is the
goal: `artifacts` and `buildInputs` fail when missing, `excludedFromBuild` reports absence as
**expected**. All six vendored templates are in the third kind, which is why an agent's `repo` row
for one of them reads `excluded` instead of `MISSING` and points here for the full report.

#### Proved by removing the files, not by reasoning

Both modes were exercised on the real tree, by moving files away and restoring them:

- **All six vendored files absent** → `28 checks, 28 ok, 0 failures`, exit `0`. The three
  `installed: true` rows still read `ok` with the right hash. Each excluded row reported
  `absent`, `kept on disk, never committed`, and its replacement.
- **A real build input absent** (`prototypes/templates/claude-code.json`) in the *same run* →
  `MISSING` on that row, `28 checks, 27 ok, 1 failure`, exit `1`.

The two modes are not the same code path, and that is the point: an absent excluded reference must
never print `MISSING`, because `MISSING` is the one signal this script has. All six files were put
back and re-hashed afterwards — **7/7 hashes identical** to the pre-test baseline.

### The surface ladder — D7, re-tiered 2026-09-27

The two tiers are **not** the palette and its darkened copy any more. They are two steps of a
three-step chain, and the palette itself is now the unshipped top of it.

| Chain step | Role | Shipped as | base | deep | elevated |
| --- | --- | --- | --- | --- | --- |
| 0 | reference | **not shipped** | `#24212e` luma 35.38 | `#211e2b` luma 32.38 | `#2e2a3a` luma 45.02 |
| 1 | shipped | `dark` | `#181520` luma 23.15 | `#121018` luma 17.51 | `#201d2a` luma 31.38 |
| 2 | shipped | `darker` | `#0a0910` luma 10.10 | `#060509` luma 5.75 | `#13111a` luma 18.62 |

What that changes for a user: **`dark` is now a genuinely dark theme** (it paints what `darker`
used to paint), and **`darker` is near-black** (base luma 10.10, against a 12 threshold the
validator asserts). Before D7, `dark` was the palette's `#24212e`.

The chain is walked, not looked up. `0→1` is transcribed from upstream `build.js`
(`darkerBackgrounds`, 7 entries). **`1→2` is declared in our own builder and has no upstream** —
`build.js` only ever darkened the palette once. It covers exactly the three surfaces and nothing
else.

Three consequences that are decisions, not derivations:

- **`#544f64` (`borderSubtle`) stays at both tiers.** The chain declares no step-2 value for
  `guideMid`, and inventing one is a visual judgement nobody has made. This is the clearest
  evidence the chain is real and not a rename.
- **`accentFaint` takes alpha `0x30` at *both* shipped steps.** Upstream raises 0x2a→0x30 because a
  darker canvas needs more alpha. After D7 both shipped tiers are below the step-0 reference, so
  both take 0x30 — and step 2 **reuses** 0x30 rather than raising it further, because how bright an
  accent should glow against almost nothing is a visual judgement, not a build default.
- **The diff washes and the two syntax hues stayed TIER-keyed, not chain-keyed.** D7 ruled on the
  `accentFaint` alpha and on the surfaces; it did not rule on these. Converting them to chain links
  would have been a silent extra decision. **These are the open points to review** if you want the
  chain to own everything.

`semantic-ladder` asserts the ladder is strictly descending on every rung, that the three rungs
stay distinct at all three steps, and that the deepest shipped base is under the near-black
threshold. `source-chain` asserts step 0 is the palette, that each step's declared surfaces are
what the chain actually produces, and that the `1→2` link covers exactly three values.

> **The 5.75 vs 5.76 discrepancy.** The brief specified `deep` luma `5.76` for step 2. The colour is
> exactly as specified (`#060509`); only the printed number differs, and the cause is a float.
> Rec. 601 on `r=6, g=5, b=9` is `1.794 + 2.935 + 1.026 = 5.755` in exact arithmetic — but
> `0.587 * 5` evaluates to `2.9349999999999996` in IEEE-754, pulling the total to
> `5.754999999999999`, just under the halfway point, so rounding to two decimals yields **5.75**
> where exact arithmetic would give 5.76. `color-math.mjs` was **not** changed: the same function
> grades every other surface in the project, and re-tuning it to print 5.76 would move values
> nothing in D7 asked to move. The colour is correct; the digit is a rounding artefact.

### Transparency exists only in OpenCode — and this is a format limit, not an omission

A `-transparent` variant is emitted for **OpenCode only**, because OpenCode's `background` token is
the literal string `"none"`, meaning *do not paint the canvas, let the terminal show through*. The
two transparent files differ from their solid siblings in **exactly one key**:

```
dark    background: #181520 -> "none"     (chain step 1)
darker  background: #0a0910 -> "none"     (chain step 2)
```

The other two agents **cannot express transparency at all**, and emitting `"none"` at them would be
actively wrong rather than merely redundant:

- **Claude Code** has seven background-bearing slots — `background`, `composerSidebarBackground`,
  `memoryBackgroundColor`, `userMessageBackground`, `userMessageBackgroundHover`,
  `clawd_background`, `bashMessageBackgroundColor` — and every one is an explicit `rgb(r,g,b)`.
  There is no pass-through sentinel, and **malformed colours are silently dropped with no warning**,
  so `"none"` would not make the canvas transparent; it would drop the slot and fall back to the
  default dark, a completely different colour.
- **Pi** expresses its canvas through `export.pageBg -> bg` and `export.cardBg -> bgElement`, both
  indirections to real `vars` values. Again no pass-through.

So Claude Code and Pi ship 2 solid variants each. Two validator checks hold the scope:
`semantic-transparency-scope` asserts that `"none"` appears in no emitted Claude Code or Pi file,
and that every transparent file differs from its solid sibling in exactly one key;
`criterion-4-surfaces` additionally pins the 4 **solid** OpenCode `background` slots to their own
tier's base surface.

> **Why that second assertion exists — found by mutation, not by reading.** D7 left one hole:
> OpenCode's solid `background` was in no rung list, because a transparent file holds `"none"`
> there and the two cannot be one constant. Re-pointing a *solid* `background` at the deep surface
> therefore changed no rung and failed nothing. `criterion-4-surfaces` now pins it, which is what
> makes "the transparent variant follows its own tier" testable from both ends: the transparent
> file equals its solid sibling except on that key, and the solid sibling paints the tier's base.

> **A note on what "solid" used to mean here.** The first build made OpenCode's `background`
> `passThrough` unconditionally, so the two solid OpenCode files were also transparent — the
> `-transparent` variants are byte-identical to what the solid ones used to be. Solid OpenCode is a
> **behaviour change**, made deliberately: a transparent base voids exactly the rung that
> distinguishes `dark` from `darker` (`#181520` luma 23.15 vs `#0a0910` luma 10.10, after D7).

### Activating one

Filename and internal `name` are made identical on purpose, so a theme resolves whether the agent
matches the **filename** or the **`name` field** — which is not knowable from the outside. Upstream
sets the precedent: `~/.pi/agent/themes/Gentleman.json` carries the internal name `Gentleman`.

Set the corresponding setting to the slug:

| Agent | File to edit | Key | Current value (verified 2026-09-27 19:39) |
| --- | --- | --- | --- |
| Claude Code | `~\.claude\settings.json` | `theme` | `custom:funky-dark-prototype` — **live** |
| OpenCode | `~\.config\opencode\opencode.json` | `theme` | `gentleman` |
| Pi | `~\.pi\agent\settings.json` | `theme` | `funky-dark-prototype` — **live** |

Change it to the variant slug — but note the value format is **per agent**, and Claude Code is not
the bare slug:

| Agent | Value to use |
| --- | --- |
| Claude Code | `custom:funky-dark-prototype` — the `custom:` prefix is **required** |
| OpenCode | `funky-dark-prototype` — bare slug |
| Pi | `funky-dark-prototype` — bare slug |

So the variants are `funky-dark-prototype` / `funky-darker-prototype`, and for OpenCode only also
`funky-dark-transparent-prototype` / `funky-darker-transparent-prototype`. This is not a
guesswork assumption: the two `custom:funky-dark-prototype` and `funky-dark-prototype` values above
were read back from the live settings, where they are already rendering. Reverting is the same edit
with the old value. **The D7 re-tiering work did not touch any settings file** — swapping the live
theme is a user decision.

> **A theme file change needs an agent restart.** Claude Code and Pi were pointed at
> `funky-dark-prototype` *before* D7 reinstalled the re-tiered files, so what is on screen right now
> is the pre-D7 ladder. Restart both to see step 1 `#181520` / step 2 `#0a0910`.

> **Correction — the two rows above were stale when this table was written.** It previously claimed
> Claude Code requested `gentleman` and Pi requested `Gentleman-Cute`. Both were changed to
> `funky-dark-prototype` **by the user**, at 07:00 and 07:15 on 2026-09-27; the D7 install wrote
> only the 8 theme files, at 07:37, and left every `settings.json` and `opencode.json` alone
> (`opencode.json` mtime is still 2026-09-26). So the `funky-dark-prototype` prototype is currently
> **rendering live in Claude Code and Pi** — which is the point of installing it, and is the reason
> the D7 re-tiering is visible on screen rather than only in a diff.

### Removing them

```powershell
Remove-Item "$env:USERPROFILE\.claude\themes\funky-*-prototype.json", `
            "$env:USERPROFILE\.config\opencode\themes\funky-*-prototype.json", `
            "$env:USERPROFILE\.pi\agent\themes\funky-*-prototype.json"
```

The `~/.claude\themes` directory itself was created for this and can be removed if left empty.

### D9 - no committed build input carries the vendored project's identity as data

The rule is that **nothing carrying another project's identity may be committed**. A document
*citing* the vendored project is fine and is the audit trail this file is; a **build input carrying it
as a data value** is not. Exactly one tracked non-doc file broke that:
`prototypes/templates/claude-code.json` had `"name": "gentleman-cute"` — a committed generator input
naming somebody else's theme as a value of ours. The field is **inert** (the builder sets `name`
from the variant slug on emit), so it is now `"structural-stub"`, which says what the file is, and
re-running the build confirmed **8/8 emitted files byte-for-byte identical** to their pre-change
hashes above. The stub's own hash did move (`64050de6a8943997`, 2749 bytes), so `sources.json` and
the D8 table record the new one rather than claiming a hash nothing matches — and the unchanged
28/28 green of `check-upstream.mjs` is what proves the manifest is back in sync. `provenance-identity`
now enforces the rule over the **4 committed build inputs** — the two stubs plus `theme-config.js`
and `build.js` — and draws the distinction that makes it enforceable rather than merely strict: a
**data value** (`"name": "gentleman-cute"`) fails with the JSON pointer it was found at, while a
**path reference** (`~/.pi/agent/npm/node_modules/gentle-pi/themes/Gentleman-Cute.json`) is a
citation of a real external install that this repo cannot rename and is therefore allowed. That
exception is scoped to the **builder's declared path table and nothing else** — this file and our
comments are documentation and stay as they are — and the check reads that table on every run, so
the one existing occurrence is *proven* to be a path instead of waved through. Both directions were
mutation-tested: putting the brand back into a stub as a value gives `1 failure, exit 1`; degrading
the external path to a bare brand name also fails, which is what shows the allowance is live; the
real path is read on every run and stays silent. `39 checks, 0 failures` is the new green.

---

## Resolved: the spurious MISSING reports — 2026-09-27

**What the false claim was.** An earlier version of this document carried a section titled *"Repo
artifacts are MISSING — verified 2026-09-27"*, asserting that all six of our theme files no longer
existed on disk and that "the installed copies are the only survivors". **That was wrong.**

**Root cause.** The `repoPath` values in `sources.json` still pointed at the pre-`material-trabajo\`
locations — the repo root for Claude Code and OpenCode, and `pi/` for Pi. The files had been *moved*
into `material-trabajo\`, the manifest was never updated, and `check-upstream.mjs` faithfully
reported 6 `MISSING` rows. The doc then repeated the checker's output as fact.

The giveaway that should have stopped it earlier: the doc's own hash tables were **correct**. You
cannot lose a file and still know its SHA256 to 16 digits. The hashes were never lost; only the
paths were.

**Fix.** `repoPath` in `sources.json` now carries the `material-trabajo\` prefix, and every hash
re-verified against disk:

| Path | Bytes | SHA256 (first 16) | Status |
| --- | --- | --- | --- |
| `material-trabajo\claude-code\gentleman.json` | 3105 | `ED90D7AF3C097DBB7` | present, hash matches |
| `material-trabajo\claude-code\gentleman-cute.json` | 3138 | `F8BDBF818033C26E` | present, hash matches |
| `material-trabajo\opencode\gentleman.json` | 1660 | `1F09532AC91B066A` | present, hash matches |
| `material-trabajo\opencode\gentleman-cute.json` | 1660 | `B681E9860137BB48` | present, hash matches |
| `material-trabajo\pi\Gentleman.json` | 2629 | `7C3B8C584585955F` | present, hash matches |
| `material-trabajo\pi\Gentleman-Cute.json` | 2435 | `F1B89B56E9DB3BA4` | present, hash matches |

Also corrected in the manifest:

- `pi.upstream.version` `3.3.0` -> **`3.7.0`**. The `VERSION DRIFT` warning was real; 3.7.0 is what
  `package.json` on disk reports and what every `upstreamFiles` hash belongs to.
- `pi.artifacts[Gentleman-Cute].installed` `true` -> **`false`**, matching the deliberate deletion.
- `claude.installDirExists` `false` -> **`true`**, the directory now exists.

`node check-upstream.mjs`: **19 ok, 0 warnings, 0 failures** (was 19 checks — 10 ok, 2 warnings,
7 failures).

**Lesson.** A checker reporting `MISSING` is evidence about the *manifest* as much as the disk. When
a tool contradicts a document that contains precise hashes, suspect the tool's inputs before
concluding the document's subject is gone.

---

## Three format shapes

This is the detail most likely to trip someone up. The three agents do **not** share a format, and
a file that is correct for one is silently wrong for another.

| Agent | Shape | Color syntax | Slot count | Failure mode when wrong |
| --- | --- | --- | --- | --- |
| OpenCode | flat map under `theme`, plus `$schema` | `#RRGGBB` | ~50 | tokens ignored, default theme |
| Claude Code | nested `overrides` under `base` | `rgb(r,g,b)` | 72 | flat map yields `overrides: undefined`; renders as default dark with **zero warnings** |
| Pi | two layers: `vars` hex palette + `colors` var indirections | `#RRGGBB` | 19–36 vars, 51–56 colors | wrong shape or broken indirection; no validation feedback |

Key differences to remember:

1. **Hex vs `rgb()`.** Claude Code uses `rgb(r,g,b)`. OpenCode and Pi use `#RRGGBB`. All of our
   files respect this — Claude Code files contain zero hex, Pi and OpenCode files contain zero
   `rgb()`.
2. **Flat vs nested.** Only Claude Code requires a wrapper. A flat map is correct for OpenCode and
   wrong for Claude Code.
3. **Indirection.** Only Pi has a two-layer palette where `colors` values name `vars` entries
   rather than being colors. `accent=accent` is valid in Pi and meaningless elsewhere.

---

## Re-verify these

Run from the repo root. The checker is read-only: it creates, modifies, and deletes nothing.

```powershell
node check-upstream.mjs
```

**Current expected result: `28 checks — 28 ok, 0 warnings, 0 failures`, exit `0`.**

The count moved from 19 to 24 when D8 added the prototype build's own inputs to the manifest: 3
`buildInputs` and 2 `excludedFromBuild`. It moved from 24 to 28 when the other four vendored
templates were reclassified as excluded references too, so all six are listed. The six excluded
rows report `present` while the files are on disk; a clone without them reports `absent` with the
reason, which is **not** a failure.

> **One row is expected to look like a failure and is not.** `pi / Gentleman-Cute / installed` is
> `installed: false` because that file was deleted on purpose. A checker run that lists it as
> `absent, as expected` is reporting the intended state, not drift.
>
> **The six vendored templates are NOT deleted.** They are ignored: present on disk, excluded by
> `.gitignore`, hash-pinned in `sources.json`. An `artifacts` row for one of them reads `excluded`
> rather than `MISSING`, and the full report lives under *excluded from the build*. See D8.

To re-derive the manifest by hand:

```powershell
# Repo artifacts — note the material-trabajo\ prefix
Get-FileHash -Algorithm SHA256 .\material-trabajo\claude-code\gentleman.json, `
  .\material-trabajo\claude-code\gentleman-cute.json, `
  .\material-trabajo\opencode\gentleman.json, .\material-trabajo\opencode\gentleman-cute.json, `
  .\material-trabajo\pi\Gentleman.json, .\material-trabajo\pi\Gentleman-Cute.json

# Installed copies
Get-FileHash -Algorithm SHA256 "$env:USERPROFILE\.config\opencode\themes\*.json", `
  "$env:USERPROFILE\.pi\agent\themes\*.json", "$env:USERPROFILE\.claude\themes\*.json"

# The stale duplicate must stay gone. If this ever returns True again, Pi is rendering
# a theme that no longer matches upstream.
Test-Path "$env:USERPROFILE\.pi\agent\themes\Gentleman-Cute.json"   # expect False

# Pi upstream (volatile path)
Get-FileHash -Algorithm SHA256 "$env:USERPROFILE\.pi\agent\npm\node_modules\gentle-pi\themes\*.json"
(Get-Content "$env:USERPROFILE\.pi\agent\npm\node_modules\gentle-pi\package.json" -Raw |
  ConvertFrom-Json).version

# Existence checks
Test-Path "$env:USERPROFILE\.claude\themes"          # expect True (created 2026-09-27)
Test-Path "$env:USERPROFILE\.claude\plugins"         # expect False
Test-Path "$env:USERPROFILE\.config\opencode\opencode.jsonc"  # expect False
Test-Path ".\.opencode"                               # expect False

# The prototype build's own inputs (D8). These are the hashes node check-upstream.mjs
# enforces; the emitted themes are identical whether they read the vendored templates
# or these stubs, which is the 8/8 byte-identity result documented above.
Get-FileHash -Algorithm SHA256 .\prototypes\templates\claude-code.json, `
  .\prototypes\templates\opencode.json
node prototypes\build-prototypes.mjs      # writes the 8 emitted files, nothing else
node prototypes\validate-prototypes.mjs   # expect: 39 checks, 0 failures

# What .gitignore keeps out of a commit (D8). The two files the build NEEDS must
# print nothing and exit 1; everything else must print its path and exit 0.
git check-ignore material-trabajo\vscode-themes\theme-config.js   # expect no output, exit 1
git check-ignore material-trabajo\vscode-themes\build.js          # expect no output, exit 1
git check-ignore material-trabajo\pi\Gentleman.json                # expect the path, exit 0
git check-ignore material-trabajo\vscode-themes\maxiano-dark.json  # expect the path, exit 0
# Whole-tree view: ignored files are prefixed '!!', the two build inputs are not there.
git status --porcelain --ignored=matching

# Requested theme names
Get-Content "$env:USERPROFILE\.claude\settings.json" -Raw
Get-Content "$env:USERPROFILE\.pi\agent\settings.json" -Raw
Select-String -Path "$env:USERPROFILE\.config\opencode\opencode.json" -Pattern '^\s*"theme"'
```

> **The stubs cannot be re-derived by a committed script, and that is deliberate.** The derivation
> rule is documented in D8 above (parse the vendored template, replace every colour literal, keep
> keys / order / nesting / non-colour strings) and the stub hashes above pin the result. Committing
> the script would re-create the `material-trabajo` dependency D8 exists to remove from the build.
> So the provenance is this file plus the validator check that asserts every background-bearing key
> survived — and that remains true whether or not you happen to have the vendored templates locally.
> They are **ignored, not deleted**: a clone without them can read the rule and check the hashes,
> it just cannot re-run the derivation without fetching the templates from their own project first.
