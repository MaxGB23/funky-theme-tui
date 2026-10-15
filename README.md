# Funky Theme for AI Coding Agents 👻

> A vibrant, semantically-driven theme for **Claude Code**, **OpenCode**, and **Pi** — bringing Funky's color DNA to the terminal where you actually live.

As terminal agents and AI handle more of the heavy lifting, you're spending less time writing in the IDE and more time *in the terminal* — reviewing output, reading diffs, watching agents work. Funky Theme for Terminals embraces that shift: same semantic palette, tuned for endurance without becoming boring.

**📦 Install from this repo** · **🧪 Prototype** — palettes under visual review, surface ladder still open. [`SOURCES.md`](SOURCES.md) tracks rationale and provenance.

---

## 📸 Preview

<!-- Add screenshots here -->

<p align="center"><strong>Funky Dark (Claude Code)</strong></p>

<p align="center">
  <img src="docs/images/claude-dark.png" alt="Funky Dark in Claude Code" width="75%">
</p>

<p align="center"><strong>Funky Dark (OpenCode)</strong></p>

<p align="center">
  <img src="docs/images/opencode-darker.png" alt="Funky Darker in OpenCode" width="75%">
</p>

<p align="center"><strong>Funky Dark (Pi / Gentle-Shell)</strong></p>

<p align="center">
  <img src="docs/images/pi-dark.png" alt="Funky Dark in Pi" width="75%">
</p>

---

## 🎨 Variants — Two depths, one palette

Terminal developers read differently. Some want balanced contrast for long sessions, some want near-black for zero distraction. Two variants, same semantic mapping:

| Variant | Canvas | Best for | Claude Code | OpenCode | Pi |
|---|---|---|---|---|---|
| **Funky Dark** | `#181520` (gray-mauve) | Balanced contrast, vivid semantics — the daily driver | ✅ | ✅ | ✅ |
| **Funky Darker** | `#0a0910` (near-black) | Ultra-nocturnal, zero-distraction focus sessions | ✅ | ✅ | ✅ |

**Transparent variants** (OpenCode only): identical semantics, `background: "none"` — inherits your terminal's bg. Claude Code and Pi can't express transparency, so no false variants are generated.

> **Surface ladder** (reference): `step 0` `#24212e` → `step 1 (dark)` `#181520` → `step 2 (darker)` `#0a0910`. The editor's `Darker` becomes TUI `dark`; TUI `darker` pushes deeper.

**8 files total**: 2 tiers × 3 agents + 2 transparent (OpenCode only).

---

## 🌈 Color Philosophy — Same DNA, Terminal Tuning

Funky Theme is built around a **semantic, tiered color palette** — **54 tokens**, single source of truth. Every color has a name and a reason:

- 🩷 **Pinks** — Tags, parameters, numeric constants
- 🟣 **Purples** — Keywords, flow control (lighter purple)
- 🩵 **Cyans** — Functions, regex punctuation, structural keywords (imports, `require`…)
- 🔵 **Blues** — Methods, symbol operators, storage modifiers
- 🟡 **Yellows** — Type names, attribute names (HTML, CSS, JSX)
- 🟢 **Greens** — Strings, git untracked, inline code
- 🔴 **Reds** — Errors, deleted refs
- 🟠 **Oranges** — `new`/operators, auxiliary keywords (`extends`, `mod`…)

**One shared canvas per variant.** Dark themes often default to deep blues — familiar but fatiguing. Funky uses a custom gray-mauve canvas (kinder to eyes at low brightness). Only `darker` goes deeper; the palette stays identical.

| Canvas | Variant |
|---|---|
| `#181520` gray-mauve | Funky Dark |
| `#0a0910` near-black | Funky Darker |

**Terminal tuning** (vs. editor):
- **Backgrounds darker** — terminal sessions run longer; deeper bases reduce glare
- **Selective desaturation** — a handful of accents that hit hardest in streaming output have slightly lowered saturation. Not across the board; only where it reduces fatigue while keeping Funky identity intact
- **Semantic mapping frozen** — pinks stay tags, purples stay keywords, cyans stay functions. The meaning of every color is identical to the editor theme.

---

## 💻 Agent Support

Optimized for the workflows you actually run in the terminal:

**Agents (tested daily)**
- **OpenCode** — full support, solid + transparent variants
- **Pi** — full support, uses your terminal bg for canvas
- **Claude Code** — supported, `custom:` prefix required

---

## ⚙️ Terminal Integration Notes

**Pi doesn't paint the canvas** — it uses your terminal's background. To match the chosen variant, set your profile bg to `#181520` (Dark) or `#0a0910` (Darker).

**The assistant body in Pi uses your terminal's default foreground**, not the theme's `text` variable. If text looks gray/blueish in one terminal and fine in another, check that profile's fg and palette before the JSON.

**OpenCode ships both solid and transparent variants** precisely to fit more users: the solid one paints the canvas (`background` with a color), the transparent one lets it pass through with `"background": "none"` and inherits your terminal's bg.

**Recommended terminal font config** (Orca / Cascadia Code):
```json
{
  "fontFamily": "Cascadia Code",
  "fontSize": 17,
  "fontWeight": 375,
  "fontWeightBold": 425,
  "lineHeight": 1.35
}
```
> Not bundled; falls back to system monospace if missing. These are the exact values the maintainer uses daily — adjust to taste.

---

## 📦 Installation

| Agent | Path | Config |
|---|---|---|
| **Claude Code** | `~/.claude/themes/` | `{ "theme": "custom:funky-dark-prototype" }` |
| **OpenCode** | `~/.config/opencode/themes/` | `{ "theme": "funky-dark-prototype" }` |
| **Pi** | `~/.pi/agent/themes/` | `{ "theme": "funky-dark-prototype" }` |

1. Copy the `.json` for your variant to the agent's theme directory
2. Add the config snippet to the agent's settings file
3. Restart the agent

> **Prototype note**: Theme names carry `-prototype` while palettes are under review. Stable names will drop the suffix.

---

## 🔧 Rebuild & Verify

```bash
node prototypes/build-prototypes.mjs       # emits 8 JSONs from 54 palette tokens
node prototypes/validate-prototypes.mjs    # 41 checks on generated artifacts
node check-upstream.mjs                    # 28 provenance checks (read-only)
```

- **Deterministic build** — re-run on clean tree = zero byte diff. Generated artifacts versioned without golden-file comparison.
- **`check-upstream.mjs`** — read-only drift detector. Verifies every registered artifact and Pi upstream file by SHA-256. Exits 1 on any failure. Never writes or deletes.

---

## 📂 What's in This Repo

**Versioned**: generation/validation scripts (`prototypes/`), palette tokens, 8 generated JSONs.

**Not versioned**: base templates and `Gentleman-Cute` theme (palette source). They live in `gentle-pi` npm package; committing them would be unauthorized distribution. `.gitignore` excludes them; `check-upstream.mjs` fails if any appear.

---

## 🔗 Related

- **Funky Theme (VS Code / Cursor / Zed / Antigravity)** → [maxgb23/funky-theme](https://github.com/maxgb23/funky-theme)
- **Gentle AI (Pi agent harness)** → [gentle-pi](https://github.com/earendil-works/gentle-pi)