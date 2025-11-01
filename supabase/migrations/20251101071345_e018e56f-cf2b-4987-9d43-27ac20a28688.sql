-- Create newsletter signups table
CREATE TABLE IF NOT EXISTS public.newsletter_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text,
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_signups(email);

-- Enable RLS
ALTER TABLE public.newsletter_signups ENABLE ROW LEVEL SECURITY;

-- Allow anyone to subscribe
CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_signups 
  FOR INSERT 
  WITH CHECK (true);

-- Only admins can view newsletter signups
CREATE POLICY "Admins can view newsletter signups"
  ON public.newsletter_signups 
  FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));