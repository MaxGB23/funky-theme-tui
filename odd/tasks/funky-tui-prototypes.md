# Funky TUI prototypes — dark + darker for Claude Code, OpenCode, Pi

## Objective

Generate `prototypes/` with a Funky-palette theme for each of the three TUI agents, in two
variants (**dark** and **darker**). Each agent keeps its own slot vocabulary: the Gentleman-Cute
template supplies the exact key set, and only the color values change.

## Problem

The TUI ports had no Funky palette. The VS Code side already has one, defined in
`material-trabajo/vscode-themes/theme-config.js` (the `palette` token map) and assembled by
`material-trabajo/vscode-themes/build.js`. Those two files are the source of truth for the values
and for how the `darker` variant differs. The three TUI agents do not share a slot vocabulary, so
the same palette has to be expressed three different ways.

## Why Funky and not a straight port

Gentleman-Cute is the base for its structure, not its colors. The Funky palette is layered on top
of each agent's own key set. Decision 1 (separate repos, no monorepo) survives: the structural
overlay against Funky is near zero either way.

## Scope

In scope: the 6 prototype JSONs, plus the build script that emits them.

Out of scope: installing into `~/.claude/themes`, `~/.config/opencode/themes`, or
`~/.pi/agent/themes`; any commit; editing `sources.json`; rewriting the backlog palette sections.

## Constraints

1. **Key sets are fixed by the template. Never invent, drop, or rename a slot.** An unknown slot is
   silently dropped by the Claude Code loader with zero diagnostics.
2. **Color syntax per agent is not negotiable.** Claude Code takes `rgb(r,g,b)` and rejects hex.
   OpenCode and Pi take `#RRGGBB` and reject `rgb()`.
3. **No 8-digit hex in any output.** No target supports an alpha channel.
4. **`build.js` cannot be executed as-is** — it requires `../src/theme-config.js`, but the file now
   sits beside it. The prototype builder must not depend on running it. The palette and the darker
   maps are read as data.

## Decisions

### D1 — Alpha is composited against each variant's background

The Funky palette has 10 alpha tokens (`uiAccentStrong`, `accentSelection`, `guideAccent`,
`accentFaint`, `controlBorder`, `searchBackground`, `scrollbarTrack`, `matchBorder`,
`hoverSurface`, `highlightBorder`). No target can carry them, and alpha *is* the Funky design, so
they get flattened:

```
composite(fg, a, bg) = round(fg_c * a/255 + bg_c * (1 - a/255))
```

Because `darker` moves the backgrounds, **every composite is recomputed per variant**. A composite
computed against `bgBase` is wrong on `darker`.

This revises backlog decision 12. That decision was resolved by elimination for Gentleman-Cute,
which carries zero alpha. Funky does not, so the question is live again and answered here.

### D2 — Per-variant surfaces

| Token | dark | darker | darker source |
| --- | --- | --- | --- |
| base surface | `bgBase` `#24212e` | `#181520` | `darkerBackgrounds` |
| deep surface | `bgDeep` `#211e2b` | `#121018` | `darkerBackgrounds` |
| elevated surface | `bgElevated` `#2e2a3a` | `#201d2a` | `darkerBackgrounds` |

### D3 — Darker syntax attenuation is nearly a no-op, and that is fine

`darkerSyntaxAdjustments` maps `yellowLight #fff9b7 -> #fff9ba` and
`orangeAccent #ffd089 -> #ffd18e`. Both are imperceptible. The meaningful `darker` change is the
three background swaps plus the lowered diff/highlight alphas. Carry both adjustments anyway for
fidelity to `build.js`, and do not invent extra attenuation.

### D4 — Semantic anchors

Anchors are chosen so relative luminance matches the Gentleman-Cute slot being replaced, so the
theme keeps its contrast structure instead of merely its hues.

