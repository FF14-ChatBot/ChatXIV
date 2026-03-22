import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} repoRoot
 * @returns {boolean}
 */
function localBranchMainExists(repoRoot) {
  try {
    execSync('git show-ref --verify --quiet refs/heads/main', {
      cwd: repoRoot,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Rebuild shared CDM types then backend (same order as root `npm run build`), from repo root.
 * Touches **`backend/src/server.ts`** mtime so **`npm run dev:backend`** (`node --watch` on that entry) reloads.
 * Frontend **`npm run dev:frontend`** has no watch: Vite HMR picks up pulled **`src/`** changes; restart manually if **`vite.config`** or bootstrap scripts change.
 * Only runs when `HEAD` is branch **main**.
 *
 * @param {string} repoRoot
 */
function runPostSyncBuildAndBumpBackendDevWatcher(repoRoot) {
  const branch = execSync('git rev-parse --abbrev-ref HEAD', {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
  if (branch !== 'main') {
    throw new Error(
      `Refusing backend build: must be on branch main (currently "${branch}")`
    );
  }
  execSync('npm run build:cdm && npm run build:backend', {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: true,
  });

  const now = new Date();
  const serverTs = path.join(repoRoot, 'backend', 'src', 'server.ts');
  if (fs.existsSync(serverTs)) {
    fs.utimesSync(serverTs, now, now);
  }
}

/**
 * On a push to `main`: fetch, switch this clone to `main`, fast-forward to `origin/main`,
 * run `npm install` at repo root if `package-lock.json` changed, then **`npm run build:cdm`** and **`npm run build:backend`**,
 * then bump **`backend/src/server.ts`** mtime for **`dev:backend`** **`--watch`** (only after verifying `HEAD` is branch **main**).
 *
 * Refuses if the working tree is not clean so a forced checkout cannot drop work.
 *
 * @param {string} repoRoot Absolute path to repository root
 * @returns {{ updated: boolean; message: string }}
 */
export function syncFromOriginMain(repoRoot) {
  const dirty = execSync('git status --porcelain', {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
  if (dirty) {
    throw new Error(
      'Refusing webhook sync: working tree is not clean (commit, stash, or discard changes first)'
    );
  }

  execSync('git fetch origin main', { cwd: repoRoot, stdio: 'pipe' });

  if (localBranchMainExists(repoRoot)) {
    execSync('git checkout main', { cwd: repoRoot, stdio: 'inherit' });
  } else {
    execSync('git checkout -b main origin/main', { cwd: repoRoot, stdio: 'inherit' });
  }

  const local = execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim();
  const remote = execSync('git rev-parse origin/main', { cwd: repoRoot, encoding: 'utf8' }).trim();

  const lockPath = path.join(repoRoot, 'package-lock.json');
  const lockBefore = fs.existsSync(lockPath) ? fs.readFileSync(lockPath, 'utf8') : '';

  let updated = false;
  let message;

  if (local === remote) {
    message = 'Already up to date with origin/main';
  } else {
    execSync('git merge --ff-only origin/main', { cwd: repoRoot, stdio: 'inherit' });
    updated = true;

    const lockAfter = fs.existsSync(lockPath) ? fs.readFileSync(lockPath, 'utf8') : '';
    if (lockBefore !== lockAfter) {
      execSync('npm install', { cwd: repoRoot, stdio: 'inherit' });
      message =
        'Merged origin/main and ran npm install (lockfile changed); on branch main';
    } else {
      message = 'Merged origin/main; on branch main';
    }
  }

  runPostSyncBuildAndBumpBackendDevWatcher(repoRoot);
  message +=
    ' Ran build:cdm + build:backend; bumped backend/src/server.ts mtime for dev:backend --watch.';

  return { updated, message };
}
