import { motion } from "framer-motion";

function FilterTabs({ filters, activeFilter, onChange }) {
  return (
    <div className="soft-card flex gap-2 p-2" role="tablist" aria-label="Task filters">
      {filters.map((filter) => {
        const isActive = activeFilter === filter;

        return (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(filter)}
            className="focus-ring relative min-h-11 flex-1 rounded-2xl px-4 text-sm font-semibold text-slate-500 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            {isActive && (
              <motion.span
                layoutId="active-filter"
                className="absolute inset-0 rounded-2xl bg-skysoft shadow-card dark:bg-slate-800"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{filter}</span>
          </button>
        );
      })}
    </div>
  );
}

export default FilterTabs;
