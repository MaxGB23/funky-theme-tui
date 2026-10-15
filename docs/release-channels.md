# Release channels: VS Code, Zed, and TUI agents

One repo family, three distribution models. VS Code and Zed live in their own repos and are documented here as family reference only — **this repo ships TUI agents alone**. TUI agents (OpenCode, Claude Code, Pi) ship from `funky-theme-tui` with npm as source of truth **for Pi (the only agent that consumes npm natively)** and per-agent install paths.

## Quick path

1. VS Code change → release skill → GitHub Release `vX.Y.Z` + vsix → **you** upload to Marketplace / Open VSX.
2. Zed change → tag `zed-vX.Y.Z` → action opens registry PR → merge upstream → users update.
3. TUI change → `node prototypes/build-prototypes.mjs` + validate → tag `tui-v0.x.x` (confirmed — a bare `v0.x.x` would collide with the VS Code `vX.Y.Z` namespace in family tooling) → local `npm stage publish` + human `npm stage approve` with 2FA (manual by design — no publish in CI) → install per agent below.

## Details

| Channel | Version file | Tag | Artifact | Publishes via |
|---|---|---|---|---|
| VS Code | `package.json` | `vX.Y.Z` | `funky-theme-vscode-<ver>.vsix` | GitHub Release + manual Marketplace / Open VSX |
| Zed | `zed/extension.toml` | `zed-vX.Y.Z` (annotated) | `zed/themes/funky-theme.json` | Registry PR to `zed-industries/extensions` |
| TUI agents | `package.json` (proposed, `0.x.x`) | `tui-v0.x.x` (confirmed) | 8 JSONs under `prototypes/` (published layout: `themes/`, see below) | npm `funky-theme-tui` (native channel for Pi; manual-copy mirror for OpenCode/Claude Code) |

### VS Code + Open VSX — live in its own repo, manual by design (family reference)

Source of truth: `src/theme-config.js`. Never hand-edit `themes/*.json`.

```bash
pnpm install && pnpm build && pnpm package   # AFTER changelog finalize
pnpm verify:vsix                              # entry set + packaged changelog
gh release create v<version> funky-theme-vscode-<version>.vsix \
  --title "v<version>" --notes-file RELEASE_NOTES.md [--prerelease]
Remove-Item RELEASE_NOTES.md                  # transient, never versioned
```

| Rule | Why |
|---|---|
| Finalize `CHANGELOG.md` before `pnpm package` | The vsix embeds `extension/changelog.md`; packaging first ships stale notes |
| `RELEASE_NOTES.md` via `--notes-file`, then delete | Shells corrupt backticks; file keeps notes byte-identical |
| RCs are always `--prerelease`, never create a changelog section | Stable that closes the line consolidates the RC bodies |
| `vsce publish` is forbidden | It auto-bumps and creates commit+tag |
| Agent never uploads | Stable handoff: Marketplace manage page (Microsoft login) + `npx ovsx publish <vsix> -p <OPEN_VSX_TOKEN>` |

CI is validation only (`.github/workflows/ci-build.yml`): checkout, pnpm setup, Node 20, `pnpm install --frozen-lockfile`, build, validate. No secrets, no publish.

Boundaries are per channel: `git log $(git describe --tags --match "v[0-9]*")..HEAD` for VS Code, `--match "zed-v*"` for Zed. A `zed-v*` tag is invisible to the VS Code pipeline and vice versa. TUI tags use the `tui-v*` prefix (confirmed) precisely so they stay invisible to the `v[0-9]*` VS Code match — a bare `v0.x.x` tag WOULD match it and pollute the VS Code range.

### Zed — live in its own repo, registry PR per release (family reference)

Source of truth: `palette` + `src/zed-config.js` (`zedMap`) → `scripts/build-zed.js` → `zed/themes/funky-theme.json`. Extension id `funky-theme`, starts at `0.1.0`, own `zed/CHANGELOG.md`.

Local install (v0.1, no registry needed):

```bash
# copy, or install zed/ as dev extension
Copy-Item zed/themes/funky-theme.json "$env:APPDATA\Zed\themes\"
```

Registry (post-v0.1): push of tag `zed-v*` triggers `.github/workflows/zed-registry-bump.yml`. No GitHub Release is created for Zed tags.

What the action does:

1. Verifies tag matches `zed/extension.toml` version.
2. Resolves tag to commit SHA (peels annotated tags).
3. Syncs fork `MaxGB23/extensions` from upstream.
4. Bumps `version` inside the `[funky-theme]` section of `extensions.toml`.
5. Points the submodule gitlink at the tagged commit (`git update-index --add --cacheinfo 160000,<SHA>,extensions/funky-theme`).
6. Commits **as the PAT owner** (Zed CLA bot rejects `github-actions[bot]`), force-pushes branch `funky-theme-v<ver>`.
7. Dedupes via REST pulls list; creates or refreshes one PR against `zed-industries/extensions`.

