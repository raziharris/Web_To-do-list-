import { createClient } from "@supabase/supabase-js";

const fallbackSupabaseUrl = "https://ynryzozggxafgxyvhwas.supabase.co";
const fallbackSupabaseAnonKey = "sb_publishable_9a_l57gR0OkPiizxdBa5Hg_1id33u_B";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackSupabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackSupabaseAnonKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
