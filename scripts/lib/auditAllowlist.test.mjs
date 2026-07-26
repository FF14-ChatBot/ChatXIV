import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateAuditReport } from './auditAllowlist.mjs';

function directFinding(pkgName, ghsaId, severity = 'high') {
  return {
    [pkgName]: {
      severity,
      via: [{ url: `https://github.com/advisories/${ghsaId}` }],
    },
  };
}

test('passes when there are no vulnerabilities', () => {
  const result = evaluateAuditReport({ vulnerabilities: {} }, []);
  assert.equal(result.ok, true);
  assert.deepEqual(result.flagged, []);
});

test('passes when every high-severity finding is on the allowlist', () => {
  const report = { vulnerabilities: directFinding('foo', 'GHSA-aaaa-bbbb-cccc') };
  const result = evaluateAuditReport(report, [{ id: 'GHSA-aaaa-bbbb-cccc' }]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.flagged, ['foo']);
});

test('fails when a high-severity finding is not on the allowlist', () => {
  const report = { vulnerabilities: directFinding('foo', 'GHSA-aaaa-bbbb-cccc') };
  const result = evaluateAuditReport(report, []);
  assert.equal(result.ok, false);
  assert.deepEqual(result.unallowed, [{ pkgName: 'foo', ids: ['GHSA-aaaa-bbbb-cccc'] }]);
});

test('ignores findings below the severity threshold', () => {
  const report = { vulnerabilities: directFinding('foo', 'GHSA-aaaa-bbbb-cccc', 'moderate') };
  const result = evaluateAuditReport(report, []);
  assert.equal(result.ok, true);
  assert.deepEqual(result.flagged, []);
});

test('resolves a transitive finding through a chain of package-name references', () => {
  const report = {
    vulnerabilities: {
      root: { severity: 'high', via: ['middle'] },
      middle: { severity: 'high', via: ['leaf'] },
      leaf: { severity: 'high', via: [{ url: 'https://github.com/advisories/GHSA-deep-chain-1234' }] },
    },
  };
  const notAllowed = evaluateAuditReport(report, []);
  assert.equal(notAllowed.ok, false);
  assert.deepEqual(
    notAllowed.unallowed.find((u) => u.pkgName === 'root')?.ids,
    ['GHSA-deep-chain-1234']
  );

  const allowed = evaluateAuditReport(report, [{ id: 'GHSA-deep-chain-1234' }]);
  assert.equal(allowed.ok, true);
});

test('does not infinite-loop on a self-referencing via chain', () => {
  const report = {
    vulnerabilities: {
      a: { severity: 'high', via: ['b'] },
      b: { severity: 'high', via: ['a'] },
    },
  };
  const result = evaluateAuditReport(report, []);
  // No advisory object anywhere in the cycle, so nothing to flag as "not allowed" -- the point
  // of this test is that evaluation terminates at all, not any particular id list.
  assert.equal(result.ok, true);
});

test('one unallowlisted finding among several allowlisted ones still fails', () => {
  const report = {
    vulnerabilities: {
      ...directFinding('foo', 'GHSA-aaaa-bbbb-cccc'),
      ...directFinding('bar', 'GHSA-dddd-eeee-ffff'),
    },
  };
  const result = evaluateAuditReport(report, [{ id: 'GHSA-aaaa-bbbb-cccc' }]);
  assert.equal(result.ok, false);
  assert.deepEqual(result.unallowed, [{ pkgName: 'bar', ids: ['GHSA-dddd-eeee-ffff'] }]);
});
