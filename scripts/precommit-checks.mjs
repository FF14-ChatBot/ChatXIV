#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const steps = [
  'npm run format',
  'npm run lint',
  'npm run test:coverage',
  'npm run build',
  'npm run audit',
];

for (const step of steps) {
  process.stdout.write(`\n[pre-commit] Running: ${step}\n`);

  const result = spawnSync(step, {
    shell: true,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.stderr.write(
      `\n[pre-commit] Failed: ${step}\n[pre-commit] Commit aborted.\n`,
    );
    process.exit(result.status ?? 1);
  }
}

process.stdout.write('\n[pre-commit] All checks passed.\n');
