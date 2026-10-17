# Plan: funky-dotfiles + Warp theme distribution

Two outcomes: (1) a new personal repo `funky-dotfiles` for machine configs, (2) a small slice in
`funky-theme-tui` to distribute the Funky Warp theme. Agents stay the priority; the Warp slice is
one small work unit, not a new scope.

## Naming decision

`funky-dotfiles` — "dotfiles" is the universal dev-community term for a personal setup repo:
clear content signal, no context needed. Discarded: `funky-dots` (only legible inside the
community convention), `funky-config` ("config" reads as one tool's file, not a whole machine
setup). Note: "funky" is a published brand (VS Marketplace), so the repo reads as brand-adjacent;
accepted, same trade-off as Gentleman.Dots.

## Decision

| Question | Answer |
|----------|--------|
| Where do personal configs live? | New repo `funky-dotfiles`. Nothing personal enters `funky-theme-tui`. |
| Where does the distributable Warp theme live? | `funky-theme-tui/themes/warp/` — new root dir, born from this need (per AGENTS.md rule). |
| Variants? | Two, both committed: `funky-dark` (solid) and `funky-dark-wallpaper` (+ image). |
| Priority? | Agents (OpenCode/Pi/Claude Code) remain the main scope. Warp is a brief README mention. |

## Part 1 — funky-dotfiles structure

Rule: **a folder is born only when that tool has a real config committed.** No aspirational stubs.

```
funky-dotfiles/
├── README.md                     # what lives here + install step per tool
├── warp/
│   ├── README.md                 # copy theme to Warp themes dir, rewrite bg path, done
│   ├── themes/
│   │   └── funky-dark-wallpaper.yaml   # personal variant (bg image)
│   └── assets/
│       └── funky-bg.jpg                # wallpaper; swappable anytime
├── shell/                        # born when a shell profile actually lands
├── git/                          # born when .gitconfig / includes land
└── nvim/                         # born when a real config lands
```

Notes:

- The wallpaper variant references an **absolute path** (`background_image.path`). Warp does not
  resolve it relative to the theme file — the README documents a one-line path rewrite after
  clone/on new machine.
- `.gitignore`: nothing special at first; add `*.local.*` if machine-specific overrides appear.
- Machine-repo hygiene: `funky-dotfiles` is personal state, no versioning pipeline, no validation
  scripts. If it starts growing build tooling, it has become a product repo by mistake.

## Part 2 — Warp distribution in funky-theme-tui

The theme is the same Funky palette as every other surface; only Warp's YAML schema differs. It is
hand-authored (25 lines), so it does **not** join the `prototypes/` build pipeline (that area is
for generated JSONs) — it gets its own directory.

Steps, in order:

1. **Create `themes/warp/`** with two hand-authored files, palette sourced from
   `material-trabajo/vscode-themes/` (single source of truth — no hand-picked colors):
   - `funky-dark-prototype.yaml` — solid variant: `background`, `accent`, `foreground`,
     `terminal_colors` (normal + bright), `details`, `name`. No `background_image` block.
   - `funky-dark-wallpaper-prototype.yaml` — same palette + `background_image` block.
   - `funky-bg.jpg` — the wallpaper asset, committed next to the YAMLs.
   - Both files carry the `-prototype` suffix (repo convention until stable release); the `name:`
     field matches the file stem so Warp's theme picker stays unambiguous.
2. **Caveat to document in `themes/warp/README.md`:** the wallpaper variant needs an absolute
   `background_image.path`; after installing, rewrite it to the local clone path. The solid
   variant works as-is. Include the one-line PowerShell command.
3. **README.md (root):** add a short "🖥️ Terminal support" section right after "Agent Support":
   one line for Warp (full palette, solid + wallpaper variants), link to `themes/warp/`.
   No previews yet — a screenshot slot can come later, consistent with the existing preview block.
4. **Validation:** no build step exists for these files. Manual check against the upstream palette
   is enough at this size; extending `validate-prototypes.mjs` is optional future work, not part
   of this slice.
5. **Commit:** one work unit — `feat(themes): add Warp theme with solid and wallpaper variants`.
   README mention rides in the same commit (same behavior/unit, per work-unit-commits).

Out of scope (for now): iTerm/WezTerm/Kitty ports, previews, build/validation pipeline for
terminals, publishing anywhere. Warp only.

## Checklist

- [ ] `funky-dotfiles` created with `warp/` only (shell/git/nvim folders deferred until real configs)
- [ ] `themes/warp/` in `funky-theme-tui` with 2 YAMLs + jpg, palette traceable to upstream
- [ ] Root README has the one-line Terminal support mention
- [ ] Both YAMLs open in Warp without errors (theme picker shows both names)
- [ ] Wallpaper variant path-rewrite instruction tested on a fresh install

## Next step

Say the word and the `themes/warp/` slice gets implemented here (small, one commit);
`funky-dotfiles` is a separate repo you create on GitHub and I can scaffold locally.
