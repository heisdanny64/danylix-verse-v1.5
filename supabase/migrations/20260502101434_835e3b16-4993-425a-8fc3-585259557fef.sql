
-- 1. Extend continue_watching with exact-second resume info
ALTER TABLE public.continue_watching
  ADD COLUMN IF NOT EXISTS current_time_sec real,
  ADD COLUMN IF NOT EXISTS duration_sec real;

-- 2. Watch history (append-only)
CREATE TABLE IF NOT EXISTS public.watch_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  content_id text NOT NULL,
  content_type text NOT NULL,
  title text NOT NULL,
  poster text,
  season integer,
  episode integer,
  watched_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS watch_history_user_idx ON public.watch_history (user_id, watched_at DESC);
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watch_history"
  ON public.watch_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own watch_history"
  ON public.watch_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own watch_history"
  ON public.watch_history FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 3. Search history
CREATE TABLE IF NOT EXISTS public.search_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  query text NOT NULL,
  searched_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS search_history_user_idx ON public.search_history (user_id, searched_at DESC);
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search_history"
  ON public.search_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own search_history"
  ON public.search_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own search_history"
  ON public.search_history FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4. User preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid NOT NULL PRIMARY KEY,
  preferred_subtitle_lang text DEFAULT 'en',
  preferred_quality text,
  autoplay_next boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own preferences"
  ON public.user_preferences FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
