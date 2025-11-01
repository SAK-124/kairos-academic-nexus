import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, FileText, Star, Archive, BookOpen, Folder, GraduationCap, Menu, X, Layers, HelpCircle, type LucideIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CourseDialog } from './CourseDialog';
import { FolderDialog } from './FolderDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface Course {
  id: string;
  name: string;
  code: string | null;
  color: string;
}

export interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
  course_id: string | null;
}

export interface StudyMaterial {
  id: string;
  type: string;
  note_id: string;
  course_id: string | null;
  folder_id: string | null;
  content: unknown;
  created_at: string;
  notes?: { title: string };
}

interface NotesSidebarProps {
  onCreateNote: () => void;
  onCourseClick?: (courseId: string) => void;
  onFolderClick?: (folderId: string) => void;
  onViewStudyMaterial?: (material: StudyMaterial) => void;
  selectedCourseId?: string | null;
  selectedFolderId?: string | null;
  userId?: string;
}

export function NotesSidebar({ onCreateNote, onCourseClick, onFolderClick, onViewStudyMaterial, selectedCourseId, selectedFolderId, userId }: NotesSidebarProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [preselectedCourseId, setPreselectedCourseId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!userId) {
      setCourses([]);
      setFolders([]);
      setStudyMaterials([]);
      return;
    }

    const loadData = async () => {
      await Promise.all([
        loadCourses(),
        loadFolders(),
        loadStudyMaterials(userId),
      ]);
    };

    loadData();
  }, [userId]);

  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  const loadCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('courses')
        .select('id,name,code,color')
        .eq('user_id', user.id)
        .order('name')
        .range(0, 199);

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadFolders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('folders')
        .select('id,name,parent_id,course_id')
        .eq('user_id', user.id)
        .order('name')
        .range(0, 199);

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  const loadStudyMaterials = async (currentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('study_materials')
        .select('id,type,note_id,course_id,folder_id,content,created_at,notes(title)')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .range(0, 199);

      if (error) throw error;
      setStudyMaterials(data || []);
    } catch (error) {
      console.error('Error loading study materials:', error);
    }
  };

  // Group study materials by course, folder, and ungrouped
  const groupedMaterials = useMemo(() => {
    const groups = {
      byCourse: {} as Record<string, StudyMaterial[]>,
      byFolder: {} as Record<string, StudyMaterial[]>,
      ungrouped: [] as StudyMaterial[]
    };
    
    studyMaterials.forEach(material => {
      if (material.course_id) {
        if (!groups.byCourse[material.course_id]) {
          groups.byCourse[material.course_id] = [];
        }
        groups.byCourse[material.course_id].push(material);
      } else if (material.folder_id) {
        if (!groups.byFolder[material.folder_id]) {
          groups.byFolder[material.folder_id] = [];
        }
        groups.byFolder[material.folder_id].push(material);
      } else {
        groups.ungrouped.push(material);
      }
    });
    
    return groups;
  }, [studyMaterials]);

  // Group folders by course
  const foldersByCourse = useMemo(() => {
    const grouped = {
      withCourse: {} as Record<string, FolderItem[]>,
      standalone: [] as FolderItem[]
    };
    
    folders.forEach(folder => {
      if (folder.course_id) {
        if (!grouped.withCourse[folder.course_id]) {
          grouped.withCourse[folder.course_id] = [];
        }
        grouped.withCourse[folder.course_id].push(folder);
      } else {
        grouped.standalone.push(folder);
      }
    });
    
    return grouped;
  }, [folders]);

  const handleViewStudyMaterial = (material: StudyMaterial) => {
    onViewStudyMaterial?.(material);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleOpenFolderDialog = (courseId?: string) => {
    setPreselectedCourseId(courseId || null);
    setShowFolderDialog(true);
  };

  return (
    <>
      {/* Mobile hamburger button */}
      {isMobile && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed top-20 left-4 z-50 md:hidden shadow-lg"
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      )}
      
      {/* Mobile overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <div className={cn(
        "border-r border-border/40 bg-card/50 backdrop-blur flex flex-col transition-transform duration-300 ease-in-out",
        isMobile && "fixed inset-y-0 left-0 z-40 w-64",
        isMobile && !isSidebarOpen && "-translate-x-full",
        !isMobile && "w-64 relative"
      )}>
        <div className="p-4">
          <Button
            onClick={onCreateNote}
            className="w-full"
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

          {/* Courses Section with Nested Folders */}
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
                  <Collapsible key={course.id} defaultOpen={selectedCourseId === course.id}>
                    <div className="space-y-1">
                      <CollapsibleTrigger asChild>
                        <button
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left rounded transition-colors hover:bg-accent/50",
                            selectedCourseId === course.id && "bg-accent"
                          )}
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
                      </CollapsibleTrigger>
                      
                      {/* Folders within this course */}
                      <CollapsibleContent className="ml-6 space-y-1">
                        {foldersByCourse.withCourse[course.id]?.map(folder => (
                          <button
                            key={folder.id}
                            className={cn(
                              "w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left rounded transition-colors hover:bg-accent/50",
                              selectedFolderId === folder.id && "bg-accent"
                            )}
                            onClick={() => onFolderClick?.(folder.id)}
                          >
                            <Folder className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="flex-1 truncate">{folder.name}</span>
                          </button>
                        ))}
                        
                        {/* Add folder button for this course */}
                        <button
                          onClick={() => handleOpenFolderDialog(course.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left rounded transition-colors hover:bg-accent/50 text-muted-foreground"
                        >
                          <Plus className="w-4 h-4 flex-shrink-0" />
                          <span className="text-xs">Add Folder</span>
                        </button>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </div>

          {/* Standalone Folders Section */}
          {foldersByCourse.standalone.length > 0 && (
            <div className="p-4 border-t border-border/40">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  FOLDERS
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleOpenFolderDialog()}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {foldersByCourse.standalone.filter(f => !f.parent_id).map((folder) => (
                  <button
                    key={folder.id}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left rounded transition-colors hover:bg-accent/50",
                      selectedFolderId === folder.id && "bg-accent"
                    )}
                    onClick={() => onFolderClick?.(folder.id)}
                  >
                    <Folder className="w-4 h-4 text-primary" />
                    <span className="flex-1 truncate">{folder.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Study Materials Section - Organized */}
          <div className="p-4 border-t border-border/40">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              STUDY MATERIALS
            </h3>
            {studyMaterials.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Generate flashcards or quizzes to see them here
              </p>
            ) : (
              <div className="space-y-2">
                {/* Materials by Course */}
                {courses.map(course => {
                  const materials = groupedMaterials.byCourse[course.id];
                  if (!materials || materials.length === 0) return null;
                  
                  return (
                    <Collapsible key={`course-mat-${course.id}`} defaultOpen>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-accent/50 transition-colors">
                        <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium flex-1 text-left truncate">{course.name}</span>
                        <span className="text-xs text-muted-foreground">{materials.length}</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="ml-6 mt-1 space-y-1">
                        {materials.map(material => (
                          <button
                            key={material.id}
                            onClick={() => handleViewStudyMaterial(material)}
                            className="w-full flex items-center gap-2 px-2 py-1 text-xs text-left rounded hover:bg-accent/50 transition-colors"
                          >
                            {material.type === 'flashcard' ? (
                              <Layers className="w-3 h-3 text-primary flex-shrink-0" />
                            ) : (
                              <HelpCircle className="w-3 h-3 text-primary flex-shrink-0" />
                            )}
                            <span className="capitalize truncate">{material.type}</span>
                          </button>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
                
                {/* Materials by Folder */}
                {folders.map(folder => {
                  const materials = groupedMaterials.byFolder[folder.id];
                  if (!materials || materials.length === 0) return null;
                  
                  return (
                    <Collapsible key={`folder-mat-${folder.id}`} defaultOpen>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-accent/50 transition-colors">
                        <Folder className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium flex-1 text-left truncate">{folder.name}</span>
                        <span className="text-xs text-muted-foreground">{materials.length}</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="ml-6 mt-1 space-y-1">
                        {materials.map(material => (
                          <button
                            key={material.id}
                            onClick={() => handleViewStudyMaterial(material)}
                            className="w-full flex items-center gap-2 px-2 py-1 text-xs text-left rounded hover:bg-accent/50 transition-colors"
                          >
                            {material.type === 'flashcard' ? (
                              <Layers className="w-3 h-3 text-primary flex-shrink-0" />
                            ) : (
                              <HelpCircle className="w-3 h-3 text-primary flex-shrink-0" />
                            )}
                            <span className="capitalize truncate">{material.type}</span>
                          </button>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
                
                {/* Ungrouped Materials */}
                {groupedMaterials.ungrouped.length > 0 && (
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-accent/50 transition-colors">
                      <Archive className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="font-medium flex-1 text-left">Uncategorized</span>
                      <span className="text-xs text-muted-foreground">{groupedMaterials.ungrouped.length}</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-6 mt-1 space-y-1">
                      {groupedMaterials.ungrouped.map(material => (
                        <button
                          key={material.id}
                          onClick={() => handleViewStudyMaterial(material)}
                          className="w-full flex items-center gap-2 px-2 py-1 text-xs text-left rounded hover:bg-accent/50 transition-colors"
                        >
                          {material.type === 'flashcard' ? (
                            <Layers className="w-3 h-3 text-primary flex-shrink-0" />
                          ) : (
                            <HelpCircle className="w-3 h-3 text-primary flex-shrink-0" />
                          )}
                          <span className="capitalize truncate">{material.type}</span>
                        </button>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
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
          preselectedCourseId={preselectedCourseId}
        />
      </div>
    </>
  );
}

function SidebarButton({
  icon: Icon,
  label,
  active = false,
}: {
  icon: LucideIcon;
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