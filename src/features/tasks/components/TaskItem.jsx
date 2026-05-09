import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

function formatTaskDate(dateKey) {
  if (!dateKey) {
    return "No date";
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(year, month - 1, day));
}

function TaskItem({ task, onToggle, onDelete, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  function saveEdit(event) {
    event.preventDefault();
    onEdit(task.id, draft);
    setIsEditing(false);
  }

  function toggleFromCard(event) {
    if (isEditing || event.target.closest("button, input, form")) {
      return;
    }

    onToggle(task.id);
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: task.completed ? 0.72 : 1, y: 0, scale: task.completed ? 0.985 : 1 }}
      exit={{ opacity: 0, x: -18, scale: 0.98 }}
      transition={{ duration: 0.22, type: "spring", stiffness: 420, damping: 28 }}
      whileHover={!isEditing ? { y: -2 } : undefined}
      whileTap={!isEditing ? { scale: 0.985 } : undefined}
      onClick={toggleFromCard}
      className={`soft-card group flex cursor-pointer items-center gap-3 p-4 transition hover:border-emerald-100 hover:bg-white/95 hover:shadow-soft dark:hover:border-emerald-300/20 dark:hover:bg-slate-900/95 ${
        task.completed ? "bg-emerald-50/80 dark:bg-emerald-400/10" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(task.id)}
        className={`focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition ${
          task.completed
            ? "scale-105 border-emerald-600 bg-emerald-600 text-white shadow-[0_8px_18px_rgba(5,150,105,0.22)] dark:border-emerald-400 dark:bg-emerald-400 dark:text-slate-950"
            : "border-slate-300 bg-white text-transparent hover:border-emerald-600 group-hover:border-emerald-500 dark:border-slate-600 dark:bg-slate-950/60"
        }`}
        aria-label={task.completed ? "Mark task active" : "Mark task completed"}
      >
        <motion.span
          animate={{ scale: task.completed ? [0.7, 1.22, 1] : 1, rotate: task.completed ? [0, -8, 0] : 0 }}
          transition={{ duration: 0.28 }}
        >
          <Check className="h-5 w-5" aria-hidden="true" />
        </motion.span>
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
                className="focus-ring min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-base outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                autoFocus
              />
              <button type="submit" className="focus-ring rounded-xl bg-sage px-3 text-sm font-semibold text-emerald-900 dark:bg-emerald-400 dark:text-slate-950">
                Save
              </button>
            </motion.form>
          ) : (
            <motion.div
              key="title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p
                className={`break-words text-[15px] font-medium leading-7 transition duration-300 sm:text-base ${
                  task.completed
                    ? "text-slate-400 line-through decoration-emerald-500/70 decoration-2 dark:text-slate-500"
                    : "text-slate-800 dark:text-slate-100"
                }`}
              >
                {task.title}
              </p>
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-skysoft/70 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {formatTaskDate(task.dueDate)}
              </span>
            </motion.div>
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
