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
      className={`pixel-row group flex cursor-pointer items-center gap-3 px-4 py-3 transition ${
        task.completed ? "opacity-70" : ""
      }`}
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
                className="focus-ring min-h-10 min-w-0 flex-1 border-2 border-[#b88947] bg-[#fff7d8] px-3 text-base outline-none"
                autoFocus
              />
              <button type="submit" className="focus-ring bg-[#f0c05b] px-3 text-sm font-semibold text-[#42270f] shadow-pixel">
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
                className={`break-words text-[15px] font-bold leading-7 transition duration-300 sm:text-base ${
                  task.completed
                    ? "text-[#94713f] line-through decoration-[#39834a] decoration-2"
                    : "text-[#2d1b0b]"
                }`}
              >
                {task.title}
              </p>
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
  );
}

export default TaskItem;
