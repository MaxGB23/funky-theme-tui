# RFC 0001 — `classic`: shipping the palette's own canvas as a third TUI tier

**Status:** Draft — nothing built, nothing published.
**Date:** 2026-10-20
**Scope:** `prototypes/build-prototypes.mjs`, `prototypes/validate-prototypes.mjs`, `README.md`, `docs/SOURCES.md`
**Tested so far:** OpenCode only. Pi pending. Claude Code deliberately deprioritized (it inherits a
single background change and has no markdown/syntax surface).

## Summary

Promote chain step 0 — the palette itself, currently a non-shipped reference — to a shipped tier
named `classic`. `dark` and `darker` stay exactly as they are: same ids, same slugs, same files.

This is an additive change at the naming level and a **reversal** of the D7 decision at the design
level. Both halves are stated here so neither is smuggled in.

## Motivation

After long IDE sessions, the original IDE canvas (`#24212e`) reads better at night than either
shipped tier. That canvas is not a new color decision: it **is** the palette. Today both shipped
tiers are darkened derivatives of it, so a user who likes the IDE tone has no TUI option at all.

There is a second, quieter argument: `classic` is the only tier whose surfaces are not derived
numbers. Shipping it is the cheapest possible proof that the palette works — no new color math for
base/deep/elevated, only the flats the palette genuinely does not cover.

## Background: the chain already has three steps

`SURFACE_STEPS` in the builder models exactly this:

| step | role | shipped as | base | deep | elevated | base luma |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | reference | — (nothing) | `#24212e` | `#211e2b` | `#2e2a3a` | 35.38 |
| 1 | shipped | `dark` | `#181520` | `#121018` | `#201d2a` | 23.15 |
| 2 | shipped | `darker` | `#0a0910` | `#060509` | `#13111a` | 10.10 |

`alphaFaint` already carries `byStep[0] = #8c8eff2a`, so the alpha model was written with step 0 in
it. The slot exists; what is missing is a decision to paint it.

### Why step 0 was not shipped (D7, 2026-09-27)

> The user tested `funky-dark-prototype` in a real terminal and judged it far too bright, noting an
> IDE and a terminal are very different contexts.

That verdict came from the same surface this RFC proposes to ship. It is not refuted by "now I like
it"; it is **superseded by a context-dependent preference**, and the mechanism for a context-dependent
preference is a variant. The gate that rejected it — a full day in a real terminal — is therefore the
gate for accepting it.

D7 also measured the cost: dropping the canvas moved text contrast only from 16.9:1 to 18.6:1. Text
was always far above AAA. What changes with `classic` is the **surface area of the canvas**, not
readability. The felt effect is "more air", not "worse contrast".

## Proposal

1. Tier id `classic`, at chain step 0.
2. Slug `funky-classic-prototype`; transparent form `funky-classic-transparent-prototype` reserved
   but **not emitted** in the first pass.
3. Solid files for all three agents (Claude included only if it earns its slot — see open questions).
4. `dark` / `darker` untouched. No rename, no migration, no config churn across the 8 installed slots.

## Naming

`slug` is not an internal detail: the builder uses it as the filename, as Claude Code's `name`, and as
Pi's theme name (`build-prototypes.mjs:990`, `:1048`, `:1280`). The slug **is** the product name.

The grammar is `funky-<tier>-<modifier>` (`funky-dark`, `funky-darker`, `funky-dark-transparent`).
That forces a one-word tier. `funky-dark-classic` would put the modifier inside the tier slot and
produce a Frankenstein transparent form (`funky-dark-classic-transparent`).

| Candidate | Verdict | Why |
| --- | --- | --- |
| `classic` | **chosen** | Names origin, not position. Survives a fourth tier. One word. No collision in the repo. |
| `bright` / `light` | rejected | Positional. Breaks the moment a lighter tier exists, and reads as a warning label. |
| `ide` | rejected | Dates itself if the VS Code theme changes, and means nothing to Pi/Claude users. |
| `origin` | runner-up | Same semantics, but sorts **after** `darker`, losing the lightest-first listing. |
| `nocturnal` / `night` for `darker` | rejected | Describes usage, not identity. All three tiers are night themes, so it discriminates nothing. |

Alphabetical order happens to match luminance order — `funky-classic` < `funky-dark` < `funky-darker`
— so pickers list lightest to darkest for free. That is a coincidence, **not a contract**: document
the order, never rely on the sort.

Cost of the name: `classic` is the only non-comparative in the set. `dark`/`darker` explain
themselves; `classic` does not say "I am the lightest". One README line fixes it.

## Values under test

Only **one** of the five proposed surface values is a palette value.

