#!/usr/bin/env node
/**
 * Funky TUI prototypes validator.
 *
 * Enforces every acceptance criterion in odd/tasks/funky-tui-prototypes.md:
 *   1. each output has EXACTLY the template's slot set — same keys, same count, no additions
 *   2. Claude Code has zero `#` hex; OpenCode and Pi have zero `rgb(`
 *   3. no output contains an 8-digit hex
 *   4. each tier's backgrounds are its own CHAIN STEP, and every alpha-derived value was
 *      recomputed against that step's surfaces, not copied from the other tier
 *   5. all 8 files parse as JSON
 *   6. Pi `colors` entries are indirections naming `vars` keys, never literal colours
 *   7. no template input resolves under `material-trabajo/`, the two in-repo inputs are derived
 *      stubs, and all 7 of Claude Code's background-bearing slots are resolved from their KEY
 *      (D8 — the vendored templates the build used to read are gone from the build's inputs)
 *   8. no committed build input carries the vendored project's identity as a DATA value, while the
 *      builder's path reference to Pi's external npm template is allowed and asserted to be one
 *      (D9 — the rule, and the data-value-versus-path-reference distinction that makes it fair)
 *
 * A variant is TWO orthogonal axes here, exactly as in the builder: `tier` (dark | darker)
 * selects which STEP of the darkening chain the file paints and `opacity` (solid | transparent)
 * selects whether OpenCode's `background` is the terminal's pass-through. Every check below that
 * needs colour maths reads the TIER, and every check that needs a file asks the agent first
 * whether it has that variant — the failure mode this guards is a check that demands a
 * claude-code transparent file that must not exist, or one that stops looking at an
 * opencode transparent file because the id is not in a two-element list.
 *
 * D7 re-tiered the whole ladder: the palette is step 0 and ships nothing, step 1 is what
 * `darker` used to paint and ships as `dark`, step 2 is new and ships as `darker`. Three
 * consequences this file has to carry, not just the new hexes:
 *   - provenance is DECLARED, because step 1 and step 2 surfaces are not palette tokens
 *     (see DECLARED_PROVENANCE and criterion-4-accounting);
 *   - step 0 is a chain ancestor, so a dead-token check must not demand it be painted while
 *     still catching a genuinely orphaned token (see semantic-dead-token);
 *   - the ladder itself has to be monotonic and near-black at the bottom, which no per-file
 *     check can see (see semantic-ladder).
 *
 * Nothing here imports build-prototypes.mjs. The palette, the chain and the alpha tables are
 * transcribed a second time and asserted against the same upstream sources, so a build bug and a
 * validator bug would have to agree independently to slip through. This is the check that exists
 * to catch "a value copied from dark into darker".
 *
 * T8 closes the gap the parent spot check found: the six criteria above are STRUCTURE.
 * A colour can be perfectly well-formed, correctly recomputed per variant, correctly
 * accounted for by the palette, and still be wrong because two slots that must differ are
 * the same colour. The `semantic-*` checks below assert RELATIONSHIPS between the emitted
 * values and are computed from the files on disk, never from the mapping table — a check
 * that read the mapping would be asserting the intent back to itself.
 *
 * Plain Node ESM, zero dependencies. Exits 0 only when every check passes.
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Shared colour FORMULAS only (toHex, luma). Shared colour DATA would let a transcription
// error in one script hide the same error in the other, which is the whole point of the
// second transcription.
import { toHex, luma, rgbDistance } from './color-math.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SOURCE_THEME_CONFIG = join(ROOT, 'material-trabajo', 'vscode-themes', 'theme-config.js');
const SOURCE_BUILD = join(ROOT, 'material-trabajo', 'vscode-themes', 'build.js');
/**
 * Our own generator, read as TEXT — never imported, because importing it would run it and
 * rewrite the 8 files this script is in the middle of checking. Only `checkBuilderTableDrift`
 * opens it, and only to compare the alpha table against the transcription below. See that
 * function for why the unrendered half of the table needs a route that bypasses the outputs.
 */
const SOURCE_PROTOTYPE_BUILDER = join(HERE, 'build-prototypes.mjs');

// ---------------------------------------------------------------------------
// Independent transcription of the upstream data, and of the D7 chain on top of it
// ---------------------------------------------------------------------------

/**
 * The darkening ladder, as absolute values per step and per rung.
 *
 * Step 0 is the palette and is deliberately NOT shipped: D7 moved both tiers down a step, so no
 * emitted file paints it. It is transcribed anyway, because the check that the ladder is monotonic
 * and that step 0 really does feed step 1 needs both ends of the chain, and because a step 0 that
 * drifted from the palette would make "step 0 > step 1" a statement about a fiction.
 *
 * `shippedAs` is the load-bearing field: it is how this file knows a step must be painted and how
 * it knows a reference step must not be demanded. Nothing infers that from a hex.
 */
const SURFACE_VALUES = {
  base: { 0: '#24212e', 1: '#181520', 2: '#0a0910' },
  deep: { 0: '#211e2b', 1: '#121018', 2: '#060509' },
  elevated: { 0: '#2e2a3a', 1: '#201d2a', 2: '#13111a' },
};

/** Which palette token each ladder rung starts from. The chain's entire contact with the palette. */
const SCAFFOLD_PALETTE_TOKENS = { base: 'bgBase', deep: 'bgDeep', elevated: 'bgElevated' };

