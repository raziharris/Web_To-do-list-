import { motion } from "framer-motion";

function EmptyState({ filter }) {
  const message =
    filter === "Completed"
      ? "Completed tasks will show up here once you tick something off."
      : filter === "Active"
        ? "No active tasks right now. A rare and beautiful kind of quiet."
        : "Your list is clear. Add one gentle task to begin.";

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="soft-card grid place-items-center px-6 py-12 text-center"
    >
      <div className="relative mb-5 h-28 w-32">
        <div className="absolute bottom-0 left-4 h-20 w-24 rounded-[2rem] bg-skysoft shadow-card dark:bg-sky-500/25" />
        <div className="absolute left-10 top-2 h-16 w-16 rounded-full bg-sage shadow-card dark:bg-emerald-400/25" />
        <div className="absolute bottom-7 left-11 h-4 w-4 rounded-full bg-white dark:bg-slate-100" />
        <div className="absolute bottom-7 right-11 h-4 w-4 rounded-full bg-white dark:bg-slate-100" />
        <div className="absolute bottom-4 left-1/2 h-2 w-8 -translate-x-1/2 rounded-full bg-white/90 dark:bg-slate-100" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Nothing here</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-300">{message}</p>
    </motion.section>
  );
}

export default EmptyState;
