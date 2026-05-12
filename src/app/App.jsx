import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Leaf,
  LockKeyhole,
  Moon,
  Plus,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import CalendarView from "../features/tasks/components/CalendarView.jsx";
import FilterTabs from "../features/tasks/components/FilterTabs.jsx";
import ProgressCard from "../features/tasks/components/ProgressCard.jsx";
import TaskItem from "../features/tasks/components/TaskItem.jsx";
import WalkingCharacter from "../features/tasks/components/WalkingCharacter.jsx";
import { taskFilters } from "../features/tasks/constants/taskFilters.js";
import { playCompletionPing } from "../features/tasks/utils/completionSound.js";
import {
  clearTasksFromSupabase,
  deleteTaskFromSupabase,
  loadTasksFromSupabase,
  saveTasksToSupabase,
} from "../features/tasks/utils/taskRepository.js";
import { isSupabaseConfigured, supabase } from "../features/tasks/utils/supabaseClient.js";
import {
  formatDateKey,
  hasStoredTasks,
  loadTasks,
  saveTasks,
  THEME_STORAGE_KEY,
} from "../features/tasks/utils/taskStorage.js";
import EmptyState from "../shared/components/EmptyState.jsx";

const PASSWORD_SESSION_KEY = "my-tasks-password-unlocked";
const REMOTE_MIGRATION_KEY = "my-tasks-remote-migrated";
const SITE_PASSWORD_HASH = "9e468432d7dde30ef9c431eb88b6951b2928dc337b88f349a5db9d124b88bada";
const gardenCompanions = [
  { id: "cuzi", profile: "cuzi" },
  { id: "cunim", profile: "cunim" },
];

const taskDateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

function getTaskDateValue(task) {
  if (task.dueDate) {
    const [year, month, day] = task.dueDate.split("-").map(Number);
    return new Date(year, month - 1, day).getTime();
  }

  return task.createdAt || 0;
}

function getTaskTimeValue(task) {
  if (!task.time) {
    return Number.MAX_SAFE_INTEGER;
  }

  const match = task.time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const [, hourValue, minuteValue, meridiem] = match;
  const hour = Number(hourValue) % 12;
  const minute = Number(minuteValue);

  return (hour + (meridiem.toUpperCase() === "PM" ? 12 : 0)) * 60 + minute;
}

function sortTasksByStatusAndDate(taskList) {
  return [...taskList].sort((firstTask, secondTask) => {
    if (firstTask.completed !== secondTask.completed) {
      return firstTask.completed ? 1 : -1;
    }

    return getTaskDateValue(firstTask) - getTaskDateValue(secondTask) || (firstTask.createdAt || 0) - (secondTask.createdAt || 0);
  });
}

function mergeTasks(remoteTasks, localTasks) {
  const tasksById = new Map();

  remoteTasks.forEach((task) => {
    tasksById.set(task.id, task);
  });

  localTasks.forEach((task) => {
    tasksById.set(task.id, {
      ...tasksById.get(task.id),
      ...task,
    });
  });

  return sortTasksByStatusAndDate([...tasksById.values()]);
}

