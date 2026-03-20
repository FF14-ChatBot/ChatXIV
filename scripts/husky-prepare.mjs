/**
 * Runs Husky from the repo root when present. No-ops if `husky` is not installed
 * (e.g. `npm ci` was run only in a workspace package without root devDependencies).
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const huskyBin = join(repoRoot, 'node_modules', 'husky', 'bin.js');

if (!existsSync(huskyBin)) {
  process.exit(0);
}

const result = spawnSync(process.execPath, [huskyBin], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
