#!/usr/bin/env node
// Builds dist/<target>/ from src/ for each browser target, merging
// src/manifest.json with src/manifest.<target>.json.
//
// Usage: node scripts/build.mjs [chrome|firefox ...] [--zip]

import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const TARGETS = ['chrome', 'firefox'];

const args = process.argv.slice(2);
const zip = args.includes('--zip');
const requested = args.filter((a) => !a.startsWith('--'));
const unknown = requested.filter((t) => !TARGETS.includes(t));
if (unknown.length) {
  console.error(`Unknown target(s): ${unknown.join(', ')}. Valid: ${TARGETS.join(', ')}`);
  process.exit(1);
}
const targets = requested.length ? requested : TARGETS;

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const base = readJson(join(SRC, 'manifest.json'));

for (const target of targets) {
  const out = join(DIST, target);
  rmSync(out, { recursive: true, force: true });

  cpSync(SRC, out, {
    recursive: true,
    filter: (p) => {
      const name = basename(p);
      return !/^manifest.*\.json$/.test(name) && name !== '.DS_Store';
    },
  });

  const overridePath = join(SRC, `manifest.${target}.json`);
  const override = existsSync(overridePath) ? readJson(overridePath) : {};
  const manifest = { ...base, ...override };
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`built dist/${target}`);

  if (zip) {
    const zipName = `gslocation-${target}-v${manifest.version}.zip`;
    const zipPath = join(DIST, zipName);
    rmSync(zipPath, { force: true });
    // Zip from inside the target dir so manifest.json sits at the archive root.
    execFileSync('zip', ['-qr', zipPath, '.'], { cwd: out, stdio: 'inherit' });
    console.log(`packed dist/${zipName}`);
  }
}
