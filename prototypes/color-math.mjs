/**
 * Colour math shared by build-prototypes.mjs and validate-prototypes.mjs.
 *
 * Only pure FUNCTIONS live here. The palette, the darker maps and the alpha tables stay
 * transcribed independently in each script on purpose: the validator has to be able to
 * disagree with the builder, or it cannot catch it. A shared formula cannot hide a data
 * error; a shared table can.
 *
 * Plain Node ESM, zero dependencies.
 */

/**
 * `#RRGGBB` or `rgb(r,g,b)` -> lowercase `#rrggbb`. Anything else -> lowercased verbatim,
 * so a pass-through like "none" survives the trip instead of becoming a bogus colour.
 */
export function toHex(value) {
  if (typeof value !== 'string') return String(value).toLowerCase();
  if (value.startsWith('#')) return value.toLowerCase();
  const m = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(value);
  if (!m) return value.toLowerCase();
  return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Rec. 601 luma over the raw 0-255 channels: 0.299R + 0.587G + 0.114B, to 2 decimals.
 *
 * Deliberately NOT WCAG relative luminance. WCAG linearises the channels first, and that
 * crushes the dark end so hard that #211e2b measures 3.6 while #2e2a3a measures 7.6 —
 * every near-black surface in this palette becomes indistinguishable, which is precisely
 * the judgement these checks exist to make. The confirmed figures are Rec. 601:
 * #211e2b -> 32.38, #24212e -> 35.38, #2e2a3a -> 45.02, #4e4b59 -> 77.49,
 * #625e74 -> 97.70, #606685 -> 103.74, #8b8f9e -> 143.51.
 *
 * Accepts hex or `rgb(r,g,b)`, because the emitted files use both syntaxes.
 */
export function luma(value) {
  const hex = toHex(value);
  if (!/^#[0-9a-f]{6}$/.test(hex)) {
    throw new Error(`luma() needs a #RRGGBB or rgb(r,g,b) value, got "${value}"`);
  }
  const n = (i) => parseInt(hex.slice(i, i + 2), 16);
  return Math.round((0.299 * n(1) + 0.587 * n(3) + 0.114 * n(5)) * 100) / 100;
}

/**
 * Plain euclidean distance in RGB between two colours, to 2 decimals.
 *
 * Measures how close a colour sits to a reference, with no perceptual claim attached. Used
 * by `semantic-heading-family` to assert the DIRECTION of a decoupling: the Pi heading must be
 * strictly nearer the OpenCode heading than the colour it replaced was. Comparing distances
 * rather than hexes is what lets that check accept a deliberate tone difference while still
 * failing a change that made things worse.
 *
 * The two colours come from different agents' emitted files, so both go through toHex().
 */
export function rgbDistance(a, b) {
  const pa = toHex(a);
  const pb = toHex(b);
  for (const [value, hex] of [[a, pa], [b, pb]]) {
    if (!/^#[0-9a-f]{6}$/.test(hex)) {
      throw new Error(`rgbDistance() needs a #RRGGBB or rgb(r,g,b) value, got "${value}"`);
    }
  }
  const na = (i) => parseInt(pa.slice(i, i + 2), 16);
  const nb = (i) => parseInt(pb.slice(i, i + 2), 16);
  const d = Math.sqrt((na(1) - nb(1)) ** 2 + (na(3) - nb(3)) ** 2 + (na(5) - nb(5)) ** 2);
  return Math.round(d * 100) / 100;
}