| Anchor | Funky token | Value | Replaces |
| --- | --- | --- | --- |
| accent | `uiAccent` | `#8c8eff` | `accent` |
| accentBright | `linkPurple` | `#b2b3ff` | `accentBright` / `borderAccent` |
| text | `fgBase` | `#f8f8f2` | `text` |
| muted | `uiInactive` | `#8b8f9e` | `muted` |
| dim | `uiMuted` | `#606685` | `dim` |
| border | `uiMuted` | `#606685` | `border` |
| borderSubtle | `guideMid` | `#625e74` | `borderSubtle` |
| success | `greenBase` | `#8bffa8` | `success` |
| error | `errorFg` | `#ff8282` | `error` |
| warning | `yellowBase` | `#f6ff98` | `warning` |
| info | `cyanDim` | `#80ecff` | `info` |
| heading | `pinkVibrant` | `#ff8ddb` | `heading` |
| code | `cyanAccent` | `#96e7ff` | `code` |
| syntaxKeyword | `pinkBase` | `#ff8bee` | `syntaxKeyword` |
| syntaxFunction | `cyanAccent` | `#96e7ff` | `synFunction` |
| syntaxOperator | `operatorBlue` | `#9abfff` | `synOperator` |
| syntaxString | `greenAccent` | `#b9ffba` | `syntaxString` |
| syntaxNumber | `cyanDim` | `#80ecff` | `syntaxNumber` |
| syntaxType | `yellowLight` | `#fff9b7` | `syntaxType` |
| syntaxPunctuation | `purpleGrey` | `#a9b1de` | `syntaxPunctuation` |

`muted` and `dim` invert Funky's own token names on purpose: Funky puts the darker value in
`uiMuted` and the lighter in `uiInactive`, while the target slots want `dim` darker than `muted`.
The mapping follows luminance, not the source token's name.

### D5 — Pi uses the `gentle-pi` 3.7.0 key set

`material-trabajo/pi/Gentleman-Cute.json` is a stale earlier generation (`panel`, `element`,
`success`, `heading`, `addBg`, `removeBg`). The maintained copy at
`~/.pi/agent/npm/node_modules/gentle-pi/themes/Gentleman-Cute.json` carries the current key set
(`bg`, `bgPanel`, `bgSubtle`, `deepPink`, `activePink`, `selection`, `tool*Bg`, `infoBg`). Use the
maintained one. The stale copy was deleted from the agent theme dir on 2026-09-27 for this reason.

Claude Code and OpenCode have no upstream, so `material-trabajo/claude-code/gentleman-cute.json`
and `material-trabajo/opencode/gentleman-cute.json` are the only scaffolds available.

## Tasks

- [x] T1 Build script: single mapping table, per-variant alpha compositing, emits all 6 JSONs
- [x] T2 Claude Code pair — 72 slots, `rgb(r,g,b)`, nested `overrides` under `base`
- [x] T3 OpenCode pair — 50 tokens, flat map under `theme`, hex
- [x] T4 Pi pair — `vars` hex + `colors` indirections + `export`, current key set
- [x] T5 Validate: slot counts match templates exactly, zero hex in Claude Code, zero `rgb()` in
      OpenCode and Pi, zero 8-digit hex anywhere, all JSON parses
- [x] T6 Engram mirror of this document
- [x] T7 **Fix the Pi surface-mapping defects found in parent spot check** (below)
- [x] T8 **Extend the validator to assert semantic surface separation, not just structure**
- [x] T9 **Answer the 3 open questions and apply them** — Q1 `background: none` kept, Q2 colour-named
      slots kept name-honest, Q3 fixed via D6 (one indirection re-point, `mdHeading` -> `softRose`)

## Acceptance criteria

1. Each output has **exactly** the template's slot set — same keys, same count, no additions.
2. Claude Code files contain zero `#` hex; OpenCode and Pi files contain zero `rgb(`.
3. No output contains an 8-digit hex.
4. `darker` backgrounds are `#181520` / `#121018` / `#201d2a`, and every alpha-derived value was
   recomputed against those, not copied from `dark`.
5. All 6 files parse as JSON.
6. Pi `colors` entries remain **indirections naming `vars` keys**, never literal colors.

## Verification

```
node prototypes/build-prototypes.mjs
node prototypes/validate-prototypes.mjs
```

Both must exit 0.

## Route log

| Task | Route | Trigger evidence |
| --- | --- | --- |
| T1–T4 | delegated writer | 6 non-trivial files, 3 slot vocabularies, alpha math |
| T5 | delegated writer, same pass | mechanical validation |

## Progress

- 2026-09-27 — doc created. Palette and darker maps extracted from `theme-config.js` (54 tokens)
  and `build.js` (7 background swaps, 2 syntax adjustments, 6 lowered-alpha diff/highlight values).
- 2026-09-27 — D5 decided by the user after being asked.
- 2026-09-27 — T1–T6 done by delegated writer. `build-prototypes.mjs`, `validate-prototypes.mjs`,
  6 JSONs. Both scripts exit 0; validator reported 21 checks passed, 0 failures.
- 2026-09-27 — parent spot check re-ran the validator independently: exit 0, 21/21. Confirmed
  72 Claude Code overrides, 50 OpenCode tokens, Pi 26 vars / 55 indirections / 3 export, zero
  8-digit hex, zero hex in Claude Code, zero `rgb()` in OpenCode and Pi.
