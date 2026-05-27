# 02 Planning

Plan multi-file or risky changes before editing.

## Inputs

| Source | File/Location | Section/Scope | Why |
|--------|---------------|---------------|-----|
| Intake output | `../01-intake/output/` | Relevant task file if present | Carries clarified scope forward |
| Project profile | `../../shared/project-profile.md` | Source Layout and Quality Rules | Guides file ownership and verification |
| Current source | `../../src/`, `../../supabase/`, root config files | Relevant files only | Grounds the plan in existing code |

## Process

1. Inspect affected files and existing patterns.
2. Decide the smallest change set that satisfies the request.
3. Identify verification commands and manual checks.
4. For substantial work, save `output/[task-slug]-plan.md`; for small work, continue directly to implementation.

## Outputs

| Artifact | Location | Format |
|----------|----------|--------|
| Change plan | `output/[task-slug]-plan.md` | Markdown with files, approach, and verification |
