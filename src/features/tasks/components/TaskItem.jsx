import { AnimatePresence, motion } from "framer-motion";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

const taskDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatTaskDate(dateKey) {
  if (!dateKey) {
    return "No date";
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  return taskDateFormatter.format(new Date(year, month - 1, day));
}

function TaskItem({ task, onToggle, onDelete, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [dragHint, setDragHint] = useState(null);

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

  function handleDragEnd(_event, info) {
    setDragHint(null);

    if (isEditing) {
      return;
    }

    if (info.offset.x > 72) {
      onToggle(task.id);
      return;
    }

    if (info.offset.x < -72) {
      setDraft(task.title);
      setIsEditing(true);
    }
  }

  return (
    <motion.div layout className="task-swipe-shell relative">
      <div className="task-swipe-rail absolute inset-0 hidden items-center justify-between px-4 sm:hidden" aria-hidden="true">
        <span className={`task-swipe-chip ${dragHint === "toggle" ? "is-visible" : ""}`}>
          <Check className="h-4 w-4" />
        </span>
        <span className={`task-swipe-chip ${dragHint === "edit" ? "is-visible" : ""}`}>
          <Pencil className="h-4 w-4" />
        </span>
      </div>
      <motion.article
        layout
        drag={!isEditing ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        onDrag={(_event, info) => {
          if (info.offset.x > 24) {
            setDragHint("toggle");
          } else if (info.offset.x < -24) {
            setDragHint("edit");
          } else {
            setDragHint(null);
          }
        }}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: task.completed ? 0.72 : 1, y: 0, scale: task.completed ? 0.985 : 1 }}
        exit={{ opacity: 0, x: -18, scale: 0.98 }}
        transition={{ duration: 0.22, type: "spring", stiffness: 420, damping: 28 }}
        whileHover={!isEditing ? { y: -2 } : undefined}
        whileTap={!isEditing ? { scale: 0.985 } : undefined}
        onClick={toggleFromCard}
        className={`pixel-row group relative flex cursor-pointer touch-pan-y items-start gap-3 overflow-hidden px-3 py-3 transition sm:items-center sm:px-4 ${
          task.completed ? "task-complete opacity-70" : "task-active"
        }`}
        data-cat-zone="task"
      >
      <button
        type="button"
        onClick={() => onToggle(task.id)}
        className={`focus-ring grid h-7 w-7 shrink-0 place-items-center rounded-[4px] border-2 transition ${
          task.completed
            ? "border-[#8c6a35] bg-[#39834a] text-[#fff4c8]"
            : "border-[#b88947] bg-[#fff7d8] text-transparent hover:bg-[#f2cf7c]"
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

      <div className="min-w-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.form
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={saveEdit}
              className="flex min-w-0 flex-col gap-2 sm:flex-row"
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="focus-ring min-h-10 min-w-0 w-full flex-1 border-2 border-[#b88947] bg-[#fff7d8] px-3 text-base outline-none"
                autoFocus
              />
              <button type="submit" className="focus-ring min-h-10 bg-[#f0c05b] px-3 text-sm font-semibold text-[#42270f] shadow-pixel">
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
                className={`max-w-full whitespace-pre-wrap break-words text-[15px] font-bold leading-6 [overflow-wrap:anywhere] transition duration-300 sm:text-base sm:leading-7 ${
                  task.completed
                    ? "text-[#94713f] line-through decoration-[#39834a] decoration-2"
                    : "text-[#2d1b0b]"
                }`}
              >
                {task.title}
              </p>
              <span className="mt-1 inline-flex border-2 border-[#d4a661] bg-[#fff7d8] px-2 py-0.5 text-[10px] font-bold uppercase leading-4 text-[#7a5124] sm:hidden">
                {formatTaskDate(task.dueDate)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <span className="hidden min-w-[112px] text-right text-sm font-bold text-[#8b6331] sm:inline-block">
        {formatTaskDate(task.dueDate)}
      </span>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => {
            setDraft(task.title);
            setIsEditing((current) => !current);
          }}
          className="focus-ring grid h-8 w-8 place-items-center text-[#a3793d] transition hover:text-[#704414]"
          aria-label={isEditing ? "Cancel editing task" : "Edit task"}
        >
          {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="focus-ring grid h-8 w-8 place-items-center text-[#a3793d] transition hover:text-[#9c271d]"
          aria-label="Delete task"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      </motion.article>
    </motion.div>
  );
}

export default TaskItem;