- 2026-09-27 — parent spot check found 3 real semantic defects plus 1 of its own that were
  arithmetic errors. Reported as 4; **one was wrong** (`borderSubtle` vs `border` luma was
  miscalculated). A full luminance sweep then found a 4th real defect the first pass missed
  (`toolPendingBg` brighter than `toolSuccessBg`).
- 2026-09-27 — T7 + T8 done by delegated writer. All 4 fixed, 5 semantic checks added and
  mutation-tested. Parent spot check re-verified independently: 26/26, exit 0, and every corrected
  value measured against the emitted files.
- 2026-09-27 — lesson recorded: measure luminance before reporting a contrast defect. One of my own
  four findings was a bad sum, and re-checking it is what surfaced a real one I had missed.
- 2026-09-27 — T9 done: the 3 open questions answered and applied. Q1 and Q2 confirmed as-is
  (`background: none`, name-honest colour slots). Q3 fixed via D6, one re-pointed indirection
  edge. Validator now 27 checks, 0 failures. `criterion-6` rewritten to allow exactly one declared
  override, and `semantic-heading-family` added. Both mutation-tested; all three mutations
  restored to an identical SHA256.

## Lesson worth keeping

The writer's first pass shipped a validator that passed 21/21 and still let 3 real defects through,
because it could only see structure. The second pass added 5 semantic checks. A validator that has
never been seen **failing** is not a check — every new one was mutation-tested, and one of them
(`semantic-dead-token`) turned out not to be independently isolable, which was reported rather than
hidden.

## Defects found in parent spot check — RESOLVED in T7

The validator checked **structure**. It could not check that the values were *semantically* right.

**Correction to the original report.** Defect 2 below was a miscalculation on my part.
`borderSubtle` `#625e74` measures luma **97.7** and `border` `#606685` measures **103.74**, so
`borderSubtle` was already correctly recessive. The border pair was never broken and was left
untouched.

The three real defects, all in the Pi pair, all now fixed:

| # | Defect | Fix | dark | darker |
| --- | --- | --- | --- | --- |
| 1 | `bgPanel == bg`; `bgDeep` used in none of the 6 files | `bgPanel` -> `bgDeep` | `#211e2b` | `#121018` |
| 2 | `bgSubtle == bgElement` | `bgSubtle` -> `bgDeep`, mirroring the upstream `bgSubtle == bgPanel` relationship | `#211e2b` | `#121018` |
| 3 | `infoBg == bg` | new `infoSurface` = `composite(cyanDim, 0x1f, bgPanel)` | `#2d3745` | `#1f2b34` |
| 4 | `toolPendingBg` (54.90) brighter than `toolSuccessBg` (45.02) — a pending state rendering brighter than the state it precedes | `toolPendingBg` -> `bgPanel`, matching upstream | `#211e2b` | `#121018` |

Resulting ladder, measured:

| rung | dark | luma | darker | luma |
| --- | --- | --- | --- | --- |
| base | `#24212e` | 35.38 | `#181520` | 23.15 |
| deep | `#211e2b` | 32.38 | `#121018` | 17.51 |
| elevated | `#2e2a3a` | 45.02 | `#201d2a` | 31.38 |

Three real tiers, all three Funky background tokens consumed. `bgSubtle == bgPanel` is the one
declared exception, and it exists because Pi has 4 surface slots against Funky's 3 background
tokens — the tier is borrowed by design, not collapsed by accident.

Secondary observation, still open: Pi's `vars` keep upstream **names** but now hold Funky
**values**, so `deepPink` is `#423c62` (a dark grey-violet) and `activePink` is `#b2b3ff` (light
periwinkle). Not wrong — `vars` are opaque names — but the names now misdescribe the values, which
is a maintenance trap. Renaming would violate the fixed-key-set constraint, so this stays a
documented caveat.

## T8 — the validator now checks meaning, not just shape

5 new checks, all computed from the emitted JSON rather than from the mapping table, and all
mutation-tested to confirm they fail:

| Check | Asserts |
| --- | --- |
| `semantic-tiers` | adjacent surface rungs differ in both hex and luma; `bgSubtle == bgPanel` is a named exception that must ALSO not equal `bgElement` |
| `semantic-ordering` | `borderSubtle < border` and `dim < muted`, per agent, per variant |
| `semantic-dead-token` | `bgBase` / `bgDeep` / `bgElevated` each consumed, checked per variant |
| `semantic-tool-order` | `toolPendingBg < toolSuccessBg`, both variants |
| `semantic-info-bg` | `infoBg` distinct from both `bg` and `bgPanel` |

