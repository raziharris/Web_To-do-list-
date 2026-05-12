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
            className="focus-ring relative min-h-12 flex-1 border-r-2 border-[#c2914e] px-4 text-sm font-bold text-[#2d1b0b] transition last:border-r-0 hover:bg-[#f6dc9d]"
          >
            {isActive && (
              <motion.span
                layoutId="active-filter"
                className="absolute inset-0 bg-[#f0c05b] shadow-pixel"
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
