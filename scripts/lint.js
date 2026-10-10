import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 Running Enterprise Code Quality & Lint Checker...');

let errorCount = 0;
let checkedCount = 0;

function checkJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        checkJsFiles(fullPath);
      }
    } else if (entry.name.endsWith('.js')) {
      checkedCount++;
      const relPath = path.relative(rootDir, fullPath);

      // 1. Syntax check using node --check
      const res = spawnSync(process.execPath, ['--check', fullPath], { encoding: 'utf-8' });
      if (res.status !== 0) {
        console.error(`❌ Syntax Error in ${relPath}:`, res.stderr);
        errorCount++;
        continue;
      }

      // 2. Disallowed patterns (e.g. debugger, alert in server code)
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes('debugger;')) {
        console.error(`❌ Prohibited 'debugger;' found in ${relPath}`);
        errorCount++;
      }

      console.log(`  ✓ Passed: ${relPath}`);
    }
  }
}

// Check JSON files validity
function checkJsonFiles() {
  const jsonFiles = ['package.json'];
  for (const file of jsonFiles) {
    const fullPath = path.join(rootDir, file);
    if (fs.existsSync(fullPath)) {
      checkedCount++;
      try {
        JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        console.log(`  ✓ Valid JSON: ${file}`);
      } catch (err) {
        console.error(`❌ Invalid JSON in ${file}:`, err.message);
        errorCount++;
      }
    }
  }
}

checkJsFiles(path.join(rootDir, 'src'));
if (fs.existsSync(path.join(rootDir, 'test'))) {
  checkJsFiles(path.join(rootDir, 'test'));
}
checkJsonFiles();

console.log('----------------------------------------------------');
if (errorCount > 0) {
  console.error(`🚨 Lint failed with ${errorCount} error(s) across ${checkedCount} files.`);
  process.exit(1);
} else {
  console.log(`✅ All ${checkedCount} files passed code quality & syntax checks!`);
  process.exit(0);
}
