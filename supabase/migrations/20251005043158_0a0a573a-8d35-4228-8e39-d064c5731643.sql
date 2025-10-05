-- Create user_roles table for admin access
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create content_sections table for editable content
CREATE TABLE public.content_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_name TEXT NOT NULL UNIQUE,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.content_sections ENABLE ROW LEVEL SECURITY;

-- Everyone can read content
CREATE POLICY "Anyone can view content"
ON public.content_sections FOR SELECT
USING (true);

-- Only admins can modify content
CREATE POLICY "Admins can update content"
ON public.content_sections FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert content"
ON public.content_sections FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for content updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_sections;

-- Create animation_settings table
CREATE TABLE public.animation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_name TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.animation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view animation settings"
ON public.animation_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can update animation settings"
ON public.animation_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.animation_settings;

-- Create button_mappings table
CREATE TABLE public.button_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    button_id TEXT NOT NULL UNIQUE,
    text TEXT NOT NULL,
    hover_text TEXT,
    route TEXT,
    enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.button_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view button mappings"
ON public.button_mappings FOR SELECT
USING (true);

CREATE POLICY "Admins can update button mappings"
ON public.button_mappings FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.button_mappings;

-- Insert default content
INSERT INTO public.content_sections (section_name, content) VALUES
('hero', '{"headline": "Your AI-Powered Academic Companion", "description": "Transform chaos into clarity. Smart scheduling, intelligent notes, and seamless collaboration—all in one place.", "cta_text": "Start Planning"}'::jsonb),
('social_proof', '{"badges": ["Trusted by IBA students", "Rapidly expanding network", "20+ active users"]}'::jsonb),
('testimonial', '{"quote": "Kairos transformed my course planning from a 3-hour nightmare into a 5-minute breeze. The AI scheduling is incredibly smart, and the note-taking features are exactly what I needed.", "name": "Ahmed K.", "title": "BBA Student, IBA"}'::jsonb),
('pricing', '{"tiers": [{"name": "Free", "features": ["Basic scheduling", "3 courses max", "Standard support"]}, {"name": "Pro", "features": ["Unlimited courses", "AI notes", "Priority support", "Instructor intel"]}, {"name": "Team", "features": ["Everything in Pro", "Study groups", "Analytics", "Admin controls"]}]}'::jsonb),
('faq', '{"items": [{"question": "How does Kairos generate schedules?", "answer": "Kairos uses advanced AI algorithms to analyze your course data, preferences, and constraints to generate conflict-free schedules."}, {"question": "Can I change my schedule after generating it?", "answer": "Absolutely! Kairos supports dynamic re-planning."}, {"question": "Is my data private and secure?", "answer": "Yes. All your data is stored securely and encrypted."}, {"question": "What makes the AI note system special?", "answer": "Our AI notes feature smart formatting, autocomplete, markdown support, and a unique canvas mode."}]}'::jsonb);

-- Insert default animation settings
INSERT INTO public.animation_settings (setting_name, value) VALUES
('global', '{"fadeInDuration": "600ms", "dissolveDuration": "600ms", "scaleInDuration": "400ms"}'::jsonb),
('intro', '{"displayDuration": 2000, "fadeOutDuration": 600}'::jsonb);

-- Insert default button mappings
INSERT INTO public.button_mappings (button_id, text, hover_text, route, enabled) VALUES
('hero_cta', 'Start Planning', 'Coming Soon', '/scheduler', false),
('footer_privacy', 'Privacy Policy', null, '/', true),
('footer_terms', 'Terms of Service', null, '/', true),
('footer_contact', 'Contact', null, '/', true);