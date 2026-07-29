#!/usr/bin/env node
/**
 * Wraps `npm audit --json` (piped via stdin) with a reviewed allowlist for specific advisories
 * that have no safe non-breaking fix and have been assessed as not exploitable in how this repo
 * actually uses the affected package (see audit-allowlist.json for the reasoning per entry).
 * Any high+ severity finding NOT on the allowlist still fails the run.
 *
 * Usage: npm audit --audit-level=high --json | node ../scripts/auditAllowlist.mjs <path-to-allowlist.json>
 */
import { readFileSync } from 'node:fs';
import { evaluateAuditReport } from './lib/auditAllowlist.mjs';

const allowlistPath = process.argv[2];
if (!allowlistPath) {
  console.error('Usage: node auditAllowlist.mjs <path-to-allowlist.json>');
  process.exit(1);
}

const allowlist = JSON.parse(readFileSync(allowlistPath, 'utf8'));

let raw = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) raw += chunk;

if (raw.trim() === '') {
  console.error('auditAllowlist: no input received on stdin (expected `npm audit --json` output).');
  process.exit(1);
}

let report;
try {
  report = JSON.parse(raw);
} catch {
  // `npm audit --json` still exits non-zero on findings, but always prints valid JSON to stdout.
  // A parse failure here means something upstream broke, not that a vulnerability was found.
  console.error('auditAllowlist: could not parse npm audit output as JSON:\n');
  console.error(raw);
  process.exit(1);
}

const { ok, unallowed, flagged } = evaluateAuditReport(report, allowlist);

if (!ok) {
  console.error('npm audit: high+ severity findings not on the allowlist:\n');
  for (const { pkgName, ids } of unallowed) {
    console.error(`  ${pkgName}: ${ids.join(', ')}`);
  }
  console.error(`\nFix it, or add a reviewed entry (with a reason) to ${allowlistPath}.`);
  process.exit(1);
}

if (flagged.length > 0) {
  console.log(`npm audit: ${flagged.length} high+ severity finding(s), all allowlisted:`);
  for (const entry of allowlist) {
    console.log(`  ${entry.id} (${entry.package}): ${entry.reason}`);
  }
}
console.log('npm audit: no unallowed high+ severity findings.');
