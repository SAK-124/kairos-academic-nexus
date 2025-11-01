-- Create saved_schedules table
CREATE TABLE public.saved_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_name TEXT NOT NULL,
  courses JSONB NOT NULL,
  conflicts JSONB DEFAULT '[]'::jsonb,
  summary JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  semester TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_saved_schedules_user ON public.saved_schedules(user_id);
CREATE INDEX idx_saved_schedules_active ON public.saved_schedules(user_id, is_active);

-- Enable RLS
ALTER TABLE public.saved_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_schedules
CREATE POLICY "Users can view own schedules"
ON public.saved_schedules FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedules"
ON public.saved_schedules FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
ON public.saved_schedules FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules"
ON public.saved_schedules FOR DELETE
USING (auth.uid() = user_id);

-- Create schedule_courses table
CREATE TABLE public.schedule_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.saved_schedules(id) ON DELETE CASCADE,
  course_code TEXT NOT NULL,
  course_title TEXT NOT NULL,
  class_number TEXT,
  days TEXT[] NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  location TEXT,
  instructor TEXT,
  credits NUMERIC DEFAULT 3,
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_schedule_courses_schedule ON public.schedule_courses(schedule_id);

-- Enable RLS
ALTER TABLE public.schedule_courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schedule_courses
CREATE POLICY "Users can manage courses in their schedules"
ON public.schedule_courses FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.saved_schedules
    WHERE id = schedule_courses.schedule_id
    AND user_id = auth.uid()
  )
);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_courses;