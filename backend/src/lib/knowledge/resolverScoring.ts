/**
 * Shared rank-based relevance score for resolvers whose upstream API returns results already
 * ordered by relevance but without a usable numeric score (or one that isn't comparable across
 * resolvers). `knowledgeService` merges chunks from multiple resolvers sharing a category (e.g.
 * `UNLOCKS`, served by both `XivApiResolver` and `MediaWikiResolver`) into one score-sorted list,
 * so every resolver using rank-based scoring must stay on this exact scale -- a resolver-local
 * copy of this formula that drifts from another's silently reintroduces "one source always
 * outranks the other regardless of actual relevance".
 */
export function rankScore(rank: number): number {
  return 1 / (rank + 1);
}
