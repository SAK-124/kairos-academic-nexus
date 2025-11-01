-- Table for storing WebAuthn challenges
CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge text NOT NULL,
  type text NOT NULL DEFAULT 'login',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- Table for storing WebAuthn credentials
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires ON public.webauthn_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user ON public.webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_id ON public.webauthn_credentials(credential_id);

-- Enable RLS
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- RLS policies for credentials
CREATE POLICY "Users can view own credentials"
  ON public.webauthn_credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credentials"
  ON public.webauthn_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow public access to challenges (needed for registration/login flow)
CREATE POLICY "Anyone can insert challenges"
  ON public.webauthn_challenges FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read recent challenges"
  ON public.webauthn_challenges FOR SELECT
  USING (expires_at > now());

CREATE POLICY "Anyone can delete expired challenges"
  ON public.webauthn_challenges FOR DELETE
  USING (expires_at < now());