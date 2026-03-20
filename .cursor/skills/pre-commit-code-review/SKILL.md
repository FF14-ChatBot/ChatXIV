---
name: pre-commit-code-review
description: Reviews staged code changes for security, correctness, reliability, maintainability, and test coverage immediately before commit. Use when the user asks to commit, requests a pre-commit review, or asks if changes are safe to merge.
---

# Pre-Commit Code Review

Run this workflow before creating a commit.

## Inputs To Collect

1. Current status (`git status --short`)
2. Staged diff (`git diff --staged`) — only review what will actually be committed
3. Recent commit style context (`git log -5 --oneline`)

## Review Checklist

- Security: validate inputs, avoid trust of external data, no secret leakage
- Correctness: logic works for happy path and edge cases
- Reliability: errors are surfaced and handled intentionally
- Maintainability: code remains readable and appropriately modular
- Tests: changed behavior has tests; existing tests still align with intent

## Reporting Format

Return findings first, ordered by severity:

1. `Critical` - must fix before commit
2. `High` - should fix before commit
3. `Medium` - acceptable with explicit follow-up
4. `Low` - optional polish

For each finding include:

- Location (`path` and symbol/function name)
- Risk in one sentence
- Recommended fix in one sentence

If no actionable findings exist, output exactly:

`No findings. Residual risk: [short note].`

## Commit Decision

- If any unresolved `Critical` findings exist, stop and ask user whether to fix first.
- Otherwise, continue with normal commit workflow.