`prototypes/color-math.mjs` (new, 1955 B) holds `toHex()` and `luma()` for both scripts. Rec. 601
is used deliberately: WCAG linearises and crushes the dark end (`#211e2b` drops to 3.6), which would
make every near-black surface indistinguishable and the ladder unjudgeable.

Two honest caveats from the writer, not glossed over:

- `semantic-dead-token` **could not be isolated** in mutation testing. Making `bgDeep` unreferenced
  requires collapsing a ladder rung, so it co-fires with `semantic-tiers` on the same edit. It is
  reported as co-firing, not as independently proven.
- `composite()` is deliberately still duplicated in each script. A shared formula could hide a data
  error, but a validator that loses its independent composite would stop catching the builder's.

Validator reported **26 checks passed, 0 failures** at the close of T8 — 27 after T9 added
`semantic-heading-family`.

## Open questions — all three answered, applied in T9

1. **OpenCode `background` stays `"none"`,** not a hex. `none` is terminal transparency, not a
   colour. A hex would make the terminal opaque — a behaviour change disguised as a palette
   change, costing wallpaper and blur on terminals that support it. **Kept as `none`.** It is 1 of
   50 tokens; the other 49 are hex.
2. **The colour-named slots stay mapped name-honestly, not collapsed.** Gentleman-Cute collapsed
   its 15 onto one pink because *its* identity is a single accent. Funky is not: 54 tokens across
   six families. Collapsing `rainbow_*` would also make every subagent output indistinguishable,
   which defeats the only reason those slots exist. Cost is 8 tokens of 54. **Kept as is.**
3. **Pi's `champagne` divergence — DECOUPLED, see D6.** The writer's proposed fix (retyping the
   whole 55-entry indirection table) was unnecessary and would have been a mistake.

## D6 - one indirection re-pointed, not a retyped graph

Pi bundles **6 roles** onto `champagne`: `customMessageLabel`, `toolTitle`, `mdHeading`, `mdCode`,
`syntaxType`, `bashMode`. OpenCode has 4 separate tokens for the same jobs and gives
`markdownHeading` the pink `pinkVibrant #ff8ddb`. So Pi's heading rendered **yellow** (`#fff9b7`)
while OpenCode's rendered **pink** — a family error, not a tone error.

`colors` **is** the indirection map, so re-pointing one slot is a one-line change. The writer
called a full 55-entry retype necessary; it was not, and doing it would have hand-edited structure
that the template owns.

`PI_COLOR_OVERRIDES = { colors: { mdHeading: 'softRose' } }` — `softRose` holds `pinkLight #ffa8e6`,
the only pink-family value in Pi's fixed 26-var key set (`deepPink` is a dark grey-violet,
`activePink` a light periwinkle). The other 5 `champagne` roles keep it.

**Exact hex parity is impossible** and is not claimed: Pi has no `pinkVibrant` slot, and adding one
would break the fixed key set. This closes the family error while knowingly leaving a tone
difference, so the check asserts *direction of improvement*, not equality:

| | dark | darker |
| --- | --- | --- |
| OpenCode `markdownHeading` (reference) | `#ff8ddb` | `#ff8ddb` |
| Pi `mdHeading`, was `champagne` | `#fff9b7` (113.84 away) | `#fff9ba` (112.93 away) |
| Pi `mdHeading`, now `softRose` | `#ffa8e6` (**29.15** away) | `#ffa8e6` (**29.15** away) |

Structure unchanged and re-verified: Claude 72 `rgb()` overrides, OpenCode 50 tokens with
`background: none`, Pi 26 vars / 55 indirections / 3 export, zero 8-digit hex.

### Two checks guard this, and they guard different things

`criterion-6` was rewritten to compare against the template's graph **plus** a declared override
allowlist. The validator holds **its own** copy of the allowlist rather than importing the
builder's, so a wider override in the builder surfaces as drift instead of passing quietly. The
failure message names the drifted slot and the expected target.

`semantic-heading-family` is new and asserts the meaning: the heading must not be welded to
`syntaxType` (indirection and resolved colour checked separately), and must be strictly nearer the
OpenCode heading than the syntax-type colour was.

Mutation-tested, all three restored to the same SHA256:

