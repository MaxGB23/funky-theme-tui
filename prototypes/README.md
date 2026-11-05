# prototypes/

Build area for the Funky TUI themes. Source and output live side by side on purpose.

- Source (edit these): `build-prototypes.mjs` (+ `color-math.mjs`), `templates/` (structural
  stubs), `../material-trabajo/vscode-themes/` (upstream palette + chain, committed).
- Output (never hand-edit, rebuild overwrites): `claude-code/`, `opencode/`, `pi/` — 8 JSONs.

From the repo root: `node prototypes/build-prototypes.mjs`, then
`node prototypes/validate-prototypes.mjs` (42 checks), then `node scripts/check-upstream.mjs`.
