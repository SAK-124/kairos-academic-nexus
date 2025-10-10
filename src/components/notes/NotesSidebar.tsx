import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, FileText, Star, Archive, BookOpen, Folder, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CourseDialog } from './CourseDialog';
import { FolderDialog } from './FolderDialog';
import { useToast } from '@/hooks/use-toast';

interface Course {
  id: string;
  name: string;
  code: string | null;
  color: string;
}

interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
}

interface StudyMaterial {
  id: string;
  type: string;
  note_id: string;
  course_id: string | null;
  created_at: string;
  notes?: { title: string };
}

interface NotesSidebarProps {
  onCreateNote: () => void;
  onCourseClick?: (courseId: string) => void;
  onFolderClick?: (folderId: string) => void;
  onViewStudyMaterial?: (material: any) => void;
  selectedCourseId?: string | null;
  selectedFolderId?: string | null;
}

export function NotesSidebar({ onCreateNote, onCourseClick, onFolderClick, onViewStudyMaterial, selectedCourseId, selectedFolderId }: NotesSidebarProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadCourses(),
      loadFolders(),
      loadStudyMaterials(),
    ]);
  };

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('name');

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('name');

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  const loadStudyMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('study_materials')
        .select('*, notes(title)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudyMaterials(data || []);
    } catch (error) {
      console.error('Error loading study materials:', error);
    }
  };

  const handleViewStudyMaterial = (material: StudyMaterial) => {
    onViewStudyMaterial?.(material);
  };

  return (
    <div className="w-64 border-r border-border/40 bg-card/50 backdrop-blur flex flex-col">
      <div className="p-4">
        <Button
          onClick={onCreateNote}
          className="w-full bg-gradient-to-r from-primary to-accent"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Note
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          <SidebarButton icon={FileText} label="All Notes" active />
          <SidebarButton icon={Star} label="Favorites" />
          <SidebarButton icon={Archive} label="Archived" />
        </div>

        {/* Courses Section */}
        <div className="p-4 border-t border-border/40">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              COURSES
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowCourseDialog(true)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {courses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No courses yet</p>
          ) : (
            <div className="space-y-1">
              {courses.map((course) => (
                <button
                  key={course.id}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left rounded transition-colors ${
                    selectedCourseId === course.id ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                  onClick={() => onCourseClick?.(course.id)}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: course.color }}
                  />
                  <div className="flex-1 truncate">
                    <div className="font-medium">{course.name}</div>
                    {course.code && (
                      <div className="text-xs text-muted-foreground">{course.code}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Folders Section */}
        <div className="p-4 border-t border-border/40">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              FOLDERS
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowFolderDialog(true)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {folders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No folders yet</p>
          ) : (
            <div className="space-y-1">
              {folders.filter(f => !f.parent_id).map((folder) => (
                <button
                  key={folder.id}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left rounded transition-colors ${
                    selectedFolderId === folder.id ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                  onClick={() => onFolderClick?.(folder.id)}
                >
                  <Folder className="w-4 h-4 text-primary" />
                  <span className="flex-1 truncate">{folder.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Study Materials Section */}
        <div className="p-4 border-t border-border/40">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            STUDY MATERIALS
          </h3>
          {studyMaterials.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Generate flashcards or quizzes to see them here
            </p>
          ) : (
            <div className="space-y-1">
              {studyMaterials.slice(0, 5).map((material) => (
                <button
                  key={material.id}
                  onClick={() => handleViewStudyMaterial(material)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left rounded hover:bg-accent/50 transition-colors"
                >
                  {material.type === 'flashcard' ? (
                    <GraduationCap className="w-4 h-4 text-primary" />
                  ) : (
                    <BookOpen className="w-4 h-4 text-primary" />
                  )}
                  <div className="flex-1 truncate">
                    <div className="font-medium capitalize">{material.type}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {material.notes?.title || 'Untitled Note'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <CourseDialog
        open={showCourseDialog}
        onOpenChange={setShowCourseDialog}
        onSuccess={loadCourses}
      />

      <FolderDialog
        open={showFolderDialog}
        onOpenChange={setShowFolderDialog}
        onSuccess={loadFolders}
      />
    </div>
  );
}

function SidebarButton({
  icon: Icon,
  label,
  active = false,
}: {
  icon: any;
  label: string;
  active?: boolean;
}) {
  return (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      className="w-full justify-start"
    >
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
}
