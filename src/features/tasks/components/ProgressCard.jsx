import { motion } from "framer-motion";

function ProgressCard({ completed, total, progress }) {
  return (
    <section className="pixel-panel p-4" aria-label="Task progress" data-cat-zone="progress">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold leading-5 text-[#241609]">Progress</h2>
          <p className="mt-1 text-xs font-bold text-[#7a5124]">
            {completed} of {total} tasks completed
          </p>
        </div>
        <span className="text-base font-bold text-[#22723c]">
          {progress}%
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-[4px] border-2 border-[#a87a3a] bg-[#c6a467]" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
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
