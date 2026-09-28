#!/usr/bin/env node
/**
 * check-upstream.mjs — read-only drift checker for the Gentleman theme sources.
 *
 * Reads sources.json from its own directory (so cwd does not matter), verifies every recorded
 * artifact and Pi upstream file by SHA-256, and reports drift.
 *
 * Strictly read-only: it never creates, modifies, or deletes any file, and never throws on a
 * missing path.
 *
 * Exit code: 0 when there are no failures, 1 when any failure. Warnings alone still exit 0.
 */

import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const MANIFEST = join(SELF_DIR, "sources.json");

/** Severity levels. */
const OK = "ok";
const WARN = "warn";
const FAIL = "fail";

const useColor = Boolean(process.stdout.isTTY);
const paint = (code, text) => (useColor ? `\u001b[${code}m${text}\u001b[0m` : text);
const c = {
  ok: (t) => paint("32", t),
  warn: (t) => paint("33", t),
  fail: (t) => paint("31", t),
  dim: (t) => paint("90", t),
  head: (t) => paint("1", t),
};

const counts = { ok: 0, warn: 0, fail: 0 };
const bump = (level) => {
  counts[level] += 1;
};

const fatal = (message) => {
  console.error(`${c.fail("error")}: ${message}`);
  process.exit(1);
};

/**
 * Resolve a path from the manifest.
 *
 * `~` expands to the user home. Relative paths resolve against THIS SCRIPT'S directory, never
 * against process.cwd(), so results are identical no matter where the checker is invoked from.
 * Absolute paths are used as-is. Separators are normalized to forward slashes.
 */
function resolvePath(p) {
  if (typeof p !== "string" || p === "") return null;
  let out;
  if (p.startsWith("~/")) out = join(homedir(), p.slice(2));
  else if (isAbsolute(p)) out = p;
  else out = join(SELF_DIR, p);
  return out.replace(/\\/g, "/");
}

