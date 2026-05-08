import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

  const completedByDate = useMemo(() => {
    return tasks.reduce((counts, task) => {
      if (task.completed) {
        counts[task.dueDate] = (counts[task.dueDate] || 0) + 1;
      }

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
      className="soft-card p-4 sm:p-5"
      aria-label="Task calendar"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{monthFormatter.format(visibleMonth)}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Selected: {selectedDateFormatter.format(parseDateKey(selectedDate))}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="focus-ring grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:-translate-y-0.5 hover:bg-skysoft dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:bg-slate-800"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="focus-ring grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:-translate-y-0.5 hover:bg-skysoft dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:bg-slate-800"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
        {weekDays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-7 gap-2">
        {calendarDays.map((dateKey, index) => {
          if (!dateKey) {
            return <span key={`blank-${index}`} className="aspect-square" aria-hidden="true" />;
          }

          const date = parseDateKey(dateKey);
          const taskCount = taskCountByDate[dateKey] || 0;
          const completedCount = completedByDate[dateKey] || 0;
          const isSelected = dateKey === selectedDate;
          const isComplete = taskCount > 0 && completedCount === taskCount;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              className={`focus-ring relative aspect-square rounded-2xl border p-1 text-sm font-semibold transition hover:-translate-y-0.5 ${
                isSelected
                  ? "border-emerald-600 bg-emerald-700 text-white shadow-card dark:border-emerald-300 dark:bg-emerald-400 dark:text-slate-950"
                  : "border-white/80 bg-white/70 text-slate-700 hover:bg-skysoft dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
              aria-label={`${selectedDateFormatter.format(date)}${taskCount ? `, ${taskCount} tasks` : ""}`}
            >
              <span>{date.getDate()}</span>
              {taskCount > 0 && (
                <span
                  className={`absolute bottom-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full ${
                    isSelected ? "bg-white dark:bg-slate-950" : isComplete ? "bg-emerald-500" : "bg-sky-400"
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
