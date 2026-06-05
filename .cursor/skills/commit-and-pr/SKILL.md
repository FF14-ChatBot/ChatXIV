---
name: commit-and-pr
description: >-
  Commit changes with human-readable messages, generate a copyable PR summary
  from the project template, and handle push/amend workflow. Use when the user
  asks to commit, push, or prepare a PR.
---

# Commit and PR Workflow

## Prerequisite

Before committing, run the `pre-commit-code-review` skill on staged changes if it has not already been run in this session. Do not proceed with the commit while unresolved `Critical` findings remain.

## Commit Message Format

- Type prefix: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- **One sentence**, imperative mood, human-readable, under 72 chars
- No multi-line body in the commit message; detailed bullet points go in the PR description instead
- No AI attribution (no Co-authored-by for AI tools)

Examples:

```
feat: add XIVAPI client with retry and rate limiting
refactor: remove barrel exports and use direct imports
docs: add Cursor rules, skills, and AGENTS.md for project conventions
```

## PR Summary

After committing, output a filled-in PR summary as a copyable markdown block using the project template (`.github/PULL_REQUEST_TEMPLATE.md`):

```markdown
## Overview
<!-- What this PR does and why -->

---
## Revision 1

- Change 1
- Change 2
- Change 3

---
## Testing
- [x] Tests pass locally
- [x] Lint and format check pass
- [ ] CI passes on git
- [ ] (Optional) Screenshots or design notes if UI changes
```

**Revision history:** Do **not** rewrite or delete prior `## Revision N` sections when the PR evolves. Keep earlier revisions as-is (they record what shipped in that iteration) and add a new `## Revision 2`, `## Revision 3`, etc., separated by `---`, for each follow-up push or review pass.

Pre-check the Testing items that the agent has already verified. Leave "CI passes on git" unchecked (runs after push).

## Push Policy

- Feature branches only; never push directly to main
- **Amend** if ALL of these are true:
  1. The previous commit was made by the agent in this session
  2. Same branch, not yet reviewed (no PR review comments)
  3. The new change is small (lint fix, test addition, typo, format fix)
  - Use `git commit --amend --no-edit` then `git push --force-with-lease`
- **New commit** for anything else; regular `git push`
- If uncertain whether to amend: ask the user
