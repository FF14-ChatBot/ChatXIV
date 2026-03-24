/**
 * Remove build and coverage outputs (not node_modules). Cross-platform via Node fs.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const paths = [
  'backend/dist',
  'backend/coverage',
  'frontend/dist',
  'frontend/dist-node',
  'frontend/coverage',
  'packages/cdm/dist',
];

for (const rel of paths) {
  const abs = path.join(root, rel);
  try {
    await fs.rm(abs, { recursive: true, force: true });
    console.log(`removed ${rel}`);
  } catch (err) {
    console.error(`failed to remove ${rel}:`, err);
    process.exitCode = 1;
  }
}