/** Every opaque hex value the upstream palette defines, for the failure messages above. */
const PALETTE_MATCHES = new Set(
  Object.values(readPalette()).filter((h) => /^#[0-9a-f]{6}$/.test(h)),
);

/** Which step each shipped tier paints. Step 0 is absent on purpose: it ships nothing. */
const TIER_STEP = { dark: 1, darker: 2 };

/** Every step, in ladder order, with the tier that ships it (or null for the reference). */
const CHAIN_STEPS = [
  { step: 0, tier: null, role: 'reference' },
  { step: 1, tier: 'dark', role: 'shipped' },
  { step: 2, tier: 'darker', role: 'shipped' },
];

/**
 * The chain as links, `from` -> `to`, because that is the shape build.js has: a prefix map that
 * keeps the alpha suffix. Transcribed a second time on purpose.
 *
 * Link 0->1 is build.js lines 29-39 and is asserted against that file by `groundTranscription`.
 * Link 1->2 is the D7 declaration and has NO upstream — none of `#0a0910`, `#060509`, `#13111a`
 * appears in `theme-config.js` or `build.js` — so it is asserted by internal consistency instead
 * (see `checkChainDeclaration`), which is the only kind of assertion that would not be a fiction.
 */
const CHAIN_LINKS = [
  {
    from: 0, to: 1,
    entries: [
      ['#24212e', '#181520'],
      ['#211e2b', '#121018'],
      ['#2e2a3a', '#201d2a'],
      ['#363143', '#26222f'],
      ['#464254', '#3a374a'],
      ['#444156', '#3f3c4f'],
      ['#625e74', '#544f64'],
    ],
  },
  {
    from: 1, to: 2,
    entries: [
      ['#181520', '#0a0910'],
      ['#121018', '#060509'],
      ['#201d2a', '#13111a'],
    ],
  },
];

/**
 * build.js lines 46-49, applied at the `darker` TIER only.
 *
 * Left tier-keyed on purpose, matching the builder: D7 ruled on the `accentFaint` alpha and not on
 * these, both are imperceptible, and moving them is a hue change in a shipped file. The two
 * adjusted values still have to be accepted by criterion-4-accounting, and they are accepted
 * through DECLARED_PROVENANCE rather than by a blanket "any value the syntax map produces" rule,
 * so that a *third* syntax adjustment would have to be declared.
 */
const DARKER_SYNTAX = [
  ['#fff9b7', '#fff9ba'],
  ['#ffd089', '#ffd18e'],
];

/**
 * The 10 palette alpha tokens: value, and the SURFACE ROLE it sits on.
 *
 * The role, not a hex, is the transcription that matters. Before D7 this file hardcoded a
 * `surface` / `surfaceDarker` hex pair per token, which quietly baked the old two-tier world in:
 * adding a step meant editing ten rows. Naming the role means the surface follows SURFACE_VALUES
 * automatically, and a token that moves to a different step cannot be forgotten.
 *
 * `byStep` carries the one alpha D7 re-pointed: build.js raises the word-highlight family from
 * 0x2a to 0x30 because a darker canvas needs more alpha to stay visible, and after D7 BOTH
 * shipped tiers are below the step-0 reference, so both take 0x30. Step 2 reuses 0x30 rather than
 * raising it — a brighter accent on a near-black canvas is a visual judgement, not a build default.
 */
const ALPHA_TOKENS = {
  uiAccentStrong: { value: '#8c8effd2', surface: 'base' },
  accentSelection: { value: '#8c8eff45', surface: 'base' },
  guideAccent: { value: '#8c8eff73', surface: 'base' },
  accentFaint: { value: '#8c8eff2a', surface: 'base', byStep: { 1: '#8c8eff30', 2: '#8c8eff30' } },
  controlBorder: { value: '#8c8eff33', surface: 'base' },
  searchBackground: { value: '#5f569580', surface: 'base' },
  scrollbarTrack: { value: '#24212eea', surface: 'base' },
  matchBorder: { value: '#a599efff', surface: 'base' },
  hoverSurface: { value: '#2e2a3a80', surface: 'base' },
  highlightBorder: { value: '#8c8eff5e', surface: 'base' },
};

const DERIVED_ALPHAS = {
  diffAddedBg: { value: '#8c8eff25', valueDarker: '#8c8eff18', surface: 'base' },
  diffRemovedBg: { value: '#ff000025', valueDarker: '#ff000018', surface: 'base' },
  // The T7 info surface: cyanDim at 0x1f over the DEEP panel. Same alpha at every step; only the
  // surface it composites against moves, which is exactly invariant 4 — the wash darkens in step
  // 2 without anyone editing it. `composed` marks it as built by the D1 system rather than
  // transcribed from the palette, so groundTranscription must not look for it upstream.
  infoSurface: { value: '#80ecff1f', surface: 'deep', composed: true },
};

/**
 * The five literals build.js LOWERS in the ultra-nocturno profile (lines 71-78): the two diff
 * washes, the two diff text backgrounds, and the word-highlight family.
 *
 * This set exists because "the value is somewhere in build.js" is too weak a claim to ground a
 * per-step alpha. `#8c8eff30` also appears as the palette's `uiAccentStrong` base, and `#8c8eff2a`
 * appears as `accentFaint` in theme-config.js, so a flat string search over the whole upstream
 * tree passes for a `byStep` override that has been deleted outright — the search finds the
 * literal build.js no longer applies, or finds an unrelated one. Requiring membership in the
 * LOWERS set, rather than mere presence, is what makes the bump falsifiable.
 */
const LOWERED_ALPHAS = new Set([
  '#8c8eff18', '#ff000018', // diffAddedBg / diffRemovedBg
  '#8c8eff28', '#ff000028', // diffAddedBg / diffRemovedBg, text backgrounds
  '#8c8eff30',              // wordHighlight + wordHighlightStrong + bracketMatch
]);

/**
 * Alpha tokens no TUI agent exposes, and the upstream slot each one is transcribed from.
 *
 * Found by mutation testing, not by reading: deleting the `accentFaint` alpha bump from the
 * builder changed all 8 outputs by ZERO bytes and failed nothing, because `accentFaint` reaches
 * no slot in Claude Code, OpenCode or Pi. That is not a defect in the output — a TUI has no
 * word-highlight or bracket-match surface to paint, so wiring the token in would mean inventing
 * a key and breaking criterion-1's key-set equality with the templates. It IS a hole in the
 * checking: seven of thirteen declared alphas were silently dead, and no check said so.
 *
 * So they are listed here as a declared fact rather than left to be discovered by absence, and
 * `semantic-dead-token` asserts the list is exhaustive in both directions: every token not in
 * ALPHA_SLOTS must appear below, and nothing below may be consumed after all.
 */
const TRANSCRIBED_NOT_EMITTED = {
  accentFaint: 'editor.wordHighlightBackground / wordHighlightStrong / editorBracketMatch.background',
  controlBorder: 'editor.selectionBackground border / focusBorder',
  guideAccent: 'editorOverviewRuler.findMatchForeground',
  highlightBorder: 'editor.rangeHighlightBorder',
  matchBorder: 'editor.findMatchBorder',
  scrollbarTrack: 'editorScrollBar.background',
  uiAccentStrong: 'focusBorder / progressBar.background',
};


/**
 * Every value in an output that is neither a palette token nor a per-step composite, with the
 * step that introduces it and where that step came from.
 *
 * This table exists because D7 made "the value came from the palette" a false statement. A terminal
 * theme has no palette token for its own canvas: `dark` paints step 1 and `darker` paints step 2,
 * and neither step is a value `theme-config.js` defines. The old accounting check got away with
 * "any palette token after this tier's darker map", which was sound while the darker map WAS
 * upstream and is a blanket relaxation now that one link is declared here instead.
 *
 * So the acceptance is stated rather than derived, and it is kept narrow in the two ways that
 * matter: an UNDECLARED non-palette value fails (so a typo or an invented colour cannot pass), and
 * every declared entry must be chain-produced at the step it claims (so the table cannot become a
 * blank cheque for an arbitrary hex). Both halves are asserted in `checkValuesAccountedFor`.
 *
 * `#544f64` is here because the chain genuinely leaves it at step 1: build.js declares no step-2
 * value for `guideMid`, and inventing one would be a visual judgement the user owns. It is the
 * clearest evidence the chain is a real chain and not a rename.
 */
const DECLARED_PROVENANCE = {
  '#181520': { step: 1, via: 'build.js darkerBackgrounds (palette.bgBase)' },
  '#121018': { step: 1, via: 'build.js darkerBackgrounds (palette.bgDeep)' },
  '#201d2a': { step: 1, via: 'build.js darkerBackgrounds (palette.bgElevated)' },
  '#544f64': { step: 1, via: 'build.js darkerBackgrounds (palette.guideMid), no step-2 link' },
  '#0a0910': { step: 2, via: 'D7 declared chain link 1->2' },
  '#060509': { step: 2, via: 'D7 declared chain link 1->2' },
  '#13111a': { step: 2, via: 'D7 declared chain link 1->2' },
  // Tier-keyed syntax attenuation, DARKER_SYNTAX. Declared for the same reason: build.js's
  // adjusted values are not palette tokens, so they need a provenance before the accounting check
  // may accept them.
  '#fff9ba': { step: 1, via: 'build.js darkerSyntaxAdjustments (palette.yellowLight), darker tier only' },
  '#ffd18e': { step: 1, via: 'build.js darkerSyntaxAdjustments (palette.orangeAccent), darker tier only' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const failures = [];
const checks = [];

const fail = (check, message) => failures.push(`[${check}] ${message}`);
const pass = (check, message) => checks.push(`[${check}] ${message}`);

/**
 * build.js's prefix rewrite, walked along the chain until it reaches `step`.
 *
 * Walks LINKS rather than looking a hex up in a per-step table, so that a value with no link at
 * this step is left ALONE — which is the honest behaviour for a chain extended only where a
 * decision was made, and the thing criterion-4-accounting is judged against.
 *
 * The parameter is a chain STEP, not a tier and not a variant id. A transparent variant is a
 * `dark` or `darker` variant with a different opinion about one key; keying the maths off a
 * variant id would let `darker-transparent` resolve as `dark` without anything failing.
 */
const substitute = (hex, step, links) => {
  let out = hex.toLowerCase();
  for (const link of links) {
    if (link.from >= step) break; // this link lands ON step or past it: not ours to apply
    for (const [base, replacement] of link.entries) {
      if (out.startsWith(base)) {
        out = replacement + out.slice(base.length);
        break; // build.js takes the first match
      }
    }
  }
  return out;
};

/** build.js's syntax attenuation, keyed by TIER. See DARKER_SYNTAX for why it stayed behind. */
const substituteSyntax = (hex, tier) => {
  const out = hex.toLowerCase();
  if (tier !== 'darker') return out;
  for (const [base, adjusted] of DARKER_SYNTAX) {
    if (out.startsWith(base)) return adjusted + out.slice(base.length);
  }
  return out;
};

/**
 * The spec's formula, re-implemented here on purpose.
 *
 * DO NOT move this into color-math.mjs. The builder has its own copy, and that is the
 * point: the two must be able to disagree, or this file cannot catch the builder
 * compositing against the wrong surface. luma() and toHex() are shared because they are
 * arithmetic on a value already in hand, not a transcription of project data.
 */
const composite = (fgHex, alphaHex, bgHex) => {
  const a = parseInt(alphaHex.slice(0, 2), 16) / 255;
  const ch = (i) => {
    const fg = parseInt(fgHex.slice(i, i + 2), 16);
    const bg = parseInt(bgHex.slice(i, i + 2), 16);
    return Math.round(fg * a + bg * (1 - a)).toString(16).padStart(2, '0');
  };
  return `#${ch(1)}${ch(3)}${ch(5)}`;
};

/** The 8-digit value an alpha spec carries at a chain step. Mirrors the builder, independently. */
const alphaValueFor = (spec, step) => spec.byStep?.[step] ?? spec.value;

/**
 * The expected flat hex for an alpha/derived token, recomputed for this tier's STEP.
 *
 * The composite surface comes from SURFACE_VALUES by ROLE, which is what makes invariant 4 hold by
 * construction: the 10 alpha tokens never name a surface hex, so moving a tier down a step darkens
 * every wash without anyone editing a table. This is why the composited values MUST change between
 * tiers, and `criterion-4-noleak` is what holds that line.
 */
function expectedComposite(token, tier) {
  const spec = ALPHA_TOKENS[token] ?? DERIVED_ALPHAS[token];
  if (!spec) throw new Error(`unknown alpha token ${token}`);
  const step = TIER_STEP[tier];
  // DERIVED_ALPHAS keeps build.js's TIER-keyed `valueDarker`; ALPHA_TOKENS uses the chain-driven
  // `byStep`. Both are read here so the two mechanisms are not silently merged.
  const value = spec.byStep
    ? alphaValueFor(spec, step)
    : (tier === 'darker' && spec.valueDarker ? spec.valueDarker : spec.value);
  const bg = SURFACE_VALUES[spec.surface][step];
  // build.js darkens the fg too, when the fg is itself a background token.
  const fg = substitute(value.slice(0, 7), step, CHAIN_LINKS);
  return composite(fg, value.slice(7, 9), bg);
}

const sameKeys = (a, b) => {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  const missing = ka.filter((k) => !kb.includes(k));
  const extra = kb.filter((k) => !ka.includes(k));
  return { missing, extra, count: ka.length };
};

// ---------------------------------------------------------------------------
// 0. Ground this transcription in the upstream sources
// ---------------------------------------------------------------------------

function groundTranscription() {
  const check = 'source';
  const build = readFileSync(SOURCE_BUILD, 'latin1');
  const theme = readFileSync(SOURCE_THEME_CONFIG, 'latin1');

  // build.js keys its maps by computed property ([palette.bgDeep]), so the KEY hexes live in
  // theme-config.js; only the darker values and the literal keys live in build.js.
  const first = CHAIN_LINKS.find((l) => l.from === 0);
  const probes = [
    [theme, first.entries.map(([base]) => base), 'theme-config.js darkerBackgrounds keys'],
    [build, first.entries.map(([, value]) => value), 'build.js darkerBackgrounds values'],
    [theme, DARKER_SYNTAX.map(([base]) => base), 'theme-config.js darkerSyntaxAdjustments keys'],
    [build, DARKER_SYNTAX.map(([, value]) => value), 'build.js darkerSyntaxAdjustments values'],
    [build, ['#8c8eff18', '#ff000018', '#8c8eff28', '#ff000028', '#8c8eff30'], 'build.js lowered alphas'],
    [theme, [
      // Transcribed values only: a `composed` entry is built by the D1 system from a
      // palette token, so there is no upstream literal to find.
      ...Object.values(ALPHA_TOKENS).map((s) => s.value),
      ...Object.values(DERIVED_ALPHAS).filter((s) => !s.composed).map((s) => s.value),
    ], 'theme-config.js palette alphas'],
  ];
  for (const [text, values, label] of probes) {
    for (const value of values) {
      if (!text.includes(value)) fail(check, `${label}: ${value} is not in the upstream source`);
    }
  }

  // Ground the PER-STEP overrides, which the probes above cannot reach.
  //
  // A `byStep` entry is a claim that build.js applies a LOWERED alpha at this step, and the only
  // evidence for it is the lowered-alpha set — not the palette, and not build.js taken as a blob.
  // Two failure modes are covered:
  //
  //  - an override that is not one of the literals build.js lowers is an invented alpha, and
  //  - a step with no override is a shipped step that silently inherits the palette's 0x2a, which
  //    is exactly the bump D7 exists to carry, and which no output can reveal because the token
  //    it belongs to is transcribed-but-not-emitted (see TRANSCRIBED_NOT_EMITTED).
  //
  // Without this half, `accentFaint: { value: '#8c8eff2a' }` — the bump deleted — is a table that
  // still passes every check in this file, because no slot in any of the 8 files paints it.
  for (const [token, spec] of Object.entries(ALPHA_TOKENS)) {
    if (!spec.byStep) continue;
    for (const { step, tier, role } of CHAIN_STEPS) {
      if (role !== 'shipped') continue;
      const override = spec.byStep[step];
      if (!override) {
        fail(check, `${token}.byStep has no entry for chain step ${step} (tier ${tier}), so that ` +
          `tier falls back to the palette alpha ${spec.value} and loses the alpha build.js lowers`);
        continue;
      }
      if (!LOWERED_ALPHAS.has(override)) {
        fail(check, `${token}.byStep[${step}] = ${override} is not one of the alphas build.js ` +
          `lowers (${[...LOWERED_ALPHAS].join(', ')}) — an undeclared per-step alpha`);
      }
      if (!build.toLowerCase().includes(override.toLowerCase())) {
        fail(check, `${token}.byStep[${step}] = ${override} is not in build.js at all`);
      }
    }
  }

  if (!failures.some((f) => f.startsWith(`[${check}]`))) {
    const lowered = Object.entries(ALPHA_TOKENS)
      .filter(([, s]) => s.byStep)
      .map(([t, s]) => `${t} 0x${s.value.slice(7, 9)} -> ${Object.values(s.byStep).map((v) => `0x${v.slice(7, 9)}`).join('/')}`)
      .join(', ');
    pass(check, `chain link 0->1 (${first.entries.length} entries), the syntax adjustments and the ` +
      `alpha tables match the upstream sources, and the per-step alpha overrides are grounded in ` +
      `build.js's lowered set (${lowered})`);
  }
}

/**
 * source-chain: the D7 DECLARED half has no upstream, so it is held to internal consistency.
 *
 * Three things, each of which fails on a specific way the declaration can rot:
 *
 *  (a) Step 0 is the palette. If a scaffold token's upstream value and SURFACE_VALUES[step 0]
 *      disagree, "step 0 > step 1" is a claim about a colour no file can produce.
 *  (b) Each step's surfaces are what the chain actually produces from the palette, so a link that
 *      is dropped, re-pointed or renamed fails here instead of silently painting step 1 at step 2.
 *  (c) The 1->2 link starts from exactly the three step-1 surfaces and lands on exactly the three
 *      step-2 surfaces. This is the check that keeps the link narrow: extending it to `guideMid`
 *      or to a second alpha would fail here, which is the point, because those are decisions the
 *      user has not made.
 *
 * The declared values are not checked against any file on disk, and this comment is the reason:
 * there is nothing to check them against. Their correctness is D7 plus the ladder check.
 */
function checkChainDeclaration() {
  const check = 'source-chain';
  const palette = readPalette();

  // (a) The chain root is the palette.
  for (const [role, token] of Object.entries(SCAFFOLD_PALETTE_TOKENS)) {
    const upstream = palette[token];
    if (!upstream) {
      fail(check, `scaffold token ${token} is not in the theme-config.js palette`);
      continue;
    }
    if (SURFACE_VALUES[role][0] !== upstream) {
      fail(check, `step 0 ${role} is ${SURFACE_VALUES[role][0]}, but palette.${token} upstream is ` +
        `${upstream} — the chain must start at the palette`);
    }
  }

  // (b) Every step's declared surfaces are what the chain produces.
  for (const { step } of CHAIN_STEPS) {
    for (const [role, token] of Object.entries(SCAFFOLD_PALETTE_TOKENS)) {
      const walked = substitute(palette[token], step, CHAIN_LINKS);
      if (walked !== SURFACE_VALUES[role][step]) {
        fail(check, `chain is inconsistent at step ${step}, ${role}: walking palette.${token} ` +
          `(${palette[token]}) gives ${walked}, but this file declares ${SURFACE_VALUES[role][step]}`);
      }
    }
  }

  // (c) The 1->2 link is exactly the three surfaces and nothing else.
  const declared = CHAIN_LINKS.filter((l) => l.from === 1);
  if (declared.length !== 1 || declared[0].to !== 2) {
    fail(check, `the chain must declare exactly one 1->2 link; found ${declared.length}`);
  } else {
    const froms = declared[0].entries.map(([from]) => from).sort();
    const tos = declared[0].entries.map(([, to]) => to).sort();
    const wantFroms = CHAIN_STEPS.filter((s) => s.step === 1)
      .flatMap(() => Object.values(SURFACE_VALUES).map((r) => r[1])).sort();
    const wantTos = Object.values(SURFACE_VALUES).map((r) => r[2]).sort();
    if (froms.join() !== wantFroms.join() || tos.join() !== wantTos.join()) {
      fail(check, `the 1->2 link is ${declared[0].entries.map(([f, t]) => `${f}->${t}`).join(', ')}; ` +
        `it must be exactly the three surfaces ${wantFroms.join('/')} -> ${wantTos.join('/')}. ` +
        `Extending it to another value is a decision the user has not made.`);
    } else {
      pass(check, `the chain is connected: step 0 is the palette, and 2 links carry step 0 -> 1 -> 2 ` +
        `with the 1->2 link covering exactly the 3 surfaces and nothing else`);
    }
  }
}

// ---------------------------------------------------------------------------
// Load templates + outputs
// ---------------------------------------------------------------------------

// D8: the two in-repo inputs are STRUCTURAL STUBS derived from the real templates, not the
// templates themselves. Everything below that compares key sets against `templates` is therefore
// comparing against a file with the same keys, the same nesting and the same non-colour strings —
// which is the whole of what the emitters ever read. See `checkTemplateProvenance` for the proof
// that the swap changed nothing, and for the assertion that keeps a vendored path from creeping
// back in. The pi path is deliberately OUTSIDE the repo and unchanged by D8: it is real upstream.
const TEMPLATES = {
  'claude-code': join(HERE, 'templates', 'claude-code.json'),
  opencode: join(HERE, 'templates', 'opencode.json'),
  pi: join(homedir(), '.pi', 'agent', 'npm', 'node_modules', 'gentle-pi', 'themes', 'Gentleman-Cute.json'),
};

/**
 * The 4 variants and which agents own them, WITHOUT the `.json` extension.
 *
 * The validator holds its own copy rather than importing the builder's VARIANTS, for the same
 * reason `ALLOWED_COLOR_OVERRIDES` is a local copy: if the builder renamed its output and the
 * validator followed blindly, a rename could leave the validator checking files that no longer
 * exist. Here a rename shows up as a missing-output failure instead.
 *
 * The record carries the same two orthogonal axes the builder does, and both are load-bearing:
 *   tier    — which colour maths the file must embody. Every expected value below is computed
 *             from the tier, never from the id, because a transparent variant shares its tier
 *             with its solid sibling and must be held to the same surfaces and composites.
 *   opacity — solid | transparent, and only opencode has transparent variants.
 *   agents  — per-agent membership. Checks iterate `variantsFor(agent)`, never the whole list:
 *             a check that assumed every agent has every variant would demand a
 *             claude-code transparent file that must not exist, and would silently stop
 *             covering the opencode transparent files that must.
 *
 * The `-prototype` suffix is load-bearing, not decoration. These files get copied into live
 * agent config directories, and a provisional name keeps cleanup to one glob and stops anyone
 * mistaking a prototype for a theme we intend to ship.
 */
const VARIANTS = [
  {
    id: 'dark', tier: 'dark', opacity: 'solid',
    slug: 'funky-dark-prototype',
    agents: ['claude-code', 'opencode', 'pi'],
  },
  {
    id: 'darker', tier: 'darker', opacity: 'solid',
    slug: 'funky-darker-prototype',
    agents: ['claude-code', 'opencode', 'pi'],
  },
  {
    id: 'dark-transparent', tier: 'dark', opacity: 'transparent',
    slug: 'funky-dark-transparent-prototype',
    agents: ['opencode'],
  },
  {
    id: 'darker-transparent', tier: 'darker', opacity: 'transparent',
    slug: 'funky-darker-transparent-prototype',
    agents: ['opencode'],
  },
];

/** The lightness tiers, in ladder order. A tier is not a variant: two variants share each. */
const TIERS = ['dark', 'darker'];

/** The variants one agent must have, in emit order. */
const variantsFor = (agent) => VARIANTS.filter((v) => v.agents.includes(agent));

/** Every (agent, variant id) pair that must exist, and therefore the file count to expect. */
const EXPECTED_PAIRS = Object.keys(TEMPLATES)
  .flatMap((agent) => variantsFor(agent).map((v) => `${agent}/${v.id}`));

/** The same set keyed the way the FILESYSTEM keys it: agent directory + emitted filename. */
const EXPECTED_FILES = Object.keys(TEMPLATES)
  .flatMap((agent) => variantsFor(agent).map((v) => `${agent}/${v.slug}.json`));

/**
 * The file carrying a given agent's palette at a given tier.
 *
 * Prefers the solid variant, and asserts one exists: solid is the default for every agent, so
 * a missing solid file is a defect, not a reason to compare transparency against transparency.
 * Opacity only ever changes OpenCode's `background`, so no other slot's value can differ
 * between a tier's two files.
 */
function atTier(agent, tier) {
  const candidates = variantsFor(agent).filter((v) => v.tier === tier);
  if (candidates.length === 0) throw new Error(`no ${tier} variant declared for ${agent}`);
  return candidates.find((v) => v.opacity === 'solid') ?? candidates[0];
}

const templates = {};
const outputs = {};
const rawText = {};

for (const [agent, path] of Object.entries(TEMPLATES)) {
  if (!existsSync(path)) {
    fail('criterion-1', `template missing: ${path}`);
    continue;
  }
  // Leading BOM stripped, for the same reason the builder strips it: the two in-repo stubs are
  // committed JSON that a Windows editor may save with one, and a bare SyntaxError naming neither
  // the file nor the cause is the worst possible report for a file this script depends on.
  templates[agent] = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
  // Per-agent membership, so a file that must not exist is never reported as missing.
  for (const variant of variantsFor(agent)) {
    const target = join(HERE, agent, `${variant.slug}.json`);
    if (!existsSync(target)) {
      fail('criterion-5', `output missing: ${agent}/${variant.slug}.json`);
      continue;
    }
    rawText[`${agent}/${variant.id}`] = readFileSync(target, 'utf8');
    try {
      outputs[`${agent}/${variant.id}`] = JSON.parse(rawText[`${agent}/${variant.id}`]);
    } catch (error) {
      fail('criterion-5', `${agent}/${variant.slug}.json does not parse: ${error.message}`);
    }
  }
}

groundTranscription();

/**
 * criterion-5, the other half: the emitted set must be EXACTLY the expected set.
 *
 * A missing file is reported above, and an EXTRA file was reported by nothing at all — which
 * is the half that matters for a validator whose whole premise is that it holds its own slug
 * table so a builder rename surfaces as a failure. A rename leaves the old file on disk, and
 * an unexamined orphan would keep it looking correct while every check quietly read the new
 * one. A builder that also emits a variant for an agent that must not have one is the same
 * defect wearing a different hat: a file that exists, is well-formed, and expresses nothing.
 */
function checkEmitMatrix() {
  const check = 'criterion-5';
  const expected = new Set(EXPECTED_FILES);
  let found = 0;
  for (const agent of Object.keys(TEMPLATES)) {
    const dir = join(HERE, agent);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      if (!entry.endsWith('.json')) continue;
      const key = `${agent}/${entry}`;
      found += 1;
      if (!expected.has(key)) {
        fail(check, `unexpected output on disk: ${key} — no variant in this script's table claims ` +
          `it for ${agent}. If the builder renamed or added a variant, this file is an orphan: ` +
          `nothing else here will read it.`);
      }
    }
  }
  if (!failures.some((f) => f.startsWith(`[${check}]`))) {
    pass(check, `the emitted set is exactly the ${found} files this script's variant table claims, no orphans`);
  }
}

checkEmitMatrix();

// ---------------------------------------------------------------------------
// D8 — template provenance: the build must not depend on a vendored file again
// ---------------------------------------------------------------------------

/**
 * What each template input is SUPPOSED to be, declared per agent.
 *
 * `kind` is the claim the check holds the builder to. It is a per-agent claim rather than a
 * blanket rule because one of the three inputs is legitimately outside the repo: Pi's template is
 * real upstream inside `node_modules`, and D8 did not touch it. Declaring that is what stops this
 * check from being read as "everything must be in-repo" — which would be false — and stops the Pi
 * exception from being a silent gap.
 */
const TEMPLATE_PROVENANCE = {
  'claude-code': { kind: 'stub' },
  opencode: { kind: 'stub' },
  pi: { kind: 'upstream-external' },
};

/** The vendored tree D8 is removing. Any template path under it is a regression, always. */
const VENDORED_SEGMENT = 'material-trabajo';

/**
 * The template path EXPRESSIONS the builder declares, one per agent, read as source text.
 *
 * This is the load-bearing part of the D8 check, and reading the builder rather than this
 * script's own `TEMPLATES` is the entire point: a check that only inspected its own table would
 * pass while the builder went right back to reading a vendored file, which is the regression
 * being prevented. Importing the builder to read the resolved paths is not an option — importing
 * it RUNS it and rewrites the 8 files this script is in the middle of checking — so the
 * expressions are parsed, which is the same technique `checkBuilderTableDrift` uses and for the
 * same reason.
 *
 * Only the value on each agent's line is captured, so a `material-trabajo` mentioned in a
 * COMMENT (the pi entry explains that path precisely because it is NOT the one being read) is
 * never mistaken for a dependency.
 */
function builderTemplateExpressions() {
  const builder = readFileSync(SOURCE_PROTOTYPE_BUILDER, 'utf8');
  const start = builder.indexOf('const TEMPLATES = {');
  if (start === -1) return null;
  const end = builder.indexOf('\n};', start);
  if (end === -1) return null;
  const out = {};
  for (const line of builder.slice(start, end).split(/\r?\n/)) {
    // Greedy `.*` on purpose: the pi entry nests a paren (`homedir()`), so a `[^)]*` body would
    // fail to match it and report a missing entry for the one agent that has a real upstream path.
    const m = /^\s{2}'?([a-z-]+)'?:\s*(join\(.*\)),?\s*$/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

/**
 * Claude Code's 7 background-bearing slots, named here because of WHAT THEY PROVE.
 *
 * In the real template these 7 were identifiable only by their DARK VALUES: every one of the
 * other 65 slots was a saturated text/border colour, and exactly these 7 were the near-black
 * surface tokens. That is a property of a file we are deleting, and it is the reason the swap had
 * to be proven rather than assumed — if any part of the build had recognised a surface by its
 * colour, a stub full of one sentinel would have flattened all 7 together.
 *
 * The check is therefore two-sided and both halves are needed:
 *   (a) all 7 KEYS survive in the stub, so the vocabulary is intact, and
 *   (b) the BUILDER names every one of them in its MAPPING table, so the value is resolved from
 *       the key and can never have come from the template's colour.
 *
 * (b) reads the builder as text for the same reason `checkBuilderTableDrift` does: importing it
 * would run it. Together with criterion-4-surfaces, which already pins the RESOLVED surface of
 * each tier, this makes "the surface logic still recognises all 7 from the stub" a standing
 * assertion instead of a one-off proof result.
 */
const BACKGROUND_BEARING_SLOTS = [
  'background',
  'composerSidebarBackground',
  'memoryBackgroundColor',
  'userMessageBackground',
  'userMessageBackgroundHover',
  'clawd_background',
  'bashMessageBackgroundColor',
];

/** The slot names the builder's MAPPING table assigns, per agent, parsed out of the builder text. */
function builderMappingSlots(agent) {
  const builder = readFileSync(SOURCE_PROTOTYPE_BUILDER, 'utf8');
  const mapping = builder.indexOf('const MAPPING = {');
  if (mapping === -1) return null;
  // The claude-code section runs from its own key to the next agent's key.
  const from = builder.indexOf(`'${agent}': {`, mapping);
  if (from === -1) return null;
  const to = builder.indexOf('\n  opencode: {', from);
  if (to === -1) return null;
  const slots = new Set();
  for (const m of builder.slice(from, to).matchAll(/^\s{4}([A-Za-z0-9_]+):\s*'/gm)) slots.add(m[1]);
  return slots;
}

function checkTemplateProvenance() {
  const check = 'criterion-template-provenance';
  let stubs = 0;
  let external = 0;
  let backgroundSlots = 0;

  // --- (1) What the BUILDER declares. This is the half that catches the regression. ---------
  const expressions = builderTemplateExpressions();
  if (expressions === null) {
    fail(check, 'could not locate the TEMPLATES table in the builder — has it been renamed?');
  } else {
    for (const [agent, rule] of Object.entries(TEMPLATE_PROVENANCE)) {
      const expr = expressions[agent];
      if (!expr) {
        fail(check, `the builder's TEMPLATES has no entry for ${agent} — nothing to verify, and ` +
          'the build would fail on an undefined path');
        continue;
      }

      // (a) The vendored tree, checked first and in every form. This is the regression itself,
      // and it must fire before anything else can wave the path through.
      if (expr.includes(VENDORED_SEGMENT)) {
        fail(check, `the builder reads ${agent}'s template from ${expr} — that is a path under ` +
          `${VENDORED_SEGMENT}/, the vendored tree D8 removed. It must read the derived stub at ` +
          `join(HERE, 'templates', '${agent}.json').`);
        continue;
      }

      // (b) An expression this checker cannot interpret must FAIL, not pass. A check that
      // recognises two path shapes and shrugs at a third is a check with a hole in it, and a
      // hole in a provenance check is the exact failure mode D8 is guarding against.
      const stubForm = new RegExp(`^join\\((HERE|ROOT), 'templates', '${agent}\\.json'\\)$`);
      const externalForm = /^join\(homedir\(\), /;
      if (rule.kind === 'stub') {
        if (!stubForm.test(expr)) {
          fail(check, `${agent} is declared as a derived stub, but its builder path is ${expr} — ` +
            `expected join(HERE, 'templates', '${agent}.json'). An unrecognised expression cannot ` +
            'be verified, so it is reported rather than assumed safe.');
          continue;
        }
        stubs += 1;
        // The file itself must exist: a stub path that resolves to nothing is a broken build.
        if (!existsSync(TEMPLATES[agent])) {
          fail(check, `${agent}'s stub is missing: ${TEMPLATES[agent]}`);
        }
      } else {
        if (!externalForm.test(expr)) {
          fail(check, `${agent} is declared as real upstream outside the repo, but its builder path ` +
            `is ${expr} — expected a join(homedir(), ...) path. Pi's template is genuinely ` +
            'upstream; moving it is a decision, not a refactor.');
          continue;
        }
        external += 1;
        // A missing external path IS a broken dependency, unlike a removed vendored one.
        if (!existsSync(TEMPLATES[agent])) {
          fail(check, `${agent}'s upstream template is missing: ${TEMPLATES[agent]} — this is real ` +
            'upstream, so its absence is a broken dependency rather than a removed one');
        }
      }
    }
  }

  // --- (2) This script's own table must agree, or it validates a fiction. --------------------
  // The key sets compared throughout this file come from `templates`, so a validator reading a
  // different input than the builder would pass on files it never checked.
  for (const agent of Object.keys(TEMPLATE_PROVENANCE)) {
    if (!templates[agent]) {
      fail(check, `${agent}: this script's own template input did not load, so its key-set checks ` +
        'would be comparing against nothing');
    }
  }

  // --- (3) The 7 background-bearing slots, both halves. --------------------------------------
  const mapped = builderMappingSlots('claude-code');
  if (mapped === null) {
    fail(check, 'could not locate the claude-code MAPPING section in the builder — the "surface ' +
      'logic recognises the slot by key" half of this check cannot run');
  } else {
    const slots = templates['claude-code']?.overrides ?? {};
    for (const name of BACKGROUND_BEARING_SLOTS) {
      if (!(name in slots)) {
        fail(check, `claude-code background-bearing slot "${name}" is absent from the stub, so the ` +
          '7-slot surface vocabulary is incomplete and a slot would be silently dropped');
        continue;
      }
      if (!mapped.has(name)) {
        fail(check, `claude-code background-bearing slot "${name}" is in the stub but NOT in the ` +
          "builder's MAPPING table, so its value would have to come from the template — which is " +
          'exactly the dependency D8 removed');
        continue;
      }
      backgroundSlots += 1;
    }
  }

  if (!failures.some((f) => f.startsWith(`[${check}]`))) {
    pass(check, `the BUILDER reads ${stubs} derived stubs (prototypes/templates, inside the repo) ` +
      `and ${external} real upstream path (pi, outside the repo, unchanged), and no template input ` +
      `anywhere resolves under ${VENDORED_SEGMENT}/; this script reads the same inputs; all ` +
      `${backgroundSlots}/${BACKGROUND_BEARING_SLOTS.length} Claude Code background-bearing slots ` +
      `survive in the stub AND are named in the builder's MAPPING table, so every one resolves from ` +
      'its key rather than from a template colour');
  }
}

checkTemplateProvenance();

// ---------------------------------------------------------------------------
// D9 — provenance hygiene: no committed build input carries the vendored project's
// identity as a DATA value
// ---------------------------------------------------------------------------

/**
 * The identity strings that belong to the project these templates were derived from.
 *
 * Kept to the PROJECT name rather than to one theme of it, so a single entry covers `gentleman`,
 * `gentleman-cute` and `Gentleman-Cute.json` alike, and matched case-insensitively as a substring.
 * A second vendored identity later is one more line, not a rewrite of the check.
 *
 * SCOPE, because a check that is too wide is a check that eventually gets deleted:
 *
 *  - IN: the committed build inputs below, and nothing else. A build input is data the build
 *    reads, so a value in it is a value this repo acts on and ships. That is the entire rule:
 *    nothing that carries another project's identity may be committed as data.
 *  - OUT, on purpose: every document — SOURCES.md, the backlog, DRAFTS/, this task file — and the
 *    manifest's path records. Those references ARE the audit trail. They say which template a stub
 *    was derived from and which upstream install is read at runtime, and removing them would
 *    destroy the provenance the owner requires to stay auditable. `derivedFrom` in sources.json is
 *    a path reference, and is exactly the shape this check calls legitimate below.
 *  - OUT: our own generator and validator SOURCE, which both contain the brand inside a RUNTIME
 *    PATH to Pi's externally-installed npm template
 *    (~/.pi/agent/npm/node_modules/gentle-pi/themes/Gentleman-Cute.json). That file lives outside
 *    this repo, is installed by npm, and cannot be renamed from here. A check that flagged it
 *    would be wrong, and would force someone to break Pi to satisfy it. The builder's path TABLE
 *    is the single narrow place our own source is examined below, and only to keep that allowance
 *    honest — see checkBuildInputIdentity.
 *
 * THE DISTINCTION THIS CHECK EXISTS TO DRAW. Every occurrence it finds, in every file it reads, is
 * one of exactly two things:
 *
 *   DATA VALUE      the brand stands alone as a value — `"name": "gentleman-cute"`. The
 *                   violation: ours, committed, and it names somebody else's project as ours.
 *   PATH REFERENCE  the brand is a SEGMENT of a filesystem path — `.../themes/Gentleman-Cute.json`.
 *                   A citation of a real file somewhere else, which is the only reason a path is
 *                   ever written down.
 *
 * Both are found by the same search, so the classifier is a stated rule and not an opinion: the
 * token around the match is a PATH REFERENCE when it carries a path separator or a file extension,
 * and a DATA VALUE otherwise. Mutation-tested in both directions — put the brand back into a stub
 * as a value and this fails, and the builder's existing external path is read on every run and
 * stays silent.
 */
const IDENTITY_NEEDLES = ['gentleman'];

/** Characters that can appear inside one filesystem path segment, so a token can be grown around a match. */
const IDENTITY_TOKEN_CHAR = /[A-Za-z0-9._\\/-]/;

const DATA_VALUE = 'data-value';
const PATH_REFERENCE = 'path-reference';

/**
 * The committed build inputs, in the only sense that matters here: files inside this repo that the
 * build reads. Built from the same constants the rest of this file already reads them through, so
 * the list cannot name a file the build no longer uses.
 *
 * Pi's template is absent on purpose. It is real upstream outside the repo (TEMPLATE_PROVENANCE
 * declares it `upstream-external`) and it is the one legitimate PATH REFERENCE this project carries.
 */
const COMMITTED_BUILD_INPUTS = [
  { label: 'claude-code stub', path: TEMPLATES['claude-code'], shape: 'json' },
  { label: 'opencode stub', path: TEMPLATES.opencode, shape: 'json' },
  { label: 'theme-config.js (palette source)', path: SOURCE_THEME_CONFIG, shape: 'text' },
  { label: 'build.js (darker maps)', path: SOURCE_BUILD, shape: 'text' },
];

/** The run of path-ish characters around `at` — the unit the classification is actually made on. */
function identityTokenAt(text, at) {
  let start = at;
  let end = at;
  while (start > 0 && IDENTITY_TOKEN_CHAR.test(text[start - 1])) start -= 1;
  while (end < text.length && IDENTITY_TOKEN_CHAR.test(text[end])) end += 1;
  return text.slice(start, end);
}

/** PATH REFERENCE or DATA VALUE. The whole rule, in one expression. */
const classifyIdentityToken = (token) =>
  (token.includes('/') || token.includes('\\') || /\.[A-Za-z0-9]+$/.test(token))
    ? PATH_REFERENCE
    : DATA_VALUE;

/** The first identity match inside a single string, with its token and classification, or null. */
function classifyIdentityIn(value) {
  const lower = value.toLowerCase();
  for (const needle of IDENTITY_NEEDLES) {
    const at = lower.indexOf(needle);
    if (at === -1) continue;
    const token = identityTokenAt(value, at);
    return { token, kind: classifyIdentityToken(token) };
  }
  return null;
}

/** Every identity match in a text body, with its line number. Used for non-JSON build inputs. */
function findIdentityInText(text) {
  const lower = text.toLowerCase();
  const out = [];
  for (const needle of IDENTITY_NEEDLES) {
    let at = lower.indexOf(needle);
    while (at !== -1) {
      const token = identityTokenAt(text, at);
      out.push({ token, kind: classifyIdentityToken(token), line: text.slice(0, at).split(/\r?\n/).length });
      at = lower.indexOf(needle, at + needle.length);
    }
  }
  return out;
}

/**
 * Every string in a parsed JSON document, as `{ pointer, value }` — keys included, because a key is
 * a value the loader will read just as surely as the string beside it.
 */
function jsonStringLeaves(value, pointer = '<root>', out = []) {
  if (typeof value === 'string') {
    out.push({ pointer, value });
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  for (const [key, child] of Object.entries(value)) {
    const next = `${pointer}.${key}`;
    out.push({ pointer: `${next} (key)`, value: key });
    jsonStringLeaves(child, next, out);
  }
  return out;
}

/**
 * provenance-identity: D9's rule, over the committed build inputs and the builder's path table.
 *
 * Three halves, in the order they can produce a failure:
 *
 *  (1) Each declared build input is INSIDE the repo, exists, and parses. "Committed" is asserted
 *      rather than assumed, because the whole scope of this check rests on it: a build input
 *      outside the repo is either Pi's upstream — which is not on this list — or the
 *      vendored-path regression D8 removed. An absent or unparsable input is reported rather than
 *      skipped, because a file this check cannot read is a file nothing is checking.
 *  (2) Every identity occurrence in those files is classified, and a DATA VALUE fails with the
 *      pointer (JSON) or line (text) it was found at.
 *  (3) The builder's declared TEMPLATES path table is read, and every identity occurrence in it
 *      must be a PATH REFERENCE. This is the narrow exception from the scope note above, and it is
 *      here so the exception cannot rot into a blank cheque: Pi's template is named by a brand
 *      because that is genuinely its filename in someone else's npm install, and if that ever
 *      became a bare name instead of a path, "we allow the path reference" would no longer be a
 *      true statement about this repo.
 */
function checkBuildInputIdentity() {
  const check = 'provenance-identity';
  let scanned = 0;
  let pathReferences = 0;

  // --- (1) and (2) the committed build inputs ------------------------------------------------
  for (const input of COMMITTED_BUILD_INPUTS) {
    if (!input.path) {
      fail(check, `${input.label} has no path — this script's template table lost the entry, so the ` +
        'build input cannot be scanned and the gap would be silent');
      continue;
    }
    const rel = relative(ROOT, input.path);
    if (isAbsolute(rel) || rel.startsWith('..')) {
      fail(check, `${input.label} resolves to ${input.path}, which is OUTSIDE this repo. The only ` +
        'external build input is Pi\'s upstream template, it is declared upstream-external, and it ' +
        'is deliberately not on this list. An external build input is the vendored-path regression ' +
        'D8 removed.');
      continue;
    }
    if (!existsSync(input.path)) {
      fail(check, `${input.label} is missing: ${input.path} — an unscannable build input is an ` +
        'unchecked one. criterion-template-provenance reports the absence too.');
      continue;
    }

    // latin1 for the JS sources, matching every other read of them in this file: they carry
    // non-UTF8 comment bytes and only the ASCII text matters to a substring search.
    const text = readFileSync(input.path, input.shape === 'json' ? 'utf8' : 'latin1');
    let found;
    if (input.shape === 'json') {
      let parsed;
      try {
        parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
      } catch (error) {
        fail(check, `${input.label} does not parse: ${error.message} — it cannot be scanned, and an ` +
          'unscanned build input is an unchecked one');
        continue;
      }
      // Walked as DATA rather than as text: the strings are the values, so a match is reported at
      // the exact pointer instead of at a guessed line.
      found = jsonStringLeaves(parsed)
        .map(({ pointer, value }) => {
          const hit = classifyIdentityIn(value);
          return hit && { ...hit, at: pointer };
        })
        .filter(Boolean);
    } else {
      found = findIdentityInText(text).map(({ token, kind, line }) => ({ token, kind, at: `line ${line}` }));
    }
    scanned += 1;

    for (const hit of found) {
      if (hit.kind === PATH_REFERENCE) {
        pathReferences += 1;
        continue;
      }
      fail(check, `${input.label} (${hit.at}) carries the vendored project's identity as a DATA ` +
        `VALUE: ${JSON.stringify(hit.token)}. A committed build input must not ship another ` +
        `project's name as data — a document may cite it, a value may not.`);
    }
  }

  // --- (3) the builder's path table: the exception, kept honest --------------------------------
  const expressions = builderTemplateExpressions();
  let witnessed = 0;
  if (expressions === null) {
    fail(check, 'could not locate the TEMPLATES table in the builder — the one place our own ' +
      'source is allowed to name the vendored project cannot be checked, so the allowance is ' +
      'unverified rather than true');
  } else {
    for (const [agent, expr] of Object.entries(expressions)) {
      for (const hit of findIdentityInText(expr)) {
        witnessed += 1;
        if (hit.kind === PATH_REFERENCE) continue;
        fail(check, `the builder's ${agent} template path is ${JSON.stringify(hit.token)} as a bare ` +
          'name, not as a path. Pi\'s template genuinely lives at a branded path in an external ' +
          'npm install and that citation is allowed; a brand standing alone as a value is the ' +
          'violation this check exists to catch.');
      }
    }
  }

  if (!failures.some((f) => f.startsWith(`[${check}]`))) {
    pass(check, `no committed build input carries the vendored project's identity as a data value: ` +
      `${scanned} build inputs scanned, ${pathReferences} path reference(s) found and allowed as ` +
      `citations; and the builder's declared path table carries ${witnessed} identity occurrence(s), ` +
      'all of them path references to Pi\'s externally-installed npm template, which is outside ' +
      'this repo and cannot be renamed from here');
  }
}

checkBuildInputIdentity();

// ---------------------------------------------------------------------------
// Criterion 1 — exact template slot set, per agent, per level
// ---------------------------------------------------------------------------

// Derived from the variant table rather than written out again, so the name a Pi file must
// carry and the filename it must have cannot drift apart inside this script.
const EXPECTED_PI_NAME = Object.fromEntries(VARIANTS.map((v) => [v.id, v.slug]));

function checkCriterion1() {
  const check = 'criterion-1';

  for (const variant of VARIANTS) {
    // Only the agents this variant belongs to. A transparent claude-code file must not be
    // demanded here, and a transparent opencode file must not be skipped.
    for (const agent of variant.agents) {
      const key = `${agent}/${variant.id}`;
      const out = outputs[key];
      if (!out) continue; // already reported as a missing output

      if (agent === 'claude-code') {
        // { name, base, overrides }
        const top = sameKeys({ name: 0, base: 0, overrides: 0 }, out);
        if (top.missing.length || top.extra.length) {
          fail(check, `${key} top level: missing [${top.missing}] extra [${top.extra}]`);
        }
        if (out.base !== 'dark') fail(check, `${key} base is "${out.base}", expected "dark"`);
        if (!out.overrides || typeof out.overrides !== 'object') {
          fail(check, `${key} has no overrides object`);
        } else {
          const diff = sameKeys(templates['claude-code'].overrides, out.overrides);
          if (diff.missing.length || diff.extra.length) {
            fail(check, `${key}/overrides: missing [${diff.missing}] extra [${diff.extra}]`);
          }
          if (diff.count !== 72) fail(check, `${key}/overrides has ${diff.count} slots, expected 72`);
          else pass(check, `${key}/overrides: ${diff.count} slots, identical key set to the template`);
        }
        continue;
      }

      if (agent === 'opencode') {
        // { $schema, theme }
        const top = sameKeys({ $schema: 0, theme: 0 }, out);
        if (top.missing.length || top.extra.length) {
          fail(check, `${key} top level: missing [${top.missing}] extra [${top.extra}]`);
        }
        if (out.$schema !== templates.opencode.$schema) {
          fail(check, `${key} $schema is "${out.$schema}", expected the template's`);
        }
        if (!out.theme || typeof out.theme !== 'object') {
          fail(check, `${key} has no theme object`);
        } else {
          const diff = sameKeys(templates.opencode.theme, out.theme);
          if (diff.missing.length || diff.extra.length) {
            fail(check, `${key}/theme: missing [${diff.missing}] extra [${diff.extra}]`);
          }
          if (diff.count !== 50) fail(check, `${key}/theme has ${diff.count} slots, expected 50`);
          else pass(check, `${key}/theme: ${diff.count} slots, identical key set to the template`);
        }
        continue;
      }

      // pi: { $schema, name, vars, colors, export }
      const top = sameKeys({ $schema: 0, name: 0, vars: 0, colors: 0, export: 0 }, out);
      if (top.missing.length || top.extra.length) {
        fail(check, `${key} top level: missing [${top.missing}] extra [${top.extra}]`);
      }
      if (out.$schema !== templates.pi.$schema) fail(check, `${key} $schema was not preserved`);
      if (out.name !== EXPECTED_PI_NAME[variant.id]) {
        fail(check, `${key} name is "${out.name}", expected "${EXPECTED_PI_NAME[variant.id]}"`);
      }
      for (const level of ['vars', 'colors', 'export']) {
        if (!out[level] || typeof out[level] !== 'object') {
          fail(check, `${key} has no ${level} object`);
          continue;
        }
        const diff = sameKeys(templates.pi[level], out[level]);
        if (diff.missing.length || diff.extra.length) {
          fail(check, `${key}/${level}: missing [${diff.missing}] extra [${diff.extra}]`);
        }
      }
      if (out.export && Object.keys(out.export).length !== 3) {
        fail(check, `${key}/export has ${Object.keys(out.export).length} keys, expected 3`);
      } else {
        pass(check, `${key}: vars ${Object.keys(out.vars ?? {}).length} / colors ${Object.keys(out.colors ?? {}).length} / export 3 — identical key sets to the gentle-pi 3.7.0 template`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Criterion 2 — colour syntax per agent is not negotiable
// ---------------------------------------------------------------------------

function checkCriterion2() {
  const check = 'criterion-2';

  for (const variant of VARIANTS) {
    for (const agent of variant.agents) {
      const key = `${agent}/${variant.id}`;
      const text = rawText[key];
      const out = outputs[key];

      if (agent === 'claude-code') {
        // zero `#` anywhere, every override rgb(r,g,b)
        if (text) {
          const hexes = text.match(/#[0-9a-fA-F]{3,8}/g) ?? [];
          if (hexes.length) fail(check, `${key} contains hex: ${[...new Set(hexes)].slice(0, 5).join(', ')}`);
          if (out?.overrides) {
            const bad = Object.entries(out.overrides).filter(([, v]) => !/^rgb\(\d{1,3},\d{1,3},\d{1,3}\)$/.test(v));
            if (bad.length) fail(check, `${key} non-rgb overrides: ${bad.slice(0, 5).map(([s, v]) => `${s}=${v}`).join(', ')}`);
            if (bad.length === 0) pass(check, `${key}: 0 hex, ${Object.keys(out.overrides).length}/${Object.keys(out.overrides).length} overrides are rgb(r,g,b)`);
          }
        }
        continue;
      }

      // OpenCode + Pi: zero `rgb(`, and every value is #RRGGBB
      if (text && text.includes('rgb(')) fail(check, `${key} contains rgb(`);
      if (!out) continue;
      const values = agent === 'opencode' ? Object.entries(out.theme ?? {}) : Object.entries(out.vars ?? {});
      const bad = values.filter(([, v]) => !/^#[0-9a-fA-F]{6}$/.test(v));
      // opencode `background` is "none" in a TRANSPARENT variant and a hex in a solid one, so
      // the exemption is keyed on the slot that can carry it, not on the variant: a solid
      // variant that emitted "none" here is caught by semantic-transparency-scope, which can
      // say so with the right context.
      const unexpected = agent === 'opencode' ? bad.filter(([s]) => s !== 'background') : bad;
      if (unexpected.length) {
        fail(check, `${key} non-#RRGGBB values: ${unexpected.slice(0, 5).map(([s, v]) => `${s}=${v}`).join(', ')}`);
      } else {
        const passThrough = values.filter(([, v]) => v === 'none').length;
        pass(check, `${key}: 0 rgb(), ${values.length} values, ` +
          `${passThrough ? `${values.length - passThrough} #RRGGBB + ${passThrough} terminal pass-through` : 'all #RRGGBB'}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Criterion 3 — no 8-digit hex anywhere
// ---------------------------------------------------------------------------

function checkCriterion3() {
  const check = 'criterion-3';
  let clean = 0;
  for (const [key, text] of Object.entries(rawText)) {
    const eight = text.match(/#[0-9a-fA-F]{8}/g) ?? [];
    if (eight.length) fail(check, `${key} contains 8-digit hex: ${[...new Set(eight)].join(', ')}`);
    else clean += 1;
  }
  // Counted from the variant table, not hardcoded: 2+2 for claude-code and pi, 4 for
  // opencode. A hardcoded 6 would have gone on passing while two files went unchecked.
  if (clean === EXPECTED_PAIRS.length && Object.keys(rawText).length === EXPECTED_PAIRS.length) {
    pass(check, `${clean}/${EXPECTED_PAIRS.length} files: 0 eight-digit hex`);
  } else {
    fail(check, `expected ${EXPECTED_PAIRS.length} emitted files, found ${Object.keys(rawText).length}`);
  }
}

// ---------------------------------------------------------------------------
// Criterion 4 — per-variant surfaces + alpha recomputed per variant
// ---------------------------------------------------------------------------

const SURFACE_SLOTS = {
  'claude-code': {
    base: ['background', 'composerSidebarBackground', 'memoryBackgroundColor'],
    deep: ['inverseText'],
    elevated: ['bashMessageBackgroundColor', 'clawd_background', 'userMessageBackground'],
  },
  opencode: {
    // `background` is NOT a rung here: it is "none" in a transparent variant and the base
    // surface in a solid one, so it cannot be a constant across the files of a tier. The base
    // rung is carried by backgroundPanel + diffContextBg, which are in every file.
    base: ['backgroundPanel', 'diffContextBg'],
    deep: [],
    elevated: ['backgroundElement'],
  },
  pi: {
    base: ['bg'],
    deep: ['bgPanel', 'bgSubtle', 'toolPendingBg'],
    elevated: ['bgElement', 'toolSuccessBg'],
  },
};

// Keyed by TIER, not by variant id: dark and dark-transparent are the same chain step and must be
// held to the same surfaces, and a table keyed by id would have to be written twice. The lookup
// itself goes through TIER_STEP, so a tier can never be handed a step directly.
const surfaceValueFor = (role, tier) => SURFACE_VALUES[role][TIER_STEP[tier]];

function slotsOf(agent, out) {
  if (agent === 'claude-code') return out?.overrides ?? {};
  if (agent === 'opencode') return out?.theme ?? {};
  return out?.vars ?? {};
}

function checkSurfaces() {
  const check = 'criterion-4-surfaces';
  let slotsChecked = 0;
  for (const [agent, roles] of Object.entries(SURFACE_SLOTS)) {
    for (const variant of variantsFor(agent)) {
      const slots = slotsOf(agent, outputs[`${agent}/${variant.id}`]);
      for (const [role, names] of Object.entries(roles)) {
        for (const name of names) {
          if (!(name in slots)) {
            fail(check, `${agent}/${variant.id}: slot "${name}" is absent, cannot verify the ${role} surface`);
            continue;
          }
          const expected = surfaceValueFor(role, variant.tier);
          if (toHex(slots[name]) !== expected) {
            fail(check, `${agent}/${variant.id}.${name} = ${slots[name]} (${toHex(slots[name])}), expected the ${role} surface ${expected} for tier ${variant.tier} (chain step ${TIER_STEP[variant.tier]})`);
          } else {
            slotsChecked += 1;
          }
        }
      }
    }
  }

  // The one background slot that cannot sit in the table above: a transparent file holds the
  // terminal's "none" there, so `background` is not a constant across a tier's two files and was
  // left out of the rung list. Left out of the ASSERTION as well, though, which is a real hole —
  // re-pointing a solid `background` at the deep surface keeps every other check green, because
  // nothing else in an opencode file depends on it. So it is pinned here, for SOLID files only.
  //
  // This is also what makes invariant 5 testable from both ends: semantic-transparency-scope
  // proves a transparent file equals its solid sibling except on this key, and this proves the
  // sibling itself paints the tier's base, so the canvas is the only difference between them.
  let solidBackgrounds = 0;
  for (const agent of Object.keys(TEMPLATES)) {
    const backgroundPath = BACKGROUND_PATHS[agent];
    if (!backgroundPath) continue; // pi has no background slot: its surfaces are bg/bgPanel/bgElement
    for (const variant of variantsFor(agent)) {
      if (variant.opacity !== 'solid') continue;
      const out = outputs[`${agent}/${variant.id}`];
      if (!out) continue;
      const value = at(out, backgroundPath);
      const expected = surfaceValueFor('base', variant.tier);
      if (toHex(value) !== expected) {
        fail(check, `${agent}/${variant.id} is SOLID but ${backgroundPath} = ` +
          `${JSON.stringify(value)}, expected the base surface ${expected} for tier ${variant.tier}`);
      } else {
        solidBackgrounds += 1;
      }
    }
  }

  if (!failures.some((f) => f.startsWith(`[${check}]`))) {
    const rungs = ['base', 'deep', 'elevated']
      .map((role) => CHAIN_STEPS.map(({ tier }) => tier ? SURFACE_VALUES[role][TIER_STEP[tier]] : null)
        .filter(Boolean).join('/')).join(' | ');
    pass(check, `${slotsChecked} surface slots over ${EXPECTED_PAIRS.length} files hold ` +
      `${rungs} (base | deep | elevated, for the ${TIERS.join(' and ')} tiers), plus ` +
      `${solidBackgrounds} solid background slots painting their own tier's base`);
  }
}

// Every slot whose value is an alpha composite. Spelled out here on purpose: this list is
// the thing under test, so it cannot come from the build script.
const ALPHA_SLOTS = [
  ['claude-code', 'selectionBg', 'accentSelection'],
  ['claude-code', 'userMessageBackgroundHover', 'hoverSurface'],
  ['claude-code', 'diffAdded', 'diffAddedBg'],
  ['claude-code', 'diffAddedDimmed', 'diffAddedBg'],
  ['claude-code', 'diffRemoved', 'diffRemovedBg'],
  ['claude-code', 'diffRemovedDimmed', 'diffRemovedBg'],
  ['opencode', 'diffAddedBg', 'diffAddedBg'],
  ['opencode', 'diffAddedLineNumberBg', 'diffAddedBg'],
  ['opencode', 'diffRemovedBg', 'diffRemovedBg'],
  ['opencode', 'diffRemovedLineNumberBg', 'diffRemovedBg'],
  ['pi', 'selection', 'accentSelection'],
  ['pi', 'deepPink', 'searchBackground'],
  ['pi', 'infoBg', 'infoSurface'],
  ['pi', 'toolErrorBg', 'diffRemovedBg'],
];

function checkAlphaPerVariant() {
  const check = 'criterion-4-alpha';
  let verified = 0;
  // Total is counted, not written down: the opencode transparent files carry the same alpha
  // slots as the solid ones, so a hardcoded 14 would have reported coverage it did not have.
  const expected = ALPHA_SLOTS.reduce(
    (n, [agent]) => n + variantsFor(agent).length, 0,
  );

  for (const [agent, slot, token] of ALPHA_SLOTS) {
    for (const variant of variantsFor(agent)) {
      const value = slotsOf(agent, outputs[`${agent}/${variant.id}`])[slot];
      if (value === undefined) {
        fail(check, `${agent}/${variant.id}.${slot}: missing, cannot verify the ${token} composite`);
        continue;
      }
      const want = expectedComposite(token, variant.tier);
      const otherTier = variant.tier === 'darker' ? 'dark' : 'darker';
      if (toHex(value) !== want) {
        fail(check, `${agent}/${variant.id}.${slot} = ${toHex(value)}, expected ` +
          `composite(${token}, tier ${variant.tier}) = ${want}` +
          (toHex(value) === expectedComposite(token, otherTier) ? `  <-- copied from the ${otherTier} tier` : ''));
      } else {
        verified += 1;
      }
    }
  }
  if (verified === expected) {
    pass(check, `${verified}/${expected} alpha-derived slots across ${EXPECTED_PAIRS.length} files equal the independently recomputed composite for their own TIER`);
  }
}

/** A step-1 value surviving into step 2 is the bug D1 warns about. Prove it cannot hide. */
function checkDarkValuesNotLeaked() {
  const check = 'criterion-4-noleak';
  const leaks = [];
  for (const [agent, slot, token] of ALPHA_SLOTS) {
    const spec = ALPHA_TOKENS[token] ?? DERIVED_ALPHAS[token];
    // The alpha the builder would carry on the deepest tier: `byStep` if the chain drives it,
    // `valueDarker` if the tier does, `value` if neither.
    const value = (spec.byStep?.[TIER_STEP.darker] ?? spec.valueDarker ?? spec.value).slice(7, 9);
    if (value === 'ff') continue; // fully opaque: identical by definition, nothing to leak
    // Compared ACROSS tiers, never between a tier's own two files: transparency changes only
    // OpenCode's `background`, so a tier's solid and transparent files must be identical here
    // and comparing them would prove nothing.
    const dark = toHex(slotsOf(agent, outputs[`${agent}/${atTier(agent, 'dark').id}`])[slot]);
    const darker = toHex(slotsOf(agent, outputs[`${agent}/${atTier(agent, 'darker').id}`])[slot]);
    if (dark === darker) leaks.push(`${agent}/${slot}`);
  }
  if (leaks.length) fail(check, `dark == darker in alpha-derived slots: ${leaks.join(', ')}`);
  else pass(check, 'every alpha-derived slot with alpha < 0xff differs between the two chain steps the shipped tiers paint');

  // The full 10-token set, independent of what the agents happen to consume.
  const identical = [];
  for (const token of Object.keys(ALPHA_TOKENS)) {
    const dark = expectedComposite(token, 'dark');
    const darker = expectedComposite(token, 'darker');
    if (!/^#[0-9a-f]{6}$/.test(dark) || !/^#[0-9a-f]{6}$/.test(darker)) {
      fail(check, `${token} does not flatten to 6-digit hex: ${dark} / ${darker}`);
    }
    if (dark === darker) identical.push(token);
  }
  const expectedIdentical = ['matchBorder']; // #a599efff — alpha ff
  const unexpected = identical.filter((t) => !expectedIdentical.includes(t));
  if (unexpected.length) fail(check, `alphas that did not move with the background: ${unexpected.join(', ')}`);
  else pass(check, `all 10 palette alphas flatten to 6-digit hex; 9/10 differ per step, matchBorder is opaque (alpha ff) and correctly identical`);
}

/** The upstream palette, parsed fresh from theme-config.js: token name -> hex. */
function readPalette() {
  const theme = readFileSync(SOURCE_THEME_CONFIG, 'latin1');
  const start = theme.indexOf('const palette = {');
  if (start < 0) return {};
  const block = theme.slice(start, theme.indexOf('\n};', start));
  const out = {};
  for (const match of block.matchAll(/^\s{2}([A-Za-z][A-Za-z0-9]*):\s*"(#[0-9a-fA-F]{6,8})"/gm)) {
    out[match[1]] = match[2].toLowerCase();
  }
  return out;
}

/** A flat palette token as this tier's step must consume it: the chain walk, then the syntax map. */
function paletteTokenValue(token, tier) {
  const hex = readPalette()[token];
  if (!hex) throw new Error(`unknown palette token: ${token}`);
  return substituteSyntax(substitute(hex, TIER_STEP[tier], CHAIN_LINKS), tier);
}

/**
 * Nothing in an output may be a colour the palette, the per-step composites and the DECLARED
 * provenance cannot explain.
 *
 * Three accepted kinds, and nothing else:
 *
 *  1. A palette token, verbatim. Some tokens are never touched by the chain.
 *  2. A per-step composite — expectedComposite(), which resolves its own surface role.
 *  3. A DECLARED non-palette value, whose declared step must be AT OR BELOW this tier's step.
 *
 * Kind 3 is the change D7 forced. Before it, the allowed set was "any palette token after this
 * tier's darker map", which was a single derivation and therefore a single point of trust; now half
 * the chain is declared here, so acceptance has to be stated per value. The two directions of the
 * rule matter equally and are both asserted:
 *
 *  - an UNDECLARED non-palette value fails. This is the direction that keeps a typo or an invented
 *    colour from shipping, and it is the one the old blanket rule could not express.
 *  - a DECLARED value must be chain-produced at the step it claims, checked below. Without this
 *    half the table would be a blank cheque: any hex anyone typed in would be "declared". It is
 *    the same discipline as ALLOWED_COLOR_OVERRIDES, which pins WHICH re-point is legal.
 *  - and a step-2 value may not appear in a step-1 file, so the table is directional rather than
 *    just a set. A tier swap is caught by criterion-4-surfaces too; this catches it from the
 *    provenance side, where the mistake actually is.
 */
function checkValuesAccountedFor() {
  const check = 'criterion-4-accounting';
  const paletteHexes = Object.values(readPalette());
  if (paletteHexes.length !== 54) {
    fail(check, `expected 54 palette tokens in theme-config.js, parsed ${paletteHexes.length}`);
    return;
  }

  // Every declared entry must be chain-produced at the step it claims, or be a declared value of a
  // tier-keyed upstream map (the syntax adjustments, which the chain does not carry).
  const syntaxAdjusted = new Set(DARKER_SYNTAX.map(([, adjusted]) => adjusted));
  for (const [hex, entry] of Object.entries(DECLARED_PROVENANCE)) {
    const producedByChain = CHAIN_LINKS.some((link) =>
      link.entries.some(([, value]) => value === hex) && link.to === entry.step);
    if (!producedByChain && !syntaxAdjusted.has(hex)) {
      fail(check, `DECLARED_PROVENANCE lists ${hex} as step ${entry.step} (${entry.via}), but no chain ` +
        `link produces it at that step — the table is a blank cheque, not a declaration`);
    }
  }
  // And the other direction of the same discipline: a value the chain DOES produce at a step must
  // be declared, or the accounting check would be rejecting its own ladder.
  for (const { step } of CHAIN_STEPS.filter((s) => s.role === 'shipped')) {
    for (const role of Object.keys(SURFACE_VALUES)) {
      const hex = SURFACE_VALUES[role][step];
      if (!(hex in DECLARED_PROVENANCE)) {
        fail(check, `step ${step} ${role} is ${hex} and ships, but DECLARED_PROVENANCE does not list it`);
      }
    }
  }

  // Keyed by TIER, and built WITHOUT deriving the chain: kind 1 is the raw palette plus the two
  // declared syntax values, kind 2 is per-step, kind 3 is declared with a step ceiling. A
  // transparent file must be explainable by exactly the same set the solid file is, or the
  // byte-identity constraint would be a constraint on nothing.
  const allowed = Object.fromEntries(TIERS.map((tier) => [tier, new Set()]));
  for (const tier of TIERS) {
    for (const token of Object.keys(ALPHA_TOKENS)) allowed[tier].add(expectedComposite(token, tier));
    for (const token of Object.keys(DERIVED_ALPHAS)) allowed[tier].add(expectedComposite(token, tier));
    // Flat values: every opaque palette token, verbatim. Deliberately NOT the chain-walked value:
    // deriving it here is exactly the blanket relaxation D7 removed.
    for (const hex of paletteHexes) {
      if (/^#[0-9a-f]{6}$/.test(hex)) allowed[tier].add(hex);
    }
    for (const hex of syntaxAdjusted) allowed[tier].add(hex);
    for (const [hex, entry] of Object.entries(DECLARED_PROVENANCE)) {
      if (entry.step <= TIER_STEP[tier]) allowed[tier].add(hex);
    }
  }

  for (const agent of Object.keys(TEMPLATES)) {
    for (const variant of variantsFor(agent)) {
      const slots = slotsOf(agent, outputs[`${agent}/${variant.id}`]);
      for (const [slot, value] of Object.entries(slots)) {
        const hex = toHex(value);
        if (hex === 'none') {
          // The one legal non-colour, and only where semantic-transparency-scope allows it.
          // Reported here too, because an unexplained "none" in a solid file would otherwise
          // slip past this check entirely.
          if (!(agent === 'opencode' && variant.opacity === 'transparent' && slot === 'background')) {
            fail(check, `${agent}/${variant.id}.${slot} = "none", which no rule permits ` +
              `(transparency exists only for opencode's background in a transparent variant)`);
          }
          continue;
        }
        if (!/^#[0-9a-f]{6}$/.test(hex)) continue; // already reported by criterion 2/3
        if (!allowed[variant.tier].has(hex)) {
          const known = PALETTE_MATCHES.has(hex) ? 'a palette token' : 'a declared provenance value';
          fail(check, `${agent}/${variant.id}.${slot} = ${hex} is not a palette value, a per-step ` +
            `composite, or ${known} at or below step ${TIER_STEP[variant.tier]}`);
        }
      }
    }
  }
  if (!failures.some((f) => f.startsWith(`[${check}]`))) {
    pass(check, `every colour in every output is a palette token, a per-step composite, or one of the ` +
      `${Object.keys(DECLARED_PROVENANCE).length} declared provenance values at or below its tier's step; ` +
      `every declared value is chain-produced at the step it claims; the only "none" is opencode/background ` +
      `in a transparent variant`);
  }
}

// ---------------------------------------------------------------------------
// Criterion 6 — Pi colors stay indirections
// ---------------------------------------------------------------------------

/**
 * D6: the single indirection edge the builder is allowed to re-point.
 *
 * The validator holds its OWN copy instead of importing the builder's table, so a wider
 * override in the builder shows up here as drift rather than passing unnoticed. Only the slots
 * named below may differ from the template; every other edge must still be the template's.
 */
const ALLOWED_COLOR_OVERRIDES = { mdHeading: 'softRose' };

function checkCriterion6() {
  const check = 'criterion-6';
  for (const variant of variantsFor('pi')) {
    const out = outputs[`pi/${variant.id}`];
    if (!out) continue;
    const varNames = new Set(Object.keys(out.vars ?? {}));
    for (const [slot, value] of Object.entries(out.colors ?? {})) {
      if (typeof value !== 'string') {
        fail(check, `pi/${variant.id}/colors/${slot} is ${typeof value}, expected a vars key name`);
        continue;
      }
      if (value.startsWith('#') || value.startsWith('rgb(')) {
        fail(check, `pi/${variant.id}/colors/${slot} is a literal colour ("${value}"), must name a vars key`);
        continue;
      }
      if (!varNames.has(value)) fail(check, `pi/${variant.id}/colors/${slot} names "${value}", which is not a vars key`);
    }
    for (const [slot, value] of Object.entries(out.export ?? {})) {
      if (!varNames.has(value)) fail(check, `pi/${variant.id}/export/${slot} names "${value}", which is not a vars key`);
    }

    // The expected graph is the template's, plus the declared D6 re-points. Anything else
    // drifting is reported by slot so the failure is actionable rather than a bare "no".
    const expected = { ...templates.pi.colors, ...ALLOWED_COLOR_OVERRIDES };
    const allSlots = new Set([...Object.keys(expected), ...Object.keys(out.colors ?? {})]);
    const drifted = [...allSlots].filter((slot) => out.colors?.[slot] !== expected[slot]);

    if (drifted.length > 0) {
      const shown = drifted.slice(0, 5)
        .map((slot) => `${slot} -> ${out.colors?.[slot] ?? 'absent'} (expected ${expected[slot]})`)
        .join('; ');
      fail(check, `pi/${variant.id}/colors: ${drifted.length} slot(s) deviate from the expected graph; ` +
        `only ${Object.keys(ALLOWED_COLOR_OVERRIDES).join(', ')} may be re-pointed. ${shown}` +
        (drifted.length > 5 ? ` (+${drifted.length - 5} more)` : ''));
    } else {
      const rePoints = Object.keys(ALLOWED_COLOR_OVERRIDES).length;
      pass(check, `pi/${variant.id}: ${varNames.size} vars, ${Object.keys(out.colors).length} colors ` +
        `indirections all resolving to a vars key, export 3, ${rePoints} declared re-point` +
        (rePoints ? ` (${Object.entries(ALLOWED_COLOR_OVERRIDES).map(([k, v]) => `${k}->${v}`).join(', ')})` : ''));
    }
  }
}

// ---------------------------------------------------------------------------
// T8 — semantic relationships, computed from the emitted files
//
// The six criteria prove a file is well-formed. They cannot prove a file is right, which
// is how four defects in the parent spot check passed: every colour was valid hex, every
// per-variant composite was correctly recomputed, every value was a palette token, and
// three surface slots that had to be distinct were byte-identical.
//
// Everything below reads the emitted JSON. Reading the mapping table instead would only
// restate the author's intent back to itself.
// ---------------------------------------------------------------------------

/**
 * The ordered surface ladder per agent: one entry per rung, listing the slots that stand
 * for it. Only rungs an agent actually has are listed — OpenCode has no deep surface slot,
 * so it contributes base and elevated. Tiers that share a value collapse this list's
 * meaning, which is what the check below is for.
 */
const TIER_LADDERS = {
  'claude-code': [
    ['background'],
    ['inverseText'],
    ['bashMessageBackgroundColor', 'clawd_background', 'userMessageBackground'],
  ],
  opencode: [
    ['backgroundPanel', 'diffContextBg'],
    ['backgroundElement'],
  ],
  pi: [
    ['bg'],
    ['bgPanel'],
    ['bgElement'],
  ],
};

/**
 * The ONE place two surface slots are allowed to share a value, stated as a named
 * exception rather than a blanket allowance.
 *
 * Pi has 4 surface slots (bg, bgPanel, bgSubtle, bgElement) and Funky has 3 background
 * tokens, so one tier must be borrowed. Upstream Gentleman-Cute sets bgSubtle == bgPanel;
 * mirroring that relationship is the faithful choice, mirroring the original equality
 * (bgSubtle == bgElement) is the defect the parent spot check found. So the exception
 * carries both halves: bgSubtle MUST equal bgPanel, and MUST NOT equal bgElement.
 */
const SURFACE_EXCEPTIONS = {
  pi: [
    { slot: 'bgSubtle', mustEqual: 'bgPanel', mustDifferFrom: 'bgElement' },
  ],
};

const describeLuma = (hex) => `${hex} (luma ${luma(hex).toFixed(2)})`;

/** semantic-tiers: no two adjacent surface rungs may be the same colour. */
function checkSurfaceTiers() {
  const check = 'semantic-tiers';
  let ladders = 0;

  for (const [agent, tiers] of Object.entries(TIER_LADDERS)) {
    for (const variant of variantsFor(agent)) {
      const slots = slotsOf(agent, outputs[`${agent}/${variant.id}`]);
      if (!Object.keys(slots).length) continue;
      ladders += 1;

      // (a) Every slot standing for a rung must agree, else the rung is a fiction.
      for (const tier of tiers) {
        const values = tier.map((slot) => [slot, toHex(slots[slot])]);
        const distinct = new Set(values.map(([, hex]) => hex));
        if (distinct.size > 1) {
          fail(check, `${agent}/${variant.id}: the [${tier.join(', ')}] tier disagrees — ` +
            values.map(([s, h]) => `${s}=${h}`).join(' '));
        }
      }

      // (b) Adjacent rungs must be distinguishable: different hex AND different luma, so
      // the rung survives both a byte diff and the eye.
      for (let i = 1; i < tiers.length; i += 1) {
        const lower = tiers[i - 1][0];
        const upper = tiers[i][0];
        const lowHex = toHex(slots[lower]);
        const highHex = toHex(slots[upper]);
        if (lowHex === highHex) {
          fail(check, `${agent}/${variant.id}: ${lower} and ${upper} are both ${lowHex} — the surface ladder has no rung between them`);
        } else if (luma(lowHex) === luma(highHex)) {
          fail(check, `${agent}/${variant.id}: ${lower} ${describeLuma(lowHex)} and ${upper} ${describeLuma(highHex)} are visually identical despite different bytes`);
        }
      }
    }
  }

  // (c) The declared exception, held to its own terms.
  for (const [agent, exceptions] of Object.entries(SURFACE_EXCEPTIONS)) {
    for (const variant of variantsFor(agent)) {
      const slots = slotsOf(agent, outputs[`${agent}/${variant.id}`]);
      if (!Object.keys(slots).length) continue;
      for (const ex of exceptions) {
        if (ex.slot in slots === false) {
          fail(check, `${agent}/${variant.id}: declared exception slot "${ex.slot}" is absent`);
          continue;
        }
        const value = toHex(slots[ex.slot]);
        const expected = toHex(slots[ex.mustEqual]);
        if (value !== expected) {
          fail(check, `declared exception broken: ${agent}/${variant.id}.${ex.slot} is ${value}, ` +
            `but the upstream relationship requires it to equal ${ex.mustEqual} (${expected})`);
        }
        if (value === toHex(slots[ex.mustDifferFrom])) {
          fail(check, `${agent}/${variant.id}.${ex.slot} is ${value}, identical to ` +
            `${ex.mustDifferFrom} — the borrowed tier collapsed back onto a real one`);
        }
      }
    }
  }

  if (!failures.some((f) => f.startsWith(`[${check}]`))) {
    pass(check, `${ladders} surface ladders over ${EXPECTED_PAIRS.length} files: every adjacent rung distinct in both hex and luma, ` +
      `and the 1 declared exception (pi bgSubtle == bgPanel) holds`);
  }
}

/**
 * semantic-ordering: the de-emphasised slot must recede behind the emphasised one.
 *
 * D4 chose guideMid (97.70) for borderSubtle against uiMuted (103.74) for border precisely
 * so borderSubtle is darker; a previous review read that pair the wrong way round and
 * almost had it swapped. It also maps dim -> uiMuted (103.74) against muted -> uiInactive
 * (143.51), inverting Funky's token NAMES on purpose so the target slots keep dim darker
 * than muted. Both directions are locked in here so a future edit cannot silently invert
 * either. Tuples are (agent, recessive, dominant): recessive must have the lower luma.
 *
 * OpenCode has no slot literally named `dim`; there the de-emphasis role is spelled by
 * `syntaxComment` (and diffLineNumber / markdownBlockQuote), so that is the pair used.
 */
const DEEMPHASIS_PAIRS = [
  ['opencode', 'borderSubtle', 'border'],
  ['opencode', 'syntaxComment', 'textMuted'],
  ['pi', 'borderSubtle', 'border'],
  ['pi', 'dim', 'muted'],
];

function checkDeemphasisOrdering() {
  const check = 'semantic-ordering';
  let pairs = 0;

  for (const [agent, recessive, dominant] of DEEMPHASIS_PAIRS) {
    for (const variant of variantsFor(agent)) {
      const slots = slotsOf(agent, outputs[`${agent}/${variant.id}`]);
      if (!(recessive in slots) || !(dominant in slots)) continue;
      pairs += 1;
      const low = toHex(slots[recessive]);
      const high = toHex(slots[dominant]);
      if (!(luma(low) < luma(high))) {
        fail(check, `${agent}/${variant.id}: ${recessive} ${describeLuma(low)} is not darker than ` +
          `${dominant} ${describeLuma(high)} — the recessive slot must recede`);
      }
    }
  }

  if (!failures.some((f) => f.startsWith(`[${check}]`))) {
    pass(check, `${pairs} de-emphasis pairs recede in every file that has them: borderSubtle < border, dim < muted`);
  }
}

/**
 * semantic-dead-token: every background token must reach at least one emitted file.
 *
 * This is the generalisable form of the defect class. A dead background token is not a
 * typo, it is a rung of the ladder that was assigned and then never wired to a slot — the
 * surface went flat while every structural check stayed green.
 *
 * D7 turned the naive version of this check into a false-positive generator: the palette is now
 * step 0 and NO file paints it, so "every step's surfaces must be consumed" would fire on a value
 * the chain genuinely still needs. And skipping step 0 without saying so would be going blind in
 * the other direction. So the exemption is a DECLARED role, per step, and the check has three
 * halves that use it:
 *
 *  (a) Every SHIPPED step's three surfaces are consumed, counted over every file at that step's
 *      tier. Not per variant id: no agent has all three rungs (OpenCode has no deep surface slot
 *      at all), so the union has to span agents, and a step is the finest grouping for which the
 *      union is meaningful — a transparent file must be identical to its solid sibling on every key
 *      but `background`, which is what semantic-transparency-scope proves.
 *  (b) Every REFERENCE step is CONNECTED: walking the palette token to that step must reproduce the
 *      surface this file declares for it. A reference step nobody feeds is a chain that has been
 *      amputated, and (a) alone would never notice because nothing ships it.
 *  (c) A reference step is not a licence to have a rung no step inherits: the ladder has to be
 *      strictly descending, which is `semantic-ladder`'s job. This check only asks who paints what.
 */
const SCAFFOLD_TOKENS = Object.values(SCAFFOLD_PALETTE_TOKENS);

function checkNoDeadPaletteTokens() {
  const check = 'semantic-dead-token';
  const used = Object.fromEntries(TIERS.map((tier) => [tier, new Set()]));

  for (const agent of Object.keys(TEMPLATES)) {
    for (const variant of variantsFor(agent)) {
      for (const value of Object.values(slotsOf(agent, outputs[`${agent}/${variant.id}`]))) {
        const hex = toHex(value);
        if (/^#[0-9a-f]{6}$/.test(hex)) used[variant.tier].add(hex);
      }
    }
  }

  // (a) Shipped steps: consumed or the ladder lost a rung.
  for (const { step, tier, role } of CHAIN_STEPS) {
    if (role !== 'shipped') continue;
    for (const token of SCAFFOLD_TOKENS) {
      const hex = paletteTokenValue(token, tier);
      if (!used[tier].has(hex)) {
        fail(check, `${token} (chain step ${step}, tier ${tier} = ${hex}) reaches no slot in any ` +
          `${tier} file — dead palette token, the surface ladder lost a rung`);
      }
    }
  }

  // (b) Reference steps: connected to the chain, or the chain has been amputated above them.
  const palette = readPalette();
  for (const { step, role } of CHAIN_STEPS) {
    if (role !== 'reference') continue;
    for (const [rung, token] of Object.entries(SCAFFOLD_PALETTE_TOKENS)) {
      const walked = substitute(palette[token], step, CHAIN_LINKS);
      if (walked !== SURFACE_VALUES[rung][step]) {
        fail(check, `chain step ${step} is a declared reference but nothing produces it: walking ` +
          `palette.${token} gives ${walked}, the ladder declares ${SURFACE_VALUES[rung][step]}`);
      }
    }
  }

  // (c) The alpha table, in both directions. Six of thirteen alphas reach a slot; the other seven
  // are VS Code workbench tokens a TUI has no surface for. Mutation testing is what turned that
  // from an accident into a fact: deleting `accentFaint`'s alpha bump rewrote nothing and failed
  // nothing, because nothing painted it. So the split is now declared and policed —
  // an alpha consumed by no slot must be listed with its upstream origin, and a listed alpha that
  // some agent DOES consume is a stale entry hiding a real regression.
  const consumedAlphas = new Set(ALPHA_SLOTS.map(([, , token]) => token));
  const allAlphas = { ...ALPHA_TOKENS, ...DERIVED_ALPHAS };
  for (const [token, spec] of Object.entries(allAlphas)) {
    if (consumedAlphas.has(token)) {
      if (token in TRANSCRIBED_NOT_EMITTED) {
        fail(check, `${token} is listed as transcribed-but-not-emitted but ALPHA_SLOTS paints it — ` +
          `remove the stale TRANSCRIBED_NOT_EMITTED entry`);
      }
      continue;
    }
    if (!(token in TRANSCRIBED_NOT_EMITTED)) {
      fail(check, `${token} (${spec.value}) reaches no slot in any of the ${EXPECTED_PAIRS.length} ` +
        `files and is not declared in TRANSCRIBED_NOT_EMITTED — dead alpha token`);
    }
  }
  for (const token of Object.keys(TRANSCRIBED_NOT_EMITTED)) {
    if (!(token in allAlphas)) {
      fail(check, `TRANSCRIBED_NOT_EMITTED lists ${token}, which is not an alpha token at all`);
    }
  }

  if (!failures.some((f) => f.startsWith(`[${check}]`))) {
    const shipped = CHAIN_STEPS
      .filter((s) => s.role === 'shipped')
      .map(({ step, tier }) => `step ${step}/${tier}: ${SCAFFOLD_TOKENS
        .map((t) => paletteTokenValue(t, tier)).join('/')}`)
      .join(' | ');
    pass(check, `${SCAFFOLD_TOKENS.length} background tokens all consumed across the ${EXPECTED_PAIRS.length} ` +
      `files of both shipped steps (${shipped}), the step-0 reference is still connected to the chain, ` +
      `and the alpha table splits cleanly into ${consumedAlphas.size} painted and ` +
      `${Object.keys(TRANSCRIBED_NOT_EMITTED).length} declared transcribed-but-not-emitted`);
  }
}

/**
 * semantic-ladder: the chain descends, and the bottom of it is genuinely near-black.
 *
 * Two claims that no per-file check can make, because both are about the relationship BETWEEN
 * steps rather than about any one file:
 *
 *  (a) Strictly descending luma, per rung, step 0 > step 1 > step 2. Without this the chain is
 *      just three names; a step that got brighter would leave every other check green while the
 *      premise of D7 — a monotonic darkening — quietly stopped holding.
 *  (b) The deepest shipped base is below NEAR_BLACK_MAX_LUMA. "bg casi full negro" is the user's
 *      words for step 2, and an adjective is not an assertion. 12 on the same Rec. 601 scale that
 *      puts step 0's base at 35.38 is the number that makes it checkable, and the check reports
 *      the real figures so the threshold is auditable rather than trusted.
 */
const NEAR_BLACK_MAX_LUMA = 12;

/**
 * source-drift: the builder's alpha table and this file's transcription must agree.
 *
 * WHY THIS EXISTS, because it is the least obvious check in the file and mutation testing is the
 * only reason it is here at all.
 *
 * Every other check in this script reaches the BUILDER through its OUTPUT. It reads the 8 files the
 * builder wrote and compares them against a transcription derived independently here. That is the
 * right design, and it is why this script can catch a builder that lies (M1's tier swap, M9's
 * re-pointed background).
 *
 * But an output can only testify about what it renders. Seven of thirteen alpha tokens render
 * nothing — they are VS Code workbench slots that no TUI agent exposes (see
 * TRANSCRIBED_NOT_EMITTED). Mutating `accentFaint`'s per-step alpha in the builder therefore
 * changed all 8 outputs by zero bytes and failed nothing: not the composite arithmetic, not the
 * no-leak check, not the accounting check, and not `groundTranscription`, because grounding reads
 * UPSTREAM build.js, not our builder. The builder's copy of a token nothing paints is, without
 * this check, unfalsifiable data.
 *
 * So this asserts agreement between the two tables. It is deliberately NOT a correctness check —
 * it cannot tell whether `#8c8eff30` is the right alpha, and `groundTranscription` is what
 * establishes that. It is a DRIFT check: it says the builder and this file believe the same thing,
 * which is the only way an unrendered declaration can be held to account at all. Two honest
 * properties follow: adding an alpha to the builder without transcribing it here fails, and
 * editing the builder's copy of one that nothing paints fails.
 */
function checkBuilderTableDrift() {
  const check = 'source-drift';
  const builder = readFileSync(SOURCE_PROTOTYPE_BUILDER, 'utf8');

  // Pull the builder's ALPHA_TOKENS block, then index it one line per token. Line-indexing is
  // enough because the table is written as one entry per line, and it means a renamed or
  // reformatted entry surfaces as a "not found" failure rather than as a silent regex miss.
  const start = builder.indexOf('const ALPHA_TOKENS = {');
  if (start === -1) {
    fail(check, 'could not locate the ALPHA_TOKENS table in the builder — has it been renamed?');
    return;
  }
  const block = builder.slice(start, builder.indexOf('\n};', start));
  const lines = new Map();
  for (const line of block.split('\n')) {
    const m = /^\s{2}([A-Za-z]\w*):\s*\{/.exec(line);
    if (m) lines.set(m[1], line);
  }

  for (const [token, spec] of Object.entries(ALPHA_TOKENS)) {
    const line = lines.get(token);
    if (line === undefined) {
      fail(check, `${token} is transcribed here but has no entry in the builder's ALPHA_TOKENS — ` +
        `the two tables have drifted`);
      continue;
    }
    if (!line.includes(`value: '${spec.value}'`)) {
      fail(check, `builder ALPHA_TOKENS.${token}.value is not ${spec.value} — the builder and this ` +
        `transcription disagree, and nothing else in this script can see it`);
    }
    for (const { step, tier, role } of CHAIN_STEPS) {
      if (role !== 'shipped') continue;
      if (!spec.byStep) continue;
      if (!line.includes(`${step}: '${spec.byStep[step]}'`)) {
        fail(check, `builder ALPHA_TOKENS.${token}.byStep[${step}] (tier ${tier}) is not ` +
          `${spec.byStep[step]}. The token renders in no file, so only this check can catch the ` +
          `builder's copy drifting from the transcription`);
      }
    }
  }

  for (const [token, spec] of Object.entries(DERIVED_ALPHAS)) {
    const line = lines.get(token);
    if (line === undefined) continue; // DERIVED_ALPHAS is builder-side only; not drift-checked
    if (!line.includes(`value: '${spec.value}'`)) {
      fail(check, `builder ALPHA_TOKENS.${token}.value is not ${spec.value} — the builder and this ` +
        `transcription disagree`);
    }
    if (spec.valueDarker && !line.includes(`valueDarker: '${spec.valueDarker}'`)) {
      fail(check, `builder ALPHA_TOKENS.${token}.valueDarker is not ${spec.valueDarker}`);
    }
  }

  if (!failures.some((f) => f.startsWith(`[${check}]`))) {
    const unrendered = Object.keys(TRANSCRIBED_NOT_EMITTED)
      .filter((t) => ALPHA_TOKENS[t]?.byStep)
      .map((t) => `${t} ${Object.entries(ALPHA_TOKENS[t].byStep)
        .map(([step, v]) => `step ${step} -> 0x${v.slice(7, 9)}`).join(', ')}`);
    pass(check, `the builder's alpha table agrees with this transcription token for token, base ` +
      `value and per-step override, including the ${unrendered.length} override(s) no output renders ` +
      `(${unrendered.join('; ') || 'none'}) — upstream grounding proves the value, this proves the ` +
      `builder still holds it`);
  }
}

function checkLadderMonotonic() {
  const check = 'semantic-ladder';
  const rows = [];
  const deepest = CHAIN_STEPS[CHAIN_STEPS.length - 1];

  for (const [rung, hexes] of Object.entries(SURFACE_VALUES)) {
    const lumas = CHAIN_STEPS.map(({ step }) => luma(hexes[step]));
    rows.push(`${rung} ${lumas.join(' > ')}`);
    for (let i = 1; i < lumas.length; i += 1) {
      if (!(lumas[i] < lumas[i - 1])) {
        fail(check, `the ${rung} rung is not strictly descending across the chain: ` +
          CHAIN_STEPS.map(({ step }, j) => `step ${step} ${hexes[step]} luma ${lumas[j]}`).join(' -> ') +
          ` — a chain that stops going down is not a darkening chain`);
      }
    }
  }

  const deepestBase = SURFACE_VALUES.base[deepest.step];
  const deepestLuma = luma(deepestBase);
  if (!(deepestLuma < NEAR_BLACK_MAX_LUMA)) {
    fail(check, `step ${deepest.step} base ${deepestBase} measures luma ${deepestLuma}, which is not ` +
      `below ${NEAR_BLACK_MAX_LUMA} — the deepest shipped canvas is not near-black`);
  }

  // The three rungs must also stay distinct at every step, or "descending" is comparing a colour
  // with itself. semantic-tiers proves this per emitted file; this proves it on the declaration,
  // where a collision would be introduced rather than inherited.
  for (const { step } of CHAIN_STEPS) {
    const values = Object.values(SURFACE_VALUES).map((hexes) => hexes[step]);
    if (new Set(values).size !== values.length) {
      fail(check, `the three rungs collide at step ${step}: ${values.join(' / ')}`);
    }
  }

  if (!failures.some((f) => f.startsWith(`[${check}]`))) {
    pass(check, `the ladder is strictly descending on every rung (${rows.join('; ')}), the three ` +
      `rungs are distinct at all ${CHAIN_STEPS.length} steps, and the deepest shipped base ` +
      `${deepestBase} measures luma ${deepestLuma} < ${NEAR_BLACK_MAX_LUMA} (near-black)`);
  }
}

/** semantic-tool-order: pending must not render brighter than the success it precedes. */
const TOOL_STATE_LADDER = ['toolPendingBg', 'toolSuccessBg'];

function checkToolStateOrdering() {
  const check = 'semantic-tool-order';
  let pairs = 0;

  for (const variant of variantsFor('pi')) {
    const slots = slotsOf('pi', outputs[`pi/${variant.id}`]);
    for (let i = 1; i < TOOL_STATE_LADDER.length; i += 1) {
      const lower = TOOL_STATE_LADDER[i - 1];
      const upper = TOOL_STATE_LADDER[i];
      if (!(lower in slots) || !(upper in slots)) continue;
      pairs += 1;
      const low = toHex(slots[lower]);
      const high = toHex(slots[upper]);
      if (!(luma(low) < luma(high))) {
        fail(check, `pi/${variant.id}: ${lower} ${describeLuma(low)} is not darker than ` +
          `${upper} ${describeLuma(high)} — a pending state must not render brighter than the state it precedes`);
      }
    }
  }

  if (!failures.some((f) => f.startsWith(`[${check}]`))) {
    pass(check, `${pairs} tool-state pairs ordered: toolPendingBg < toolSuccessBg in every pi file`);
  }
}

/** semantic-info-bg: the info surface must be its own surface, not a copy of another. */
const INFO_BG_DISTINCT_FROM = ['bg', 'bgPanel'];

function checkInfoSurfaceIdentity() {
  const check = 'semantic-info-bg';
  let pairs = 0;

  for (const variant of variantsFor('pi')) {
    const slots = slotsOf('pi', outputs[`pi/${variant.id}`]);
    if (!('infoBg' in slots)) continue;
    pairs += 1;
    const info = toHex(slots.infoBg);
    for (const other of INFO_BG_DISTINCT_FROM) {
      if (info === toHex(slots[other])) {
        fail(check, `pi/${variant.id}.infoBg is ${info}, identical to ${other} — ` +
          `the info surface lost the identity that gives it its own role`);
      }
    }
  }

  if (!failures.some((f) => f.startsWith(`[${check}]`))) {
    pass(check, `${pairs} info surfaces carry their own colour, distinct from bg and bgPanel in every pi file`);
  }
}

/**
 * semantic-heading-family: Pi's markdown heading must not inherit its syntax-type colour.
 *
 * D6 re-points `pi/colors/mdHeading` off `champagne`, because Pi bundles 6 roles onto that
 * one var and the heading was rendering yellow while OpenCode rendered it pink. `softRose`
 * holds pinkLight #ffa8e6, the only pink-family value in Pi's fixed 26-var key set.
 *
 * The assertion is DIRECTION of improvement, not hex equality: the emitted Pi heading must be
 * strictly nearer the OpenCode heading than the syntax-type colour it replaced was. Exact
 * parity with OpenCode's #ff8ddb is impossible without adding a `pinkVibrant` var the
 * template does not have, so demanding equality would be demanding an illegal key. Comparing
 * distances accepts the known tone difference while still failing any change that moves the
 * heading away from the reference.
 */
function checkHeadingFamily() {
  const check = 'semantic-heading-family';
  let compared = 0;

  for (const variant of variantsFor('pi')) {
    if (!variantsFor('opencode').some((v) => v.tier === variant.tier)) continue;
    const pi = outputs[`pi/${variant.id}`];
    const ocVersion = variantsFor('opencode').find((v) => v.tier === variant.tier);
    const oc = outputs[`opencode/${ocVersion.id}`];
    if (!pi?.colors || !pi?.vars || !oc?.theme) continue;

    const mdTarget = pi.colors.mdHeading;
    const typeTarget = pi.colors.syntaxType;
    if (mdTarget === undefined || typeTarget === undefined) continue;

    if (mdTarget === typeTarget) {
      fail(check, `pi/${variant.id}: colors.mdHeading === colors.syntaxType ("${mdTarget}") — the heading ` +
        `is still welded to the syntax-type role and renders yellow instead of pink`);
      continue;
    }

    const heading = toHex(pi.vars[mdTarget]);
    const syntaxType = toHex(pi.vars[typeTarget]);
    if (heading === syntaxType) {
      fail(check, `pi/${variant.id}: mdHeading resolves to ${heading}, the same colour as syntaxType, ` +
        `even though the indirection now points elsewhere`);
      continue;
    }

    const reference = toHex(oc.theme.markdownHeading);
    if (reference === undefined) continue;
    compared += 1;

    const dHeading = rgbDistance(heading, reference);
    const dSyntax = rgbDistance(syntaxType, reference);
    if (!(dHeading < dSyntax)) {
      fail(check, `pi/${variant.id}: mdHeading ${heading} sits ${dHeading} from the OpenCode heading ` +
        `${reference}, not nearer than the syntax-type colour ${syntaxType} at ${dSyntax} — the ` +
        `decoupling moved the heading the wrong way`);
    }
  }

  if (!failures.some((f) => f.startsWith(`[${check}]`))) {
    pass(check, `${compared} Pi headings are decoupled from syntax-type and strictly nearer the ` +
      `OpenCode heading colour than the colour they replaced`);
  }
}

// ---------------------------------------------------------------------------
// T10 - name resolution, because these files get installed into live agent config dirs
// ---------------------------------------------------------------------------

/**
 * criterion-name-resolution: the filename and the internal `name` must agree.
 *
 * This is the check that makes live testing possible rather than merely structurally valid. Each
 * agent picks a theme by name, but it is not obvious from the outside whether that name is matched
 * against the FILENAME or against the `name` field inside the JSON. Claude Code's search path is
 * `~/.claude/themes/<slug>.json` while Pi resolves across two directories; upstream settles it by
 * convention — `~/.pi/agent/themes/Gentleman.json` carries the internal name `Gentleman`.
 *
 * So both are made identical to the slug here. A user can then set either `"funky-dark-prototype"`
 * in `settings.json` and it resolves, without depending on which strategy the agent actually uses.
 * OpenCode has no internal name field and is checked for that absence, not for a value.
 */
function checkNameResolution() {
  const check = 'criterion-name-resolution';
  let named = 0;

  for (const variant of VARIANTS) {
    for (const agent of ['claude-code', 'pi']) {
      if (!variant.agents.includes(agent)) continue;
      const out = outputs[`${agent}/${variant.id}`];
      if (!out) continue;
      named += 1;
      if (out.name !== variant.slug) {
        fail(check, `${agent}/${variant.id}: internal name is "${out.name}", expected "${variant.slug}" — the ` +
          `file would only resolve if the agent matches the ${agent === 'pi' ? 'name field' : 'filename'}`);
      }
    }

    // OpenCode must NOT grow a name field: its format is exactly { $schema, theme }.
    if (!variant.agents.includes('opencode')) continue;
    const oc = outputs[`opencode/${variant.id}`];
    if (oc && 'name' in oc) {
      fail(check, `opencode/${variant.id}: has a top-level "name" field, but its format is exactly ` +
        `{ $schema, theme } — an extra key may be dropped silently`);
    }
  }

  if (!failures.some((f) => f.startsWith(`[${check}]`))) {
    pass(check, `${named} name-bearing files: filename, Claude Code name and Pi name all agree on the ` +
      `slug across ${EXPECTED_PAIRS.length} files; OpenCode correctly carries no name field`);
  }
}

// ---------------------------------------------------------------------------
// semantic-transparency-scope — transparency is OpenCode-only, and only ever one key
// ---------------------------------------------------------------------------

/** The agents that have no pass-through token, so a `"none"` there is always a bug. */
const OPAQUE_ONLY_AGENTS = ['claude-code', 'pi'];

/**
 * Where each agent's background slot lives in its emitted file.
 *
 * Pi is absent on purpose: it has no background slot at all (its surface slots are bg /
 * bgPanel / bgElement), which is exactly why transparency is not expressible for it. A
 * transparent Pi variant could not differ from its solid sibling on any key, so the
 * "differs in exactly one key" rule below is unsatisfiable and the variant is meaningless.
 */
const BACKGROUND_PATHS = {
  'claude-code': 'overrides.background',
  opencode: 'theme.background',
};

/** Read a dotted path out of a parsed JSON file, or undefined if any step is missing. */
const at = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

/**
 * Every leaf whose value differs between two JSON values, as `{ path, from, to }`.
 *
 * The path is returned SEPARATE from the values, not pre-formatted into one string: the
 * caller has to filter the path alone to allow exactly one expected difference, and a
 * pre-formatted string makes that filter silently unmatchable.
 */
function diffPaths(a, b, prefix = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  const bothPlain = a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b);
  if (!bothPlain) return [{ path: prefix || '<root>', from: a, to: b }];
  const out = [];
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    out.push(...diffPaths(a[key], b[key], prefix ? `${prefix}.${key}` : key));
  }
  return out;
}

const showDiff = (d) => `${d.path}: ${JSON.stringify(d.from)} -> ${JSON.stringify(d.to)}`;

/** Every leaf path in a JSON value that holds a string containing `needle`, case-insensitive. */
function findNeedlePaths(value, needle, prefix = '') {
  if (typeof value === 'string') {
    return value.toLowerCase().includes(needle) ? [`${prefix || '<root>'} = "${value}"`] : [];
  }
  if (!value || typeof value !== 'object') return [];
  const out = [];
  for (const [key, child] of Object.entries(value)) {
    out.push(...findNeedlePaths(child, needle, prefix ? `${prefix}.${key}` : key));
  }
  return out;
}

/**
 * Solid is the default; transparency is an opt-in, available on exactly one key of exactly
 * one agent. Four assertions, ordered by how quietly a violation would behave for real:
 *
 *  (a) Every agent has a solid variant at BOTH tiers. Otherwise "solid is the default" is a
 *      claim about a file that may not exist, and (c) has no sibling to compare against.
 *  (b) OpenCode `background` is the template's "none" in a transparent file and is NOT "none"
 *      in a solid one. Asserting one direction only would let a solid file advertise terminal
 *      pass-through the user never asked for — the failure is invisible, not an error.
 *  (c) A transparent file equals its solid sibling on every key EXCEPT `background`, and holds
 *      "none" there. This is the byte-identity constraint: transparency is a rendering change,
 *      never a palette change, so a second differing key means two files of one theme drifted.
 *  (d) No claude-code or pi file contains "none" anywhere. Those agents have no pass-through
 *      token at all: Claude Code silently drops a malformed colour, and Pi's export keys
 *      (pageBg, cardBg, infoBg) indirect to real vars, so a literal there breaks a different
 *      link in the graph. `criterion-2` and `criterion-4-accounting` both tolerate "none" in
 *      opencode's background, so without this check a stray "none" elsewhere is unreported.
 */
function checkTransparencyScope() {
  const check = 'semantic-transparency-scope';

  // (a) Solid is the default for every agent, at every tier.
  for (const agent of Object.keys(TEMPLATES)) {
    for (const tier of TIERS) {
      const solid = variantsFor(agent).find((v) => v.tier === tier && v.opacity === 'solid');
      if (!solid) {
        fail(check, `${agent} has no SOLID ${tier} variant — solid is the default for every agent, ` +
          `and the transparent files have nothing to be byte-identical to`);
      } else if (!outputs[`${agent}/${solid.id}`]) {
        fail(check, `${agent}/${solid.id} is absent, so the ${tier} tier cannot be verified`);
      }
    }
  }

  // (b) and (c) hold for every transparent variant, against the solid sibling of EVERY agent
  // that variant claims. Scoped per agent on purpose: a transparent file for an agent whose
  // background slot is an ordinary colour is a byte-for-byte duplicate of its solid sibling
  // that changes nothing, and a check that only ever looked at opencode would wave it through.
  let pairs = 0;
  for (const variant of VARIANTS) {
    if (variant.opacity !== 'transparent') continue;
    for (const agent of variant.agents) {
      const backgroundPath = BACKGROUND_PATHS[agent];
      if (!backgroundPath) {
        fail(check, `${variant.id} claims agent "${agent}", which has no background slot to make ` +
          `transparent (${agent} expresses its surfaces as bg / bgPanel / bgElement) — the variant ` +
          `would be a byte-for-byte duplicate of the solid one`);
        continue;
      }
      const solid = variantsFor(agent).find((v) => v.tier === variant.tier && v.opacity === 'solid');
      if (!solid) {
        fail(check, `${variant.id}: no solid ${variant.tier} sibling for ${agent} to be identical to`);
        continue;
      }
      const tKey = `${agent}/${variant.id}`;
      const sKey = `${agent}/${solid.id}`;
      const transparent = outputs[tKey];
      const sibling = outputs[sKey];
      if (!transparent || !sibling) {
        fail(check, `${tKey} or ${sKey} is absent, cannot compare the transparent file with its sibling`);
        continue;
      }
      pairs += 1;

      // (b) Direction matters: "none" only where it was asked for, and only where it means
      // something. A background slot holding a colour here is the tell that the agent cannot
      // pass the terminal through at all.
      const transparentBackground = at(transparent, backgroundPath);
      if (transparentBackground !== 'none') {
        fail(check, `${tKey} ${backgroundPath} = ${JSON.stringify(transparentBackground)}, expected the ` +
          `template's "none" — a transparent variant that does not pass the terminal through is a ` +
          `duplicate of ${sKey}, and if ${agent} cannot express pass-through it should not claim to`);
      }
      if (at(sibling, backgroundPath) === 'none') {
        fail(check, `${sKey} ${backgroundPath} = "none" on a SOLID variant — the file advertises ` +
          `terminal pass-through the user did not ask for, and the two files are indistinguishable`);
      }

      // (c) EXACTLY one differing key, the named one. Zero differences is a duplicate, two is a
      // palette that drifted between two files of the same theme, and any other single key is
      // transparency leaking into a slot it was never allowed to touch.
      const differing = diffPaths(sibling, transparent);
      const onlyBackground = differing.length === 1 && differing[0].path === backgroundPath;
      if (!onlyBackground) {
        const described = differing.length === 0
          ? '0 keys — the two files are byte-identical, so this variant expresses no transparency at all'
          : `${differing.length} key(s): ${differing.slice(0, 5).map(showDiff).join('; ')}` +
            (differing.length > 5 ? ` (+${differing.length - 5} more)` : '');
        fail(check, `${tKey} differs from its solid sibling ${sKey} on ${described}; it must differ on ` +
          `exactly one key, ${backgroundPath}, and on nothing else — transparency changes the ` +
          `rendering, never the palette`);
      }
    }
  }

  // (d) "none" is legal in exactly one place in the whole emit matrix.
  let scanned = 0;
  for (const agent of OPAQUE_ONLY_AGENTS) {
    for (const variant of variantsFor(agent)) {
      const key = `${agent}/${variant.id}`;
      const out = outputs[key];
      if (!out) continue;
      scanned += 1;
      const inValues = findNeedlePaths(out, 'none');
      if (inValues.length) {
        fail(check, `${key} contains "none" as a value: ${inValues.slice(0, 5).join('; ')} — ` +
          `${agent === 'claude-code'
            ? 'Claude Code silently drops a malformed colour, so this renders as no colour at all'
            : "Pi's export keys indirect to real vars, so a literal here is a broken reference"}`);
        continue;
      }
      // The value walk cannot see a KEY, so the raw text is scanned too: "anywhere" is the
      // constraint, and this is the only assertion that can honour it end to end.
      if (rawText[key] && /none/i.test(rawText[key])) {
        fail(check, `${key} contains the substring "none" outside any value (a key, or a field ` +
          `the value walk does not descend into)`);
      }
    }
  }

  if (!failures.some((f) => f.startsWith(`[${check}]`))) {
    pass(check, `solid is the default for all ${Object.keys(TEMPLATES).length} agents at both tiers; ` +
      `${pairs} transparent files hold background "none" and differ from their solid sibling on exactly ` +
      `that one key; ${scanned} claude-code/pi files contain no "none" anywhere`);
  }
}

// ---------------------------------------------------------------------------

checkCriterion1();
checkCriterion2();
checkCriterion3();
checkSurfaces();
checkAlphaPerVariant();
checkDarkValuesNotLeaked();
checkValuesAccountedFor();
checkCriterion6();
checkSurfaceTiers();
checkDeemphasisOrdering();
checkNoDeadPaletteTokens();
checkLadderMonotonic();
checkBuilderTableDrift();
checkToolStateOrdering();
checkInfoSurfaceIdentity();
checkHeadingFamily();
checkNameResolution();
checkTransparencyScope();
checkChainDeclaration();

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log('Funky TUI prototypes — validation\n');
for (const check of checks) console.log(`  ok   ${check}`);

if (failures.length) {
  console.log('');
  for (const failure of failures) console.log(`  FAIL ${failure}`);
  console.log(`\n${failures.length} failure(s), ${checks.length} check(s) passed.`);
  process.exit(1);
}

console.log('\nEmitted files:');
for (const agent of Object.keys(TEMPLATES)) {
  // Per-agent membership: the report must not list a file that must not exist, or the reader
  // is invited to go looking for transparency in Claude Code and Pi.
  for (const variant of variantsFor(agent)) {
    const path = join(HERE, agent, `${variant.slug}.json`);
    if (existsSync(path)) {
      console.log(`  ${agent}/${variant.slug}.json  ${statSync(path).size} bytes  (tier ${variant.tier}, ${variant.opacity})`);
    }
  }
}
console.log(`\n${checks.length} checks passed, 0 failures.`);
process.exit(0);
