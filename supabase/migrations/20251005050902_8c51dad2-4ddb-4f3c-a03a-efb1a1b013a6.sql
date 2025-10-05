-- Grant admin role to saboor12124@gmail.com
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE email = 'saboor12124@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Create early access signups table
CREATE TABLE public.early_access_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  notified boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.early_access_signups ENABLE ROW LEVEL SECURITY;

-- Policies for early access signups
CREATE POLICY "Anyone can insert early access signups"
ON public.early_access_signups
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view all signups"
ON public.early_access_signups
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));