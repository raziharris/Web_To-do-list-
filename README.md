# My Tasks

A modern minimalist React to do list app for writing tasks, ticking off completed items, filtering your list, and tracking progress.

## How to use

Install dependencies and start the local development server:

```bash
npm install
npm run dev
```

Tasks are saved in your browser with `localStorage`, so they stay there after you close the page.

## Files

- `src/App.jsx` - main app experience
- `src/components/` - reusable UI pieces
- `src/index.css` - Tailwind layers and custom app styling
- `pics/` - local wallpaper images

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
