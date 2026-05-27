# 03 Implementation

Apply focused source changes.

## Inputs

| Source | File/Location | Section/Scope | Why |
|--------|---------------|---------------|-----|
| Plan output | `../02-planning/output/` | Relevant task file if present | Keeps implementation scoped |
| Project profile | `../../shared/project-profile.md` | Stack, Source Layout, Quality Rules | Maintains app conventions |
| Application source | `../../src/`, `../../supabase/`, root config files | Relevant files only | Code to modify |

## Process

1. Read the exact files that own the behavior.
2. Edit only the files needed for the request.
3. Preserve existing user changes and unrelated local files.
4. Keep styling responsive and consistent with the current app.
5. If useful, save `output/[task-slug]-implementation.md` with changed files and notes.

## Outputs

| Artifact | Location | Format |
|----------|----------|--------|
| Implementation note | `output/[task-slug]-implementation.md` | Markdown change summary when the task is non-trivial |