| Slot | Candidate | Origin | Status |
| --- | --- | --- | --- |
| `background` | `#24212e` | palette `bgBase` | settled |
| `backgroundElement` | `#2c2938` **or** `#2e2a3a` | recut **or** palette `bgElevated` | **undecided** |
| `backgroundPanel` | `#282533` | declared flat, one lift below elevated | consistent with either |
| `diffAddedBg` / `diffAddedLineNumberBg` | `#35334e` | declared flat | consistent |
| `diffRemovedBg` / `diffRemovedLineNumberBg` | `#461e29` | declared flat | consistent |
| Pi `selection` | none yet | — | open |

The flats are internally coherent, not random: the diff backgrounds are a uniform `+0x0c / +0x0e`
lift over step 1 (`#292740 → #35334e`, `#3a121b → #461e29`), and `#2c2938 → #282533` gives
`(-4,-4,-5)`, byte-identical to the step-1 panel lift (`#201d2a → #1c1925`).

### The fork: verbatim palette or recut elevation

- **A — verbatim.** `backgroundElement = #2e2a3a`, the palette's own `bgElevated`. The invariant
  "step 0 **is** the palette" survives untouched, the chain-integrity assertion keeps its teeth, and
  `classic` is literally true. Zero new color decisions.
- **B — recut.** `backgroundElement = #2c2938`. The tier is still named `classic` but is no longer
  the palette; it becomes "the palette canvas with a flattened elevation". `assertChainIntegrity`
  would reject this, so it must be declared as a deviation with the measured delta and a written
  reason (the honest reading: `#2e2a3a` felt a touch too violet/bright against `#24212e`).

B is allowed. B smuggled in as if it were the palette is not. The decision belongs in this RFC before
any code is written, because it changes what the README is allowed to claim.

### Pi selection

Pi selection is a per-tier flat, user-tested, never chained. A starting point for the lighter canvas,
derived from `accentSelection #8c8eff45` composited over `#24212e`, is `#403e67`. Derived is not
tested; it is a candidate to look at, not a value to ship.

## Implementation sketch

- `VARIANTS`: new entry `{ id: 'classic', tier: 'classic', opacity: 'solid', slug: 'funky-classic-prototype', agents: [...] }`.
- `TIER_STEP`: `classic: 0`.
- `SURFACE_STEPS[0]`: `role: 'shipped'`, `shippedAs: 'classic'`.
- `PANEL_TUI`, `ADDED_BG_TUI`, `SELECTION_TUI`: new `classic` key each.
- Validator mirrors: `TIER_STEP`, `TIERS`, `CHAIN_STEPS[0].tier = 'classic'`, `PANEL_TUI` mirror,
  `DECLARED_TUI_VALUES`.
- Checks that assert "step 0 ships nothing" must flip from _reference_ semantics to _shipped_
  semantics — and must keep failing if `classic` silently stops being emitted.

## Acceptance gates

1. A full working day in a real terminal (OpenCode first, Pi second). This is the gate D7 used.
2. `backgroundElement` decided as A or B, in writing, in this RFC.
3. Panel stacking verified numerically: `base < panel < elevated`, per tier.
4. Validator green with three tiers, and the dead-token check still catches an orphaned surface.
5. No rename of `dark`/`darker`; no transparent emission in the first pass.
6. README no longer says "two depths".

## Risks

- **Reversal debt.** D7's verdict was "too bright in a terminal". Shipping `classic` is a deliberate
  reversal; if it is not re-tested in a terminal, the repo ships a tier its own history rejected.
- **Proliferation.** 8 files → 10 (solid only), 12 if transparency follows. Each file is a doc claim.
- **Naming asymmetry.** One non-comparative name among comparatives; mitigated by one README line.
- **Sort-order dependence.** The alphabetical/luminance alignment is accidental.
- **Honesty debt.** Option B makes `classic` a partial truth unless the README says so.

## Documentation impact — README copy proposal

Current heading: **"Variants — Two depths, one palette"**. Proposed replacement:

> ## Variants — Three depths, one palette
>
> `classic` is the canvas the IDE theme was built on — kept for people who love that exact tone.
> `dark` and `darker` are the terminal-tuned variants: same palette, same hues, with the canvas
> stepped down, because a terminal is read at full size for hours.

That framing is honest: it says out loud that `dark`/`darker` are the terminal-adapted ones and
`classic` is the original, without pretending `classic` was tuned for a terminal.

## Open questions

1. `backgroundElement`: A (verbatim `#2e2a3a`) or B (recut `#2c2938`)?
2. Does Claude Code get `classic` at all, given it only moves a background?
3. Transparent `classic`: never, or after solid proves itself?
4. Pi `selection`: start from `#403e67` or re-derive by eye?

## Decision log

- **2026-10-20** — Tier id `classic` agreed. Flat set drafted and tested in OpenCode only. Nothing
  built; `#2e2a3a` explicitly left open pending a second test round.
