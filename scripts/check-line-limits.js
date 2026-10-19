/**
 * Automated Policy Check:
 * 1. Checks that every text file under src/ and public/ has at most 149 lines.
 * 2. Checks that forbidden catch-all files are not present.
 */

import fs from 'fs';
import path from 'path';

const MAX_LINES = 149;
const TARGET_DIRS = ['src', 'public'];
const FORBIDDEN_NAMES = new Set([
  'actions.js', 'actions.ts',
  'app.js',
  'utils.ts', 'utils.js',
  'helpers.ts', 'helpers.js',
  'common.ts', 'common.js',
  'misc.ts', 'misc.js',
  'api.ts', 'api.js'
]);

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot'
]);

let violations = [];
let checkedFiles = 0;

function scanDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile()) {
      const lowerName = entry.name.toLowerCase();
      const ext = path.extname(lowerName);

      // Check forbidden catch-all file names
      if (FORBIDDEN_NAMES.has(lowerName)) {
        violations.push({
          file: fullPath,
          reason: `Forbidden catch-all filename: '${entry.name}'`
        });
      }

      // Check line limit for text files
      if (!BINARY_EXTENSIONS.has(ext)) {
        checkedFiles++;
        const content = fs.readFileSync(fullPath, 'utf8');
        const lineCount = content.split(/\r?\n/).length;

        if (lineCount > MAX_LINES) {
          violations.push({
            file: fullPath,
            reason: `Exceeds max line limit: ${lineCount} lines (max is ${MAX_LINES})`
          });
        }
      }
    }
  }
}

for (const target of TARGET_DIRS) {
  scanDir(path.resolve(process.cwd(), target));
}

console.log(`[Policy Check] Checked ${checkedFiles} files across [${TARGET_DIRS.join(', ')}].`);

if (violations.length > 0) {
  console.error(`[Policy Check FAILED] ${violations.length} violations found:`);
  violations.forEach((v) => {
    console.error(`  - ${v.file}: ${v.reason}`);
  });
  process.exit(1);
} else {
  console.log(`[Policy Check PASSED] All text files are <= ${MAX_LINES} lines with no forbidden catch-all files.`);
}
