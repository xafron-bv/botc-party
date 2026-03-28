#!/usr/bin/env node
/*
 Generates a list of static assets to prefetch/cache for offline support.
 Do not hardcode the list in app code; this script scans the repo and writes
 asset-manifest.json at the project root.

 Rules:
 - Include files with extensions typically safe to cache for a PWA
 - Include files within common asset/code folders
 - Exclude tests, CI, dot-folders, node_modules, and hidden files
 - Hash each file with SHA-256 (truncated to 12 hex chars) for differential updates
*/

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const repoRoot = process.cwd();

const INCLUDE_EXTS = new Set(['.css', '.js', '.mjs', '.json', '.woff2', '.png', '.webp', '.svg', '.ico', '.html']);
const EXCLUDE_DIRS = new Set([
  '.git', '.github', '.vscode', 'node_modules', 'tests', 'cypress', '.cursor', '.instructions'
]);
const EXCLUDE_FILES = new Set(['version.json']);

// Directories likely to contain assets to ship
const CANDIDATE_DIRS = [
  '.', 'assets', 'src', 'styles', 'build'
];

function shouldIncludeFile(relPath) {
  // Exclude specific files up-front (e.g., version.json must stay network-fetched)
  const normalized = relPath.split(path.sep).join('/');
  if (EXCLUDE_FILES.has(path.basename(normalized)) || EXCLUDE_FILES.has(normalized)) return false;

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

  // Exclude test files
  if (/\.test\.|\.spec\.|\.cy\./.test(relPath)) return false;

  return true;
}

function hashFile(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
  } catch {
    return null;
  }
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
        const posixRel = `./${rel.split(path.sep).join('/')}`;
        acc.set(posixRel, full);
      }
    }
  }
}

function generate() {
  const fileMap = new Map();
  for (const d of CANDIDATE_DIRS) {
    const dir = path.resolve(repoRoot, d);
    if (fs.existsSync(dir)) {
      walk(dir, fileMap);
    }
  }

  // Ensure key entry points are present even if filtering missed them
  ['./index.html', './manifest.json', './service-worker.js', './pwa.js'].forEach(f => {
    if (!fileMap.has(f)) fileMap.set(f, path.resolve(repoRoot, f.slice(2)));
  });

  const sortedPaths = Array.from(fileMap.keys()).sort();

  const entries = sortedPaths.map(p => ({
    path: p,
    hash: hashFile(fileMap.get(p)) || '000000000000'
  }));

  const coreEntries = entries.filter(e => {
    const f = e.path;
    if (f === './index.html' || f === './styles.css' || f === './pwa.js' || f === './manifest.json') return true;
    if (f.startsWith('./src/')) return true;
    return false;
  });

  const out = {
    generatedAt: new Date().toISOString(),
    core: coreEntries,
    files: entries
  };
  const outPath = path.join(repoRoot, 'asset-manifest.json');
  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Wrote ${entries.length} assets to ${outPath} (${coreEntries.length} core)`);
}

generate();
