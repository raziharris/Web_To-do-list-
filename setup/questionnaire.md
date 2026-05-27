# Setup Questionnaire

Read this file when the user types `setup`. Ask all questions in one conversational pass. These configure durable project preferences for this todo app workspace, not a single feature request.

1. What should this app be called in user-facing copy?
   - Default: My Tasks
   - Derive `{{APP_NAME}}`

2. Who is the primary user?
   - Default: one person managing personal tasks
   - Derive `{{PRIMARY_USER}}`

3. What visual direction should future UI changes preserve?
   - Default: modern, minimalist, calm, task-focused
   - Derive `{{VISUAL_DIRECTION}}`

4. Should Supabase be considered required or optional for local development?
   - Default: optional, with localStorage fallback
   - Derive `{{SUPABASE_MODE}}`

5. What validation should run before handoff?
   - Default: `npm run build`
   - Derive `{{VALIDATION_COMMAND}}`

After collecting answers, update `shared/project-profile.md`, `README.md`, and any stage references that contain matching placeholders. Then search for unresolved `{{PLACEHOLDERS}}`.
