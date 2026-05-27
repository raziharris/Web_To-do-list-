# Project Profile

## Purpose

My Tasks is a minimalist todo app for writing tasks, marking them complete, filtering the list, and tracking progress.

## Stack

- React with Vite
- Tailwind CSS
- Framer Motion
- Lucide icons
- Supabase with localStorage fallback

## Source Layout

| Path | Purpose |
|------|---------|
| `src/main.jsx` | React entry point |
| `src/app/App.jsx` | App shell and main screen |
| `src/features/tasks/components/` | Task feature UI components |
| `src/features/tasks/constants/` | Task constants |
| `src/features/tasks/utils/` | Storage, Supabase, sound, and repository helpers |
| `src/shared/components/` | Shared reusable UI |
| `src/styles/index.css` | Tailwind layers and global styling |
| `supabase/schema.sql` | Database schema |

## Quality Rules

- Match existing component and styling patterns before adding abstractions.
- Keep state and persistence logic centralized in task utilities.
- Preserve the localStorage fallback when changing Supabase behavior.
- Keep UI responsive across mobile and desktop.
- Run `npm run build` after source changes when practical.

## Environment

The app reads:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Do not commit real environment values.
