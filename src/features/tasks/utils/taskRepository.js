import { supabase } from "./supabaseClient.js";

const TASKS_TABLE = "tasks";

function taskFromRow(row) {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed,
    priority: row.priority,
    dueDate: row.due_date,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function taskToRow(task, position) {
  return {
    id: task.id,
    title: task.title,
    completed: task.completed,
    priority: task.priority || "Focus",
    due_date: task.dueDate,
    position,
    created_at: new Date(task.createdAt || Date.now()).toISOString(),
  };
}

export async function loadTasksFromSupabase() {
  const { data, error } = await supabase
    .from(TASKS_TABLE)
    .select("id,title,completed,priority,due_date,created_at,position")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data.map(taskFromRow);
}

export async function saveTasksToSupabase(tasks) {
  if (tasks.length === 0) {
    return;
  }

  const { error } = await supabase
    .from(TASKS_TABLE)
    .upsert(tasks.map(taskToRow), { onConflict: "id" });

  if (error) {
    throw error;
  }
}

export async function deleteTaskFromSupabase(taskId) {
  const { error } = await supabase.from(TASKS_TABLE).delete().eq("id", taskId);

  if (error) {
    throw error;
  }
}

export async function clearTasksFromSupabase() {
  const { error } = await supabase.from(TASKS_TABLE).delete().not("id", "is", null);

  if (error) {
    throw error;
  }
}
