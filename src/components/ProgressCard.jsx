import { motion } from "framer-motion";

function ProgressCard({ completed, total, progress }) {
  return (
    <section className="soft-card p-5" aria-label="Task progress">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Progress</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            {completed} of {total} tasks completed
          </p>
        </div>
        <span className="rounded-2xl bg-sage px-3 py-1 text-sm font-bold text-emerald-900 dark:bg-emerald-400/25 dark:text-emerald-100">
          {progress}%
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-400"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      </div>
    </section>
  );
}

export default ProgressCard;
