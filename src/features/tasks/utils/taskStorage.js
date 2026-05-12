export const TASKS_STORAGE_KEY = "my-tasks-react";
export const THEME_STORAGE_KEY = "my-tasks-theme";

export function formatDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function createDefaultTasks() {
  return [
    {
      id: crypto.randomUUID(),
      title: "Design new landing page",
      completed: false,
      priority: "Work",
      time: "9:00 AM",
      dueDate: formatDateKey(),
      createdAt: Date.now() - 1,
    },
    {
      id: crypto.randomUUID(),
      title: "Update project documentation",
      completed: false,
      priority: "Work",
      time: "11:30 AM",
      dueDate: formatDateKey(),
      createdAt: Date.now() - 2,
    },
    {
      id: crypto.randomUUID(),
      title: "Reply to client emails",
      completed: false,
      priority: "Work",
      time: "1:00 PM",
      dueDate: formatDateKey(),
      createdAt: Date.now() - 3,
    },
    {
      id: crypto.randomUUID(),
      title: "Study Japanese for 30 minutes",
      completed: true,
      priority: "Personal",
      time: "4:00 PM",
      dueDate: formatDateKey(),
      createdAt: Date.now() - 4,
    },
    {
      id: crypto.randomUUID(),
      title: "Read a book",
      completed: false,
      priority: "Personal",
      time: "8:00 PM",
      dueDate: formatDateKey(),
      createdAt: Date.now() - 5,
    },
  ];
}

export function hasStoredTasks() {
  return localStorage.getItem(TASKS_STORAGE_KEY) !== null;
}

export function loadTasks() {
  const savedTasks = localStorage.getItem(TASKS_STORAGE_KEY);

  if (!savedTasks) {
    return createDefaultTasks();
  }

  try {
    const parsedTasks = JSON.parse(savedTasks);

    return parsedTasks.map((task) => ({
      ...task,
      priority: task.priority || "Work",
      time: task.time || "9:00 AM",
      dueDate: task.dueDate || formatDateKey(new Date(task.createdAt || Date.now())),
    }));
  } catch {
    return createDefaultTasks();
  }
}

export function saveTasks(tasks) {
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}
