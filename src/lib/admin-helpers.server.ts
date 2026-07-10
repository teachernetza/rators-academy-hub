// Server-only helpers for admin server functions.
// Kept in a separate .server.ts module so TanStack's server-fn splitter
// doesn't strip them from the worker bundle (which would 500 with
// "Server function info not found").
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export function getSupabaseAdmin() {
  return supabaseAdmin;
}

export function generatePassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  return out + "!1";
}

export async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!data || data.role !== "admin") throw new Error("Forbidden");
}

export async function getRole(userId: string) {
  const { data } = await supabaseAdmin
    .from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role as "admin" | "teacher" | "student" | undefined;
}
