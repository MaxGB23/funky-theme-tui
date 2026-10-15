# Release channels: VS Code, Zed, and TUI agents

One repo family, three distribution models. VS Code and Zed are live. TUI agents (OpenCode, Claude Code, Pi) ship from `funky-theme-tui` with npm as source of truth and per-agent install paths.

## Quick path

1. VS Code change → release skill → GitHub Release `vX.Y.Z` + vsix → **you** upload to Marketplace / Open VSX.
2. Zed change → tag `zed-vX.Y.Z` → action opens registry PR → merge upstream → users update.
3. TUI change → `node prototypes/build-prototypes.mjs` + validate → tag `v0.x.x` → `npm publish --provenance` (proposed) → install per agent below.

## Details

| Channel | Version file | Tag | Artifact | Publishes via |
|---|---|---|---|---|
| VS Code | `package.json` | `vX.Y.Z` | `funky-theme-vscode-<ver>.vsix` | GitHub Release + manual Marketplace / Open VSX |
| Zed | `zed/extension.toml` | `zed-vX.Y.Z` (annotated) | `zed/themes/funky-theme.json` | Registry PR to `zed-industries/extensions` |
| TUI agents | `package.json` (proposed, `0.x.x`) | `v0.x.x` | 8 JSONs under `prototypes/` | npm `funky-theme-tui` + per-agent install |

### VS Code + Open VSX — live, manual by design

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

Boundaries are per channel: `git log $(git describe --tags --match "v[0-9]*")..HEAD` for VS Code, `--match "zed-v*"` for Zed. A `zed-v*` tag is invisible to the VS Code pipeline and vice versa.

### Zed — live, registry PR per release

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

### TUI agents — proposed, npm as source of truth

Current state: 8 deterministic prototypes, zero deps, no `package.json`, no CI. Proposed: independent `0.x.x` stream (never `3.x` — that would claim to track Funky VS Code, which is false).

```bash
node prototypes/build-prototypes.mjs
node prototypes/validate-prototypes.mjs   # 39 checks
node check-upstream.mjs                   # 28 checks, read-only
npm publish --provenance --access public   # from tag v0.x.x, trusted publishing
```

Proposed `package.json` (minimal):

```json
{
  "name": "funky-theme-tui",
  "version": "0.1.0",
  "files": ["prototypes/*/funky-*.json", "prototypes/templates/"],
  "scripts": {
    "build": "node prototypes/build-prototypes.mjs",
    "validate": "node prototypes/validate-prototypes.mjs && node check-upstream.mjs"
  }
}
```

Supply-chain baseline (same for all npm publishes): trusted OIDC publishing over long-lived tokens, `id-token: write` only, `package-manager-cache: false`, `npm ci` in CI, 2FA required, provenance attestations verifiable with `npm audit signatures`, `stage publish` in automation + human `stage approve`.

| Agent | Market? | Install path | Proposed distribution |
|---|---|---|---|
| OpenCode | **No market** — themes load from `~/.config/opencode/themes/` or project `.opencode/themes/`; `share` is session links, plugins are JS/TS modules | `~/.config/opencode/themes/funky-*.json` (bare name in `opencode.json`) | Copy from npm tarball or repo; team override via `.opencode/themes/`; transparent variants (`background: "none"`) only here |
| Claude Code | Plugin marketplace **with `themes/` component** + local dir | `~/.claude/themes/` with `custom:` prefix, or plugin `themes/*.json` (`{ "name", "base": "dark", "overrides": { rgb() } }`) | Ship a `funky-theme` plugin (`plugin.json` + `themes/`) plus marketplace entry; npm tarball stays the reviewable source; plugin themes are read-only (user edits become local copies) |
| Pi | npm packages (**real channel**, like `gentle-pi`) | `~/.pi/agent/themes/` or packaged `themes/` via `settings.json` `packages: ["npm:funky-theme-tui"]` | Publish `funky-theme-tui` with `themes/` + `keywords: ["pi-package"]`; Pi resolves `vars`/`colors` indirections + `export` (`pageBg`, `cardBg`, `infoBg`) |

72 Claude slots (`rgb()`), ~50 OpenCode tokens (`#RRGGBB` + `defs`), Pi `vars` hex + `colors` indirections. A file correct for one agent is silently wrong for another — never copy across agents.

## Checklist

- [ ] VS Code release used the skill, changelog was finalized before packaging, `verify:vsix` passed.
- [ ] Zed tag matches `extension.toml`, Zed artifact actually changed, registry PR is the only open one for the branch.
- [ ] TUI build is byte-deterministic, validator + upstream checker green, tarball contains only allowlisted files.
- [ ] npm publish used trusted publishing + provenance; RCs went to `--tag next`, never `latest`.

## Next step

Decide the TUI `0.1.0` scope (which of the 8 prototypes ship), then add `package.json` + `ci-validate.yml` + TUI release skill derived from the VS Code pattern without the VSIX step.