| mutation | caught by | isolated? |
| --- | --- | --- |
| `softRose` holds the syntax-type colour | `semantic-heading-family` (resolved-colour assertion) | **yes** |
| `mdHeading` -> `pearl` | `criterion-6` (allowlist) | yes — but see below |
| `mdHeading` -> `deepPink` | `criterion-6` + `semantic-heading-family` (distance assertion, 238.59 vs 113.84) | co-firing, reported as such |

The `pearl` mutation is worth recording because it did **not** fail the distance assertion, and
that is correct: `#cbcbcb` genuinely is nearer the pink heading than the yellow it replaced, so
direction-of-improvement holds. The distance check is not a palette check — `criterion-6` is what
pins *which* target is allowed. Two checks, two jobs.

## Blocker: no git repository

`gentle-ai review assess` returns `risk: high` with `code: unassessable` — the directory is not a
git repo, so there is no inventory to assess and the native review lifecycle cannot run.
Receipt-driven development is **off** (decided by global), so work-unit commits are impossible and
everything here is uncommitted. The user deferred the first commit until after the
gentleman-cute adaptation.

This is the only thing standing between the current state and delivery. Nothing about the
prototypes themselves is outstanding.

## D7 - the tiers are chain steps, and the palette is now the top of the chain

### The decision

D1–D6 treated the two tiers as *a palette plus a darkening*. D7 replaces that with a three-step
chain in which the palette is step 0 and is **not shipped**:

| Step | Role | Shipped as | base | deep | elevated |
| --- | --- | --- | --- | --- | --- |
| 0 | reference | not shipped | `#24212e` 35.38 | `#211e2b` 32.38 | `#2e2a3a` 45.02 |
| 1 | shipped | `dark` | `#181520` 23.15 | `#121018` 17.51 | `#201d2a` 31.38 |
| 2 | shipped | `darker` | `#0a0910` 10.10 | `#060509` 5.75 | `#13111a` 18.62 |

(Rec. 601, as `color-math.mjs` computes it.)

**The user-facing point:** `dark` is now a genuinely dark theme, and `darker` is near-black. Before
D7, `dark` painted the palette's `#24212e` and `darker` painted `#181520`; both tiers are now a step
lower than they used to be, and the gap between them got *wider* in luma (12.23 before, 13.05 now).

### What is transcribed and what is declared

This is the distinction the whole change turns on:

- **`0→1` is transcribed.** 7 entries, from the `darkerBackgrounds` map at `build.js` lines 29-43,
  applied by the loop at lines 60-68. Verified against upstream by `groundTranscription`, and against
  `theme-config.js` for the 4 entries whose *keys* are computed properties (`[palette.bgDeep]`)
  rather than literals.
- **`1→2` is declared here.** `build.js` only ever darkened the palette once; there is no upstream
  step 2, and there is no step-2 value in `theme-config.js`. It is 3 entries — the three surfaces,
  and nothing else.

So the validator cannot ground step 2 against upstream, and `source-chain` does the next best thing:
it asserts internal consistency. Step 0 is the palette, each step's declared surfaces are what
walking the chain produces, and the `1→2` link covers exactly three values. That last half is a
deliberate constraint — it fails if the link is widened to `guideMid` or to a second alpha, because
those are decisions nobody has made.

### Three judgement calls, all of them refusals to invent

1. **`#544f64` (`borderSubtle`) stays at both tiers.** No step-2 value is declared for `guideMid`.
2. **`accentFaint` is `0x30` at both shipped steps, not `0x30` then something higher.** Upstream
   raises 0x2a→0x30 for a darker canvas; how much brighter an accent should glow against near-black
   is a visual judgement, so the table is where that number goes when someone decides it.
3. **The diff washes and the two syntax hues stayed TIER-keyed, not chain-keyed.** D7 ruled on the
   surfaces and on the `accentFaint` alpha. Converting `diffAddedBg`, `diffRemovedBg`,
   `syntaxType` and `syntaxVariable` to chain links would have been an unrequested extra decision.

**These three are the open points.** If you want the chain to own everything, items 1 and 3 are the
work: item 1 needs a visual pick for a step-2 `guideMid`, item 3 needs a decision on whether a diff
wash at 0x18 on a near-black canvas should stay there.

### The `5.75` vs `5.76` discrepancy

The brief said `deep` luma `5.76`. The implementation prints **5.75**. The colour is exactly as
specified; the digit is a float artefact. Rec. 601 on `#060509` is `1.794 + 2.935 + 1.026 = 5.755`
exactly, but `0.587 * 5` is `2.9349999999999996` in IEEE-754, so the sum lands at
`5.754999999999999` — under halfway — and rounds down.

