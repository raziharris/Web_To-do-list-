# My Tasks

A modern minimalist React to do list app for writing tasks, ticking off completed items, filtering your list, and tracking progress.

## How to use

Install dependencies and start the local development server:

```bash
npm install
npm run dev
```

Tasks are saved in Supabase when the app is configured with Supabase environment variables. The app also keeps a `localStorage` fallback, so it can still run locally before Supabase is connected.

## Supabase setup

1. Create a Supabase project.
2. Open the Supabase SQL editor and run the SQL in `supabase/schema.sql`.
3. Copy `.env.example` to `.env.local`.
4. Add your project URL and anon key:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Restart the dev server after changing env variables.

When Supabase is configured, the app merges any tasks already saved in this browser into Supabase on first load. That keeps your existing list from disappearing when you move the same site to Netlify.

## Deploy to Netlify

The repo includes `netlify.toml`, so Netlify can build the Vite app automatically.

The website opens behind a password gate. Visitors must know the shared website password before the task app loads.

Use these environment variables in Netlify:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Add them in Netlify under **Site configuration > Environment variables**, then deploy. Without these variables, the app still works locally in the browser, but tasks will not sync through Supabase on the Netlify site.

## Files

- `src/main.jsx` - starts the React app
- `src/app/` - main app screen and page layout
- `src/features/tasks/` - task-specific components, constants, and helpers
- `src/shared/` - reusable components that can be used anywhere
- `src/styles/` - Tailwind layers and custom app styling
- `pics/` - local wallpaper images

## Folder structure

```text
src/
  app/
    App.jsx
  features/
    tasks/
      components/
        FilterTabs.jsx
        ProgressCard.jsx
        TaskItem.jsx
      constants/
        taskFilters.js
      utils/
        completionSound.js
        supabaseClient.js
        taskRepository.js
        taskStorage.js
  shared/
    components/
      EmptyState.jsx
  styles/
    index.css
  main.jsx
```

The task feature has everything related to tasks in one place. If you want to change how tasks look, start in `src/features/tasks/components/`. If you want to change Supabase reads and writes, start in `src/features/tasks/utils/taskRepository.js`.

## Push to GitHub

```bash
git add .
git commit -m "Create todo list website"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

## Deploy to Vercel

Use these settings:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Root Directory: ./
```

## Domain & Tunnel Notes

For the polished domain, DNS, homelab, and Cloudflare Tunnel explanation, see [`docs/domain-and-tunnel-guide.md`](docs/domain-and-tunnel-guide.md).
