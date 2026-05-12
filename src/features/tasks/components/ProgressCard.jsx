import { motion } from "framer-motion";

function ProgressCard({ completed, total, progress }) {
  return (
    <section className="pixel-panel p-5" aria-label="Task progress" data-cat-zone="progress">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#241609]">Progress</h2>
          <p className="mt-3 text-sm font-bold text-[#241609]">
            {completed} of {total} tasks completed
          </p>
        </div>
        <span className="text-lg font-bold text-[#22723c]">
          {progress}%
        </span>
      </div>

      <div className="h-4 overflow-hidden rounded-[4px] border-2 border-[#a87a3a] bg-[#c6a467]" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
        <motion.div
          className="h-full rounded-[2px] border-r-2 border-[#145522] bg-[#3d9348]"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      </div>
    </section>
  );
}

export default ProgressCard;
