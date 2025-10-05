-- Extend early_access_signups table with full user details
ALTER TABLE public.early_access_signups
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS university TEXT,
ADD COLUMN IF NOT EXISTS graduation_year TEXT,
ADD COLUMN IF NOT EXISTS interest_level TEXT DEFAULT 'casual';

-- Create contact_submissions table
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved BOOLEAN DEFAULT false
);

-- Enable RLS on contact_submissions
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_submissions
CREATE POLICY "Anyone can insert contact submissions"
ON public.contact_submissions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view contact submissions"
ON public.contact_submissions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update contact submissions"
ON public.contact_submissions FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed missing content sections
INSERT INTO public.content_sections (section_name, content)
VALUES 
  ('problem_before', '{"items": ["Spreadsheet overwhelm", "Manual conflict checking", "Last-minute schedule changes", "Scattered notes across apps", "Missing instructor insights"]}'::jsonb),
  ('problem_after', '{"items": ["AI-generated optimal schedules", "Automatic conflict resolution", "Instant schedule adjustments", "Smart unified note system", "Instructor intelligence insights"]}'::jsonb),
  ('value_benefits', '{"benefits": [{"icon": "Calendar", "title": "Smart Scheduling", "description": "AI-generated conflict-free schedules ranked by best fit"}, {"icon": "Brain", "title": "AI Notes", "description": "Smart formatting, canvas mode, and semantic search"}, {"icon": "Target", "title": "Dynamic Planning", "description": "Instant recalculation when sections fill up"}, {"icon": "Users", "title": "Collaboration", "description": "Opt-in study groups with private contact links"}, {"icon": "Sparkles", "title": "Instructor Intel", "description": "AI-generated faculty reviews and performance metrics"}]}'::jsonb),
  ('how_it_works', '{"steps": [{"icon": "Upload", "number": "1", "title": "Upload", "description": "Drop your course Excel file"}, {"icon": "Settings", "number": "2", "title": "Preferences", "description": "Set your preferred days, times, and instructors"}, {"icon": "CheckCircle", "number": "3", "title": "Get Schedule", "description": "Receive conflict-free schedules ranked by fit"}]}'::jsonb),
  ('social_proof', '{"proofs": ["Trusted by IBA students", "Rapidly expanding network", "AI-powered scheduling", "Smart note-taking", "Collaborative learning"]}'::jsonb),
  ('testimonial', '{"quote": "Kairos transformed my course planning from a 3-hour nightmare into a 5-minute breeze. The AI scheduling is incredibly smart, and the note-taking features are exactly what I needed.", "name": "Ahmed K.", "title": "BBA Student, IBA", "avatar_gradient": "from-primary to-accent"}'::jsonb),
  ('footer', '{"company": "Kairos", "tagline": "Your AI-Powered Academic Companion", "copyright": "© 2025 Kairos. All rights reserved."}'::jsonb)
ON CONFLICT (section_name) DO NOTHING;