async function hashPassword(password) {
  const encodedPassword = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encodedPassword);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function PasswordGate({ onUnlock }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  async function unlockWebsite(event) {
    event.preventDefault();
    setIsChecking(true);
    setError("");

    try {
      const passwordHash = await hashPassword(password);

      if (passwordHash === SITE_PASSWORD_HASH) {
        sessionStorage.setItem(PASSWORD_SESSION_KEY, "true");
        onUnlock();
        return;
      }

      setError("Wrong password.");
      setPassword("");
    } catch (unlockError) {
      console.warn("Could not check website password.", unlockError);
      setError("This browser could not check the password.");
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <main className="pixel-world relative grid min-h-screen place-items-center overflow-hidden px-4 text-[#241609]">
      <div className="pixel-sky" aria-hidden="true">
        <span className="cloud cloud-left" />
        <span className="cloud cloud-right" />
      </div>
      <div className="pixel-hills" aria-hidden="true" />
      <div className="pixel-garden" aria-hidden="true">
        <span className="tree tree-left" />
        <span className="tree tree-right" />
        <span className="fence fence-left" />
        <span className="fence fence-right" />
        <span className="path" />
        <span className="pond" />
        <span className="flower-bed flower-left" />
        <span className="flower-bed flower-right" />
      </div>

      <section className="pixel-panel relative z-10 w-full max-w-md p-6 sm:p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center bg-[#2f8b45] text-[#fff7d8] shadow-pixel">
            <LockKeyhole className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-normal">Private Tasks</h1>
            <p className="text-sm font-bold text-[#7a5124]">Password required</p>
          </div>
        </div>

        <form onSubmit={unlockWebsite} className="space-y-4">
          <div className="pixel-input px-4 py-3">
            <label htmlFor="website-password" className="sr-only">
              Website password
            </label>
            <input
              id="website-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="focus-ring min-h-11 w-full bg-transparent text-lg font-bold text-[#2d1b0b] outline-none placeholder:text-[#9c7847]"
              placeholder="Enter password"
              autoComplete="current-password"
              autoFocus
            />
          </div>

          {error && <p className="text-sm font-bold text-[#9c271d]">{error}</p>}

          <button
            type="submit"
            disabled={isChecking || password.length === 0}
            className="focus-ring inline-flex min-h-12 w-full items-center justify-center bg-[#f0c05b] px-5 font-bold text-[#42270f] shadow-pixel transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
          >
            {isChecking ? "Checking..." : "Unlock"}
          </button>
        </form>
      </section>
    </main>
  );
}

function TodoApp() {
  const [tasks, setTasks] = useState(() => loadTasks());
  const [newTask, setNewTask] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [activePanel, setActivePanel] = useState("Progress");
  const [selectedDate, setSelectedDate] = useState(formatDateKey());
  const [isRemoteReady, setIsRemoteReady] = useState(!isSupabaseConfigured);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [activeReactionTaskId, setActiveReactionTaskId] = useState(null);
  const [isDark, setIsDark] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) === "dark");
  const applyingRemoteTasksRef = useRef(false);
  const characterSafeSpace = 170;

  const completedCount = tasks.filter((task) => task.completed).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const nextTask = useMemo(() => {
    return tasks
      .filter((task) => !task.completed)
      .sort(
        (firstTask, secondTask) =>
          getTaskDateValue(firstTask) - getTaskDateValue(secondTask) ||
          getTaskTimeValue(firstTask) - getTaskTimeValue(secondTask) ||
          (firstTask.createdAt || 0) - (secondTask.createdAt || 0),
      )[0];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let visibleTasks = tasks;

    if (activeFilter === "Active") {
      visibleTasks = tasks.filter((task) => !task.completed);
      return sortTasksByStatusAndDate(visibleTasks);
    }

    if (activeFilter === "Completed") {
      visibleTasks = tasks.filter((task) => task.completed);
      return sortTasksByStatusAndDate(visibleTasks);
    }

    return sortTasksByStatusAndDate(visibleTasks);
  }, [activeFilter, tasks]);

  useEffect(() => {
    saveTasks(tasks);

    if (applyingRemoteTasksRef.current) {
      applyingRemoteTasksRef.current = false;
      return;
    }

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
    let refreshTimerId;

    async function applyTasksFromSupabase({ mergeLocalTasks = false } = {}) {
      try {
        const remoteTasks = await loadTasksFromSupabase();
        const shouldMigrateLocalTasks =
          mergeLocalTasks && localStorage.getItem(REMOTE_MIGRATION_KEY) !== "true" && hasStoredTasks();
        const nextTasks = shouldMigrateLocalTasks
          ? mergeTasks(remoteTasks, loadTasks())
          : sortTasksByStatusAndDate(remoteTasks);

        if (!isMounted) {
          return;
        }

        applyingRemoteTasksRef.current = true;
        setTasks(nextTasks);

        if (shouldMigrateLocalTasks && nextTasks.length > 0) {
          await saveTasksToSupabase(nextTasks);
        }

        localStorage.setItem(REMOTE_MIGRATION_KEY, "true");
      } catch (error) {
        console.warn("Could not load tasks from Supabase. Using local tasks for now.", error);
      } finally {
        if (isMounted) {
          setIsRemoteReady(true);
        }
      }
    }

    applyTasksFromSupabase({ mergeLocalTasks: true });

    const syncChannel = supabase
      .channel("tasks-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        applyTasksFromSupabase();
      })
      .subscribe();

    refreshTimerId = window.setInterval(() => {
      applyTasksFromSupabase();
    }, 8000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshTimerId);
      supabase.removeChannel(syncChannel);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  function showCompletionReaction(taskId) {
    setActiveReactionTaskId(taskId);
    window.setTimeout(() => {
      setActiveReactionTaskId((currentId) => (currentId === taskId ? null : currentId));
    }, 1500);
  }

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
        priority: "Work",
        time: "9:00 AM",
        dueDate: selectedDate,
        createdAt: Date.now(),
      },
      ...currentTasks,
    ]);
    setNewTask("");
    setActiveFilter("All");
  }

  function toggleTask(taskId) {
    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        if (!task.completed) {
          playCompletionPing();
          showCompletionReaction(taskId);
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

  function clearAllTasks() {
    setTasks([]);
    setIsClearDialogOpen(false);

    if (isSupabaseConfigured && isRemoteReady) {
      clearTasksFromSupabase().catch((error) => {
        console.warn("Could not clear tasks from Supabase.", error);
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

  function selectCalendarDate(dateKey) {
    setSelectedDate(dateKey);
  }

  return (
    <main
      className="pixel-world relative min-h-screen overflow-hidden px-4 pt-6 text-[#241609] sm:px-6 lg:px-8"
      style={{ paddingBottom: characterSafeSpace + 32 }}
    >
      <div className="pixel-sky" aria-hidden="true">
        <span className="cloud cloud-left" />
        <span className="cloud cloud-right" />
      </div>
      <div className="pixel-hills" aria-hidden="true" />
      <div className="pixel-garden" aria-hidden="true">
        <span className="tree tree-left" />
        <span className="tree tree-right" />
        <span className="sign">Keep<br />Growing</span>
        <span className="fence fence-left" />
        <span className="fence fence-right" />
        <span className="path" />
        <span className="pond" />
        <span className="flower-bed flower-left" />
        <span className="flower-bed flower-right" />
      </div>

      {gardenCompanions.map((cat, index) => (
        <WalkingCharacter
          key={cat.id}
          profile={cat.profile}
          reactionId={activeReactionTaskId}
          lane={index}
        />
      ))}

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-[1250px] flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="grid w-full max-w-[430px] items-stretch gap-5 sm:max-w-[560px] lg:max-w-none lg:grid-cols-[minmax(0,760px)_370px]"
        >
          <section className="pixel-panel flex h-full flex-col p-4 sm:p-6" data-cat-zone="tasks">
            <header className="mb-5 flex items-center">
              <div className="flex items-center gap-3">
                <Leaf className="h-7 w-7 fill-[#6a942f] text-[#244f1b]" aria-hidden="true" />
                <h1 className="text-3xl font-bold tracking-normal sm:text-4xl">My Tasks</h1>
              </div>
            </header>

            <div className="mb-5 grid gap-4 sm:grid-cols-[1fr_auto]">
              <FilterTabs filters={taskFilters} activeFilter={activeFilter} onChange={setActiveFilter} />
              <button
                type="button"
                onClick={() => setIsClearDialogOpen(true)}
                disabled={tasks.length === 0}
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 bg-[#f1d390] px-5 text-sm font-bold text-[#9c271d] shadow-pixel transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Clear Task
              </button>
            </div>

            <div className="flex flex-1 flex-col space-y-4">
              <form onSubmit={addTask} className="pixel-input flex flex-wrap items-center gap-3 px-4 py-3" data-cat-zone="input">
                <Plus className="h-7 w-7 shrink-0 text-[#9b6a2d]" aria-hidden="true" />
                <label htmlFor="task-input" className="sr-only">
                  New task
                </label>
                <input
                  id="task-input"
                  value={newTask}
                  onChange={(event) => setNewTask(event.target.value)}
                  className="focus-ring min-h-10 min-w-[180px] flex-1 bg-transparent text-lg font-bold text-[#2d1b0b] outline-none placeholder:text-[#9c7847]"
                  placeholder="Add a new task..."
                  maxLength={120}
                  autoComplete="off"
                />
                <span className="inline-flex min-h-10 items-center gap-2 px-2 text-xs font-bold uppercase tracking-[0.08em] text-[#7a5124]">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {taskDateFormatter.format(new Date(`${selectedDate}T00:00:00`))}
                </span>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  className="focus-ring hidden min-h-10 items-center justify-center bg-[#f0c05b] px-4 font-bold text-[#42270f] shadow-pixel transition hover:-translate-y-0.5 sm:inline-flex"
                >
                  Add
                </motion.button>
              </form>

              {filteredTasks.length > 0 ? (
                <div className="task-scroll max-h-[430px] flex-1 overflow-y-auto" aria-live="polite">
                  <motion.div layout>
                    {filteredTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onToggle={toggleTask}
                        onDelete={deleteTask}
                        onEdit={editTask}
                      />
                    ))}
                  </motion.div>
                </div>
              ) : (
                <div aria-live="polite">
                  <EmptyState filter={activeFilter} />
                </div>
              )}
            </div>
          </section>

          <aside className="mx-auto w-full max-w-[430px] space-y-4 lg:max-w-none">
            <div className="pixel-profile flex items-center gap-3 p-3" data-cat-zone="profile">
              <div className="grid h-12 w-12 shrink-0 place-items-center bg-[#2f8b45] text-xs font-black leading-none text-[#fff7d8] shadow-pixel">
                NEXT
              </div>
              <div className="min-w-0 flex-1 border-2 border-[#edd19a] bg-[#fff0bf] px-4 py-2 font-bold">
                <p className="text-xs uppercase leading-4 text-[#7a5124]">Next task</p>
                <p className="truncate text-sm leading-5 text-[#241609]">
                  {nextTask ? nextTask.title : "All tasks done"}
                </p>
                <p className="text-xs leading-4 text-[#7a5124]">
                  {nextTask ? `${taskDateFormatter.format(new Date(`${nextTask.dueDate}T00:00:00`))} • ${nextTask.time || "Anytime"}` : "Enjoy the quiet list"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDark((current) => !current)}
                className="focus-ring grid h-12 w-12 place-items-center border-2 border-[#edd19a] bg-[#fff0bf] text-[#241609] transition hover:bg-[#f0c05b]"
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? <Sun className="h-7 w-7" /> : <Moon className="h-7 w-7" />}
              </button>
            </div>

            <CalendarView tasks={tasks} selectedDate={selectedDate} onSelectDate={selectCalendarDate} />
            <ProgressCard completed={completedCount} total={tasks.length} progress={progress} />

          </aside>
        </motion.div>
      </section>

      <AnimatePresence>
        {isClearDialogOpen && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="clear-tasks-title"
              className="w-full max-w-md rounded-[1.5rem] border border-white/70 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.18 }}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 id="clear-tasks-title" className="text-xl font-semibold text-slate-900 dark:text-white">
                    Clear all tasks?
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                    This will remove every task from your list.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsClearDialogOpen(false)}
                  className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label="Close clear tasks dialog"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsClearDialogOpen(false)}
                  className="focus-ring min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={clearAllTasks}
                  className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Clear All
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function App() {
  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem(PASSWORD_SESSION_KEY) === "true");

  if (!isUnlocked) {
    return <PasswordGate onUnlock={() => setIsUnlocked(true)} />;
  }

  return <TodoApp />;
}

export default App;
