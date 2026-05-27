# 04 Validation

Verify the result and prepare the handoff.

## Inputs

| Source | File/Location | Section/Scope | Why |
|--------|---------------|---------------|-----|
| Implementation output | `../03-implementation/output/` | Relevant task file if present | Carries change notes forward |
| Package metadata | `../../package.json` | Scripts | Chooses validation commands |
| Changed source | Git diff and affected files | Relevant files only | Reviews actual changes |

## Process

1. Review changed files for scope, regressions, and secrets.
2. Run `npm run build` for code changes when feasible.
3. For UI work, check responsive behavior when a browser is available.
4. Save `output/[task-slug]-validation.md` for substantial changes.
5. Handoff with changed files, verification result, and any residual risk.

## Outputs

| Artifact | Location | Format |
|----------|----------|--------|
| Validation note | `output/[task-slug]-validation.md` | Markdown with commands run and result |
