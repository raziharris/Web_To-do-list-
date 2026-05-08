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
      title: "Plan one tiny win for today",
      completed: false,
      priority: "Calm",
      dueDate: formatDateKey(),
      createdAt: Date.now() - 2,
    },
    {
      id: crypto.randomUUID(),
      title: "Drink water and reset the desk",
      completed: true,
      priority: "Easy",
      dueDate: formatDateKey(),
      createdAt: Date.now() - 1,
    },
  ];
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
      dueDate: task.dueDate || formatDateKey(new Date(task.createdAt || Date.now())),
    }));
  } catch {
    return createDefaultTasks();
  }
}

export function saveTasks(tasks) {
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}