| Rule | Value |
|---|---|
| Secret | `ZED_REGISTRY_PAT`, classic PAT with `repo` scope on a CLA-signed account (expires 2027-01-08; expiry fails closed) |
| Registry limits | Exactly 1 extension per PR, max 3 open PRs, respond within 3 weeks |
| Each channel releases alone | Shared-source change rebuilds both, but a channel with byte-identical artifact neither bumps nor tags |

### TUI agents — proposed, npm as source of truth for Pi (manual-copy mirror for the rest)

Current state: 8 deterministic prototypes, zero deps, no `package.json`, no CI. Proposed: independent `0.x.x` stream (never `3.x` — that would claim to track Funky VS Code, which is false). Tags use the `tui-v` prefix (confirmed) so they never collide with the VS Code `vX.Y.Z` namespace. Scope decided: all 8 prototypes ship; final names drop `-prototype` (`funky-dark`, `funky-darker`, plus `funky-dark-transparent` / `funky-darker-transparent` for OpenCode only).

```bash
node prototypes/build-prototypes.mjs
node prototypes/validate-prototypes.mjs   # 39 checks
node check-upstream.mjs                   # 28 checks, read-only
npm stage publish   # staged flow; a maintainer approves with 2FA (see supply-chain baseline)
```

Notes: the publish model is MANUAL (decided): `npm stage publish` runs locally under your login/token, then you approve with 2FA (`npm stage approve <id>` or the website button). No publish workflow in CI, no `NODE_AUTH_TOKEN` in CI to manage. This survives the 2FA-bypass token phase-out (bypass tokens keep stage ability after Jan 2027; only direct publish dies — and we never direct-publish). Tradeoff, stated plainly: manual publishes get NO Sigstore provenance badge (provenance requires trusted-publishing OIDC from CI on a public repo). Verification for our releases is the committed build + validator output and tarball inspection via `npm stage download`, not a provenance attestation.

Proposed `package.json` (corrected — the `pi` manifest key and `repository.url` are hard requirements, not niceties):

```json
{
  "name": "funky-theme-tui",
  "version": "0.1.0",
  "description": "Funky TUI themes for Pi (native npm channel), Claude Code and OpenCode (manual copy)",
  "license": "MIT",
  "repository": { "type": "git", "url": "git+https://github.com/<owner>/funky-theme-tui.git" },
  "keywords": ["pi-package", "theme", "terminal", "opencode", "claude-code", "pi"],
  "engines": { "node": ">=22.14" },
  "publishConfig": { "access": "public" },
  "files": ["themes/", "README.md", "LICENSE", "CHANGELOG.md"],
  "pi": { "themes": ["./themes/*.json"] },
  "scripts": {
    "build": "node prototypes/build-prototypes.mjs",
    "validate": "node prototypes/validate-prototypes.mjs && node check-upstream.mjs",
    "prepack": "npm run build && npm run validate"
  }
}
```

Rules behind it: `repository.url` must be set (and exactly match the repo once known — `<owner>` above is a placeholder; exactness becomes a hard OIDC/provenance requirement only if the model ever flips to CI); `keywords: ["pi-package"]` only buys gallery discovery, the `pi.themes` key is what exposes themes; `files` ships ONLY consumables — `prototypes/templates/` (build-input stubs) must never be published, and the per-agent `prototypes/<agent>/` trees must be mapped to the published `themes/` layout (copy the Pi files to `themes/` in a prepack step or point `pi.themes` at the exact glob). Requires npm CLI ≥11.15.0 (`npm stage` needs it) and Node ≥22.14. `npm ci` additionally requires a committed lockfile (missing today).

Supply-chain baseline (manual model, decided): stage locally with `npm stage publish` (no 2FA needed to stage), review with `npm stage list` / `view` / `download`, approve as maintainer with 2FA — CLI (`npm stage approve <id>`) or the website Approve button. No tokens in CI, no trusted-publisher config to maintain (and its 2-day first-publish expiry never applies to us). Background facts that justify this choice: 2FA-bypass tokens lost management ops on 2026-07-31 and lose DIRECT publish in Jan 2027, but keep STAGE ability — so a stored token that only stages stays valid; approval always requires interactive 2FA and can never go through OIDC. If the model ever flips to CI trusted publishing, the rules become: `id-token: write` only, `package-manager-cache: false`, `npm ci` (needs committed lockfile), NO `NODE_AUTH_TOKEN`, GitHub-hosted runners only, `repository.url` exact match, npm CLI ≥11.5.1 + Node ≥22.14 — and only then is provenance automatic (public repo + public package). Do NOT verify releases with `npm audit signatures` (ECDSA registry signatures, a different mechanism from Sigstore provenance).

