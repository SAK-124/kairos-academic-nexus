CREATE INDEX IF NOT EXISTS idx_notes_user_updated ON public.notes (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_user_name ON public.courses (user_id, name);
CREATE INDEX IF NOT EXISTS idx_folders_user_name ON public.folders (user_id, name);