`color-math.mjs` was deliberately **not** touched. It grades every surface in the project, and
bending it to print one more faithful digit on one value would move numbers nothing in D7 asked to
move. Making the arithmetic honest is a separate change with its own blast radius.

### What mutation testing found that reading did not

Every check was mutation-tested: 15 mutations, all caught, and two of them found real holes rather
than confirming what was already believed.

**Hole 1 — the dead-token check had a false-positive generator waiting in it.** D7 turned "every
step's surfaces must be consumed" into a failure for step 0, which by definition no file paints. The
fix was a DECLARED role per step (`reference` / `shipped`) with three halves: shipped steps must be
consumed, the reference step must stay *connected* by walking the palette through the chain, and the
ladder must stay distinct. An orphaned `bgElevated` still fails, on four checks at once — which is
the honest result, not a weakness: in a three-rung ladder, orphaning a token collapses a rung, and
three other assertions are *entitled* to notice.

**Hole 2 — 7 of 13 alpha tokens were silently dead.** Deleting the `accentFaint` alpha bump from the
builder changed all 8 outputs by **zero bytes** and failed **nothing**. Cause: `accentFaint` (and
`uiAccentStrong`, `guideAccent`, `controlBorder`, `scrollbarTrack`, `matchBorder`, `highlightBorder`)
are VS Code workbench slots that no TUI agent exposes. They are transcribed from upstream, they
composite correctly, and they paint nothing.

The reason no check noticed is structural, and it is the most interesting thing D7 taught:
**every check in the validator reaches the builder through its output.** That is the right design —
it is why a builder that lies gets caught — but an output can only testify about what it renders, and
these seven render nothing. `groundTranscription` did not help either, because it reads *upstream*
`build.js`, not our builder's copy of the table.

Two changes closed it:

- `TRANSCRIBED_NOT_EMITTED` names all 7 with the upstream slot each came from, and
  `semantic-dead-token` asserts the split **in both directions** — an unpainted token must be listed,
  and a listed token that some agent *does* paint is a stale entry hiding a regression.
- `source-drift` compares the builder's alpha table against the validator's transcription, token for
  token, value for value, override for override. It is explicitly **not** a correctness check — it
  cannot know whether `#8c8eff30` is right. It is a drift check, and it is the only thing that can
  hold an unrendered declaration to account. Upstream grounding proves the *value*; this proves the
  *builder still holds it*.

**Hole 3 — a `byStep` override was ungrounded.** The per-step alpha was never checked against
upstream, only the base value, and a flat string search over the whole upstream tree passes for a
deleted override because `#8c8eff30` appears there for other reasons. `LOWERED_ALPHAS` now names the
five literals `build.js` actually lowers, and membership in that set is the test.

**Hole 4 — OpenCode's solid `background` was pinned by nothing.** A transparent file holds `"none"`
there, so `background` could not sit in a rung list spanning both variants — and it was left out of
the *assertion* too. Re-pointing a solid `background` at the deep surface failed nothing.
`criterion-4-surfaces` now pins all 4 solid `background` slots, which is what makes "the transparent
variant follows its own tier" testable from both ends.

### Verification

`37 checks, 0 failures`. The ladder is strictly descending on every rung, the three rungs are
distinct at all three steps, and step 2's base is under the near-black threshold of 12.

All 8 files were reinstalled and re-hashed; every hash changed, because D7 changes a canvas value in
all 8. The two OpenCode `gentleman` themes and Pi's `Gentleman.json` were re-hashed after the copy
and are unchanged. No `settings.json` and no `opencode.json` was touched.

## D8 - the build no longer reads a vendored template

### The decision

`build-prototypes.mjs` used to read two of the vendored `material-trabajo/` themes as generator
input. Those files are somebody else's work, and we are not vendoring them. Rather than hardcode
72 + 50 slot names — which would be a promise, not a structure — the build now reads **structural
stubs**: files derived from the real templates that keep every key, every nesting level and every
non-colour string, with every colour literal replaced by a sentinel.

| File | Bytes | SHA256 | Replaces |
| --- | --- | --- | --- |
| `prototypes/templates/claude-code.json` | 2748 | `db491362596dc8c2…` | `material-trabajo/claude-code/gentleman-cute.json` |
| `prototypes/templates/opencode.json` | 1660 | `f87a7015f4b63db3…` | `material-trabajo/opencode/gentleman-cute.json` |

Pi is **unchanged**. It reads real upstream from `~/.pi/agent/npm/node_modules/gentle-pi/themes/`
and always did; stubbing genuine upstream would be theatre, not independence.

