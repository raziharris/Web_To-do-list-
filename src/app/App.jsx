import { motion, Reorder } from "framer-motion";
import { Moon, Plus, SearchCheck, Sparkles, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CalendarView from "../features/tasks/components/CalendarView.jsx";
import FilterTabs from "../features/tasks/components/FilterTabs.jsx";
import ProgressCard from "../features/tasks/components/ProgressCard.jsx";
import TaskItem from "../features/tasks/components/TaskItem.jsx";
import { taskFilters } from "../features/tasks/constants/taskFilters.js";
import { playCompletionPing } from "../features/tasks/utils/completionSound.js";
import { deleteTaskFromSupabase, loadTasksFromSupabase, saveTasksToSupabase } from "../features/tasks/utils/taskRepository.js";
import { isSupabaseConfigured } from "../features/tasks/utils/supabaseClient.js";
import { formatDateKey, loadTasks, saveTasks, THEME_STORAGE_KEY } from "../features/tasks/utils/taskStorage.js";
import EmptyState from "../shared/components/EmptyState.jsx";

function App() {
  const [tasks, setTasks] = useState(() => loadTasks());
  const [newTask, setNewTask] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedDate, setSelectedDate] = useState(formatDateKey());
  const [isRemoteReady, setIsRemoteReady] = useState(!isSupabaseConfigured);
  const [isDark, setIsDark] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) === "dark");

  const completedCount = tasks.filter((task) => task.completed).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  const filteredTasks = useMemo(() => {
    if (activeFilter === "Calendar") {
      return tasks.filter((task) => task.dueDate === selectedDate);
    }

    if (activeFilter === "Active") {
      return tasks.filter((task) => !task.completed);
    }

    if (activeFilter === "Completed") {
      return tasks.filter((task) => task.completed);
    }

    return tasks;
  }, [activeFilter, selectedDate, tasks]);

  useEffect(() => {
    saveTasks(tasks);

    if (!isSupabaseConfigured || !isRemoteReady) {
      return;
    }

    saveTasksToSupabase(tasks).catch((error) => {
      console.warn("Could not save tasks to Supabase.", error);
    });
  }, [isRemoteReady, tasks]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isMounted = true;
    const localTasks = loadTasks();

    async function syncTasksFromSupabase() {
      try {
        const remoteTasks = await loadTasksFromSupabase();

        if (!isMounted) {
          return;
        }

        if (remoteTasks.length > 0) {
          setTasks(remoteTasks);
        } else {
          await saveTasksToSupabase(localTasks);
        }
      } catch (error) {
        console.warn("Could not load tasks from Supabase. Using local tasks for now.", error);
      } finally {
        if (isMounted) {
          setIsRemoteReady(true);
        }
      }
    }

    syncTasksFromSupabase();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  function addTask(event) {
    event.preventDefault();
    const title = newTask.trim();

    if (!title) {
      return;
    }

    setTasks((currentTasks) => [
      {
        id: crypto.randomUUID(),
        title,
        completed: false,
        priority: "Focus",
        dueDate: selectedDate,
        createdAt: Date.now(),
      },
      ...currentTasks,
    ]);
    setNewTask("");
    setActiveFilter(activeFilter === "Calendar" ? "Calendar" : "All");
  }

  function toggleTask(taskId) {
    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        if (!task.completed) {
          playCompletionPing();
        }

        return { ...task, completed: !task.completed };
      }),
    );
  }

  function deleteTask(taskId) {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));

    if (isSupabaseConfigured && isRemoteReady) {
      deleteTaskFromSupabase(taskId).catch((error) => {
        console.warn("Could not delete task from Supabase.", error);
      });
    }
  }

  function editTask(taskId, title) {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    setTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === taskId ? { ...task, title: trimmedTitle } : task)),
    );
  }

  function taskMatchesActiveFilter(task) {
    if (activeFilter === "Calendar") {
      return task.dueDate === selectedDate;
    }

    if (activeFilter === "Active") {
      return !task.completed;
    }

    if (activeFilter === "Completed") {
      return task.completed;
    }

    return true;
  }

  function reorderVisibleTasks(reorderedVisibleTasks) {
    setTasks((currentTasks) => {
      let visibleIndex = 0;

      return currentTasks.map((task) => {
        if (!taskMatchesActiveFilter(task)) {
          return task;
        }

        const reorderedTask = reorderedVisibleTasks[visibleIndex];
        visibleIndex += 1;
        return reorderedTask;
      });
    });
  }

  function selectCalendarDate(dateKey) {
    setSelectedDate(dateKey);
    setActiveFilter("Calendar");
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 text-ink dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-[8%] top-10 h-36 w-36 rounded-full bg-skysoft/70 blur-3xl dark:bg-sky-500/20" />
      <div className="pointer-events-none absolute right-[7%] top-52 h-48 w-48 rounded-full bg-sage/80 blur-3xl dark:bg-emerald-400/15" />
      <div className="pointer-events-none absolute bottom-10 left-1/3 h-40 w-40 rounded-full bg-slate-200/70 blur-3xl dark:bg-slate-500/20" />

      <section className="relative mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-5xl flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="glass-panel rounded-[2rem] p-4 sm:p-6 lg:p-8"
        >
          <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-skysoft to-sage shadow-card dark:from-sky-500/35 dark:to-emerald-400/25">
                <SearchCheck className="h-7 w-7 text-emerald-800 dark:text-emerald-100" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">My Tasks</h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                  Small steps count. Choose one, finish it gently.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/72 p-2 pr-4 shadow-card dark:border-white/10 dark:bg-slate-900/75">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-sage text-sm font-bold text-emerald-900 dark:bg-emerald-400/25 dark:text-emerald-100">
                  MT
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-200">Today</span>
              </div>
              <button
                type="button"
                onClick={() => setIsDark((current) => !current)}
                className="focus-ring grid h-12 w-12 place-items-center rounded-2xl border border-white/70 bg-white/75 text-slate-600 shadow-card transition hover:-translate-y-0.5 hover:bg-skysoft dark:border-white/10 dark:bg-slate-900/75 dark:text-slate-100 dark:hover:bg-slate-800"
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-5">
              <form onSubmit={addTask} className="soft-card flex flex-col gap-3 p-3 sm:flex-row">
                <label htmlFor="task-input" className="sr-only">
                  New task
                </label>
                <input
                  id="task-input"
                  value={newTask}
                  onChange={(event) => setNewTask(event.target.value)}
                  className="focus-ring min-h-14 flex-1 rounded-2xl border border-slate-200/80 bg-white/90 px-5 text-base text-slate-800 outline-none transition placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500"
                  placeholder="What do you want to do today?"
                  maxLength={120}
                  autoComplete="off"
                />
                <label htmlFor="task-date" className="sr-only">
                  Task date
                </label>
                <input
                  id="task-date"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="focus-ring min-h-14 rounded-2xl border border-slate-200/80 bg-white/90 px-4 text-sm font-medium text-slate-600 outline-none transition dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100"
                  aria-label="Task date"
                />
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                >
                  <Plus className="h-5 w-5" aria-hidden="true" />
                  Add Task
                </motion.button>
              </form>

              <FilterTabs filters={taskFilters} activeFilter={activeFilter} onChange={setActiveFilter} />

              {activeFilter === "Calendar" && (
                <CalendarView tasks={tasks} selectedDate={selectedDate} onSelectDate={selectCalendarDate} />
              )}

              {filteredTasks.length > 0 ? (
                <Reorder.Group
                  axis="y"
                  values={filteredTasks}
                  onReorder={reorderVisibleTasks}
                  as="div"
                  className="space-y-3"
                  aria-live="polite"
                >
                  {filteredTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onToggle={toggleTask}
                        onDelete={deleteTask}
                        onEdit={editTask}
                      />
                    ))}
                </Reorder.Group>
              ) : (
                <div aria-live="polite">
                  <EmptyState filter={activeFilter} />
                </div>
              )}
            </div>

            <aside className="space-y-5">
              <ProgressCard completed={completedCount} total={tasks.length} progress={progress} />

              <div className="soft-card p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
                  <Sparkles className="h-4 w-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                  Gentle focus
                </div>
                <p className="text-sm leading-6 text-slate-500 dark:text-slate-300">
                  Keep the list short, finish what matters, and let completed cards fade quietly out of your head.
                </p>
              </div>
            </aside>
          </div>
        </motion.div>
      </section>
    </main>
  );
}

export default App;
