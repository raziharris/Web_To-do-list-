# Web_To-do-list-

> ICM-assisted workspace for a Vite React todo app

This project uses Interpreted Context Methodology (ICM): staged, filesystem-based guidance instead of external orchestration. For task routing, read `CONTEXT.md` first, then the relevant stage `CONTEXT.md`.

## Project Overview

A small todo web application using React, Vite, Tailwind CSS, Framer Motion, Lucide icons, and Supabase.

**Tech Stack:** React, Vite, Tailwind CSS, Supabase, Node.js
**Architecture:** Frontend-first single page app with Supabase integration

## Quick Start

```bash
npm install
npm run dev
npm run build
```

## ICM Workflow

| Trigger | Action |
|---------|--------|
| `setup` | Read `setup/questionnaire.md` and configure durable project preferences |
| `status` | Scan `stages/*/output/` and report completed/pending workflow stages |
| `ship` | Run validation from `stages/04-validation/CONTEXT.md` |

## Stage Map

| Task Type | Start Here |
|-----------|------------|
| Clarify a feature, bug, or request | `stages/01-intake/CONTEXT.md` |
| Plan a multi-file change | `stages/02-planning/CONTEXT.md` |
| Implement code changes | `stages/03-implementation/CONTEXT.md` |
| Verify, review, and prepare handoff | `stages/04-validation/CONTEXT.md` |

## Code Standards

- Keep changes scoped to the requested behavior.
- Prefer existing React, Tailwind, Supabase, and file-organization patterns.
- Keep React components focused and readable.
- Do not hardcode secrets or credentials.
- Validate user input at boundaries.
- Run `npm run build` before handing off code changes when feasible.

## Important Paths

- `src/main.jsx` - React entry point
- `src/app/` - main app screen and page layout
- `src/features/tasks/` - task components, constants, and helpers
- `src/features/tasks/utils/taskRepository.js` - Supabase and fallback persistence
- `src/shared/` - reusable shared components
- `src/styles/` - Tailwind layers and custom styling
- `supabase/` - database schema and Supabase project files
- `_core/` - upstream ICM conventions copied from `RinDig/Interpreted-Context-Methdology`

## Security

- Never commit `.env.local`, API keys, passwords, or private credentials.
- Keep Supabase anon key usage client-safe and documented.
- Sanitize output and avoid unsafe HTML injection.
- Use repository utilities for persistence instead of scattering storage calls.
