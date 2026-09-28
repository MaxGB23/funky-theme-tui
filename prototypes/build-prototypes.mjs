#!/usr/bin/env node
/**
 * Funky TUI prototypes builder.
 *
 * Emits the 8 prototype themes from ONE mapping table:
 *
 *   claude-code/  funky-dark-prototype.json              funky-darker-prototype.json
 *   opencode/     funky-dark-prototype.json              funky-darker-prototype.json
 *                 funky-dark-transparent-prototype.json  funky-darker-transparent-prototype.json
 *   pi/           funky-dark-prototype.json              funky-darker-prototype.json
 *
 * A variant is TWO orthogonal axes, not one string:
 *   tier    dark | darker    — which STEP of the darkening chain this file paints
 *   opacity solid | transparent — whether OpenCode's `background` passes the terminal through
 *
 * SOLID is the default for every agent. Transparent exists only for opencode, because
 * `"none"` is a real token there: OpenCode's `background` is the template's own literal
 * `"none"`, which means "let the terminal show through". Claude Code has no such token
 * (it silently drops a malformed colour, so `"none"` would be dropped too) and Pi's
 * `export` keys indirect to vars (so a literal there would be a different bug). A
 * transparent variant must therefore be byte-identical to its solid sibling on every key
 * except OpenCode's `background`; validate-prototypes.mjs asserts exactly that.
 *
 * Spec: odd/tasks/funky-tui-prototypes.md (D1-D5).
 *
 * The slot vocabulary of every agent is fixed by its template. The template is read
 * from disk and its keys are enumerated, never hardcoded here, so "same keys, same
 * count, nothing added, nothing dropped" is structural rather than a promise.
 *
 * Colour values are NEVER pre-computed here. They are derived:
 *   - flat anchors  -> palette token, walked down the darkening chain to the tier's step
 *   - alpha anchors -> composited per variant against that variant's own surface (D1)
 *
 * Data provenance (read as data, never executed — build.js requires ../src/theme-config.js
 * which no longer exists at that path):
 *   material-trabajo/vscode-themes/theme-config.js  lines 7-95   (palette, 54 tokens)
 *   material-trabajo/vscode-themes/build.js         lines 18-100 (darker maps, lowered alphas)
 *
 * Both files are re-read at build time and the transcription below is asserted against
 * them, so a palette edit upstream fails the build instead of silently drifting.
 *
 * D7: the two tiers are steps of ONE downward darkening chain, not two value sets. The palette is
 * step 0 and ships nothing; step 1 is what `darker` used to paint and is shipped as `dark`; step 2
 * is new and is shipped as `darker`. See the chain section for why the 0->1 link is transcribed
 * and the 1->2 link is declared.
 *
 * Plain Node ESM, zero dependencies.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The only thing shared with the validator: a colour formula. Palette DATA is deliberately
// transcribed twice, so the two scripts can disagree. See color-math.mjs.
import { luma } from './color-math.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(HERE);

// ---------------------------------------------------------------------------
// 1. Palette — 54 tokens, transcribed from theme-config.js lines 7-95.
// ---------------------------------------------------------------------------

const PALETTE = {
  // Dark surfaces
  bgBase: '#24212e',
  bgDeep: '#211e2b',
  bgElevated: '#2e2a3a',
  // Foreground
  fgBase: '#f8f8f2',
  fgWhite: '#ffffff',
  fgMuted: '#d8d8d8',
  // UI greys
  uiMuted: '#606685',
  uiInactive: '#8b8f9e',
  guideMid: '#625e74',
  greyLight: '#cbcbcb',
  purpleGrey: '#a9b1de',
  linkPurple: '#b2b3ff',
  // Cyans
  cyanDim: '#80ecff',
  cyanAccent: '#96e7ff',
  cyanVibrant: '#6df5fa',
  // Reds
  redBase: '#ff5555',
  // Pinks
  pinkBase: '#ff8bee',
  pinkLight: '#ffa8e6',
  pinkAccent: '#ff87c5',
  pinkVibrant: '#ff8ddb',
  pinkTerminal: '#ff55a4',
  errorFg: '#ff8282',
  // Purples
  purpleDim: '#c792ea',
  purpleBase: '#bd93f9',
  purpleBright: '#eaa9fc',
  purpleSoft: '#b7b5ff',
  // Oranges & yellows
  orangeBase: '#ffb86c',
  orangeAccent: '#ffd089',
  orangeSoft: '#ffb488',
  yellowBase: '#f6ff98',
  yellowLight: '#fff9b7',
  yellowVibrant: '#ffde25',
  bracketGold: '#ffd700',
  // Greens
  greenBase: '#8bffa8',
  greenAccent: '#b9ffba',
  // UI accent & surfaces
  uiAccent: '#8c8eff',
  bgScrollbar: '#4e4b59',
  // Method blues
  blueMethod: '#82aaff',
  operatorBlue: '#9abfff',
  blueSoft: '#a1caff',
  cyanTerminal: '#a4ffff',
  // Material greens / oranges / terracotta
  greenMaterial: '#c3e88d',
  orangeScarlet: '#f78c6c',
  terracotta: '#c17e70',
  // Shared alphas — the 10 tokens D1 flattens
  uiAccentStrong: '#8c8effd2',
  accentSelection: '#8c8eff45',
  guideAccent: '#8c8eff73',
  accentFaint: '#8c8eff2a',
  controlBorder: '#8c8eff33',
  searchBackground: '#5f569580',
  scrollbarTrack: '#24212eea',
  matchBorder: '#a599efff',
  hoverSurface: '#2e2a3a80',
  highlightBorder: '#8c8eff5e',
};

/**
 * Every opaque hex value the palette defines.
 *
 * The chain's key provenance is now asserted structurally rather than by lookup — `assertChainGround`
 * checks that step 0 IS the palette, and `assertChainIntegrity` checks that each link reproduces
 * the ladder it claims to implement. This set is kept because it is the honest answer to "which of
 * the 54 tokens does the chain actually touch": the three surface tokens, plus `guideMid`.
 */
