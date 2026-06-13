import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  CalendarDays,
  Clock3,
  CheckCircle2,
  Fingerprint,
  ListTodo,
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
import PixelBirds from "../features/tasks/components/PixelBirds.jsx";
import TaskItem from "../features/tasks/components/TaskItem.jsx";
import WalkingCharacter from "../features/tasks/components/WalkingCharacter.jsx";
import { taskFilters } from "../features/tasks/constants/taskFilters.js";
import { playCompletionPing } from "../features/tasks/utils/completionSound.js";
import {
  canUseBackgroundPushNotifications,
  getCurrentPushEndpoint,
  isBackgroundPushConfigured,
  sendTaskPushNotification,
  subscribeToTaskPushNotifications,
} from "../features/tasks/utils/pushNotifications.js";
import {
  clearCompletedTasksFromSupabase,
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
const TASK_NOTIFICATION_KEY = "my-tasks-notification-enabled";
const BACKGROUND_NOTIFICATION_KEY = "my-tasks-background-notification-enabled";
const NOTIFICATION_PROMPT_DISMISSED_KEY = "my-tasks-notification-prompt-dismissed";
const NOTIFICATION_READY_TIMEOUT_MS = 1200;
const TASK_NOTIFICATION_THROTTLE_MS = 5000;
const SITE_PASSWORD_HASH = "9e468432d7dde30ef9c431eb88b6951b2928dc337b88f349a5db9d124b88bada";
const MALAYSIA_TIME_ZONE = "Asia/Kuala_Lumpur";
const gardenCompanions = [
  { id: "cuzi", profile: "cuzi" },
  { id: "cunim", profile: "cunim" },
];
const mobilePanels = [
  { id: "Tasks", label: "Tasks", icon: ListTodo },
  { id: "Calendar", label: "Calendar", icon: CalendarDays },
  { id: "Upcoming", label: "Upcoming", icon: Clock3 },
];
const SKY_CLOUD_COUNT = 9;

const taskDateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });
const shortTaskDateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
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

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDaysLeft(dateKey, date = new Date()) {
  if (!dateKey) {
    return "No date";
  }

  const dueDate = parseDateKey(dateKey);
  const startOfToday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.round((dueDate.getTime() - startOfToday.getTime()) / msPerDay);

  if (daysLeft === 0) {
    return "Today";
  }

  if (daysLeft === 1) {
    return "1 day left";
  }

  if (daysLeft > 1) {
    return `${daysLeft} days left`;
  }

  return `${Math.abs(daysLeft)} days overdue`;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return nextDate;
}

function sortTasksByStatusAndDate(taskList) {
  return [...taskList].sort((firstTask, secondTask) => {
    if (firstTask.completed !== secondTask.completed) {
      return firstTask.completed ? 1 : -1;
    }

    return getTaskDateValue(firstTask) - getTaskDateValue(secondTask) || (firstTask.createdAt || 0) - (secondTask.createdAt || 0);
  });
}