### The proof, and why it had to be a proof

A template can contribute *structure* or *colour* or both, and the claim "only structure" is
exactly the kind of claim that is true right up until it is not. So it was measured: baseline
build, then stubs generated **programmatically** from the parsed real templates, then rebuild, then
compare all 8 files byte for byte.

**Result: 8/8 byte-for-byte identical.** No token diverged, so there is nothing to report. The
vendored templates contributed slot vocabulary and **zero colour**.

Two details that could have broken byte-identity for reasons unrelated to colour, and did not:

- **Key order is part of the contract.** Both emitters iterate `Object.keys(template.<section>)` and
  write the output in that order, so a stub that reordered a key reorders the emitted JSON. Deriving
  from the parsed real template preserves the order by construction, and the harness asserts it.
- **Two strings are load-bearing and are not colours.** OpenCode's `$schema` is copied verbatim into
  every emitted file, and `background: "none"` is the terminal pass-through token the transparent
  variants emit unchanged. The rewrite is a *colour-literal* rewrite, so both survive — which is
  the reason the rule is stated as "replace colour literals" and not "replace every value".

### The sentinels keep each agent's own syntax

The brief specified the sentinel `#000000` for every colour literal. The committed stubs use
`rgb(0,0,0)` for Claude Code and `#000000` for OpenCode instead, and the proof was run under
**both**: 8/8 byte-identical either way, so the deviation costs nothing.

It is still the right form. Claude Code's format is `rgb(r,g,b)` and a flat hex map is documented
in this repo as *silently wrong* for that agent; a committed stub showing `#000000` where the real
template shows `rgb(...)` would be a false claim about the format, sitting in the repo, to be read
by whoever looks next. Format is structure; only the colour value is the free variable.

### The 7 background-bearing slots

In the real Claude Code template, exactly 7 of the 72 slots are near-black surfaces
(`background`, `composerSidebarBackground`, `memoryBackgroundColor`, `userMessageBackground`,
`userMessageBackgroundHover`, `clawd_background`, `bashMessageBackgroundColor`) and the other 65
are saturated text and border colours. **In the stub, all 72 are one sentinel** — so if any part of
the build had recognised a surface by its colour, the swap would have flattened those 7 together
and the diff would have shown it. It did not: the builder resolves every one of them by KEY, from
`MAPPING`. The byte-identity result is that fact, measured.

`criterion-template-provenance` now holds it permanently, on both halves: all 7 keys must survive
in the stub, **and** all 7 must be named in the builder's `MAPPING` table (read as source text, since
importing the builder would run it). The second half is the load-bearing one — a slot present in the
template but absent from the mapping would have to take its value *from the template*, which is the
dependency D8 removed.

### What the check reads, and why that was almost a hole

The check had a bug before it had a first run. It was written to inspect the **validator's own**
`TEMPLATES` table — which would have passed, happily, while the builder went straight back to
reading `material-trabajo/`. That is a check that guards nothing. It now parses the **builder's**
declared path expressions instead, and separately requires the validator's table to agree, because
the validator compares key sets against its own input and would otherwise be validating a fiction.

Four mutations, all caught:

| Mutation | Caught by |
| --- | --- |
| builder reads `material-trabajo/…/gentleman-cute.json` | fails the vendored-path rule, with the required path named |
| stub path renamed to `claude-code-template.json` | fails the expression-shape rule — an unrecognised path is reported, not assumed safe |
| a background-bearing slot removed from `MAPPING` | fails the 7-slot rule, **and nothing else did** |
| a key removed from the stub | fails the 7-slot rule, plus 4 unrelated checks |

The third row is the one that justifies the check: dropping `memoryBackgroundColor` from `MAPPING`
left `criterion-1` green, because the output on disk still had the slot. Only the new check noticed.

### The manifest now distinguishes three kinds of file

`check-upstream.mjs` had one notion of "recorded file". It now has three, because D8 introduced a
file whose **absence is legitimate**:

| Kind | Section | Absent means | Severity |
| --- | --- | --- | --- |
| artifact | `agents.*.artifacts` | the file is gone | FAIL |
| build input | `buildInputs` | the build cannot run | FAIL |
| excluded reference | `excludedFromBuild` | **expected** | OK |

All six vendored templates are recorded in `excludedFromBuild` with their hashes, so the exclusion
is auditable rather than invisible. The derivation script is **not** committed, on purpose: its only
input is a `material-trabajo/` file, so committing it would re-create the very dependency being
removed from the build. The rule is written down in `SOURCES.md` and the stub hashes pin the result.

