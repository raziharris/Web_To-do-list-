import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Moon, Plus, SearchCheck, SlidersHorizontal, Sparkles, Sun, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { isSupabaseConfigured } from "../features/tasks/utils/supabaseClient.js";
import { formatDateKey, loadTasks, saveTasks, THEME_STORAGE_KEY } from "../features/tasks/utils/taskStorage.js";
import EmptyState from "../shared/components/EmptyState.jsx";

const CHARACTER_SETTINGS_KEY = "my-tasks-walking-character";
const MAX_MASCOTS = 3;
const defaultObjectImage = "/pics/WhatsApp Image 2026-02-07 at 1.57.58 AM.jpeg";
const defaultCharacterSettings = {
  id: "mascot-1",
  name: "Mascot 1",
  enabled: true,
  walking: true,
  idleAnimations: true,
  faceImage: defaultObjectImage,
  size: 96,
  speed: 14,
  pauseDuration: 0.8,
  walkingAreaHeight: 120,
  characterType: "lion",
  outline: "soft",
  faceSize: 100,
  faceZoom: 108,
  faceShape: "round",
  faceRotation: 0,
  faceBrightness: 100,
  faceX: 50,
  faceY: 50,
};

function createMascot(overrides = {}) {
  return {
    ...defaultCharacterSettings,
    id: crypto.randomUUID(),
    name: "Mascot",
    ...overrides,
  };
}

function normalizeMascot(settings, index = 0) {
  return {
    ...defaultCharacterSettings,
    ...settings,
    id: settings.id || crypto.randomUUID(),
    name: settings.name || `Mascot ${index + 1}`,
    characterType: settings.characterType || "lion",
  };
}

function loadMascots() {
  const savedSettings = localStorage.getItem(CHARACTER_SETTINGS_KEY);

  if (!savedSettings) {
    return [createMascot({ id: "mascot-1", name: "Mascot 1" })];
  }

  try {
    const parsedSettings = JSON.parse(savedSettings);
    return (Array.isArray(parsedSettings) ? parsedSettings : [parsedSettings]).slice(0, MAX_MASCOTS).map(normalizeMascot);
  } catch {
    return [createMascot({ id: "mascot-1", name: "Mascot 1" })];
  }
}

function getTaskDateValue(task) {
  if (task.dueDate) {
    const [year, month, day] = task.dueDate.split("-").map(Number);
    return new Date(year, month - 1, day).getTime();
  }

  return task.createdAt || 0;
}

function sortTasksByStatusAndDate(taskList) {
  return [...taskList].sort((firstTask, secondTask) => {
    if (firstTask.completed !== secondTask.completed) {
      return firstTask.completed ? 1 : -1;
    }

    return getTaskDateValue(secondTask) - getTaskDateValue(firstTask) || (secondTask.createdAt || 0) - (firstTask.createdAt || 0);
  });
}

