import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

const taskDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const compactTaskDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

function formatTaskDate(dateKey) {
  if (!dateKey) {
    return "No date";
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  return taskDateFormatter.format(new Date(year, month - 1, day));
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTaskDateLabel(dateKey) {
  if (!dateKey) {
    return "No date";
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const taskDate = new Date(year, month - 1, day);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const shortDate = compactTaskDateFormatter.format(taskDate);

  if (dateKey === getDateKey(today)) {
    return `Today · ${shortDate}`;
  }

  if (dateKey === getDateKey(tomorrow)) {
    return `Tomorrow · ${shortDate}`;
  }

  return `Later · ${shortDate}`;
}

function getDaysLeft(dateKey) {
  if (!dateKey) {
    return null;
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const dueDate = new Date(year, month - 1, day);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.round((dueDate.getTime() - startOfToday.getTime()) / msPerDay);

  if (daysLeft === 0) {
    return "Today";
  }

  if (daysLeft === 1) {
    return "1 day left";
  }

  if (daysLeft > 1) {
    return `${daysLeft} days left`;
  }

  return `${Math.abs(daysLeft)} days overdue`;
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
        className={`pixel-row group relative flex cursor-pointer touch-pan-y items-start gap-3 overflow-hidden px-3.5 py-3.5 transition sm:gap-4 sm:px-4 ${
          task.completed ? "task-complete opacity-70" : "task-active"
        }`}
        data-cat-zone="task"
      >
      <button
        type="button"
        onClick={() => onToggle(task.id)}
        className={`task-check-button focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-[4px] border-2 transition ${
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
                className="task-edit-input focus-ring min-h-11 min-w-0 w-full flex-1 border-2 px-3 text-base font-bold outline-none"
                autoFocus
              />
              <button type="submit" className="task-save-button focus-ring min-h-11 px-3 text-sm font-bold shadow-pixel">
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
                className={`task-title max-w-full whitespace-pre-wrap break-words text-base font-black leading-7 [overflow-wrap:anywhere] transition duration-300 sm:text-[17px] sm:leading-8 ${
                  task.completed ? "is-complete line-through decoration-2" : ""
                }`}
              >
                {task.title}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="task-row-footer mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="task-date-chip inline-flex max-w-full flex-wrap items-center gap-1.5 border-2 px-2.5 py-1.5 text-[11px] font-bold leading-4" title={formatTaskDate(task.dueDate)}>
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{formatTaskDateLabel(task.dueDate)}</span>
            {task.dueDate ? (
              <span className="task-days-left text-[10px] font-black">
                {getDaysLeft(task.dueDate)}
              </span>
            ) : null}
          </span>

          <div className="task-row-actions ml-auto flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setDraft(task.title);
                setIsEditing((current) => !current);
              }}
              className="task-action-button focus-ring grid h-9 w-9 place-items-center border-2 transition"
              aria-label={isEditing ? "Cancel editing task" : "Edit task"}
            >
              {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="task-action-button task-delete-button focus-ring grid h-9 w-9 place-items-center border-2 transition"
              aria-label="Delete task"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      </motion.article>
    </motion.div>
  );
}

export default TaskItem;
