-- Add course_id column to folders table to enable nested folders within courses
ALTER TABLE folders 
ADD COLUMN course_id uuid REFERENCES courses(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_folders_course_id ON folders(course_id);