/** SHA-256 of a file, or null when the file is missing or unreadable. Never throws. */
function hashFile(absPath) {
  try {
    const buf = readFileSync(absPath);
    return createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}

function readJson(absPath) {
  try {
    return JSON.parse(readFileSync(absPath, "utf8"));
  } catch {
    return null;
  }
}

/** Existence of a path, without following it destructively. Never throws. */
function pathExists(absPath) {
  try {
    statSync(absPath);
    return true;
  } catch {
    return false;
  }
}

const SHORT = 16;
const short = (hash) => (hash ? hash.slice(0, SHORT) : "-");

/**
 * Check one recorded file.
 *
 * mode "required": the file is expected to exist. Missing -> FAIL, different hash -> WARN.
 * mode "optional": the manifest says the file is not installed. Absent -> OK, present -> WARN.
 */
function checkFile({ label, path, expected, mode, shortLabel }) {
  const abs = resolvePath(path);
  if (abs === null) {
    bump(FAIL);
    console.log(`  ${pad(shortLabel, 22)} ${pad(label, 10)} ${c.fail("BAD PATH")} ${dim(path)}`);
    return;
  }

  const actual = hashFile(abs);

  if (actual === null) {
    if (mode === "optional") {
      bump(OK);
      console.log(`  ${pad(shortLabel ?? label, 22)} ${pad(label, 10)} ${c.ok(pad("absent", 22))} ${c.dim("as expected")}`);
    } else {
      bump(FAIL);
      console.log(`  ${pad(shortLabel ?? label, 22)} ${pad(label, 10)} ${c.fail(pad("MISSING", 22))} ${c.dim(abs)}`);
    }
    return;
  }

  if (mode === "optional") {
    bump(WARN);
    console.log(
      `  ${pad(shortLabel ?? label, 22)} ${pad(label, 10)} ${c.warn(pad("UNEXPECTED", 22))} ${c.dim("manifest says not installed, but file exists")}`,
    );
    return;
  }

  if (expected && actual !== expected) {
    bump(WARN);
    console.log(
      `  ${pad(shortLabel ?? label, 22)} ${pad(label, 10)} ${c.warn(pad("DRIFT", 22))} ${short(actual)} ${c.dim(`expected ${short(expected)}`)}`,
    );
    return;
  }

  bump(OK);
  console.log(`  ${pad(shortLabel ?? label, 22)} ${pad(label, 10)} ${c.ok(pad("ok", 22))} ${short(actual)}`);
}

function pad(text, width) {
  const s = String(text ?? "");
  return s.length >= width ? s : s + " ".repeat(width - s.length);
}

function dim(text) {
  return c.dim(text);
}

// ---------------------------------------------------------------- load manifest

const manifest = readJson(MANIFEST);
if (manifest === null) {
  let reason = "unreadable or not valid JSON";
  try {
    readFileSync(MANIFEST, "utf8");
  } catch (err) {
    reason = err.code === "ENOENT" ? "file not found" : `unreadable (${err.code ?? "unknown"})`;
  }
  fatal(`cannot load manifest ${MANIFEST}: ${reason}`);
  process.exit(1);
}

if (typeof manifest !== "object" || manifest === null || Array.isArray(manifest)) {
  fatal(`manifest ${MANIFEST} is malformed: expected a JSON object at the top level.`);
}

if (typeof manifest.agents !== "object" || manifest.agents === null || Array.isArray(manifest.agents)) {
  fatal(`manifest ${MANIFEST} is malformed: missing an "agents" object.`);
}

// ---------------------------------------------------------------- report

console.log(c.head("theme source drift check"));
console.log(c.dim(`manifest  ${MANIFEST}`));
console.log(c.dim(`updated   ${manifest.updated ?? "unknown / not verified"}`));
console.log(c.dim(`home      ${homedir()}`));
console.log("");

// ---------------------------------------------------------------- cross-section index

/**
 * The two facts this script must never let contradict each other, resolved ONCE, up front.
 *
 * A vendored base template is described in two places in the manifest, on purpose: its agent's
 * `artifacts` list carries the live-machine `installed` flag, and `excludedFromBuild` carries the
 * hash and the "kept on disk, never committed" classification. That is duplication, and duplication
 * rots — so the two are CROSS-CHECKED below rather than trusted.
 *
 * `EXCLUDED_REPO_PATHS` is the single source of truth for "is this repo path committed?". It is
 * derived from `excludedFromBuild` alone. An artifact entry never gets to declare itself
 * un-committable, because two flags describing one fact is how they end up disagreeing.
 */
const EXCLUDED = Array.isArray(manifest.excludedFromBuild) ? manifest.excludedFromBuild : [];

const EXCLUDED_REPO_PATHS = new Set(
  EXCLUDED.filter((e) => e && typeof e.path === "string").map((e) => e.path),
);

/** Every repo path tracked as an artifact, with the hash its agent claims, keyed by path. */
function artifactRepoIndex() {
  const out = new Map();
  for (const [agentName, agent] of Object.entries(manifest.agents ?? {})) {
    for (const artifact of Array.isArray(agent?.artifacts) ? agent.artifacts : []) {
      if (artifact && typeof artifact.repoPath === "string") {
        out.set(artifact.repoPath, {
          agentName,
          slug: artifact.slug ?? "unknown",
          installed: artifact.installed === true,
          sha256: typeof artifact.sha256 === "string" ? artifact.sha256.toLowerCase() : null,
        });
      }
    }
  }
  return out;
}

const ARTIFACT_REPO_INDEX = artifactRepoIndex();
const ARTIFACT_REPO_PATHS = new Set(ARTIFACT_REPO_INDEX.keys());

const agentNames = Object.keys(manifest.agents);

for (const agentName of agentNames) {
  const agent = manifest.agents[agentName];

  if (typeof agent !== "object" || agent === null) {
    bump(FAIL);
    console.log(c.head(agentName));
    console.log(`  ${c.fail("BAD AGENT RECORD")} ${c.dim("expected an object")}`);
    console.log("");
    continue;
  }

  const runtime = agent.runtime ?? "unknown";
  const version = agent.version ? ` ${agent.version}` : "";
  console.log(c.head(`${agentName}  ${runtime}${version}`));

  // upstream
  const up = agent.upstream;
  if (up && up.kind === "none") {
    console.log(`  ${pad("upstream", 22)} ${pad("none", 10)} ${c.dim(up.note ?? "")}`);
  } else if (up && up.kind === "npm") {
    const volatileTag = up.volatile ? c.warn(" VOLATILE") : "";
    console.log(
      `  ${pad("upstream", 22)} ${pad("npm", 10)} ${up.package ?? "?"}@${up.version ?? "?"}${volatileTag}`,
    );
    if (up.repo) console.log(`  ${pad("", 22)} ${pad("", 10)} ${c.dim(up.repo)}`);

    const onDisk = up.packageJson ? readJson(resolvePath(up.packageJson)) : null;
    const diskVersion = onDisk && typeof onDisk.version === "string" ? onDisk.version : null;
    if (up.packageJson && diskVersion === null) {
      bump(FAIL);
      console.log(`  ${pad("", 22)} ${pad("", 10)} ${c.fail("package.json missing or unreadable")} ${c.dim(up.packageJson)}`);
    } else if (diskVersion !== null && diskVersion !== up.version) {
      bump(WARN);
      console.log(
        `  ${pad("", 22)} ${pad("", 10)} ${c.warn(`VERSION DRIFT: on disk ${diskVersion}, manifest ${up.version}`)}`,
      );
    } else if (diskVersion !== null) {
      bump(OK);
      console.log(`  ${pad("", 22)} ${pad("", 10)} ${c.ok(`version on disk ${diskVersion} matches`)}`);
    }

    const upDir = resolvePath(up.path);
    const upFiles = Array.isArray(up.upstreamFiles) ? up.upstreamFiles : agent.upstreamFiles;
    for (const file of upFiles ?? []) {
      if (!file || typeof file.name !== "string") continue;
      checkFile({
        label: "upstream",
        shortLabel: file.name,
        path: upDir ? `${upDir}/${file.name}` : file.name,
        expected: typeof file.sha256 === "string" ? file.sha256.toLowerCase() : null,
        mode: "required",
      });
    }
  } else {
    console.log(`  ${pad("upstream", 22)} ${pad("-", 10)} ${c.dim("unknown / not verified")}`);
  }

  // install dir
  if (typeof agent.installDir === "string") {
    const abs = resolvePath(agent.installDir);
    const present = pathExists(abs);
    if (agent.installDirExists === true) {
      if (present) {
        bump(OK);
        console.log(`  ${pad("installdir", 22)} ${pad("", 10)} ${c.ok("present")} ${c.dim(abs)}`);
      } else {
        bump(FAIL);
        console.log(`  ${pad("installdir", 22)} ${pad("", 10)} ${c.fail("MISSING")} ${c.dim(`${abs} (manifest says it exists)`)}`);
      }
    } else if (agent.installDirExists === false) {
      if (present) {
        bump(WARN);
        console.log(`  ${pad("installdir", 22)} ${pad("", 10)} ${c.warn("present")} ${c.dim(`${abs} (manifest says absent)`)}`);
      } else {
        bump(OK);
        console.log(`  ${pad("installdir", 22)} ${pad("", 10)} ${c.ok("absent")} ${c.dim(abs)}`);
      }
    }
  }

  // requested theme
  if (agent.requestedTheme) {
    console.log(
      `  ${pad("requested", 22)} ${pad("", 10)} ${agent.requestedTheme}` +
        (agent.configPath ? c.dim(`  via ${agent.configPath}`) : ""),
    );
  }

  // artifacts
  const artifacts = Array.isArray(agent.artifacts) ? agent.artifacts : [];
  if (artifacts.length === 0) {
    console.log(`  ${c.warn("no artifacts recorded")}`);
  }
  for (const artifact of artifacts) {
    if (!artifact || typeof artifact !== "object") {
      bump(FAIL);
      console.log(`  ${c.fail("BAD ARTIFACT RECORD")}`);
      continue;
    }
    const slug = artifact.slug ?? "unknown";
    const expected = typeof artifact.sha256 === "string" ? artifact.sha256.toLowerCase() : null;

    // The repo copy and the installed copy are INDEPENDENT facts, and this is where that is
    // enforced rather than asserted in prose.
    //
    // A vendored base template lives in both sections: `excludedFromBuild` says it is kept on
    // disk, hash-pinned and never committed, so its absence in a clone is expected. Calling
    // `checkFile` with mode "required" here would report MISSING for exactly the file whose
    // absence is legal — and worse, it would sit two lines above an `installed: true` row that
    // is perfectly healthy, so the report would read as "this theme is broken" when the truth is
    // "this clone did not vendor a reference file". The row below is a pointer instead, and the
    // full evidence report lives once, in the excluded-from-build section.
    //
    // `installed` is read from installPath and NEVER from repoPath, which is what makes an absent
    // vendored file unable to contradict a true installed flag. Do not "simplify" this by
    // deriving one from the other.
    if (EXCLUDED_REPO_PATHS.has(artifact.repoPath)) {
      bump(OK);
      console.log(
        `  ${pad(slug, 22)} ${pad("repo", 10)} ${c.ok(pad("excluded", 22))} ` +
          c.dim('vendored reference, kept on disk and never committed - reported in full under "excluded from the build"'),
      );
    } else {
      checkFile({
        label: "repo",
        shortLabel: slug,
        path: artifact.repoPath,
        expected,
        mode: "required",
      });
    }

    checkFile({
      label: "installed",
      shortLabel: slug,
      path: artifact.installPath,
      expected,
      mode: artifact.installed === true ? "required" : "optional",
    });
  }

  console.log("");
}

// ---------------------------------------------------------------- build inputs

/**
 * A BUILD INPUT: a file the build actually reads. Its absence is a FAILURE, because the build
 * cannot run without it and nothing else in this script would notice.
 */
function checkBuildInput(entry) {
  const abs = resolvePath(entry.path);
  if (abs === null) {
    bump(FAIL);
    console.log(`  ${pad(entry.agent ?? "build", 22)} ${pad("build input", 10)} ${c.fail("BAD PATH")} ${dim(entry.path)}`);
    return;
  }
  const actual = hashFile(abs);
  if (actual === null) {
    bump(FAIL);
    console.log(`  ${pad(entry.agent ?? "build", 22)} ${pad("build input", 10)} ${c.fail(pad("MISSING", 22))} ${c.dim(`${abs} (required by the build)`)}`);
    return;
  }
  const expected = typeof entry.sha256 === "string" ? entry.sha256.toLowerCase() : null;
  if (!expected) {
    // No local hash: the entry points at a hash recorded elsewhere in the manifest. Say so,
    // because a bare "ok" next to no expected value reads as if nothing was verified.
    bump(OK);
    console.log(`  ${pad(entry.agent ?? "build", 22)} ${pad("build input", 10)} ${c.ok(pad("ok", 22))} ${short(actual)} ${c.dim(`hash recorded in ${entry.hashRecordedIn ?? "elsewhere"}`)}`);
    return;
  }
  if (actual !== expected) {
    bump(WARN);
    console.log(`  ${pad(entry.agent ?? "build", 22)} ${pad("build input", 10)} ${c.warn(pad("DRIFT", 22))} ${short(actual)} ${c.dim(`expected ${short(expected)}`)}`);
    return;
  }
  bump(OK);
  console.log(`  ${pad(entry.agent ?? "build", 22)} ${pad("build input", 10)} ${c.ok(pad("ok", 22))} ${short(actual)} ${c.dim("required by the build")}`);
}

/**
 * An EXCLUDED REFERENCE: a file the build does not read and never will.
 *
 * This is deliberately NOT `checkFile`. The whole reason the kind exists is that absence here
 * means the opposite of what it means for a build input: these files are vendored from another
 * project, kept on disk and hash-pinned as evidence, but never committed — so a clone that lacks
 * one is NORMAL, and its absence is the expected end state. Reporting it as MISSING would be a
 * false alarm that trains the reader to ignore MISSING, which is the one signal this script has.
 *
 * The three outcomes:
 *   absent              -> OK.   "excluded, absent" plus the reason it is not needed and the
 *                                 stub or upstream path that took its place, if any.
 *   present, hash match -> OK.   "excluded, present" - still evidence, still verified.
 *   present, hash drift -> WARN. The exclusion stands either way, but the evidence changed, so
 *                                 the recorded hash is no longer what the file says it is.
 *
 * A hash drift is a warning rather than a failure on purpose: the build does not read this file,
 * so nothing shipped can be wrong because of it. That is exactly the difference from a build
 * input, and it is why the two are separate functions rather than one with a flag.
 */
function checkExcludedReference(entry) {
  const abs = resolvePath(entry.path);
  // agent ALONE is not a label any more: there are six of these, two per agent, and "pi" twice
  // on consecutive lines is not a report a reader can act on. Name the file.
  const base = typeof entry.path === "string" ? (basename(entry.path) || entry.path) : "excluded";
  const label = entry.agent ? `${entry.agent}/${base}` : base;
  if (abs === null) {
    bump(FAIL);
    console.log(`  ${pad(label, 22)} ${pad("excluded", 10)} ${c.fail("BAD PATH")} ${dim(entry.path)}`);
    return;
  }

  const actual = hashFile(abs);

  if (actual === null) {
    bump(OK);
    // Name the replacement only when one exists. `replacedBy: null` is a stated fact for the
    // vendored files nothing replaced, and saying "replaced by" nothing would read as an omission
    // rather than as the answer. The build not reading this file is the whole reason it is absent.
    const replaced = entry.replacedBy
      ? `  replaced by ${entry.replacedBy}`
      : "  nothing replaced it: the build never read it";
    const notCommitted = entry.committed === false ? "  kept on disk, never committed" : "";
    console.log(
      `  ${pad(label, 22)} ${pad("excluded", 10)} ${c.ok(pad("absent", 22))} ` +
        c.dim(`not a build input, so its absence is expected${notCommitted}${replaced}`),
    );
    if (ARTIFACT_REPO_PATHS.has(entry.path)) {
      const owner = ARTIFACT_REPO_INDEX.get(entry.path);
      console.log(
        `  ${pad("", 22)} ${pad("", 10)} ` +
          c.dim(
            `note: still a tracked artifact of ${owner.agentName}, and its installed row still reads ` +
              `installed:${owner.installed} — that flag is read from the install path, so it stands ` +
              "whether or not this reference file exists in the clone being checked.",
          ),
      );
    }
    return;
  }

  const expected = typeof entry.sha256 === "string" ? entry.sha256.toLowerCase() : null;
  if (expected && actual !== expected) {
    bump(WARN);
    console.log(
      `  ${pad(label, 22)} ${pad("excluded", 10)} ${c.warn(pad("EVIDENCE DRIFT", 22))} ${short(actual)} ` +
        c.dim(`recorded ${short(expected)} - the build does not read this, so nothing shipped is affected`),
    );
    return;
  }

  bump(OK);
  console.log(
    `  ${pad(label, 22)} ${pad("excluded", 10)} ${c.ok(pad("present", 22))} ${short(actual)} ` +
      c.dim(expected ? "evidence, hash matches" : "evidence (no hash recorded)"),
  );
}

/**
 * The hash an excluded reference and its agent's artifact row BOTH record, must be the same.
 *
 * The overlap is deliberate — one is "this file is not committed", the other is "this theme is
 * installed on someone's machine" — but the hash is the same fact recorded twice, so it is
 * CHECKED rather than assumed. A mismatch here would mean the excluded section verifies one file
 * while the installed row verifies another, and no single row would show it.
 */
function checkExcludedArtifactHashes() {
  for (const entry of EXCLUDED) {
    if (!entry || typeof entry.path !== "string") continue;
    const owner = ARTIFACT_REPO_INDEX.get(entry.path);
    if (!owner) continue;
    const a = typeof entry.sha256 === "string" ? entry.sha256.toLowerCase() : null;
    if (!a || !owner.sha256) continue;
    if (a !== owner.sha256) {
      bump(FAIL);
      console.log(
        `  ${c.fail("HASH DISAGREEMENT")} ${dim(entry.path)} — excludedFromBuild records ${short(a)} but ` +
          `${owner.agentName}/${owner.slug} records ${short(owner.sha256)}. The two sections must ` +
          "describe the same file.",
      );
    }
  }
}

checkExcludedArtifactHashes();

const buildInputs = Array.isArray(manifest.buildInputs) ? manifest.buildInputs : [];
if (buildInputs.length > 0) {
  console.log(c.head("prototype build inputs — required by the build"));
  for (const entry of buildInputs) {
    if (!entry || typeof entry !== "object") {
      bump(FAIL);
      console.log(`  ${c.fail("BAD BUILD INPUT RECORD")}`);
      continue;
    }
    checkBuildInput(entry);
  }
  console.log("");
}

const excluded = EXCLUDED; // same array the cross-section index was built from
if (excluded.length > 0) {
  console.log(c.head("excluded from the build — evidence, NOT required"));
  if (typeof manifest.excludedFromBuildNote === "string" && manifest.excludedFromBuildNote !== "") {
    console.log(c.dim(manifest.excludedFromBuildNote));
  }
  for (const entry of excluded) {
    if (!entry || typeof entry !== "object") {
      bump(FAIL);
      console.log(`  ${c.fail("BAD EXCLUDED RECORD")}`);
      continue;
    }
    checkExcludedReference(entry);
  }
  console.log("");
}

// ---------------------------------------------------------------- summary

const total = counts.ok + counts.warn + counts.fail;
const summary =
  `summary: ${total} checks — ` +
  `${c.ok(`${counts.ok} ok`)}, ` +
  `${counts.warn > 0 ? c.warn(`${counts.warn} warning${counts.warn === 1 ? "" : "s"}`) : `${counts.warn} warnings`}, ` +
  `${counts.fail > 0 ? c.fail(`${counts.fail} failure${counts.fail === 1 ? "" : "s"}`) : `${counts.fail} failures`}`;

console.log(summary);
process.exit(counts.fail > 0 ? 1 : 0);