| Agent | Market? | Install path | Proposed distribution |
|---|---|---|---|
| OpenCode | **No market** — themes load from `~/.config/opencode/themes/`, `<root>/.opencode/themes/`, `./.opencode/themes/` (later wins); `share` is session links, plugins are JS/TS modules, not a theme channel | `~/.config/opencode/themes/funky-*.json`, name set in `tui.json` (`{"theme": "..."}`, NOT `opencode.json` — that key is deprecated) | npm tarball is a manual-copy mirror only (OpenCode cannot consume npm); team override via `.opencode/themes/`; transparent variants (`background: "none"`) only here; current files emit flat hex only (no `defs`, no `{dark,light}` variants — an allowed subset, not a format limit) |
| Claude Code | Plugin marketplace with **`experimental.themes`** (unstable API — manifest shape may still change) + local dir | `~/.claude/themes/` with `custom:` prefix, or plugin `themes/*.json` (`{ "name", "base", "overrides" }`; colors accept `#rrggbb`, `#rgb`, `rgb()`, `ansi256(n)`, `ansi:<name>`; `base` in `dark`, `light`, `dark/light-daltonized`, `dark/light-ansi`) | 0.1.0 scope (proposed): local-dir copy only; plugin (`plugin.json` + `themes/` + marketplace entry) is phase 2 — needs version pinning plus strict-mode and name-reservation handling; npm tarball stays the reviewable source; "plugin themes are read-only" is UNVERIFIED, do not rely on it |
| Pi | npm packages (**real channel**) | `~/.pi/agent/themes/` (global), `.pi/themes/` (project, after trust), or packaged themes via `pi install npm:funky-theme-tui` | Publish with `themes/` at root (or declared paths) + `keywords: ["pi-package"]` (gallery discovery only) + REQUIRED `pi: {"themes": [...]}` manifest; strict schema (6 color forms incl. `oklch()`/`okhsl()`/256-index/var-ref/`""`, unique `name` = filename, `appearance`); validate against the published theme schema; final names drop `-prototype` (decided for all 8: `funky-dark`, `funky-darker`) |

~72 Claude tokens across the `base` presets (per 2.1.x; unknown tokens are silently ignored), 49 OpenCode tokens (flat hex — a subset of the documented format), Pi `vars` + `colors` indirections under a strict schema. A file correct for one agent is silently wrong for another — never copy across agents.

## Checklist

- [ ] VS Code release used the skill, changelog was finalized before packaging, `verify:vsix` passed.
- [ ] Zed tag matches `extension.toml`, Zed artifact actually changed, registry PR is the only open one for the branch.
- [ ] TUI build is byte-deterministic, validator + upstream checker green, tarball contains only allowlisted files.
- [ ] publish used the manual model (local stage + human 2FA approve, no CI publish); every publish is final — no prereleases (decided, consistent with backlog). If it breaks, ship a patch; `latest` is always the newest stable.

## Open checklist — project rules and release

Pending definitions before the first `0.1.0`. Tracked here so they are not lost.

- [ ] `AGENTS.md` rules for this repo (commit style, changelog flow, backport policy for the palette). Scope note: this repo is TUI-only — VS Code/Zed rules live in their repos and are referenced here, never duplicated.
- [ ] TUI release skill derived from the VS Code pattern: `0.x.x` stream, no VSIX step, changelog finalized before publish.
- [ ] npm publish model: DECIDED manual — local `npm stage publish` + human 2FA approve, no publish in CI (consistent with backlog #10, survives Jan-2027; tradeoff: no Sigstore provenance badge).
- [ ] `package.json` contract: specified above (name, `repository.url` exact, `pi.themes`, `files` allowlist = `themes/` only, build/validate/prepack scripts, Node ≥22.14). To implement: confirm owner placeholder, map `prototypes/<agent>/` to published `themes/`.
- [ ] CI scope: validation-only `ci-validate.yml` mirroring `ci-build.yml` (no credentialed publish in CI — confirmed by the manual-model decision).
- [ ] Changelog flow: this repo gets its own `CHANGELOG.md` for TUI (VS Code/Zed changelogs live in their repos — a cross-repo single CHANGELOG is impossible with separate repos). `[Unreleased]` discipline, English notes.
- [ ] Propagation rules between `funky-theme` and `funky-theme-tui` when a key color changes.

## Next step

Decided: manual publish model (no `publish.yml` ever), all-8 scope with final names minus `-prototype`, `tui-v*` tags, no prereleases (every publish is final; breakage ships as a patch). Then add `package.json` + `ci-validate.yml` + TUI release skill derived from the VS Code pattern without the VSIX step. The `-prototype` → final rename itself (builder, validator, installed copies) is implementation work for the 0.1.0 pass, not a doc edit.
