# Todo App Workspace Context

This workspace maintains the todo website. Use the stage map to route work and keep context focused.

## Task Routing

| Task | Stage | Why |
|------|-------|-----|
| New request, unclear bug, or broad change | `stages/01-intake/CONTEXT.md` | Capture scope before touching code |
| Multi-file feature or risky refactor | `stages/02-planning/CONTEXT.md` | Decide affected files and verification path |
| Code, styling, or configuration edit | `stages/03-implementation/CONTEXT.md` | Apply focused source changes |
| Final review, build, and handoff | `stages/04-validation/CONTEXT.md` | Verify behavior and summarize outcome |

## Shared Resources

| Resource | Location | Contains |
|----------|----------|----------|
| Project profile | `shared/project-profile.md` | App purpose, stack, source layout, quality rules |
| ICM conventions | `_core/CONVENTIONS.md` | Stage and routing conventions |

## Source Areas

| Area | Location |
|------|----------|
| App shell | `src/app/` |
| Task feature | `src/features/tasks/` |
| Shared UI | `src/shared/` |
| Global styles | `src/styles/` |
| Supabase schema | `supabase/` |
