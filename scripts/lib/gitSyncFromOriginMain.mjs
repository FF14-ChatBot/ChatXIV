import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Fetches origin/main and fast-forwards the current branch if behind.
 * Runs `npm install` at repo root only if `package-lock.json` changed.
 * @param {string} repoRoot Absolute path to repository root
 * @returns {{ updated: boolean; message: string }}
 */
export function syncFromOriginMain(repoRoot) {
  const branch = execSync('git rev-parse --abbrev-ref HEAD', {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
  if (branch !== 'main') {
    return {
      updated: false,
      message: `Skipped: repo is on "${branch}", not main (checkout main on this machine to auto-sync)`,
    };
  }

  execSync('git fetch origin main', { cwd: repoRoot, stdio: 'pipe' });
  const local = execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim();
  const remote = execSync('git rev-parse origin/main', { cwd: repoRoot, encoding: 'utf8' }).trim();
  if (local === remote) {
    return { updated: false, message: 'Already up to date with origin/main' };
  }

  const lockPath = path.join(repoRoot, 'package-lock.json');
  const lockBefore = fs.existsSync(lockPath) ? fs.readFileSync(lockPath, 'utf8') : '';

  execSync('git merge --ff-only origin/main', { cwd: repoRoot, stdio: 'inherit' });

  const lockAfter = fs.existsSync(lockPath) ? fs.readFileSync(lockPath, 'utf8') : '';
  if (lockBefore !== lockAfter) {
    execSync('npm install', { cwd: repoRoot, stdio: 'inherit' });
  }

  return {
    updated: true,
    message:
      lockBefore !== lockAfter
        ? 'Merged origin/main and ran npm install (lockfile changed)'
        : 'Merged origin/main (restart dev servers if deps or env changed)',
  };
}
