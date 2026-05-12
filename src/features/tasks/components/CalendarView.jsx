import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

const weekDays = ["S", "M", "T", "W", "T", "F", "S"];
const monthFormatter = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });
const selectedDateFormatter = new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" });

function createDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function CalendarView({ tasks, selectedDate, onSelectDate }) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = parseDateKey(selectedDate);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const taskCountByDate = useMemo(() => {
    return tasks.reduce((counts, task) => {
      counts[task.dueDate] = (counts[task.dueDate] || 0) + 1;
      return counts;
    }, {});
  }, [tasks]);

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let index = 0; index < firstDay; index += 1) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push(createDateKey(year, month, day));
    }

    return days;
  }, [visibleMonth]);

  function moveMonth(direction) {
    setVisibleMonth((currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1));
  }

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="pixel-panel p-4 sm:p-5"
      aria-label="Task calendar"
      data-cat-zone="calendar"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          className="focus-ring grid h-9 w-9 place-items-center text-[#241609] transition hover:text-[#8b5b22]"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-7 w-7" aria-hidden="true" />
        </button>

        <h2 className="text-xl font-bold text-[#241609]">{monthFormatter.format(visibleMonth)}</h2>

        <button
          type="button"
          onClick={() => moveMonth(1)}
          className="focus-ring grid h-9 w-9 place-items-center text-[#241609] transition hover:text-[#8b5b22]"
          aria-label="Next month"
        >
          <ChevronRight className="h-7 w-7" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-sm font-bold text-[#241609]">
        {weekDays.map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-7 gap-2">
        {calendarDays.map((dateKey, index) => {
          if (!dateKey) {
            return <span key={`blank-${index}`} className="aspect-square" aria-hidden="true" />;
          }

          const date = parseDateKey(dateKey);
          const taskCount = taskCountByDate[dateKey] || 0;
          const isSelected = dateKey === selectedDate;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              className={`focus-ring relative aspect-square rounded-[5px] p-1 text-base font-bold transition hover:-translate-y-0.5 ${
                isSelected
                  ? "border-2 border-[#9d6b24] bg-[#efc45d] text-[#241609] shadow-pixel"
                  : "text-[#241609] hover:bg-[#f4da9b]"
              }`}
              aria-label={`${selectedDateFormatter.format(date)}${taskCount ? `, ${taskCount} tasks` : ""}`}
            >
              <span>{date.getDate()}</span>
              {taskCount > 0 && (
                <span
                  className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                    isSelected ? "bg-[#241609]" : "bg-[#2f8b45]"
                  }`}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </motion.section>
  );
}

export default CalendarView;
