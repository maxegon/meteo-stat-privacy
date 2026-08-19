#!/usr/bin/env node
/**
 * generate_snapshot.js
 *
 * Rigenera MeteoAggregator_snapshot.txt: un dump testuale piatto di tutti i
 * file sorgente/config del progetto (.js/.jsx/.json/.ts/.tsx), nel formato:
 *
 *   ===== FILE: ./path/relativo =====
 *   <contenuto del file>
 *
 *   ===== FILE: ./altro/file =====
 *   ...
 *
 * PERCHÉ ESISTE: stesso meccanismo già in uso su SportViewLens (script
 * gemello, stessa data di ripristino su ShowViewLens/Solo1Meteo:
 * 19/08/2026). Serve a dare contesto completo del codice a un tool esterno
 * senza accesso diretto al filesystem del progetto (es. Gemini/Antigravity)
 * — non a Claude, che legge già i file direttamente e usa graphify-out/ per
 * la navigazione strutturata.
 *
 * REGOLA PERMANENTE (vedi CLAUDE.md): rigenerare questo snapshot dopo OGNI
 * modifica al codice e a fine sessione, senza eccezioni — eseguendo:
 *   node scripts/generate_snapshot.js
 *
 * Esclusioni:
 *  - Directory: node_modules, .git, android, assets, dist, graphify-out,
 *    landing, _old_builds, .github, Pods, .vscode, coverage, .expo-shared
 *  - ios/ escluso tranne ios/build/generated/**\/*.json
 *  - Estensioni incluse SOLO: .js .jsx .json .ts .tsx
 *  - Niente markdown (*.md), niente immagini/binari, niente .gitignore
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.join(ROOT, 'MeteoAggregator_snapshot.txt');

const EXCLUDED_DIR_NAMES = new Set([
  'node_modules', '.git', 'android', 'assets', 'dist', 'graphify-out',
  'landing', '_old_builds', '.github', 'Pods', '.vscode', 'coverage',
  '.expo-shared',
]);

const INCLUDED_EXTENSIONS = new Set(['.js', '.jsx', '.json', '.ts', '.tsx']);

// Percorsi relativi (dalla root) da escludere anche se l'estensione combacia.
function isExplicitlyExcluded(relPath) {
  if (relPath.startsWith('ios/') && !relPath.startsWith('ios/build/generated/')) return true;
  if (relPath.startsWith('.expo/web/')) return true;
  return false;
}

function shouldSkipDir(dirName) {
  return EXCLUDED_DIR_NAMES.has(dirName);
}

// Dotdir esplicitamente whitelisted (contengono config utile): tutte le altre
// dotdir (.git, .vscode, .idea, ecc.) vengono ignorate.
const WHITELISTED_DOTDIRS = new Set(['.claude', '.expo']);

function walk(dir, fileList) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const isHiddenDir = entry.isDirectory() && entry.name.startsWith('.');
    if (isHiddenDir && !WHITELISTED_DOTDIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT, fullPath).split(path.sep).join('/');

    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      walk(fullPath, fileList);
      continue;
    }

    const ext = path.extname(entry.name);
    if (!INCLUDED_EXTENSIONS.has(ext)) continue;
    if (isExplicitlyExcluded(relPath)) continue;
    fileList.push(relPath);
  }
}

function main() {
  const files = [];
  walk(ROOT, files);
  files.sort((a, b) => a.localeCompare(b));

  const chunks = [];
  for (const relPath of files) {
    const abs = path.join(ROOT, relPath);
    let content;
    try {
      content = fs.readFileSync(abs, 'utf8');
    } catch (e) {
      continue; // file binario/illeggibile, salta
    }
    chunks.push(`===== FILE: ./${relPath} =====\n${content}\n`);
  }

  fs.writeFileSync(OUTPUT, chunks.join('\n'));
  console.log(`✅ Snapshot rigenerato: ${files.length} file → ${path.relative(ROOT, OUTPUT)}`);
}

main();
