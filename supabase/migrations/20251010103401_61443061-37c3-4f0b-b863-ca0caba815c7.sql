-- Create study_materials table for storing flashcards and quizzes
CREATE TABLE IF NOT EXISTS study_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('flashcard', 'quiz')),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_reviewed_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_study_materials_user_id ON study_materials(user_id);
CREATE INDEX idx_study_materials_note_id ON study_materials(note_id);
CREATE INDEX idx_study_materials_type ON study_materials(type);
CREATE INDEX idx_study_materials_course_id ON study_materials(course_id);
CREATE INDEX idx_study_materials_folder_id ON study_materials(folder_id);

-- Enable Row Level Security
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own study materials"
  ON study_materials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own study materials"
  ON study_materials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study materials"
  ON study_materials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study materials"
  ON study_materials FOR DELETE
  USING (auth.uid() = user_id);