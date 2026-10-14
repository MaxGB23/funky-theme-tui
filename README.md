# Funky Theme for your Favorite AI Agents 👻

Funky theme prototypes for AI coding agents: **Claude Code**, **OpenCode**, and **Pi**.

Generates 8 theme files from a single mapping table and 54 palette tokens. No
dependencies, no build step, no `node_modules`.

> **Status: prototype.** Palettes are still under visual review. The surface
> ladder is an open decision, not a stable contract.
> [`SOURCES.md`](SOURCES.md) tracks the rationale and provenance.

## The 4 Variants

| Variant | Claude Code | OpenCode | Pi |
|---|---|---|---|
| `dark` | ✅ | ✅ | ✅ |
| `darker` | ✅ | ✅ | ✅ |
| `dark-transparent` | ❌ | ✅ | ❌ |
| `darker-transparent` | ❌ | ✅ | ❌ |

`dark` and `darker` are **two steps of a three-step ladder**, not an arbitrary pair:
`dark` uses the surface that previously belonged to `darker`, and `darker` becomes
near-black.

| Step | base | deep | elevated |
|---|---|---|---|
| step 0 (reference, not shipped) | `#24212e` | `#211e2b` | `#2e2a3a` |
| step 1 `dark` | `#181520` | `#121018` | `#201d2a` |
| step 2 `darker` | `#0a0910` | `#060509` | `#13111a` |

The `-transparent` variants are identical to their solid counterparts **except for
`background`**, which becomes `"none"`. Only OpenCode supports true transparency;
Claude Code and Pi have no way to express it, so variants aren't generated for them
rather than generating one that lies.

## Install

Copy the `.json` to your terminal's theme directory and activate by name.

**Claude Code** — `~/.claude/themes/`

```jsonc
// ~/.claude/settings.json — the `custom:` prefix is required for custom themes
{ "theme": "custom:funky-dark-prototype" }
```

**OpenCode** — `~/.config/opencode/themes/`

```jsonc
// ~/.config/opencode/opencode.json — bare name, no prefix
{ "theme": "funky-dark-prototype" }
```

**Pi** — `~/.pi/agent/themes/`

```jsonc
// ~/.pi/agent/settings.json — bare name, no prefix
{ "theme": "funky-dark-prototype" }
```

## Your Terminal Is Also Part of the Theme

No theme lives in isolation: the emulator (Warp, Orca, Windows Terminal, whatever
you use) contributes its own scheme — e.g., Tokyo Night, Dracula, Catppuccin — and
its color overrides, and that tints what the agent doesn't paint.

- **Pi doesn't paint the canvas**: it uses your terminal's background. To match the
  chosen variant, set your profile bg to `#181520` (dark) or `#0a0910` (darker).
- **The assistant body in Pi uses your terminal's default foreground**, not the
  theme's `text` variable. If text looks gray/blueish in one terminal and fine in
  another, check that profile's fg and palette before the JSON.
- **OpenCode ships both solid and transparent variants** precisely to fit more users:
  the solid one paints the canvas (`background` with a color), the transparent one
  lets it pass through with `"background": "none"` and inherits your terminal's bg.

## Rebuild and Verify

```bash
node prototypes/build-prototypes.mjs       # emits the 8 JSONs from palette tokens
node prototypes/validate-prototypes.mjs    # 39 checks on the artifacts
node check-upstream.mjs                    # 28 provenance checks
```

The build is **deterministic**: running it again on a clean tree produces not a
single byte of difference. That's what lets generated artifacts be versioned without
verification depending on comparing them against a golden file.

`check-upstream.mjs` is a **read-only drift checker**: it reads `sources.json`,
verifies every registered artifact and every Pi upstream file by SHA-256, and
reports drift. It never writes or deletes anything, and exits with code 1 on any
failure.

## What's in This Repo and What Isn't

**Versioned:** generation and validation scripts, the palette, and the 8 generated
JSONs.

**Not versioned:** the base templates and the `Gentleman-Cute` theme the palette
derives from. They belong to another project (`gentle-pi`) and live in its npm
package; committing them would be unauthorized distribution of third-party material.
`.gitignore` excludes them and `check-upstream.mjs` fails if any appear.

Full provenance is in [`SOURCES.md`](SOURCES.md) and
[`sources.json`](sources.json), with a hash per excluded file so the exclusion
stays auditable.