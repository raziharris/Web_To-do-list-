import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const PROGRESS_NOTE_KEY = "my-tasks-progress-note";

function ProgressCard({ completed, total, progress }) {
  const [note, setNote] = useState(() => localStorage.getItem(PROGRESS_NOTE_KEY) || "");

  useEffect(() => {
    localStorage.setItem(PROGRESS_NOTE_KEY, note);
  }, [note]);

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

      <div className="mt-4">
        <label htmlFor="progress-note" className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#7a5124]">
          Note
        </label>
        <textarea
          id="progress-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="focus-ring min-h-[45vh] w-full resize-y border-2 border-[#a87a3a] bg-[#fff9e8] px-3 py-2 text-sm font-semibold leading-6 text-[#2d1b0b] shadow-pixel outline-none placeholder:text-[#9c7847] sm:min-h-[50vh] lg:min-h-[420px]"
          placeholder="Write your note here..."
          maxLength={500}
        />
      </div>
    </section>
  );
}

export default ProgressCard;