### The loose end, now closed: all six, and they are ignored rather than deleted

This section used to end on an open question — *what the other four `artifacts` entries become* —
and the framing of it was wrong. The vendored files were never to be deleted; they must not be
**committed**. Two of six had been reclassified and four had not, and because an artifact row
hard-fails on a missing file, those four went red on any clone that did not have the vendored
copies. The classification was the bug, not the files.

Resolved:

- **All six are `excluded-reference`**, one category: base templates vendored from another project,
  kept on disk, hash-pinned, never committed. Two happen to be named `gentleman.json` rather than
  `gentleman-cute.json`; the user's rationale — *they are only base templates, someone else's work* —
  covers all six, so the name was never a reason to split them.
- **`.gitignore` enforces the un-committed half**, with a stated reason per group, and
  `material-trabajo/vscode-themes/maxiano-*.json` (146,622 bytes of compiled upstream output no part
  of the pipeline reads) with them. Two `!` negations guard `theme-config.js` and `build.js`, which
  the build needs and must stay committable.
- **Presence, required-ness and committed-ness are three facts, and `installed` is a fourth.** The
  `installed` flag describes the user's live machine and is read from `installPath`, never from
  `repoPath`, so an absent vendored file cannot contradict `installed: true`. All six flags are
  unchanged. The two sections record the same file, so the checker cross-checks that both copies of
  the hash agree and fails loudly if they diverge.

Only three of the six have a real replacement — the two `gentleman-cute` stubs, and the live
`gentle-pi` upstream copy that supersedes the stale `pi/Gentleman-Cute.json`. The other three record
`replacedBy: null` explicitly, because the build never read them and a bare omission would read as
an oversight.

### Proved by removing the files, not by arguing about them

Both modes were run against the real tree, with the files moved out and then restored:

| Test | Result |
| --- | --- |
| all six vendored files absent | `28 checks, 28 ok, 0 failures`, exit `0` |
| a real build input absent, same run | `1 failure`, exit `1`, row reads `MISSING` |
| the 7 files put back | **7/7 hashes identical** to the pre-test baseline |

The two modes are separate code paths, deliberately. An absent excluded reference must never print
`MISSING`, because `MISSING` is the only signal this script has — a false alarm there teaches the
reader to ignore the one thing that matters.

### The provenance check still holds

`criterion-template-provenance` is unchanged and re-verified by mutation, because "no file under
`material-trabajo/` is reachable as a build input" is the invariant that keeps the ignored files
ignored:

| Mutation | Caught by |
| --- | --- |
| builder's claude-code path moved under `material-trabajo/` | the vendored-path rule, with the required path named |
| builder's **pi** path moved under `material-trabajo/` | the same rule — the agent D8 deliberately left external is not an exception to it |
| stub path renamed to `claude-code-template.json` | the expression-shape rule — an unrecognised path is reported, not assumed safe |
| `memoryBackgroundColor` removed from `MAPPING` | the 7-slot rule, **and nothing else did** |
| `memoryBackgroundColor` removed from the stub | the 7-slot rule, plus 4 unrelated checks |

All five: `1 failure` each (5 for the last), never a silent pass. The mutations were run against a
throwaway copy of `prototypes/`, so the real builder was never modified.

### Verification

`38 checks, 0 failures` (`criterion-template-provenance` is the one D8 adds over D7's 37).
`node check-upstream.mjs`: **28 ok, 0 warnings, 0 failures**. All 8 emitted files are unchanged —
byte-identical to the pre-D8 baseline, both hashes in `SOURCES.md` still correct. Nothing in this
pass touched a generator, so the emitted set cannot have moved.

## Next step

Planning phase complete. T1–T9 are done, D7 and D8 are applied, and the validator reports
**38 checks, 0 failures**.

Two loose ends remain, neither blocking:

1. **The three open judgement calls above.** Structural checks cannot settle whether a step-2
   `guideMid` should exist, or whether a 0x18 diff wash belongs on a near-black canvas. Those need
   eyes.
2. **Visual check in a real terminal.** Every assertion here is structural or numeric. Whether the
   step-0/1/2 ladder and the pink heading actually *look* right is a question for the eye, not for a
   luminance function. Note that `funky-dark-prototype` went live in Claude Code and Pi at 07:15
   on 2026-09-27, so the re-tiering is already on screen and worth a look.

Closed since the last pass: what the 6 vendored `artifacts` entries become. They are
`excluded-reference` — ignored, not deleted — with `installed` decoupled from repo presence and
`.gitignore` enforcing the un-committed half.
