import { supabase } from "@/integrations/supabase/client";

export interface CloudWatchlistItem {
  id: string;
  user_id: string;
  content_id: string;
  content_type: "movie" | "tv" | "anime";
  title: string;
  poster: string | null;
  added_at: string;
}

export interface CloudContinueItem {
  id: string;
  user_id: string;
  content_id: string;
  content_type: "movie" | "tv" | "anime";
  title: string;
  poster: string | null;
  season: number | null;
  episode: number | null;
  progress: number;
  last_channel: number | null;
  updated_at: string;
}

export async function fetchCloudWatchlist(userId: string): Promise<CloudWatchlistItem[]> {
  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });
  if (error) { console.error("fetchCloudWatchlist error:", error); return []; }
  return (data ?? []) as CloudWatchlistItem[];
}

export async function addToCloudWatchlist(
  userId: string,
  contentId: string,
  contentType: "movie" | "tv" | "anime",
  title: string,
  poster: string | null
) {
  const { error } = await supabase.from("watchlist").upsert(
    { user_id: userId, content_id: contentId, content_type: contentType, title, poster },
    { onConflict: "user_id,content_id,content_type" }
  );
  if (error) console.error("addToCloudWatchlist error:", error);
  return !error;
}

export async function removeFromCloudWatchlist(userId: string, contentId: string, contentType: string) {
  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", userId)
    .eq("content_id", contentId)
    .eq("content_type", contentType);
  if (error) console.error("removeFromCloudWatchlist error:", error);
  return !error;
}

export async function isInCloudWatchlist(userId: string, contentId: string, contentType: string): Promise<boolean> {
  const { count } = await supabase
    .from("watchlist")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("content_id", contentId)
    .eq("content_type", contentType);
  return (count ?? 0) > 0;
}

export async function fetchCloudContinueWatching(userId: string): Promise<CloudContinueItem[]> {
  const { data, error } = await supabase
    .from("continue_watching")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) { console.error("fetchCloudContinueWatching error:", error); return []; }
  return (data ?? []) as CloudContinueItem[];
}

export async function updateCloudProgress(
  userId: string,
  contentId: string,
  contentType: "movie" | "tv" | "anime",
  title: string,
  poster: string | null,
  progress: number,
  season?: number,
  episode?: number,
  lastChannel?: number,
  currentTime?: number,
  duration?: number,
) {
  if (progress >= 95) {
    await supabase
      .from("continue_watching")
      .delete()
      .eq("user_id", userId)
      .eq("content_id", contentId)
      .eq("content_type", contentType);
    return;
  }

  const { error } = await supabase.from("continue_watching").upsert(
    {
      user_id: userId,
      content_id: contentId,
      content_type: contentType,
      title,
      poster,
      progress,
      season: season ?? null,
      episode: episode ?? null,
      last_channel: lastChannel ?? null,
      current_time_sec: currentTime ?? null,
      duration_sec: duration ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,content_id,content_type" }
  );
  if (error) console.error("updateCloudProgress error:", error);
}

export async function removeFromCloudContinue(userId: string, contentId: string, contentType: string) {
  await supabase
    .from("continue_watching")
    .delete()
    .eq("user_id", userId)
    .eq("content_id", contentId)
    .eq("content_type", contentType);
}

export async function fetchCloudDownloads(userId: string) {
  const { data, error } = await supabase
    .from("downloads")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) { console.error("fetchCloudDownloads error:", error); return []; }
  return data ?? [];
}
