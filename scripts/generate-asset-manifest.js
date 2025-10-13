#!/usr/bin/env node
/*
 Generates a list of static assets to prefetch/cache for offline support.
 Do not hardcode the list in app code; this script scans the repo and writes
 asset-manifest.json at the project root.

 Rules:
 - Include files with extensions typically safe to cache for a PWA
 - Include files within common asset/code folders
 - Exclude tests, CI, dot-folders, node_modules, and hidden files
*/

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();

const INCLUDE_EXTS = new Set(['.css', '.js', '.mjs', '.json', '.woff2', '.png', '.webp', '.svg', '.ico', '.html']);
const EXCLUDE_DIRS = new Set([
  '.git', '.github', '.vscode', 'node_modules', 'tests', 'cypress', '.cursor', '.instructions'
]);

// Directories likely to contain assets to ship
const CANDIDATE_DIRS = [
  '.', 'assets', 'src', 'styles', 'build'
];

function shouldIncludeFile(relPath) {
  // Exclude hidden files (starting with .) except .well-known if ever used
  const parts = relPath.split(path.sep);
  for (const part of parts) {
    if (part !== '.' && part.startsWith('.') && part !== '.well-known') return false;
    if (EXCLUDE_DIRS.has(part)) return false;
  }
  const ext = path.extname(relPath);
  if (!INCLUDE_EXTS.has(ext)) return false;

  // Exclude this generator itself and test artifacts if matched by ext
  if (relPath.includes(path.join('scripts', 'generate-asset-manifest.js'))) return false;

  // Exclude obvious dev-only files
  if (/eslint|stylelint|cypress\.config|README|LICENSE/i.test(relPath)) return false;

  return true;
}

function walk(dir, acc) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(repoRoot, full);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      walk(full, acc);
    } else if (entry.isFile()) {
      if (shouldIncludeFile(rel)) {
        // Use POSIX separators and prefix with './' for consistency
        const posixRel = './' + rel.split(path.sep).join('/');
        acc.add(posixRel);
      }
    }
  }
}

function generate() {
  const files = new Set();
  for (const d of CANDIDATE_DIRS) {
    const dir = path.resolve(repoRoot, d);
    if (fs.existsSync(dir)) {
      walk(dir, files);
    }
  }

  // Ensure key entry points are present even if filtering missed them
  ['./index.html', './manifest.json', './service-worker.js', './pwa.js'].forEach(f => files.add(f));

  const list = Array.from(files).sort();
  const out = {
    generatedAt: new Date().toISOString(),
    files: list
  };
  const outPath = path.join(repoRoot, 'asset-manifest.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${list.length} assets to ${outPath}`);
}

generate();

