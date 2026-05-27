# 01 Intake

Clarify the task and identify the smallest useful path through the codebase.

## Inputs

| Source | File/Location | Section/Scope | Why |
|--------|---------------|---------------|-----|
| User request | Conversation | Full request | Defines the desired outcome |
| Project profile | `../../shared/project-profile.md` | Full file | Keeps scope aligned with app purpose and stack |
| Source map | `../../README.md` | Files and Folder structure sections | Finds likely affected areas |

## Process

1. Restate the requested outcome in implementation terms.
2. Identify whether this is documentation, styling, behavior, persistence, deployment, or setup work.
3. Search only the likely source areas first.
4. If the request is broad or risky, write a short note to `output/[task-slug]-intake.md`; otherwise continue directly to implementation.

## Outputs

| Artifact | Location | Format |
|----------|----------|--------|
| Intake note | `output/[task-slug]-intake.md` | Markdown summary of scope, affected areas, and open questions |
