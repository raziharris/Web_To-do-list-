import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Fingerprint,
  ListTodo,
  LockKeyhole,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import CalendarView from "../features/tasks/components/CalendarView.jsx";
import FilterTabs from "../features/tasks/components/FilterTabs.jsx";
import PixelBirds from "../features/tasks/components/PixelBirds.jsx";
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
} from "../features/tasks/utils/taskStorage.js";
import EmptyState from "../shared/components/EmptyState.jsx";

const PASSWORD_SESSION_KEY = "my-tasks-password-unlocked";
const FACE_ID_CREDENTIAL_KEY = "my-tasks-face-id-credential";
const FACE_ID_USER_KEY = "my-tasks-face-id-user";
const REMOTE_MIGRATION_KEY = "my-tasks-remote-migrated";
const SITE_PASSWORD_HASH = "9e468432d7dde30ef9c431eb88b6951b2928dc337b88f349a5db9d124b88bada";
const MALAYSIA_TIME_ZONE = "Asia/Kuala_Lumpur";
const gardenCompanions = [
  { id: "cuzi", profile: "cuzi" },
  { id: "cunim", profile: "cunim" },
];
const mobilePanels = [
  { id: "Tasks", label: "Tasks", icon: ListTodo },
  { id: "Calendar", label: "Calendar", icon: CalendarDays },
  { id: "Progress", label: "Progress", icon: BarChart3 },
];
const SKY_CLOUD_COUNT = 9;

const taskDateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });
const malaysiaHeaderDateFormatter = new Intl.DateTimeFormat("en-MY", {
  timeZone: MALAYSIA_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const malaysiaHeaderTimeFormatter = new Intl.DateTimeFormat("en-MY", {
  timeZone: MALAYSIA_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

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

function getMalaysiaMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MALAYSIA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);

  return hour * 60 + minute;
}

function getMalaysiaSkyState(date = new Date()) {
  const minutes = getMalaysiaMinutes(date);
  const sunrise = 7 * 60;
  const sunset = 19 * 60;
  const isDark = minutes >= sunset || minutes < sunrise;
  const cycleMinutes = isDark
    ? ((minutes - sunset + 24 * 60) % (12 * 60)) / (12 * 60)
    : (minutes - sunrise) / (sunset - sunrise);
  const arc = Math.sin(Math.PI * cycleMinutes);

  return {
    isDark,
    skyX: isDark ? 88 - 76 * cycleMinutes : 12 + 76 * cycleMinutes,
    skyY: 24 - 15 * arc,
  };
}

function createSkyClouds() {
  return Array.from({ length: SKY_CLOUD_COUNT }, (_, index) => ({
    id: `cloud-${index}`,
    top: 7 + Math.random() * 28,
    scale: 0.58 + Math.random() * 0.72,
    duration: 34 + Math.random() * 34,
    delay: -(Math.random() * 38),
    opacity: 0.28 + Math.random() * 0.36,
  }));
}

async function hashPassword(password) {
  const encodedPassword = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encodedPassword);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createChallenge() {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
}

function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToArrayBuffer(value) {
  const paddedValue = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const binary = atob(paddedValue.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function getOrCreateFaceIdUser() {
  const storedUser = localStorage.getItem(FACE_ID_USER_KEY);

  if (storedUser) {
    return base64UrlToArrayBuffer(storedUser);
  }

  const user = new Uint8Array(32);
  crypto.getRandomValues(user);
  localStorage.setItem(FACE_ID_USER_KEY, arrayBufferToBase64Url(user.buffer));

  return user.buffer;
}

function isFaceIdReady() {
  return Boolean(localStorage.getItem(FACE_ID_CREDENTIAL_KEY));
}

async function canUseFaceId() {
  if (!window.isSecureContext || !("PublicKeyCredential" in window) || !navigator.credentials) {
    return false;
  }

  if (!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
    return true;
  }

  return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
}

async function registerFaceIdCredential() {
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: createChallenge(),
      rp: { name: "My Tasks" },
      user: {
        id: getOrCreateFaceIdUser(),
        name: "my-tasks",
        displayName: "My Tasks",
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "required",
      },
      attestation: "none",
      timeout: 60000,
    },
  });

  localStorage.setItem(FACE_ID_CREDENTIAL_KEY, arrayBufferToBase64Url(credential.rawId));
}

async function unlockWithFaceId() {
  const credentialId = localStorage.getItem(FACE_ID_CREDENTIAL_KEY);

  if (!credentialId) {
    throw new Error("Face ID is not set up yet.");
  }

  await navigator.credentials.get({
    publicKey: {
      challenge: createChallenge(),
      allowCredentials: [
        {
          id: base64UrlToArrayBuffer(credentialId),
          type: "public-key",
        },
      ],
      userVerification: "required",
      timeout: 60000,
    },
  });
}

function PasswordGate({ onUnlock }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isFaceIdSupported, setIsFaceIdSupported] = useState(false);
  const [isFaceIdRegistered, setIsFaceIdRegistered] = useState(() => isFaceIdReady());
  const faceIdAutoTriedRef = useRef(false);

  useEffect(() => {
    canUseFaceId()
      .then(setIsFaceIdSupported)
      .catch(() => setIsFaceIdSupported(false));
  }, []);

  useEffect(() => {
    if (!isFaceIdSupported || !isFaceIdRegistered || faceIdAutoTriedRef.current) {
      return;
    }

    faceIdAutoTriedRef.current = true;
    window.setTimeout(() => {
      unlockWebsiteWithFaceId({ isAutomatic: true });
    }, 350);
  }, [isFaceIdSupported, isFaceIdRegistered]);

  function unlockSession() {
    sessionStorage.setItem(PASSWORD_SESSION_KEY, "true");
    onUnlock();
  }

  async function unlockWebsite(event) {
    event.preventDefault();
    setIsChecking(true);
    setError("");

    try {
      const passwordHash = await hashPassword(password);

      if (passwordHash === SITE_PASSWORD_HASH) {
        if (isFaceIdSupported && !isFaceIdRegistered) {
          try {
            await registerFaceIdCredential();
            setIsFaceIdRegistered(true);
          } catch (faceIdSetupError) {
            console.warn("Could not set up Face ID unlock.", faceIdSetupError);
          }
        }

        unlockSession();
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

  async function unlockWebsiteWithFaceId({ isAutomatic = false } = {}) {
    setIsChecking(true);
    setError("");

    try {
      await unlockWithFaceId();
      unlockSession();
    } catch (faceIdError) {
      console.warn("Could not unlock with Face ID.", faceIdError);
      setError(
        isAutomatic
          ? "Face ID could not start automatically. Use Face ID or enter password."
          : "Face ID was cancelled or could not unlock. Enter password instead.",
      );
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
            <p className="text-sm font-bold text-[#7a5124]">Face ID or password</p>
          </div>
        </div>

        {isFaceIdSupported && (
          <button
            type="button"
            onClick={unlockWebsiteWithFaceId}
            disabled={!isFaceIdRegistered || isChecking}
            className="focus-ring mb-4 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#2f8b45] px-5 font-bold text-[#fff7d8] shadow-pixel transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
          >
            <Fingerprint className="h-5 w-5" aria-hidden="true" />
            {isFaceIdRegistered ? "Use Face ID" : "Face ID available after password"}
          </button>
        )}

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
  const [activePanel, setActivePanel] = useState("Tasks");
  const [selectedDate, setSelectedDate] = useState(formatDateKey());
  const [isRemoteReady, setIsRemoteReady] = useState(!isSupabaseConfigured);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [activeReactionTaskId, setActiveReactionTaskId] = useState(null);
  const [skyState, setSkyState] = useState(() => getMalaysiaSkyState());
  const [currentMalaysiaTime, setCurrentMalaysiaTime] = useState(() => new Date());
  const [themeOverride, setThemeOverride] = useState(null);
  const applyingRemoteTasksRef = useRef(false);
  const characterSafeSpace = 132;
  const isDark = themeOverride ?? skyState.isDark;
  const malaysiaDateLabel = malaysiaHeaderDateFormatter.format(currentMalaysiaTime);
  const malaysiaTimeLabel = malaysiaHeaderTimeFormatter.format(currentMalaysiaTime);
  const skyClouds = useMemo(() => createSkyClouds(), []);

  const completedCount = tasks.filter((task) => task.completed).length;
  const pendingCount = tasks.length - completedCount;
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
  const selectedDateTaskCount = useMemo(() => {
    return tasks.filter((task) => task.dueDate === selectedDate).length;
  }, [selectedDate, tasks]);

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
    }, 3000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshTimerId);
      supabase.removeChannel(syncChannel);
    };
  }, []);

  useEffect(() => {
    function syncMalaysiaTheme() {
      setSkyState(getMalaysiaSkyState());
    }

    syncMalaysiaTheme();
    const themeTimerId = window.setInterval(syncMalaysiaTheme, 60000);

    return () => window.clearInterval(themeTimerId);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    function syncMalaysiaTime() {
      setCurrentMalaysiaTime(new Date());
    }

    syncMalaysiaTime();
    const malaysiaTimeTimerId = window.setInterval(syncMalaysiaTime, 1000);

    return () => window.clearInterval(malaysiaTimeTimerId);
  }, []);

  function toggleTheme() {
    setThemeOverride((currentOverride) => !(currentOverride ?? skyState.isDark));
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
    setActivePanel("Tasks");
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
    setActivePanel("Tasks");
  }

  return (
    <main
      className="pixel-world relative min-h-screen overflow-hidden px-4 pt-24 text-[#241609] sm:px-6 sm:pt-28 lg:px-8 lg:pt-32"
      style={{
        paddingBottom: characterSafeSpace + 32,
        "--sky-body-x": `${skyState.skyX}%`,
        "--sky-body-y": `${skyState.skyY}%`,
      }}
    >
      <div className="pixel-sky" aria-hidden="true">
        <span className="cloud cloud-left" />
        <span className="cloud cloud-right" />
        {skyClouds.map((cloud) => (
          <span
            key={cloud.id}
            className="cloud cloud-random"
            style={{
              "--cloud-top": `${cloud.top}%`,
              "--cloud-scale": cloud.scale,
              "--cloud-duration": `${cloud.duration}s`,
              "--cloud-delay": `${cloud.delay}s`,
              "--cloud-opacity": cloud.opacity,
            }}
          />
        ))}
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
      <PixelBirds />

      {gardenCompanions.map((cat, index) => (
        <WalkingCharacter
          key={cat.id}
          profile={cat.profile}
          reactionId={activeReactionTaskId}
          lane={index}
        />
      ))}

      <section className="mobile-view-scale relative z-10 mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-[1250px] flex-col items-center justify-start">
        <div className="malaysia-time-bar mb-4 flex w-full max-w-[430px] items-center gap-3 px-4 py-3 text-[#3b2410] sm:max-w-[560px] lg:max-w-none">
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold leading-6 text-[#241609] sm:text-xl">
              {malaysiaDateLabel}
            </p>
          </div>
          <time className="malaysia-time-pill shrink-0 border-2 px-2 py-1 text-sm font-bold uppercase sm:px-3 sm:text-base">
            {malaysiaTimeLabel}
          </time>
        </div>

        <nav className="mobile-panel-dock sticky top-3 z-30 mb-4 grid w-full max-w-[430px] grid-cols-3 gap-2 lg:hidden" aria-label="Mobile task panels">
          {mobilePanels.map(({ id, label, icon: Icon }) => {
            const isActivePanel = activePanel === id;
            const badge = id === "Tasks" ? filteredTasks.length : id === "Calendar" ? selectedDateTaskCount : `${progress}%`;

            return (
              <motion.button
                key={id}
                type="button"
                onClick={() => setActivePanel(id)}
                whileTap={{ scale: 0.94 }}
                className={`focus-ring mobile-panel-tab relative min-h-14 overflow-hidden border-2 px-2 text-xs font-bold uppercase text-[#3b2410] shadow-pixel transition ${
                  isActivePanel
                    ? "border-[#5c3921] bg-[#f0c05b]"
                    : "border-[#b88947] bg-[#fff9e8]/90 hover:bg-[#fff0bf]"
                }`}
                aria-current={isActivePanel ? "page" : undefined}
              >
                <span className="relative z-10 grid h-full w-full grid-rows-[20px_16px_18px] place-items-center gap-1">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span className="leading-4">{label}</span>
                  <span className="mobile-panel-badge">{badge}</span>
                </span>
              </motion.button>
            );
          })}
        </nav>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="grid w-full max-w-[430px] items-stretch gap-5 sm:max-w-[560px] lg:max-w-none lg:grid-cols-[minmax(0,760px)_370px]"
        >
          <section
            className={`pixel-panel h-full flex-col p-4 sm:p-6 lg:flex ${
              activePanel === "Tasks" ? "flex" : "hidden"
            }`}
            data-cat-zone="tasks"
          >
            <header className="app-header mb-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center">
                  <h1 className="app-title truncate text-3xl leading-none text-[#241609] sm:text-4xl">JomSettle</h1>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="focus-ring inline-flex h-10 shrink-0 items-center gap-2 border-2 border-[#d9b678] bg-[#fff9e8] px-3 text-[#5c3921] shadow-pixel transition hover:-translate-y-0.5 hover:bg-[#f0c05b] sm:h-11"
                  aria-label={isDark ? "Switch to day mode" : "Switch to night mode"}
                >
                  {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  <span className="hidden text-xs font-bold uppercase tracking-[0.08em] sm:inline">
                    {isDark ? "Night" : "Day"}
                  </span>
                </button>
              </div>

              <div className="mb-2 flex items-center justify-end gap-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#7a5124]">
                <span>{pendingCount} left</span>
              </div>
              <div
                className="header-progress h-3 overflow-hidden border-2 border-[#a87a3a] bg-[#dfb96e]"
                role="progressbar"
                aria-label="Task completion progress"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={progress}
              >
                <div className="h-full bg-[#3d9348] transition-[width] duration-500" style={{ width: `${progress}%` }} />
              </div>
            </header>

            <section
              className="next-task-card next-task-feature today-card-modern mb-5 flex gap-3 border-4 border-[#6d4320] bg-[#fff0bf] p-3 font-bold shadow-pixel"
              aria-label="Next task"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center border-2 border-[#5d3a1c] bg-[#4b2b16] text-[#fff7d8] shadow-pixel">
                {nextTask ? <Sparkles className="h-6 w-6" aria-hidden="true" /> : <CheckCircle2 className="h-6 w-6" aria-hidden="true" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="text-[11px] uppercase leading-4 tracking-[0.08em] text-[#7a5124]">Focus now</p>
                  <span className="inline-flex items-center gap-1 border-2 border-[#d4a661] bg-[#fff7d8] px-2 py-0.5 text-[10px] uppercase leading-4 text-[#2f6d32]">
                    <CalendarDays className="h-3 w-3" aria-hidden="true" />
                    {nextTask ? taskDateFormatter.format(new Date(`${nextTask.dueDate}T00:00:00`)) : "Clear"}
                  </span>
                </div>
                <p className="max-w-full break-words text-lg leading-6 text-[#241609] [overflow-wrap:anywhere]">
                  {nextTask ? nextTask.title : "All tasks done"}
                </p>
              </div>
            </section>

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
              <form onSubmit={addTask} className="add-task-input flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5" data-cat-zone="input">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  type="submit"
                  className="focus-ring add-task-button grid h-12 w-12 shrink-0 place-items-center text-[#42270f] transition hover:-translate-y-0.5 sm:h-14 sm:w-14"
                  aria-label="Add task"
                >
                  <Plus className="h-8 w-8 sm:h-9 sm:w-9" aria-hidden="true" />
                </motion.button>
                <label htmlFor="task-input" className="sr-only">
                  New task
                </label>
                <input
                  id="task-input"
                  value={newTask}
                  onChange={(event) => setNewTask(event.target.value)}
                  className="focus-ring min-h-12 min-w-0 flex-[1_1_220px] bg-transparent text-lg font-semibold leading-7 text-[#2d1b0b] outline-none placeholder:text-[#9c7847] sm:min-h-14 sm:text-xl"
                  placeholder=""
                  maxLength={120}
                  autoComplete="off"
                />
                <span className="add-task-date inline-flex min-h-10 min-w-0 items-center gap-2 px-2 text-xs font-bold uppercase tracking-[0.08em] text-[#7a5124] sm:min-h-12">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="truncate">{taskDateFormatter.format(new Date(`${selectedDate}T00:00:00`))}</span>
                </span>
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

          <aside className={`mx-auto w-full max-w-none space-y-4 lg:block lg:max-w-none ${activePanel === "Tasks" ? "hidden" : "block"}`}>
            <div className={activePanel === "Calendar" ? "block" : "hidden lg:block"}>
              <CalendarView tasks={tasks} selectedDate={selectedDate} onSelectDate={selectCalendarDate} />
            </div>
            <div className={activePanel === "Progress" ? "block" : "hidden lg:block"}>
              <ProgressCard completed={completedCount} total={tasks.length} progress={progress} />
            </div>

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
