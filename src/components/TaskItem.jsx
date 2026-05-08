import { AnimatePresence, motion } from "framer-motion";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

function TaskItem({ task, onToggle, onDelete, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  function saveEdit(event) {
    event.preventDefault();
    onEdit(task.id, draft);
    setIsEditing(false);
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: task.completed ? 0.66 : 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -18, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="soft-card group flex items-center gap-3 p-4"
    >
      <button
        type="button"
        onClick={() => onToggle(task.id)}
        className={`focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-xl border transition ${
          task.completed
            ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-slate-950"
            : "border-slate-300 bg-white text-transparent hover:border-emerald-600 dark:border-slate-600 dark:bg-slate-950/60"
        }`}
        aria-label={task.completed ? "Mark task active" : "Mark task completed"}
      >
        <Check className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.form
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={saveEdit}
              className="flex gap-2"
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="focus-ring min-h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                autoFocus
              />
              <button type="submit" className="focus-ring rounded-xl bg-sage px-3 text-sm font-semibold text-emerald-900 dark:bg-emerald-400 dark:text-slate-950">
                Save
              </button>
            </motion.form>
          ) : (
            <motion.p
              key="title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`break-words text-sm font-medium leading-6 transition ${
                task.completed ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-800 dark:text-slate-100"
              }`}
            >
              {task.title}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => {
            setDraft(task.title);
            setIsEditing((current) => !current);
          }}
          className="focus-ring grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-skysoft hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label={isEditing ? "Cancel editing task" : "Edit task"}
        >
          {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="focus-ring grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/12 dark:hover:text-rose-300"
          aria-label="Delete task"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </motion.article>
  );
}

export default TaskItem;
