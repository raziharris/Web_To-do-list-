# Web_To-do-list-

ICM workspace for maintaining a Vite React todo app. This file is the Layer 0 map. Read `CONTEXT.md` for task routing, then only the stage files and references needed for the current task.

## Folder Map

```text
Web_To-do-list-/
  CLAUDE.md
  AGENTS.md
  CONTEXT.md
  setup/
    questionnaire.md
  shared/
    project-profile.md
  stages/
    01-intake/
    02-planning/
    03-implementation/
    04-validation/
  _core/
    CONVENTIONS.md
  src/
  supabase/
```

## Routing

| You want to... | Go to |
|----------------|-------|
| Understand or triage a request | `stages/01-intake/CONTEXT.md` |
| Plan a meaningful code change | `stages/02-planning/CONTEXT.md` |
| Edit the application source | `stages/03-implementation/CONTEXT.md` |
| Build, review, and hand off | `stages/04-validation/CONTEXT.md` |
| Configure project preferences | `setup/questionnaire.md` |
| Read ICM conventions | `_core/CONVENTIONS.md` |

## Triggers

| Keyword | Action |
|---------|--------|
| `setup` | Run onboarding from `setup/questionnaire.md` |
| `status` | Report which stage output folders contain artifacts |
| `ship` | Run the validation stage |

## Working Rule

Use staged context to keep tasks small: read the routing file, load only the relevant stage contract, inspect the affected source files, make the change, then validate.