function App() {
  const [tasks, setTasks] = useState(() => loadTasks());
  const [newTask, setNewTask] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [activePanel, setActivePanel] = useState("Progress");
  const [selectedDate, setSelectedDate] = useState(formatDateKey());
  const [isRemoteReady, setIsRemoteReady] = useState(!isSupabaseConfigured);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [mascots, setMascots] = useState(() => loadMascots());
  const [selectedMascotId, setSelectedMascotId] = useState(() => loadMascots()[0]?.id);
  const [activeReactionTaskId, setActiveReactionTaskId] = useState(null);
  const [isDark, setIsDark] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) === "dark");
  const selectedMascot = mascots.find((mascot) => mascot.id === selectedMascotId) || mascots[0];

  const completedCount = tasks.filter((task) => task.completed).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  const filteredTasks = useMemo(() => {
    let visibleTasks = tasks;

    if (activeFilter === "Calendar") {
      visibleTasks = tasks.filter((task) => task.dueDate === selectedDate);
      return sortTasksByStatusAndDate(visibleTasks);
    }

    if (activeFilter === "Active") {
      visibleTasks = tasks.filter((task) => !task.completed);
      return sortTasksByStatusAndDate(visibleTasks);
    }

    if (activeFilter === "Completed") {
      visibleTasks = tasks.filter((task) => task.completed);
      return sortTasksByStatusAndDate(visibleTasks);
    }

    return sortTasksByStatusAndDate(visibleTasks);
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

  useEffect(() => {
    localStorage.setItem(CHARACTER_SETTINGS_KEY, JSON.stringify(mascots));
  }, [mascots]);

  function updateCharacterSetting(key, value) {
    if (!selectedMascot) {
      return;
    }

    setMascots((currentMascots) =>
      currentMascots.map((mascot) => (mascot.id === selectedMascot.id ? { ...mascot, [key]: value } : mascot)),
    );
  }

  function addMascot() {
    if (mascots.length >= MAX_MASCOTS) {
      return;
    }

    const mascot = createMascot({
      name: `Mascot ${mascots.length + 1}`,
      characterType: ["lion", "cat", "hamster"][mascots.length] || "lion",
      speed: Math.max(8, defaultCharacterSettings.speed - mascots.length * 2),
      size: Math.max(74, defaultCharacterSettings.size - mascots.length * 8),
    });

    setMascots((currentMascots) => [...currentMascots, mascot]);
    setSelectedMascotId(mascot.id);
  }

  function deleteSelectedMascot() {
    if (!selectedMascot || mascots.length <= 1) {
      return;
    }

    setMascots((currentMascots) => {
      const nextMascots = currentMascots.filter((mascot) => mascot.id !== selectedMascot.id);
      setSelectedMascotId(nextMascots[0]?.id);
      return nextMascots;
    });
  }

  function resetSelectedMascot() {
    if (!selectedMascot) {
      return;
    }

    setMascots((currentMascots) =>
      currentMascots.map((mascot, index) =>
        mascot.id === selectedMascot.id
          ? createMascot({
              id: selectedMascot.id,
              name: selectedMascot.name || `Mascot ${index + 1}`,
              characterType: selectedMascot.characterType || "lion",
            })
          : mascot,
      ),
    );
  }

  function uploadCharacterFace(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      updateCharacterSetting("faceImage", reader.result);
    });
    reader.readAsDataURL(file);
  }

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
    setActiveFilter("Calendar");
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 text-ink dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-[8%] top-10 h-36 w-36 rounded-full bg-skysoft/70 blur-3xl dark:bg-sky-500/20" />
      <div className="pointer-events-none absolute right-[7%] top-52 h-48 w-48 rounded-full bg-sage/80 blur-3xl dark:bg-emerald-400/15" />
      <div className="pointer-events-none absolute bottom-10 left-1/3 h-40 w-40 rounded-full bg-slate-200/70 blur-3xl dark:bg-slate-500/20" />

      {mascots.map((mascot, index) => (
        <WalkingCharacter key={mascot.id} settings={mascot} reactionId={activeReactionTaskId} lane={index} />
      ))}

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

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsClearDialogOpen(true)}
                  disabled={tasks.length === 0}
                  className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white/80 px-4 text-sm font-semibold text-rose-600 shadow-card transition hover:-translate-y-0.5 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:bg-white/80 dark:border-rose-400/20 dark:bg-slate-900/75 dark:text-rose-300 dark:hover:bg-rose-500/10"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Clear Tasks
                </button>
              </div>

              {filteredTasks.length > 0 ? (
                <div className="task-scroll max-h-[460px] overflow-y-auto pr-2" aria-live="polite">
                  <motion.div layout className="space-y-3">
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

            <aside className="space-y-5">
              <div className="soft-card grid grid-cols-2 gap-2 p-2">
                {["Progress", "Character"].map((panel) => (
                  <button
                    key={panel}
                    type="button"
                    onClick={() => setActivePanel(panel)}
                    className={`focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                      activePanel === panel
                        ? "bg-emerald-700 text-white shadow-card dark:bg-emerald-400 dark:text-slate-950"
                        : "text-slate-500 hover:bg-skysoft dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {panel === "Progress" ? (
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    )}
                    {panel}
                  </button>
                ))}
              </div>

              {activePanel === "Progress" ? (
                <>
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
                </>
              ) : (
                <div className="soft-card p-5">
                  <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
                    <ImagePlus className="h-4 w-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                    Walking character
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl bg-skysoft/55 p-3 dark:bg-slate-800/70">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">Mascots</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {mascots.length}/{MAX_MASCOTS} available
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={addMascot}
                          disabled={mascots.length >= MAX_MASCOTS}
                          className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-xl bg-emerald-700 px-3 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                          Add
                        </button>
                      </div>

                      <div className="grid gap-2">
                        {mascots.map((mascot) => (
                          <button
                            key={mascot.id}
                            type="button"
                            onClick={() => setSelectedMascotId(mascot.id)}
                            className={`focus-ring flex min-h-12 items-center gap-3 rounded-xl border px-3 text-left transition hover:-translate-y-0.5 ${
                              selectedMascot?.id === mascot.id
                                ? "border-emerald-500 bg-white text-emerald-800 shadow-card dark:border-emerald-300 dark:bg-emerald-400/20 dark:text-emerald-100"
                                : "border-white/70 bg-white/60 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:bg-slate-950"
                            }`}
                          >
                            <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-white bg-white shadow-card dark:border-white/20">
                              <img src={mascot.faceImage} alt="" className="h-full w-full object-cover" draggable="false" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{mascot.name}</span>
                              <span className="block text-xs capitalize opacity-70">{mascot.characterType}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-skysoft/55 p-3 dark:bg-slate-800/70">
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">Companion</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Show the walker near the bottom</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateCharacterSetting("enabled", !selectedMascot.enabled)}
                        className={`focus-ring relative h-8 w-14 rounded-full transition ${
                          selectedMascot.enabled ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                        aria-label={selectedMascot.enabled ? "Turn character off" : "Turn character on"}
                      >
                        <span
                          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-card transition ${
                            selectedMascot.enabled ? "left-7" : "left-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 p-3 dark:bg-slate-950/60">
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">Walk animation</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Idle bounce when paused</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateCharacterSetting("walking", !selectedMascot.walking)}
                        className={`focus-ring relative h-8 w-14 rounded-full transition ${
                          selectedMascot.walking ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                        aria-label={selectedMascot.walking ? "Pause walking animation" : "Enable walking animation"}
                      >
                        <span
                          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-card transition ${
                            selectedMascot.walking ? "left-7" : "left-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 p-3 dark:bg-slate-950/60">
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">Idle animations</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Breathing, ears, and tail motion</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateCharacterSetting("idleAnimations", selectedMascot.idleAnimations === false)}
                        className={`focus-ring relative h-8 w-14 rounded-full transition ${
                          selectedMascot.idleAnimations !== false ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                        aria-label={selectedMascot.idleAnimations !== false ? "Turn idle animations off" : "Turn idle animations on"}
                      >
                        <span
                          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-card transition ${
                            selectedMascot.idleAnimations !== false ? "left-7" : "left-1"
                          }`}
                        />
                      </button>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-normal text-slate-400 dark:text-slate-500">
                        Mascot name
                      </span>
                      <input
                        value={selectedMascot.name}
                        onChange={(event) => updateCharacterSetting("name", event.target.value)}
                        className="focus-ring min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                        placeholder="Mascot name"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-normal text-slate-400 dark:text-slate-500">
                        Face image URL
                      </span>
                      <input
                        value={selectedMascot.faceImage}
                        onChange={(event) => updateCharacterSetting("faceImage", event.target.value)}
                        className="focus-ring min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                        placeholder="https://example.com/face.jpg"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-normal text-slate-400 dark:text-slate-500">
                        Upload face
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={uploadCharacterFace}
                        className="focus-ring block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-sage file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-900 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:file:bg-emerald-400 dark:file:text-slate-950"
                      />
                    </label>

                    <div>
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-normal text-slate-400 dark:text-slate-500">
                        Character
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          ["lion", "Lion"],
                          ["cat", "Cat"],
                          ["hamster", "Hamster"],
                        ].map(([characterType, label]) => (
                          <button
                            key={characterType}
                            type="button"
                            onClick={() => updateCharacterSetting("characterType", characterType)}
                            className={`focus-ring min-h-10 rounded-xl border px-2 text-sm font-semibold transition hover:-translate-y-0.5 ${
                              selectedMascot.characterType === characterType
                                ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-card dark:border-emerald-300 dark:bg-emerald-400/20 dark:text-emerald-100"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-skysoft dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-normal text-slate-400 dark:text-slate-500">
                        Outline
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          ["soft", "Soft"],
                          ["bold", "Bold"],
                          ["sticker", "Sticker"],
                        ].map(([outline, label]) => (
                          <button
                            key={outline}
                            type="button"
                            onClick={() => updateCharacterSetting("outline", outline)}
                            className={`focus-ring min-h-10 rounded-xl border px-2 text-sm font-semibold transition hover:-translate-y-0.5 ${
                              selectedMascot.outline === outline
                                ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-card dark:border-emerald-300 dark:bg-emerald-400/20 dark:text-emerald-100"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-skysoft dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-normal text-slate-400 dark:text-slate-500">
                        Face crop
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          ["round", "Rounded"],
                          ["square", "Square"],
                        ].map(([shape, label]) => (
                          <button
                            key={shape}
                            type="button"
                            onClick={() => updateCharacterSetting("faceShape", shape)}
                            className={`focus-ring min-h-10 rounded-xl border px-2 text-sm font-semibold transition hover:-translate-y-0.5 ${
                              selectedMascot.faceShape === shape
                                ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-card dark:border-emerald-300 dark:bg-emerald-400/20 dark:text-emerald-100"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-skysoft dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {[
                      ["size", "Character size", 64, 150, selectedMascot.size],
                      ["speed", "Walking speed", 1, 30, selectedMascot.speed],
                      ["pauseDuration", "Idle pause", 0, 3, selectedMascot.pauseDuration ?? 0.8, 0.1],
                      ["walkingAreaHeight", "Walking area", 96, 180, selectedMascot.walkingAreaHeight ?? 120],
                      ["faceSize", "Face size", 72, 130, selectedMascot.faceSize],
                      ["faceZoom", "Face zoom", 90, 180, selectedMascot.faceZoom ?? 108],
                      ["faceRotation", "Face rotation", -25, 25, selectedMascot.faceRotation ?? 0],
                      ["faceBrightness", "Face brightness", 70, 130, selectedMascot.faceBrightness ?? 100],
                      ["faceX", "Face horizontal", 0, 100, selectedMascot.faceX],
                      ["faceY", "Face vertical", 0, 100, selectedMascot.faceY],
                    ].map(([key, label, min, max, value, step]) => (
                      <label key={key} className="block">
                        <span className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-normal text-slate-400 dark:text-slate-500">
                          {label}
                          <span>{value}</span>
                        </span>
                        <input
                          type="range"
                          min={min}
                          max={max}
                          step={step || 1}
                          value={value}
                          onChange={(event) => updateCharacterSetting(key, Number(event.target.value))}
                          className="w-full accent-emerald-700"
                        />
                      </label>
                    ))}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={resetSelectedMascot}
                        className="focus-ring min-h-11 rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={deleteSelectedMascot}
                        disabled={mascots.length <= 1}
                        className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-100 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:bg-rose-400/15 dark:text-rose-200 dark:hover:bg-rose-400/25 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </aside>
          </div>
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

export default App;