function createUpcomingGroups(tasks, date = new Date()) {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayKey = formatDateKey(today);
  const tomorrowKey = formatDateKey(addDays(today, 1));
  const weekEnd = addDays(today, 7);
  const groups = [
    { id: "overdue", title: "Overdue", tasks: [] },
    { id: "today", title: "Today", tasks: [] },
    { id: "tomorrow", title: "Tomorrow", tasks: [] },
    { id: "week", title: "This Week", tasks: [] },
    { id: "later", title: "Later", tasks: [] },
  ];
  const groupsById = new Map(groups.map((group) => [group.id, group]));

  sortTasksByStatusAndDate(tasks.filter((task) => !task.completed)).forEach((task) => {
    const dueDateKey = task.dueDate || todayKey;
    const taskDate = parseDateKey(dueDateKey);

    if (dueDateKey < todayKey) {
      groupsById.get("overdue").tasks.push(task);
      return;
    }

    if (dueDateKey === todayKey) {
      groupsById.get("today").tasks.push(task);
      return;
    }

    if (dueDateKey === tomorrowKey) {
      groupsById.get("tomorrow").tasks.push(task);
      return;
    }

    if (taskDate <= weekEnd) {
      groupsById.get("week").tasks.push(task);
      return;
    }

    groupsById.get("later").tasks.push(task);
  });

  return groups.filter((group) => group.tasks.length > 0 || group.id !== "overdue");
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

function canUseTaskNotifications() {
  return "Notification" in window;
}

function createTaskNotificationPayload(task, notificationType) {
  const taskTitle = typeof task === "string" ? task : task?.title;
  const taskId = typeof task === "object" ? task?.id : null;
  const isCreatedNotification = notificationType === "created";

  return {
    title: isCreatedNotification ? "New task added" : "Task completed",
    body: taskTitle
      ? `${isCreatedNotification ? "New" : "Completed"}: ${taskTitle}`
      : isCreatedNotification
        ? "A new task was added."
        : "A task was marked as completed.",
    tag: `task-${notificationType}-${taskId || Date.now()}`,
    url: "/",
  };
}

async function showTaskNotification(task, notificationType = "completed") {
  if (!canUseTaskNotifications() || Notification.permission !== "granted") {
    return;
  }

  const payload = createTaskNotificationPayload(task, notificationType);

  const notificationOptions = {
    body: payload.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.tag,
    data: { url: payload.url },
  };

  try {
    if ("serviceWorker" in navigator) {
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((resolve) => window.setTimeout(() => resolve(null), NOTIFICATION_READY_TIMEOUT_MS)),
      ]);

      if (registration) {
        await registration.showNotification(payload.title, notificationOptions);
        return;
      }
    }

    new Notification(payload.title, notificationOptions);
  } catch (error) {
    console.warn("Could not show task notification.", error);
  }
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

