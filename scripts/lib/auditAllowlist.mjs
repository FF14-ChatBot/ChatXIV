const SEVERITY_RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

/** Walks a finding's `via` chain (direct advisory objects and transitive package-name strings)
 * to collect every GHSA id it's ultimately caused by, deduped by package name to avoid cycles.
 * @param {Record<string, any>} vulnerabilities npm audit --json's `vulnerabilities` map
 * @param {string} pkgName
 * @param {Set<string>} seen
 * @returns {string[]}
 */
function advisoryIdsFor(vulnerabilities, pkgName, seen = new Set()) {
  if (seen.has(pkgName)) return [];
  seen.add(pkgName);
  const entry = vulnerabilities[pkgName];
  if (!entry) return [];

  const ids = [];
  for (const via of entry.via) {
    if (typeof via === 'string') {
      ids.push(...advisoryIdsFor(vulnerabilities, via, seen));
    } else if (via.url) {
      const match = /GHSA-[a-z0-9-]+/i.exec(via.url);
      ids.push(match ? match[0] : via.url);
    }
  }
  return ids;
}

/**
 * Evaluates an `npm audit --json` report against a reviewed allowlist of advisory ids.
 * @param {{ vulnerabilities?: Record<string, any> }} report parsed `npm audit --json` output
 * @param {{ id: string }[]} allowlist
 * @param {keyof typeof SEVERITY_RANK} [threshold] minimum severity that must be allowlisted or absent
 * @returns {{ ok: boolean, unallowed: { pkgName: string, ids: string[] }[], flagged: string[] }}
 *   `flagged` is every at-or-above-threshold package name found, allowlisted or not.
 */
export function evaluateAuditReport(report, allowlist, threshold = 'high') {
  const vulnerabilities = report.vulnerabilities ?? {};
  const allowlistedIds = new Set(allowlist.map((entry) => entry.id));
  const minRank = SEVERITY_RANK[threshold];

  const unallowed = [];
  const flagged = [];

  for (const [pkgName, entry] of Object.entries(vulnerabilities)) {
    if ((SEVERITY_RANK[entry.severity] ?? 0) < minRank) continue;
    flagged.push(pkgName);

    const ids = advisoryIdsFor(vulnerabilities, pkgName);
    const notAllowed = ids.filter((id) => !allowlistedIds.has(id));
    if (notAllowed.length > 0) {
      unallowed.push({ pkgName, ids: notAllowed });
    }
  }

  return { ok: unallowed.length === 0, unallowed, flagged };
}