const PALETTE_MATCHES = new Set(Object.values(PALETTE).filter((h) => /^#[0-9a-f]{6}$/.test(h)));

// ---------------------------------------------------------------------------
// 1b. The darkening chain (D7) — a tier is a STEP, not a second value set
// ---------------------------------------------------------------------------

/**
 * The three steps of the chain, and the role each one plays.
 *
 *   step 0  the palette itself. build.js assembles `maxiano-dark.json` from it. Ships NOTHING.
 *   step 1  what build.js's `darker` profile paints. Shipped as `dark`.
 *   step 2  new. Shipped as `darker`.
 *
 * Step 1 is byte-for-byte the surface set the shipped `darker` used before D7, which is what makes
 * this a re-tiering rather than a redesign: nothing is invented except the 1->2 link.
 *
 * The ladder is declared as absolute values per step, so the monotonicity of the chain is a
 * property you can read off this table instead of a property you have to infer from a prefix map.
 */
const SURFACE_STEPS = [
  {
    step: 0, role: 'reference', shippedAs: null,
    note: 'palette reference (not shipped)',
    surfaces: { base: '#24212e', deep: '#211e2b', elevated: '#2e2a3a' },
  },
  {
    step: 1, role: 'shipped', shippedAs: 'dark',
    note: "build.js darkerBackgrounds",
    surfaces: { base: '#181520', deep: '#121018', elevated: '#201d2a' },
  },
  {
    step: 2, role: 'shipped', shippedAs: 'darker',
    note: 'D7, declared in this file (no upstream declares it)',
    surfaces: { base: '#0a0910', deep: '#060509', elevated: '#13111a' },
  },
];

/**
 * Which step each shipped tier paints. Step 0 is deliberately ABSENT: it is the ancestor the
 * chain starts from, not a tier, and giving it a key here would let it ship by accident.
 */
const TIER_STEP = { dark: 1, darker: 2 };

/**
 * The chain as LINKS, `from` -> `to`, because that is the shape build.js has and the shape the
 * prefix rewrite needs: it detects the base hex and keeps the alpha suffix, so
 * `#24212eea` -> `#181520ea` -> `#0a0910ea` in two hops.
 *
 * Link 0->1 is build.js lines 29-39, seven entries, transcribed and asserted against that file.
 * Link 1->2 is THREE entries: the surfaces only.
 *
 * Those three are DECLARED, not transcribed. None of `#0a0910`, `#060509`, `#13111a` appears in
 * `theme-config.js` or `build.js`; they are the user decision D7 encodes and this file owns them.
 *
 * And only those three. build.js declares no step-2 value for the other four entries, so none is
 * invented: `guideMid` and the three literals keep their step-1 value at step 2. That is the honest
 * encoding of a chain extended only where a decision was actually made — extending `guideMid` to
 * a near-black canvas is a visual judgement, the same class as a step-3 alpha, and belongs to the
 * user. Reported as an open point, not changed quietly.
 */
const CHAIN_LINKS = [
  {
    from: 0, to: 1, provenance: 'build.js lines 29-39 (darkerBackgrounds), transcribed',
    entries: [
      ['#24212e', '#181520'], // palette.bgBase   — base surface
      ['#211e2b', '#121018'], // palette.bgDeep   — deep surface
      ['#2e2a3a', '#201d2a'], // palette.bgElevated — elevated surface
      ['#363143', '#26222f'], // statusBarItem.compactHoverBackground
      ['#464254', '#3a374a'], // editorIndentGuide.background1
      ['#444156', '#3f3c4f'], // menu.separatorBackground
      ['#625e74', '#544f64'], // palette.guideMid — active indent guide / borderSubtle
    ],
  },
  {
    from: 1, to: 2, provenance: 'D7, declared above (no upstream exists)',
    entries: [
      ['#181520', '#0a0910'], // step-1 base     -> step-2 base
      ['#121018', '#060509'], // step-1 deep     -> step-2 deep
      ['#201d2a', '#13111a'], // step-1 elevated -> step-2 elevated
    ],
  },
];

/**
 * build.js lines 46-49 — `darkerSyntaxAdjustments`, applied at the `darker` TIER only.
 *
 * Deliberately NOT a chain link. D7 moved both shipped canvases below the step-0 reference, so the
 * same argument that pulls the `accentFaint` alpha bump forward applies here — but D7 ruled only on
 * the alpha, both of these adjustments are imperceptible (#fff9b7 -> #fff9ba, #ffd089 -> #ffd18e),
 * and the cost of applying them is a hue change in a shipped file. Left tier-keyed and reported as
 * an open point. Carried for fidelity to build.js either way, so no extra attenuation is invented.
 */
const DARKER_SYNTAX = [
  ['#fff9b7', '#fff9ba'], // palette.yellowLight  (syntaxType)
  ['#ffd089', '#ffd18e'], // palette.orangeAccent
];

// ---------------------------------------------------------------------------
// 2. Alpha flattening (D1)
// ---------------------------------------------------------------------------

// composite(fg, a, bg) = round(fg_c * a/255 + bg_c * (1 - a/255))
const composite = (fgHex, alphaHex, bgHex) => {
  const a = parseInt(alphaHex.slice(0, 2), 16) / 255;
  const ch = (i) => {
    const fg = parseInt(fgHex.slice(i, i + 2), 16);
    const bg = parseInt(bgHex.slice(i, i + 2), 16);
    return Math.round(fg * a + bg * (1 - a)).toString(16).padStart(2, '0');
  };
  return `#${ch(1)}${ch(3)}${ch(5)}`;
};

/** The three surfaces an alpha can sit on (D2). Role names, resolved through the chain. */
const SURFACE_TOKENS = { base: 'bgBase', deep: 'bgDeep', elevated: 'bgElevated' };

/**
 * The 8-digit value an alpha spec carries at a given chain step.
 *
 * Two mechanisms, kept deliberately distinct:
 *
 *   byStep        CHAIN-driven (D7). The alpha follows the canvas, and both shipped canvases are
 *                 now below the step-0 reference, so both need the bump build.js gave its
 *                 `darker` profile.
 *   darkerValue   TIER-driven, and predates D7. build.js lowers the diff washes only in its
 *                 `darker` profile. Untouched, because re-pointing it at the step would silently
 *                 lower the `dark` tier's diff washes — a visual change nobody asked for.
 *
 * Merging them into one field would be tidier and wrong: it would claim D7 decided the diff
 * alphas when it did not. Reported as an open point instead.
 */
const alphaValueFor = (spec, step) => spec.byStep?.[step] ?? spec.value;

/**
 * All 10 alpha tokens from the palette, verbatim, plus the surface each one sits on.
 *
 * `accentFaint.byStep` is build.js lines 76-78 (the word-highlight family, `#8c8eff30`) lifted from
 * a `darkerValue` to a per-step table, because it is now a property of the canvas rather than of a
 * variant id: 0x2a at step 0, 0x30 at BOTH shipped steps. Modelled per step so the next rung has
 * an obvious slot to put its own number in.
 *
 * Step 2 REUSES 0x30 and is not raised. Both shipped canvases are near-black and a higher alpha
 * there is a visual judgement — how much a faint accent should glow against almost nothing — that
 * the user owns, not something a build script should quietly decide. The table is where that
 * number goes when it is decided.
 *
 * The fg half is resolved per variant: it is walked down the chain first, so hoverSurface's
 * #2e2a3a reaches #201d2a at step 1 and #13111a at step 2, and scrollbarTrack's #24212e reaches
 * #181520 then #0a0910 — exactly what build.js's startsWith rewrite does to the 8-digit value, one
 * step further down.
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

/**
 * Alpha values that are not palette tokens: the diff backgrounds. Flat alphas come from
 * theme-config.js lines 312-315, the lowered darker ones from build.js lines 71-74. Those stay
 * TIER-keyed (`darkerValue`) rather than becoming chain links — see `alphaValueFor` for why, and
 * D7's open points.
 *
 * build.js lines 76-78 (wordHighlightBackground, wordHighlightStrongBackground,
 * editorBracketMatch.background -> #8c8eff30) lower to the same family as accentFaint's
 * per-step table above; no Claude Code / OpenCode / Pi slot consumes them.
 *
 * `infoSurface` is the T7 fix 3: Pi's `infoBg` had collapsed onto `bg`, so the info surface
 * had no identity. It is rebuilt with the D1 system instead of a flat colour, because a
 * washed tint over the panel is how Funky expresses a surface and it is the one thing the
 * 10 flattened alphas are actually for. 0x1f sits below the palette's faintest alpha
 * (accentFaint 0x2a) so it reads as a surface wash and never as a selected row. It
 * composites against `deep` because upstream keeps the info surface on the panel level,
 * and it is recomputed against each step's own `deep` — no byStep entry, because the
 * alpha itself does not change, only the surface it lands on. That is invariant 4: the
 * wash darkens in step 2 without anyone touching it.
 */
const DERIVED_ALPHAS = {
  diffAddedBg: { value: '#8c8eff25', darkerValue: '#8c8eff18', surface: 'base' },
  diffRemovedBg: { value: '#ff000025', darkerValue: '#ff000018', surface: 'base' },
  infoSurface: { value: '#80ecff1f', surface: 'deep' },
};

// ---------------------------------------------------------------------------
// 3. Semantic anchors (D4) — anchor name -> palette token
// ---------------------------------------------------------------------------

const ANCHORS = {
  // D4 table
  accent: 'uiAccent',
  accentBright: 'linkPurple',
  text: 'fgBase',
  muted: 'uiInactive',
  dim: 'uiMuted',
  border: 'uiMuted',
  borderSubtle: 'guideMid',
  success: 'greenBase',
  error: 'errorFg',
  warning: 'yellowBase',
  info: 'cyanDim',
  heading: 'pinkVibrant',
  code: 'cyanAccent',
  syntaxKeyword: 'pinkBase',
  syntaxFunction: 'cyanAccent',
  syntaxOperator: 'operatorBlue',
  syntaxString: 'greenAccent',
  syntaxNumber: 'cyanDim',
  syntaxType: 'yellowLight',
  syntaxPunctuation: 'purpleGrey',

  // Surfaces (D2) — resolved through the chain, so `dark` lands on step 1
  // (#181520 / #121018 / #201d2a) and `darker` on step 2 (#0a0910 / #060509 / #13111a)
  // without any of those six values being named here.
  surfaceBase: 'bgBase',
  surfaceDeep: 'bgDeep',
  surfaceElevated: 'bgElevated',

  // Claude Code's rainbow_* and *_FOR_SUBAGENTS_ONLY slots ARE colour names. Gentleman-Cute
  // is monochrome and collapsed all of them onto its single pink; Funky has the tokens to
  // honour the name, and keeping them distinct is the whole point of a 54-token palette.
  rainbowBlue: 'blueMethod',
  rainbowIndigo: 'blueSoft',
  rainbowViolet: 'purpleSoft',
  subagentBlue: 'blueMethod',
  subagentCyan: 'cyanAccent',
  subagentGreen: 'greenBase',
  subagentOrange: 'orangeBase',
  subagentPink: 'pinkVibrant',
  subagentPurple: 'purpleDim',
  subagentRed: 'redBase',
  subagentYellow: 'yellowBase',

  // Pi-only var names that carry a role the other agents spell out.
  pearl: 'greyLight', // #D2CBD0 -> greyLight
  soft: 'pinkLight', // softRose #D7A0B8 -> pinkLight
};

// ---------------------------------------------------------------------------
// 4. The ONE mapping table: agent slot -> anchor name
// ---------------------------------------------------------------------------

/**
 * A mapping value is one of:
 *   - a key of ANCHORS        (semantic anchor)
 *   - a key of PALETTE        (a palette token used directly, e.g. 'orangeBase')
 *   - a key of ALPHA_TOKENS   (composited per tier, D1)
 *   - a key of DERIVED_ALPHAS (composited per tier, diff backgrounds)
 *   - 'passThrough'           (keep the template's own literal, in every variant)
 *   - 'passThrough:<anchor>'  (keep the template's literal when the variant is transparent,
 *                              resolve <anchor> when it is solid — OpenCode `background`)
 *
 * Anything else throws. The two pass-through forms are the only opacity-aware rows in the
 * table, and there is exactly one of them: transparency is real for one slot on one agent.
 */
const MAPPING = {
  // ---- Claude Code: 72 slots, every value emitted as rgb(r,g,b) ---------------
  'claude-code': {
    autoAccept: 'success',
    autoAcceptShimmer: 'success',
    background: 'surfaceBase',
    bashBorder: 'accent',
    bashMessageBackgroundColor: 'surfaceElevated',
    blue_FOR_SUBAGENTS_ONLY: 'subagentBlue',
    briefLabelClaude: 'accent',
    briefLabelYou: 'accent',
    chromeYellow: 'warning',
    claude: 'accent',
    claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'accent',
    claudeBlue_FOR_SYSTEM_SPINNER: 'accent',
    claudeShimmer: 'accent',
    clawd_background: 'surfaceElevated',
    clawd_body: 'text',
    composerSidebarBackground: 'surfaceBase',
    cyan_FOR_SUBAGENTS_ONLY: 'subagentCyan',
    diffAdded: 'diffAddedBg',
    diffAddedDimmed: 'diffAddedBg',
    diffAddedWord: 'success',
    diffRemoved: 'diffRemovedBg',
    diffRemovedDimmed: 'diffRemovedBg',
    diffRemovedWord: 'error',
    effortUltra: 'warning',
    error: 'error',
    fastMode: 'warning',
    fastModeShimmer: 'warning',
    green_FOR_SUBAGENTS_ONLY: 'subagentGreen',
    ide: 'accent',
    inactive: 'muted',
    inactiveShimmer: 'muted',
    inverseText: 'surfaceDeep',
    memoryBackgroundColor: 'surfaceBase',
    merged: 'success',
    orange_FOR_SUBAGENTS_ONLY: 'subagentOrange',
    permission: 'accent',
    permissionShimmer: 'accent',
    pink_FOR_SUBAGENTS_ONLY: 'subagentPink',
    planMode: 'muted',
    professionalBlue: 'accent',
    promptBorder: 'border',
    promptBorderShimmer: 'border',
    purple_FOR_SUBAGENTS_ONLY: 'subagentPurple',
    rainbow_blue: 'rainbowBlue',
    rainbow_blue_shimmer: 'rainbowBlue',
    rainbow_green: 'greenBase',
    rainbow_green_shimmer: 'greenBase',
    rainbow_indigo: 'rainbowIndigo',
    rainbow_indigo_shimmer: 'rainbowIndigo',
    rainbow_orange: 'orangeBase',
    rainbow_orange_shimmer: 'orangeBase',
    rainbow_red: 'redBase',
    rainbow_red_shimmer: 'redBase',
    rainbow_violet: 'rainbowViolet',
    rainbow_violet_shimmer: 'rainbowViolet',
    rainbow_yellow: 'yellowBase',
    rainbow_yellow_shimmer: 'yellowBase',
    rate_limit_empty: 'dim',
    rate_limit_fill: 'warning',
    red_FOR_SUBAGENTS_ONLY: 'subagentRed',
    remember: 'muted',
    selectionBg: 'accentSelection',
    skill: 'success',
    subtle: 'dim',
    success: 'success',
    suggestion: 'accent',
    text: 'text',
    userMessageBackground: 'surfaceElevated',
    userMessageBackgroundHover: 'hoverSurface',
    warning: 'warning',
    warningShimmer: 'warning',
    yellow_FOR_SUBAGENTS_ONLY: 'subagentYellow',
  },

  // ---- OpenCode: 50 tokens, flat map under `theme`, every value #RRGGBB --------
  opencode: {
    accent: 'accent',
    // The template's "none" is not a colour, it is terminal transparency, and it is only
    // correct for a variant that is TRANSPARENT about wanting it. A solid variant means the
    // caller asked for opaque, so the base surface is the answer; forcing a hex where the
    // caller wanted pass-through would silently opt them out of their own terminal, and
    // leaving "none" on a solid variant would advertise transparency they did not ask for.
    // The two variants therefore differ on this key and nowhere else.
    background: 'passThrough:surfaceBase',
    backgroundElement: 'surfaceElevated',
    backgroundPanel: 'surfaceBase',
    border: 'border',
    borderActive: 'accentBright',
    borderSubtle: 'borderSubtle',
    diffAdded: 'success',
    diffAddedBg: 'diffAddedBg',
    diffAddedLineNumberBg: 'diffAddedBg',
    diffContext: 'dim',
    diffContextBg: 'surfaceBase',
    diffHighlightAdded: 'success',
    diffHighlightRemoved: 'error',
    diffHunkHeader: 'muted',
    diffLineNumber: 'dim',
    diffRemoved: 'error',
    diffRemovedBg: 'diffRemovedBg',
    diffRemovedLineNumberBg: 'diffRemovedBg',
    error: 'error',
    info: 'info',
    markdownBlockQuote: 'dim',
    markdownCode: 'code',
    markdownCodeBlock: 'text',
    markdownEmph: 'muted',
    markdownHeading: 'heading',
    markdownHorizontalRule: 'borderSubtle',
    markdownImage: 'accent',
    markdownImageText: 'accent',
    markdownLink: 'accent',
    markdownLinkText: 'accent',
    markdownListEnumeration: 'muted',
    markdownListItem: 'accent',
    markdownStrong: 'accentBright',
    markdownText: 'text',
    primary: 'accent',
    secondary: 'muted',
    success: 'success',
    syntaxComment: 'dim',
    syntaxFunction: 'syntaxFunction',
    syntaxKeyword: 'syntaxKeyword',
    syntaxNumber: 'syntaxNumber',
    syntaxOperator: 'syntaxOperator',
    syntaxPunctuation: 'syntaxPunctuation',
    syntaxString: 'syntaxString',
    syntaxType: 'syntaxType',
    syntaxVariable: 'text',
    text: 'text',
    textMuted: 'muted',
    warning: 'warning',
  },

  // ---- Pi: 26 vars in hex; `colors` indirections and `export` are structural ----
  // Pi's var vocabulary bundles several roles into one var, so the value follows the
  // STRUCTURAL role of the var's heaviest consumer, not the var's own name:
  //   champagne -> syntaxType  (type/toolTitle/bash all read as one warm light)
  //   peach     -> syntaxNumber (D4 assigns cyanDim, the var name is the template's)
  //   mint      -> success     (D4 success green; syntaxString is the same green family)
  //   deepPink  -> searchBackground (D1 flattens it; it served searchMatchBg + mdQuoteBorder)
  //   pearl     -> greyLight, softRose -> pinkLight
  // `colors` keeps the template's indirection graph verbatim: every value still NAMES a
  // vars key, so no literal colour can leak into it.
  //
  // The four surface/tool fixes of T7, all of which the structural validator could not see:
  //   bg/bgPanel were the same colour, so the first rung of D2's ladder did not exist and
  //     bgDeep was consumed nowhere. bgPanel now takes the deep surface: #24212e canvas
  //     over #211e2b panel over #2e2a3a element, luma 35.38 / 32.38 / 45.02.
  //   bgSubtle mirrored bgElement. Upstream sets bgSubtle == bgPanel, so it now takes the
  //     same value AS bgPanel — the relationship, not the equality, is what's faithful.
  //     Pi has 4 surface slots and Funky has 3 background tokens, so one tier is borrowed.
  //     This is the single declared surface exception, and the validator holds it to
  //     bgPanel rather than waving the whole agent through.
  //   infoBg equalled bg, so the info surface had no identity. It is now the D1 composite
  //     of cyanDim over the panel — see DERIVED_ALPHAS.infoSurface.
  //   toolPendingBg was accentFaint (luma 54.9) over toolSuccessBg at bgElevated (45.02):
  //     a pending state rendering brighter than a success state, which is backwards.
  //     Upstream puts pending at the plain panel level, so it now takes bgPanel.
  pi: {
    vars: {
      bg: 'surfaceBase',
      bgPanel: 'surfaceDeep',
      bgElement: 'surfaceElevated',
      bgSubtle: 'surfaceDeep',
      border: 'border',
      borderSubtle: 'borderSubtle',
      text: 'text',
      muted: 'muted',
      dim: 'dim',
      accent: 'accent',
      deepPink: 'searchBackground',
      activePink: 'accentBright',
      champagne: 'syntaxType',
      pearl: 'pearl',
      softRose: 'soft',
      powderBlue: 'syntaxFunction',
      mint: 'success',
      peach: 'syntaxNumber',
      sky: 'syntaxOperator',
      warning: 'warning',
      error: 'error',
      selection: 'accentSelection',
      toolPendingBg: 'surfaceDeep',
      toolSuccessBg: 'surfaceElevated',
      toolErrorBg: 'diffRemovedBg',
      infoBg: 'infoSurface',
    },
  },
};

// ---- D6: role decoupling, the one deliberate deviation from the template's graph ----
// The `colors` graph is the template's indirection structure, and the keyset stays at 26 vars
// / 55 indirections / 3 export. What changes is ONE edge, because Pi bundles 6 roles onto
// `champagne` and OpenCode has 4 separate tokens for the same roles.
//
//   champagne -> customMessageLabel, toolTitle, mdHeading, mdCode, syntaxType, bashMode
//
// D4 gives OpenCode `markdownHeading` = pinkVibrant #ff8ddb. Pi routes mdHeading through
// champagne, which follows its STRUCTURAL role (syntaxType -> syntaxType #fff9b7). So the
// heading renders yellow while OpenCode renders it pink, and the fix the writer first
// proposed -- retyping the whole 55-entry indirection table -- is unnecessary: `colors` is
// already the indirection map, so re-pointing one slot is a one-line change.
//
// `softRose` holds pinkLight #ffa8e6, the only pink-family value in Pi's fixed 26-var keyset
// (deepPink is a dark grey-violet, activePink a light periwinkle). Exact hex parity with
// #ff8ddb is IMPOSSIBLE without adding a var the template does not have, so this closes the
// family error (yellow vs pink) while knowingly leaving a tone difference. The validator
// asserts direction of improvement, not hex equality.
const PI_COLOR_OVERRIDES = {
  colors: { mdHeading: 'softRose' },
};

// `slug` is the filename WITHOUT extension, and it is also what Claude Code's `name` and Pi's
// internal `name` receive. Upstream `~/.pi/agent/themes/Gentleman.json` carries the internal
// name `Gentleman`, i.e. filename and name agree, so aligning them here means the prototype
// resolves under BOTH plausible strategies (settings matching the filename, or matching the
// `name` field). The `-prototype` suffix is deliberate: these files land in real agent config
// directories, and a name that is obviously provisional makes cleanup a single glob and keeps
// them from being mistaken for a theme we intend to ship.
//
// The variant record carries TWO orthogonal axes because they are independent decisions:
//   tier    — dark | darker, which STEP of the darkening chain this file paints. Everything that
//             used to compare a variant id against the string 'darker' now goes through
//             TIER_STEP, so a future opacity value can never be mistaken for a tier (and vice
//             versa), and no variant can name a step directly.
//   opacity — solid | transparent, whether OpenCode's `background` passes the terminal
//             through. Only opencode lists transparent variants: `"none"` is a real token
//             there and nowhere else.
// `agents` is the per-agent membership, so a variant that must not exist for an agent is
// never emitted for it rather than emitted and then guarded downstream.
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

// ---------------------------------------------------------------------------
// 5. Resolution: anchor name -> #RRGGBB for a given variant
// ---------------------------------------------------------------------------

/**
 * build.js's prefix rewrite, walked along the chain until it reaches `step`.
 *
 * Walks LINKS rather than looking a hex up in a per-step table, because a walk is what makes a
 * declared value a LINK and not a magic constant: an absent link leaves the hex alone, which is
 * exactly the honest behaviour for a chain extended only where a decision was made.
 *
 * `step` is a chain step, never a variant id: a transparent variant is a `dark` or `darker`
 * variant with a different opinion about one key, and keying the maths off an id would make
 * every transparent variant silently resolve as `dark`.
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

/**
 * build.js's syntax attenuation, keyed by TIER rather than by step. See DARKER_SYNTAX for why this
 * one stayed behind: it predates D7, it is imperceptible, and moving it is a hue change.
 */
const substituteSyntax = (hex, tier, table) => {
  const out = hex.toLowerCase();
  if (tier !== 'darker') return out;
  for (const [base, adjusted] of table) {
    if (out.startsWith(base)) return adjusted + out.slice(base.length);
  }
  return out;
};

/** A flat palette token, walked down the chain to the step its tier paints. */
const resolveFlat = (token, tier) => {
  const hex = PALETTE[token];
  if (!hex) throw new Error(`unknown palette token: ${token}`);
  return substituteSyntax(substitute(hex, TIER_STEP[tier], CHAIN_LINKS), tier, DARKER_SYNTAX);
};

const surfaceFor = (role, tier) => {
  const token = SURFACE_TOKENS[role];
  if (!token) throw new Error(`unknown surface role: ${role}`);
  return resolveFlat(token, tier);
};

/** Flatten one 8-digit value against the surface it sits on, recomputed at the tier's own step. */
const flatten = (value8, role, tier) => {
  const fg = substitute(value8.slice(0, 7), TIER_STEP[tier], CHAIN_LINKS);
  const alpha = value8.slice(7, 9);
  return composite(fg, alpha, surfaceFor(role, tier));
};

const PASS_THROUGH = Symbol('passThrough');
const PASS_THROUGH_PREFIX = 'passThrough';

/** Every name `resolve` accepts as a concrete colour target, so a typo cannot pass silently. */
function isKnownAnchor(anchor) {
  return anchor in ANCHORS
    || anchor in PALETTE
    || anchor in ALPHA_TOKENS
    || anchor in DERIVED_ALPHAS;
}

/**
 * Resolve one mapping value for one variant.
 *
 * Takes the whole variant record, not the id: the tier decides the colour maths and the
 * opacity decides pass-through, and neither is derivable from the other. Returning
 * PASS_THROUGH leaves the choice of literal to the emitter, which owns the template.
 */
function resolve(anchor, variant) {
  const { tier, opacity } = variant;

  if (anchor === PASS_THROUGH_PREFIX) return PASS_THROUGH;

  if (typeof anchor === 'string' && anchor.startsWith(`${PASS_THROUGH_PREFIX}:`)) {
    const solidAnchor = anchor.slice(PASS_THROUGH_PREFIX.length + 1);
    if (!isKnownAnchor(solidAnchor)) {
      throw new Error(`unknown mapping target: ${anchor} (no such anchor "${solidAnchor}")`);
    }
    // Transparent means the caller wants the terminal to show through, so the solid half is
    // validated and then discarded. Solid means the opposite, and the same row resolves.
    return opacity === 'transparent' ? PASS_THROUGH : resolve(solidAnchor, variant);
  }

  if (anchor in ALPHA_TOKENS) {
    const spec = ALPHA_TOKENS[anchor];
    return flatten(alphaValueFor(spec, TIER_STEP[tier]), spec.surface, tier);
  }

  if (anchor in DERIVED_ALPHAS) {
    const spec = DERIVED_ALPHAS[anchor];
    // A `darkerValue` here is TIER-driven and unchanged by D7. An alpha with no `darkerValue` keeps
    // its own value and only the surface it composites against moves — see DERIVED_ALPHAS.
    // Fall back, don't guess.
    const value = tier === 'darker' && spec.darkerValue ? spec.darkerValue : spec.value;
    return flatten(value, spec.surface, tier);
  }

  if (anchor in ANCHORS) return resolveFlat(ANCHORS[anchor], tier);
  if (anchor in PALETTE) return resolveFlat(anchor, tier);

  throw new Error(`unknown mapping target: ${anchor}`);
}

// ---------------------------------------------------------------------------
// 6. Emitters
// ---------------------------------------------------------------------------

const toRgb = (hex) => {
  const n = (i) => parseInt(hex.slice(i, i + 2), 16);
  return `rgb(${n(1)},${n(3)},${n(5)})`;
};

/** Assert a mapping section and a template section describe the same slots. */
function assertSameSlots(label, templateKeys, mapping, direction) {
  const t = new Set(templateKeys);
  const m = new Set(Object.keys(mapping));
  if (direction === 'template-first') {
    for (const key of t) if (!m.has(key)) throw new Error(`${label}: template slot "${key}" has no mapping`);
    for (const key of m) if (!t.has(key)) throw new Error(`${label}: mapping slot "${key}" is not in the template`);
  }
  return t.size;
}

function emitClaudeCode(template, variant) {
  const keys = Object.keys(template.overrides);
  assertSameSlots('claude-code/overrides', keys, MAPPING['claude-code'], 'template-first');

  const overrides = {};
  for (const slot of keys) {
    const value = resolve(MAPPING['claude-code'][slot], variant);
    if (value === PASS_THROUGH) throw new Error(`claude-code/${slot}: rgb() output cannot pass through`);
    overrides[slot] = toRgb(value);
  }
  return { name: variant.slug, base: 'dark', overrides };
}

function emitOpenCode(template, variant) {
  const keys = Object.keys(template.theme);
  assertSameSlots('opencode/theme', keys, MAPPING.opencode, 'template-first');

  const theme = {};
  for (const slot of keys) {
    const value = resolve(MAPPING.opencode[slot], variant);
    theme[slot] = value === PASS_THROUGH ? template.theme[slot] : value;
  }
  return { $schema: template.$schema, theme };
}

function emitPi(template, variant) {
  assertSameSlots('pi/vars', Object.keys(template.vars), MAPPING.pi.vars, 'template-first');

  const vars = {};
  for (const name of Object.keys(template.vars)) {
    vars[name] = resolve(MAPPING.pi.vars[name], variant);
  }

  // `colors` and `export` carry no colours: they are the template's indirection graph,
  // asserted here to be names that resolve to a vars key. A literal colour cannot survive.
  // D6 re-points the slots named in PI_COLOR_OVERRIDES; nothing else in the graph moves.
  const indirection = (label, section) => {
    const overrides = PI_COLOR_OVERRIDES[section] || {};
    for (const slot of Object.keys(overrides)) {
      if (!Object.prototype.hasOwnProperty.call(template[section], slot)) {
        throw new Error(`pi/${label}: override "${slot}" is not a template slot`);
      }
    }
    const out = {};
    for (const slot of Object.keys(template[section])) {
      const target = Object.prototype.hasOwnProperty.call(overrides, slot)
        ? overrides[slot]
        : template[section][slot];
      if (!(target in vars)) throw new Error(`pi/${section}/${slot}: "${target}" is not a vars key`);
      out[slot] = target;
    }
    return out;
  };

  return {
    $schema: template.$schema,
    name: variant.slug,
    vars,
    colors: indirection('pi/colors', 'colors'),
    export: indirection('pi/export', 'export'),
  };
}

// ---------------------------------------------------------------------------
// 7. Source-of-truth assertion — the transcription above must match the real files
// ---------------------------------------------------------------------------

const SOURCE_THEME_CONFIG = join(ROOT, 'material-trabajo', 'vscode-themes', 'theme-config.js');
const SOURCE_BUILD = join(ROOT, 'material-trabajo', 'vscode-themes', 'build.js');

function assertPaletteMatchesSource() {
  // latin1: the file carries non-UTF8 comment bytes; the hex values are ASCII either way.
  const text = readFileSync(SOURCE_THEME_CONFIG, 'latin1');
  const start = text.indexOf('const palette = {');
  if (start < 0) throw new Error('palette block not found in theme-config.js');
  const end = text.indexOf('\n};', start);
  if (end < 0) throw new Error('palette block is not terminated in theme-config.js');

  const found = {};
  for (const line of text.slice(start, end).split(/\r?\n/)) {
    const m = /^\s{2}([A-Za-z][A-Za-z0-9]*):\s*"(#[0-9a-fA-F]{6,8})"/.exec(line);
    if (m) found[m[1]] = m[2].toLowerCase();
  }

  const mine = Object.keys(PALETTE).sort();
  const theirs = Object.keys(found).sort();
  if (mine.join() !== theirs.join()) {
    const missing = theirs.filter((k) => !(k in PALETTE));
    const extra = mine.filter((k) => !(k in found));
    throw new Error(`palette token set drift — missing: [${missing}] extra: [${extra}]`);
  }
  for (const token of mine) {
    if (found[token] !== PALETTE[token]) {
      throw new Error(`palette drift on ${token}: script ${PALETTE[token]} vs source ${found[token]}`);
    }
  }
  return mine.length;
}

/**
 * Ground the chain in the upstream sources, and ground its ROOT in the palette.
 *
 * Two different kinds of assertion, deliberately not merged:
 *
 *  1. Step 0 IS the palette. If `bgBase` changes upstream, the chain root moves with it instead of
 *     leaving a stale `#24212e` sitting in SURFACE_STEPS pretending to be a reference.
 *  2. Link 0->1 IS build.js. Keys live in theme-config.js (build.js reaches them through computed
 *     properties), values live in build.js. The build fails on drift instead of shipping a
 *     transcription that no longer describes its source.
 *
 * Link 1->2 is asserted the other way round — by INTERNAL consistency, in `assertChainIntegrity`.
 * There is nothing upstream to compare it to; pretending otherwise would be a fake assertion.
 */
function assertChainGround() {
  const build = readFileSync(SOURCE_BUILD, 'latin1');
  const theme = readFileSync(SOURCE_THEME_CONFIG, 'latin1');

  // 1. The chain root is the palette, not a second copy of it.
  const root = SURFACE_STEPS.find((s) => s.step === 0);
  for (const [role, token] of Object.entries(SURFACE_TOKENS)) {
    if (root.surfaces[role] !== PALETTE[token]) {
      throw new Error(`chain step 0 ${role} is ${root.surfaces[role]}, but palette.${token} is ` +
        `${PALETTE[token]} — the chain must start at the palette`);
    }
  }

  // 2. Link 0->1 matches the upstream files.
  const first = CHAIN_LINKS.find((l) => l.from === 0);
  if (!first || first.to !== 1) throw new Error('the chain has no 0->1 link');
  const keys = first.entries.map(([base]) => base);
  const values = first.entries.map(([, value]) => value);

  const probes = [
    [theme, keys, 'theme-config.js darkerBackgrounds keys'],
    [build, values, 'build.js darkerBackgrounds values'],
    [build, ['#8c8eff18', '#ff000018', '#8c8eff28', '#ff000028', '#8c8eff30'], 'build.js lowered alphas'],
    [theme, ['#8c8eff25', '#ff000025', '#8c8eff40', '#ff000040'], 'theme-config.js diff alphas'],
  ];
  for (const [text, wanted, label] of probes) {
    for (const value of wanted) {
      if (!text.includes(value)) throw new Error(`${label}: ${value} not found in source`);
    }
  }
  return {
    link01: first.entries.length,
    paletteKeys: CHAIN_LINKS.flatMap((l) => l.entries.map(([base]) => base))
      .filter((base) => PALETTE_MATCHES.has(base)).length,
    declared: CHAIN_LINKS.filter((l) => l.from > 0).flatMap((l) => l.entries).length,
  };
}

/**
 * The chain must be CONNECTED, and each link must agree with the ladder it claims to implement.
 *
 * This is the assertion that stops D7's declared half from rotting into unreferenced constants:
 * every surface in SURFACE_STEPS must be the value the chain actually produces at that step, for
 * every scaffold token. So a link that is dropped, renamed or re-pointed at a value the ladder does
 * not declare fails the build here — and so does a SURFACE_STEPS row that no link produces.
 */
function assertChainIntegrity() {
  for (const step of SURFACE_STEPS) {
    for (const [role, token] of Object.entries(SURFACE_TOKENS)) {
      const walked = substitute(PALETTE[token], step.step, CHAIN_LINKS);
      if (walked !== step.surfaces[role]) {
        throw new Error(`chain is inconsistent at step ${step.step}, ${role}: walking ` +
          `palette.${token} (${PALETTE[token]}) gives ${walked}, but SURFACE_STEPS declares ` +
          `${step.surfaces[role]}`);
      }
    }
  }
  // The 1->2 link must be exactly the three surfaces: a link carrying anything else would be
  // inventing a value the user did not decide, which is the one thing D7 rules out.
  const declared = CHAIN_LINKS.filter((l) => l.from === 1);
  if (declared.length !== 1 || declared[0].to !== 2) {
    throw new Error('the chain must declare exactly one 1->2 link');
  }
  const surfacesAt1 = Object.values(SURFACE_STEPS.find((s) => s.step === 1).surfaces);
  const linkFroms = declared[0].entries.map(([from]) => from).sort();
  if (linkFroms.join() !== [...surfacesAt1].sort().join()) {
    throw new Error(`the 1->2 link must start from the three step-1 surfaces ` +
      `[${surfacesAt1}] but starts from [${linkFroms}]`);
  }
}

/**
 * D2's ladder, printed for every STEP, with the monotonicity D7 depends on asserted rather than
 * assumed: step 0 > step 1 > step 2 on all three rungs, and step 2 is genuinely near-black.
 *
 * "Genuinely near-black" is a number, not an adjective: 12 on the same Rec. 601 scale that puts
 * step 0's base at 35.38. Step 2's base measures 10.10, so the deepest shipped canvas sits well
 * inside it rather than just under step 1.
 *
 * Three DISTINCT rungs per step is asserted first, because a mapping edit — including a
 * deliberately injected one — has to reach validate-prototypes.mjs and be judged there, rather than
 * being masked by a build that refuses to emit.
 */
const NEAR_BLACK_MAX_LUMA = 12;

function assertSurfaceLadder() {
  const order = ['base', 'deep', 'elevated'];

  for (const step of SURFACE_STEPS) {
    const seen = new Map();
    const rungs = order.map((role) => {
      const hex = step.surfaces[role];
      if (seen.has(hex)) {
        throw new Error(`surface ladder step ${step.step}: ${role} and ${seen.get(hex)} both resolve to ${hex}`);
      }
      seen.set(hex, role);
      return `${role} ${hex} luma ${luma(hex).toFixed(2)}`;
    });
    console.log(`  step ${step.step} (${step.role}${step.shippedAs ? ` -> shipped as "${step.shippedAs}"` : ''}): ` +
      `${rungs.join('  /  ')}  [${step.note}]`);
  }

  for (const role of order) {
    const lumas = SURFACE_STEPS.map((s) => luma(s.surfaces[role]));
    for (let i = 1; i < lumas.length; i += 1) {
      if (!(lumas[i] < lumas[i - 1])) {
        throw new Error(`surface ladder ${role} is not strictly descending: ` +
          SURFACE_STEPS.map((s, j) => `step ${s.step} ${luma(s.surfaces[role])}`).join(' >= '));
      }
    }
  }

  const deepest = SURFACE_STEPS[SURFACE_STEPS.length - 1];
  const baseLuma = luma(deepest.surfaces.base);
  if (!(baseLuma < NEAR_BLACK_MAX_LUMA)) {
    throw new Error(`step ${deepest.step} base ${deepest.surfaces.base} measures luma ${baseLuma}, ` +
      `which is not below ${NEAR_BLACK_MAX_LUMA} — the darkest shipped canvas is not near-black`);
  }
  return { baseLuma, maxLuma: NEAR_BLACK_MAX_LUMA };
}

const paletteTokens = assertPaletteMatchesSource();
const chainGround = assertChainGround();
assertChainIntegrity();
const ladderReport = assertSurfaceLadder();

// ---------------------------------------------------------------------------
// 8. Emit
// ---------------------------------------------------------------------------

// D8: STRUCTURAL STUBS, derived from the real Gentleman-Cute templates and committed here.
//
// The stubs carry every key, every nesting level and every non-colour string of the templates
// they came from, with every colour literal replaced by a sentinel. That is not an approximation:
// both emitters read a template for its SLOT VOCABULARY and nothing else, so the vocabulary is
// the whole of what a template contributes. Proven, not asserted — with these two files in place
// all 8 emitted files are byte-for-byte identical to the ones the real templates produced
// (SOURCES.md, "D8", carries the proof).
//
// They exist because the templates they replace were somebody else's work that we were not going
// to vendor. A stub is ours: same shape, no borrowed colour, and no dependency on a file that is
// leaving the repo.
//
// The sentinels keep each agent's own colour syntax (`rgb(0,0,0)` for Claude Code, `#000000` for
// OpenCode) rather than flattening both to one hex, because a stub that showed hex where Claude
// Code uses `rgb(r,g,b)` would be a false claim about the format. OpenCode's `background: "none"`
// is NOT a colour and survives verbatim: it is the terminal pass-through token the transparent
// variants emit unchanged.
const TEMPLATES = {
  'claude-code': join(HERE, 'templates', 'claude-code.json'),
  opencode: join(HERE, 'templates', 'opencode.json'),
  // D5, unchanged: the maintained gentle-pi 3.7.0 copy, still read from OUTSIDE the repo because
  // it genuinely is the upstream. material-trabajo/pi/Gentleman-Cute.json is a stale earlier
  // generation (panel, element, success, heading, addBg, removeBg) and D8 did not touch it.
  pi: join(homedir(), '.pi', 'agent', 'npm', 'node_modules', 'gentle-pi', 'themes', 'Gentleman-Cute.json'),
};

const EMITTERS = {
  'claude-code': emitClaudeCode,
  opencode: emitOpenCode,
  pi: emitPi,
};

let written = 0;
for (const [agent, templatePath] of Object.entries(TEMPLATES)) {
  // Strip a leading BOM: a stub is a committed JSON file that a Windows editor may well save with
  // one, and JSON.parse then dies with a bare SyntaxError that names neither the file nor the
  // cause. The templates upstream of these did not need it; the stubs do.
  const template = JSON.parse(readFileSync(templatePath, 'utf8').replace(/^\uFEFF/, ''));
  for (const variant of VARIANTS) {
    // Per-agent membership, decided by the variant record: a transparent file is never
    // emitted for an agent that has no `"none"` token, so the constraint is a missing
    // emit rather than a value that has to be caught after the fact.
    if (!variant.agents.includes(agent)) continue;
    const payload = EMITTERS[agent](template, variant);
    const target = join(OUT, agent, `${variant.slug}.json`);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    written += 1;
    const step = SURFACE_STEPS.find((s) => s.shippedAs === variant.tier);
    console.log(`wrote ${agent}/${variant.slug}.json  (tier ${variant.tier} = step ${step.step}, ` +
      `base ${step.surfaces.base}, ${variant.opacity})`);
  }
}

const stepSummary = SURFACE_STEPS
  .map((s) => `step ${s.step} ${s.shippedAs ? `"${s.shippedAs}"` : 'reference'}: ` +
    `${['base', 'deep', 'elevated'].map((r) => `${r} ${s.surfaces[r]}`).join(' / ')}`)
  .join('  |  ');

console.log(`\n${written} files written from ${paletteTokens} palette tokens, ` +
  `${Object.keys(ALPHA_TOKENS).length} flattened alphas, 1 mapping table.`);
console.log(`chain: ${CHAIN_LINKS.length} links, ${chainGround.link01} entries transcribed from build.js at 0->1 ` +
  `(${chainGround.paletteKeys} of them palette keys), ${chainGround.declared} entries declared at 1->2.`);
console.log(`ladder: ${stepSummary}`);
console.log(`step ${SURFACE_STEPS.length - 1} base luma ${ladderReport.baseLuma} ` +
  `(near-black means < ${ladderReport.maxLuma})`);
