-- Fix content_sections RLS policies to properly allow admin access

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can insert content" ON content_sections;
DROP POLICY IF EXISTS "Admins can update content" ON content_sections;

-- Recreate INSERT policy with proper WITH CHECK clause
CREATE POLICY "Admins can insert content"
ON content_sections
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Recreate UPDATE policy with both USING and WITH CHECK clauses
CREATE POLICY "Admins can update content"
ON content_sections
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for completeness
CREATE POLICY "Admins can delete content"
ON content_sections
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));