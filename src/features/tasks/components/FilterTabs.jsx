import { motion } from "framer-motion";

function FilterTabs({ filters, activeFilter, onChange }) {
  return (
    <div className="pixel-tabs flex" role="tablist" aria-label="Task filters">
      {filters.map((filter) => {
        const isActive = activeFilter === filter;

        return (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(filter)}
            className="filter-tab focus-ring relative min-h-11 flex-1 px-3 text-sm font-bold transition"
          >
            {isActive && (
              <motion.span
                layoutId="active-filter"
                className="filter-tab-active absolute inset-1"
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