function UpcomingPanel({ groups, onSelectDate }) {
  const pendingCount = groups.reduce((count, group) => count + group.tasks.length, 0);

  return (
    <section className="pixel-panel upcoming-panel p-4" aria-label="Upcoming tasks" data-cat-zone="upcoming">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold leading-6 text-[#241609]">Upcoming</h2>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-[#7a5124]">
            {pendingCount} pending
          </p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-[#93b56f] bg-[#fffdf1] text-[#49623a] shadow-pixel">
          <Clock3 className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      {pendingCount === 0 ? (
        <div className="upcoming-empty border-2 p-4 text-center text-sm font-bold text-[#657748] shadow-pixel">
          Nothing coming up.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <section key={group.id} className="upcoming-group border-2 p-3 shadow-pixel" aria-label={`${group.title} tasks`}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#49623a]">{group.title}</h3>
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#7a5124]">
                  {group.tasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {group.tasks.map((task) => {
                  const dueDateKey = task.dueDate || formatDateKey();
                  const taskDate = parseDateKey(dueDateKey);

                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onSelectDate(dueDateKey)}
                      className="upcoming-task focus-ring flex w-full items-start gap-2 border-2 px-2 py-2 text-left shadow-pixel transition hover:-translate-y-0.5"
                    >
                      <span className="upcoming-task-date shrink-0 border-2 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-4">
                        {shortTaskDateFormatter.format(taskDate)}
                      </span>
                      <span className="min-w-0 flex-1 break-words text-sm font-bold leading-5 text-[#241609]">
                        {task.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
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
  const [notificationPermission, setNotificationPermission] = useState(() =>
    canUseTaskNotifications() ? Notification.permission : "unsupported",
  );
  const [taskNotificationsEnabled, setTaskNotificationsEnabled] = useState(() => {
    return (
      canUseTaskNotifications() &&
      Notification.permission === "granted" &&
      localStorage.getItem(TASK_NOTIFICATION_KEY) === "true"
    );
  });
  const [backgroundNotificationsEnabled, setBackgroundNotificationsEnabled] = useState(() => {
    return canUseBackgroundPushNotifications() && localStorage.getItem(BACKGROUND_NOTIFICATION_KEY) === "true";
  });
  const [isNotificationSetupOpen, setIsNotificationSetupOpen] = useState(() => {
    return (
      canUseTaskNotifications() &&
      Notification.permission !== "denied" &&
      localStorage.getItem(NOTIFICATION_PROMPT_DISMISSED_KEY) !== "true" &&
      localStorage.getItem(TASK_NOTIFICATION_KEY) !== "true"
    );
  });
  const [themeOverride, setThemeOverride] = useState(null);
  const applyingRemoteTasksRef = useRef(false);
  const notifiedTaskEventsRef = useRef(new Map());
  const taskNotificationsEnabledRef = useRef(taskNotificationsEnabled);
  const backgroundNotificationsEnabledRef = useRef(backgroundNotificationsEnabled);
  const pushOriginEndpointRef = useRef(null);
  const tasksRef = useRef(tasks);
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
  const nextTaskDateLabel = nextTask?.dueDate ? taskDateFormatter.format(parseDateKey(nextTask.dueDate)) : "No due date";
  const nextTaskDaysLeft = nextTask ? formatDaysLeft(nextTask.dueDate, currentMalaysiaTime) : "Clear";
  const upcomingGroups = useMemo(() => createUpcomingGroups(tasks, currentMalaysiaTime), [currentMalaysiaTime, tasks]);
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
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    taskNotificationsEnabledRef.current = taskNotificationsEnabled;
  }, [taskNotificationsEnabled]);

  useEffect(() => {
    backgroundNotificationsEnabledRef.current = backgroundNotificationsEnabled;
  }, [backgroundNotificationsEnabled]);

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

  function notifyTaskEvent(task, notificationType) {
    if (!taskNotificationsEnabledRef.current || Notification.permission !== "granted") {
      return;
    }

    const notificationKey = `${notificationType}:${task.id || task.title || "task"}`;
    const lastNotificationTime = notifiedTaskEventsRef.current.get(notificationKey) || 0;
    const now = Date.now();

    if (now - lastNotificationTime < TASK_NOTIFICATION_THROTTLE_MS) {
      return;
    }

    notifiedTaskEventsRef.current.set(notificationKey, now);
    showTaskNotification(task, notificationType);
  }

  function notifyTaskDone(task) {
    notifyTaskEvent(task, "completed");
  }

  function notifyTaskCreated(task) {
    notifyTaskEvent(task, "created");
  }

  async function pushTaskEventToOtherDevices(task, notificationType) {
    if (!isBackgroundPushConfigured()) {
      return;
    }

    try {
      const originEndpoint = backgroundNotificationsEnabledRef.current
        ? pushOriginEndpointRef.current || (await getCurrentPushEndpoint())
        : null;
      pushOriginEndpointRef.current = originEndpoint;
      await sendTaskPushNotification(task, notificationType, originEndpoint);
    } catch (error) {
      console.warn("Could not send background task notification.", error);
    }
  }

  function notifyRemoteTaskChanges(remoteTasks) {
    remoteTasks.forEach((remoteTask) => {
      const previousTask = tasksRef.current.find((task) => task.id === remoteTask.id);

      if (!previousTask) {
        notifyTaskCreated(remoteTask);
        return;
      }

      if (previousTask?.completed === false && remoteTask.completed === true) {
        notifyTaskDone(remoteTask);
      }
    });
  }

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

        if (!mergeLocalTasks) {
          notifyRemoteTaskChanges(remoteTasks);
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
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        const previousTask = tasksRef.current.find((task) => task.id === payload.new?.id);
        const wasCompleted = payload.old?.completed ?? previousTask?.completed;

        if (payload.eventType === "INSERT" && payload.new && !previousTask) {
          notifyTaskCreated({
            id: payload.new.id,
            title: payload.new.title,
          });
        }

        if (payload.eventType === "UPDATE" && wasCompleted === false && payload.new?.completed === true) {
          notifyTaskDone({
            id: payload.new.id,
            title: payload.new.title,
          });
        }

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

  async function enableTaskNotifications() {
    if (!canUseTaskNotifications()) {
      setNotificationPermission("unsupported");
      taskNotificationsEnabledRef.current = false;
      setTaskNotificationsEnabled(false);
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationPermission("granted");
      localStorage.setItem(TASK_NOTIFICATION_KEY, "true");
      taskNotificationsEnabledRef.current = true;
      setTaskNotificationsEnabled(true);
      return;
    }

    const nextPermission = await Notification.requestPermission();
    setNotificationPermission(nextPermission);

    if (nextPermission === "granted") {
      localStorage.setItem(TASK_NOTIFICATION_KEY, "true");
      taskNotificationsEnabledRef.current = true;
      setTaskNotificationsEnabled(true);
      return;
    }

    taskNotificationsEnabledRef.current = false;
    setTaskNotificationsEnabled(false);
  }

  async function enableBackgroundNotifications() {
    if (!isBackgroundPushConfigured()) {
      return;
    }

    try {
      const result = await subscribeToTaskPushNotifications();

      if (!result.ok) {
        if (result.reason === "denied") {
          setNotificationPermission("denied");
        }

        backgroundNotificationsEnabledRef.current = false;
        setBackgroundNotificationsEnabled(false);
        return;
      }

      pushOriginEndpointRef.current = result.endpoint;
      localStorage.setItem(BACKGROUND_NOTIFICATION_KEY, "true");
      localStorage.setItem(TASK_NOTIFICATION_KEY, "true");
      taskNotificationsEnabledRef.current = true;
      backgroundNotificationsEnabledRef.current = true;
      setNotificationPermission("granted");
      setTaskNotificationsEnabled(true);
      setBackgroundNotificationsEnabled(true);
    } catch (error) {
      console.warn("Could not enable background notifications.", error);
      backgroundNotificationsEnabledRef.current = false;
      setBackgroundNotificationsEnabled(false);
    }
  }

  async function completeNotificationSetup() {
    await enableTaskNotifications();

    if (isBackgroundPushConfigured()) {
      await enableBackgroundNotifications();
    }

    localStorage.setItem(NOTIFICATION_PROMPT_DISMISSED_KEY, "true");
    setIsNotificationSetupOpen(false);
  }

  function dismissNotificationSetup() {
    localStorage.setItem(NOTIFICATION_PROMPT_DISMISSED_KEY, "true");
    setIsNotificationSetupOpen(false);
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

    const task = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      priority: "Work",
      time: "9:00 AM",
      dueDate: selectedDate,
      createdAt: Date.now(),
    };

    setTasks((currentTasks) => [task, ...currentTasks]);
    pushTaskEventToOtherDevices(task, "created");
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
          notifyTaskDone(task);
          pushTaskEventToOtherDevices(task, "completed");
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

  function clearCompletedTasks() {
    setTasks((currentTasks) => currentTasks.filter((task) => !task.completed));
    setIsClearDialogOpen(false);

    if (isSupabaseConfigured && isRemoteReady) {
      clearCompletedTasksFromSupabase().catch((error) => {
        console.warn("Could not clear completed tasks from Supabase.", error);
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
      className="app-shell pixel-world relative min-h-screen overflow-hidden px-4 pt-24 text-[#241609] sm:px-6 sm:pt-28 lg:px-8 lg:pt-32"
      style={{
        paddingBottom: `calc(${characterSafeSpace + 48}px + env(safe-area-inset-bottom, 0px))`,
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

      <section className="mobile-view-scale relative z-10 mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-[430px] flex-col items-center justify-start pt-14">
        <button
          type="button"
          onClick={toggleTheme}
          className="theme-toggle-floating focus-ring absolute right-0 top-0 inline-flex min-h-11 items-center gap-2 border-2 px-3 font-bold shadow-pixel transition hover:-translate-y-0.5"
          aria-label={isDark ? "Switch to day mode" : "Switch to night mode"}
        >
          {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          <span className="text-xs uppercase tracking-[0.08em]">{isDark ? "Night" : "Day"}</span>
        </button>

        <div className="malaysia-time-bar today-summary-card mb-3 flex w-full max-w-[430px] flex-col gap-2 px-3 py-2.5 text-[#3b2410]">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-[13px] font-bold leading-5 text-[#241609] sm:text-sm">
              {malaysiaDateLabel}
            </p>
            <time className="malaysia-time-pill shrink-0 border-2 px-2 py-1 text-xs font-bold uppercase">
              {malaysiaTimeLabel}
            </time>
          </div>
          <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#657748]">
            <span>{tasks.length} tasks</span>
            <span>{completedCount} done</span>
            <span>{pendingCount} left</span>
          </div>
          <div
            className="today-summary-progress h-2 overflow-hidden border-2"
            role="progressbar"
            aria-label="Today summary progress"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={progress}
          >
            <div className="h-full transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <nav className="mobile-panel-dock sticky top-3 z-30 mb-3 grid w-full max-w-[430px] grid-cols-3 gap-2" aria-label="Mobile task panels">
          {mobilePanels.map(({ id, label, icon: Icon }) => {
            const isActivePanel = activePanel === id;

            return (
              <motion.button
                key={id}
                type="button"
                onClick={() => setActivePanel(id)}
                whileTap={{ scale: 0.94 }}
                className={`focus-ring mobile-panel-tab relative min-h-14 overflow-hidden border-2 px-2 text-xs font-bold uppercase text-[#3b2410] shadow-pixel transition ${
                  isActivePanel
                    ? "border-[#6f8d53] bg-[#dfeab2]"
                    : "border-[#93b56f] bg-[#fffdf1]/90 hover:bg-[#edf4c9]"
                }`}
                aria-current={isActivePanel ? "page" : undefined}
              >
                <span className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-1">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span className="leading-4">{label}</span>
                </span>
              </motion.button>
            );
          })}
        </nav>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="grid w-full max-w-[430px] items-stretch gap-4"
        >
          <section
            className={`pixel-panel h-full flex-col p-3.5 sm:p-4 ${
              activePanel === "Tasks" ? "flex" : "hidden"
            }`}
            data-cat-zone="tasks"
          >
            <section
              className="next-task-card today-card-modern mb-4 border-2 border-[#b88947] bg-[#fffdf1] p-4 font-bold shadow-pixel sm:p-5"
              aria-label="Next task"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="next-task-kicker text-xs uppercase leading-4 tracking-[0.08em]">Next task</p>
                  <h2 className="next-task-title mt-2 max-w-full break-words text-2xl leading-8 [overflow-wrap:anywhere]">
                    {nextTask ? nextTask.title : "All tasks done"}
                  </h2>
                </div>
                <span className="next-task-days shrink-0 border-2 px-3 py-1.5 text-xs uppercase leading-4">
                  {nextTaskDaysLeft}
                </span>
              </div>
              {nextTask ? (
                <div className="next-task-meta mt-3 flex items-center gap-1.5 text-sm leading-5">
                  <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <time dateTime={nextTask.dueDate}>{nextTaskDateLabel}</time>
                </div>
              ) : (
                <p className="next-task-meta mt-3 flex items-center gap-1.5 text-sm leading-5">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  No pending tasks
                </p>
              )}
            </section>

            <div className="task-toolbar mb-3 flex items-stretch gap-2">
              <div className="min-w-0 flex-1">
                <FilterTabs filters={taskFilters} activeFilter={activeFilter} onChange={setActiveFilter} />
              </div>
              <button
                type="button"
                onClick={() => setIsClearDialogOpen(true)}
                disabled={tasks.length === 0}
                className="focus-ring clear-task-button grid min-h-11 w-11 shrink-0 place-items-center border-2 shadow-pixel transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                aria-label="Clear tasks"
                title="Clear tasks"
              >
                <Trash2 className="h-4.5 w-4.5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-1 flex-col space-y-3">
              <form onSubmit={addTask} className="add-task-input flex flex-col gap-3 px-3.5 py-3.5 sm:px-4" data-cat-zone="input">
                <div className="flex items-center gap-2.5">
                  <label htmlFor="task-input" className="sr-only">
                    New task
                  </label>
                  <input
                    id="task-input"
                    value={newTask}
                    onChange={(event) => setNewTask(event.target.value)}
                    className="add-task-field focus-ring min-h-12 min-w-0 flex-1 border-0 bg-transparent text-base font-bold leading-6 outline-none sm:text-lg"
                    placeholder="Add a new task..."
                    maxLength={120}
                    autoComplete="off"
                  />
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    type="submit"
                    className="focus-ring add-task-button grid h-11 w-11 shrink-0 place-items-center transition hover:-translate-y-0.5"
                    aria-label="Add task"
                  >
                    <Plus className="h-6 w-6" aria-hidden="true" />
                  </motion.button>
                </div>
                <span className="add-task-date inline-flex min-h-8 min-w-0 items-center gap-2 px-1 text-xs font-bold">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
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

          <aside className={`mx-auto w-full max-w-none space-y-4 ${activePanel === "Tasks" ? "hidden" : "block"}`}>
            <div className={activePanel === "Calendar" ? "block" : "hidden"}>
              <CalendarView tasks={tasks} selectedDate={selectedDate} onSelectDate={selectCalendarDate} />
            </div>
            <div className={activePanel === "Upcoming" ? "block" : "hidden"}>
              <UpcomingPanel groups={upcomingGroups} onSelectDate={selectCalendarDate} />
            </div>

          </aside>
        </motion.div>
      </section>

      <AnimatePresence>
        {isNotificationSetupOpen && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-[#1d1209]/45 px-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              className="notification-setup-card w-full max-w-[360px] border-4 p-5 text-center shadow-pixel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="notification-setup-title"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
            >
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center border-4 bg-[#fffdf1] shadow-pixel">
                <BellRing className="h-7 w-7 text-[#3d6d37]" aria-hidden="true" />
              </div>
              <h2 id="notification-setup-title" className="text-xl font-black uppercase text-[#2f5f34]">
                Allow Notifications
              </h2>
              <p className="mt-2 text-sm font-bold leading-6 text-[#5d794a]">
                Get alerts when another person adds a task or marks one complete, including background push when this device supports it.
              </p>
              {!isBackgroundPushConfigured() && (
                <p className="mt-3 border-2 border-[#d8c16f] bg-[#fff4bd] px-3 py-2 text-[11px] font-bold uppercase leading-4 text-[#7a6128]">
                  Background push needs the VAPID key and Supabase push function before it can turn on.
                </p>
              )}
              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={completeNotificationSetup}
                  className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 border-2 border-[#5f8f4d] bg-[#dff0b6] px-4 text-sm font-black uppercase text-[#2f5f34] shadow-pixel transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  <BellRing className="h-4 w-4" aria-hidden="true" />
                  Allow
                </button>
                <button
                  type="button"
                  onClick={dismissNotificationSetup}
                  className="focus-ring min-h-11 border-2 border-[#b5a06a] bg-[#fffdf1] px-4 text-xs font-black uppercase text-[#7a6128] shadow-pixel transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  Later
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}

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
              className="w-full max-w-md rounded-[1.5rem] border border-white/70 bg-white p-5 shadow-2xl dark:border-[#b9933f]/45 dark:bg-[#17140e]"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.18 }}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 id="clear-tasks-title" className="text-xl font-semibold text-slate-900 dark:text-[#f4e7bf]">
                    Delete tasks
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-[#c8ad63]">
                    Choose what you want to remove from your list.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsClearDialogOpen(false)}
                  className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-[#c8ad63] dark:hover:bg-[#231e14] dark:hover:text-[#e0bd62]"
                  aria-label="Close clear tasks dialog"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={clearAllTasks}
                  className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete all tasks
                </button>
                <button
                  type="button"
                  onClick={clearCompletedTasks}
                  disabled={completedCount === 0}
                  className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100 dark:hover:bg-rose-500/20"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Delete completed tasks
                </button>
                <button
                  type="button"
                  onClick={() => setIsClearDialogOpen(false)}
                  className="focus-ring min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-[#b9933f]/40 dark:bg-[#231e14] dark:text-[#f4e7bf] dark:hover:bg-[#17140e]"
                >
                  Cancel
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
