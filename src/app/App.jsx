import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  ImagePlus,
  Leaf,
  Plus,
  Sun,
  Trash2,
  X,
} from "lucide-react";
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
const legacyCharacterTypes = {
  lion: "indie",
  cat: "indie",
  hamster: "indie",
  frost: "indie",
  blade: "indie",
  stone: "indie",
};
const defaultCharacterSettings = {
  id: "mascot-1",
  name: "Mascot 1",
  enabled: true,
  walking: true,
  idleAnimations: true,
  size: 96,
  speed: 14,
  pauseDuration: 0.8,
  walkingAreaHeight: 120,
  characterType: "indie",
  popupImages: [],
};

const taskDateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

function createMascot(overrides = {}) {
  return {
    ...defaultCharacterSettings,
    id: crypto.randomUUID(),
    name: "Mascot",
    ...overrides,
  };
}

function normalizeMascot(settings, index = 0) {
  const characterType = legacyCharacterTypes[settings.characterType] || settings.characterType || "indie";

  return {
    ...defaultCharacterSettings,
    ...settings,
    id: settings.id || crypto.randomUUID(),
    name: settings.name || `Mascot ${index + 1}`,
    characterType,
    popupImages: Array.isArray(settings.popupImages) ? settings.popupImages.slice(0, 5) : [],
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
  const characterSafeSpace = Math.max(
    112,
    ...mascots
      .filter((mascot) => mascot.enabled)
      .map((mascot, index) => Math.max(mascot.walkingAreaHeight ?? 120, (mascot.size ?? 96) + 22 + index * 12) + index * 18),
  );

  const completedCount = tasks.filter((task) => task.completed).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

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

  function addCatPictures(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!selectedMascot || files.length === 0) {
      return;
    }

    const availableSlots = Math.max(0, 5 - (selectedMascot.popupImages?.length || 0));
    const imageFiles = files.filter((file) => file.type.startsWith("image/")).slice(0, availableSlots);

    if (imageFiles.length === 0) {
      return;
    }

    Promise.all(
      imageFiles.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          }),
      ),
    )
      .then((images) => {
        setMascots((currentMascots) =>
          currentMascots.map((mascot) =>
            mascot.id === selectedMascot.id
              ? { ...mascot, popupImages: [...(mascot.popupImages || []), ...images].slice(0, 5) }
              : mascot,
          ),
        );
      })
      .catch((error) => {
        console.warn("Could not load cat picture.", error);
      });
  }

  function removeCatPicture(indexToRemove) {
    if (!selectedMascot) {
      return;
    }

    setMascots((currentMascots) =>
      currentMascots.map((mascot) =>
        mascot.id === selectedMascot.id
          ? { ...mascot, popupImages: (mascot.popupImages || []).filter((_, index) => index !== indexToRemove) }
          : mascot,
      ),
    );
  }

  function addMascot() {
    if (mascots.length >= MAX_MASCOTS) {
      return;
    }

    const mascot = createMascot({
      name: `Mascot ${mascots.length + 1}`,
      characterType: "indie",
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
              characterType: selectedMascot.characterType || "indie",
            })
          : mascot,
      ),
    );
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

      {mascots.map((mascot, index) => (
        <WalkingCharacter key={mascot.id} settings={mascot} reactionId={activeReactionTaskId} lane={index} />
      ))}

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-[1250px] flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,760px)_370px]"
        >
          <section className="pixel-panel flex h-full flex-col p-4 sm:p-6">
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
              <form onSubmit={addTask} className="pixel-input flex flex-wrap items-center gap-3 px-4 py-3">
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

          <aside className="space-y-4">
            <div className="pixel-profile flex items-center gap-3 p-3">
              <div className="grid h-12 w-12 place-items-center bg-[#2f8b45] text-lg font-bold text-[#fff7d8] shadow-pixel">MT</div>
              <div className="flex-1 border-2 border-[#edd19a] bg-[#fff0bf] px-4 py-3 font-bold">Today</div>
              <button
                type="button"
                onClick={() => setIsDark((current) => !current)}
                className="focus-ring grid h-12 w-12 place-items-center border-2 border-[#edd19a] bg-[#fff0bf] text-[#241609] transition hover:bg-[#f0c05b]"
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                <Sun className="h-7 w-7" />
              </button>
            </div>

            <div className="pixel-panel p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#241609]">Cat pictures</h2>
                  <p className="text-xs font-bold text-[#7a5124]">{selectedMascot?.popupImages?.length || 0}/5 saved</p>
                </div>
                <label
                  htmlFor="cat-picture-input"
                  className={`focus-ring inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 bg-[#f0c05b] px-3 text-sm font-bold text-[#42270f] shadow-pixel transition hover:-translate-y-0.5 ${
                    (selectedMascot?.popupImages?.length || 0) >= 5 ? "pointer-events-none opacity-45" : ""
                  }`}
                >
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  Picture
                </label>
                <input
                  id="cat-picture-input"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={addCatPictures}
                  disabled={(selectedMascot?.popupImages?.length || 0) >= 5}
                />
              </div>

              {(selectedMascot?.popupImages?.length || 0) > 0 && (
                <div className="grid grid-cols-5 gap-2">
                  {selectedMascot.popupImages.map((image, index) => (
                    <button
                      key={`${image.slice(0, 24)}-${index}`}
                      type="button"
                      onClick={() => removeCatPicture(index)}
                      className="focus-ring relative aspect-square overflow-hidden border-2 border-[#d49a45] bg-[#fff0bf] shadow-pixel"
                      aria-label={`Remove cat picture ${index + 1}`}
                    >
                      <img src={image} alt="" className="h-full w-full object-cover" />
                      <span className="absolute right-0 top-0 grid h-5 w-5 place-items-center bg-[#9c271d] text-xs font-bold text-[#fff7d8]">
                        <X className="h-3 w-3" aria-hidden="true" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
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

export default App;
