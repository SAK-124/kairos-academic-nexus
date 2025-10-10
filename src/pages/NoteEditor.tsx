import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Star, Loader2 } from 'lucide-react';
import { TipTapEditor } from '@/components/notes/editor/TipTapEditor';
import { AIAssistantPanel } from '@/components/notes/editor/AIAssistantPanel';
import { useToast } from '@/hooks/use-toast';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { FlashcardViewer } from '@/components/notes/FlashcardViewer';
import { QuizViewer } from '@/components/notes/QuizViewer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function NoteEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [note, setNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showFlashcardViewer, setShowFlashcardViewer] = useState(false);
  const [showQuizViewer, setShowQuizViewer] = useState(false);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);

  useEffect(() => {
    checkAuthAndLoadNote();
    loadCoursesAndFolders();
  }, [id]);

  const checkAuthAndLoadNote = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/?auth=true');
      return;
    }

    await loadNote();
  };

  const loadNote = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setNote(data);
      setTitle(data.title);
      setIsFavorite(data.is_favorite);
    } catch (error: any) {
      toast({
        title: 'Error loading note',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/notes');
    } finally {
      setLoading(false);
    }
  };

  const loadCoursesAndFolders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const [coursesData, foldersData] = await Promise.all([
      supabase.from('courses').select('*').eq('user_id', session.user.id),
      supabase.from('folders').select('*').eq('user_id', session.user.id),
    ]);

    if (coursesData.data) setCourses(coursesData.data);
    if (foldersData.data) setFolders(foldersData.data);
  };

  const handleTitleChange = async (newTitle: string) => {
    setTitle(newTitle);
    try {
      const { error } = await supabase
        .from('notes')
        .update({ title: newTitle })
        .eq('id', id);

      if (error) throw error;
      setLastSaved(new Date());
    } catch (error: any) {
      console.error('Error updating title:', error);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ is_favorite: !isFavorite })
        .eq('id', id);

      if (error) throw error;
      setIsFavorite(!isFavorite);
    } catch (error: any) {
      toast({
        title: 'Error updating note',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCourseChange = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ course_id: courseId === 'none' ? null : courseId })
        .eq('id', id);

      if (error) throw error;
      setNote({ ...note, course_id: courseId === 'none' ? null : courseId });
      toast({ title: 'Course updated' });
    } catch (error: any) {
      toast({
        title: 'Error updating course',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleFolderChange = async (folderId: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ folder_id: folderId === 'none' ? null : folderId })
        .eq('id', id);

      if (error) throw error;
      setNote({ ...note, folder_id: folderId === 'none' ? null : folderId });
      toast({ title: 'Folder updated' });
    } catch (error: any) {
      toast({
        title: 'Error updating folder',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getLastSavedText = () => {
    if (!lastSaved) return 'All changes saved';
    const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
    if (seconds < 5) return 'Saved just now';
    if (seconds < 60) return `Saved ${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `Saved ${minutes}m ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <AnimatedLogo onClick={() => navigate('/')} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/notes')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-2xl font-semibold bg-transparent border-none outline-none flex-1"
                placeholder="Untitled Note"
              />
            </div>
            <div className="flex items-center gap-3">
              <Select value={note.course_id || 'none'} onValueChange={handleCourseChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Course</SelectItem>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={note.folder_id || 'none'} onValueChange={handleFolderChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Folder</SelectItem>
                  {folders.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {getLastSavedText()}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleFavorite}
              >
                <Star
                  className={`w-5 h-5 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`}
                />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <TipTapEditor
              noteId={id!}
              initialContent={note.content}
              onSave={setLastSaved}
            />
          </div>
        </div>

        <div className="w-96 border-l border-border/40 p-6">
          <AIAssistantPanel 
            noteId={id!} 
            courseId={note.course_id} 
            folderId={note.folder_id}
            onShowFlashcards={(cards) => {
              setFlashcards(cards);
              setShowFlashcardViewer(true);
            }}
            onShowQuiz={(questions) => {
              setQuizQuestions(questions);
              setShowQuizViewer(true);
            }}
            onGeneratingChange={setIsGenerating}
          />
        </div>
      </div>

      {showFlashcardViewer && (
        <FlashcardViewer
          flashcards={flashcards}
          onClose={() => setShowFlashcardViewer(false)}
          isGenerating={isGenerating}
        />
      )}

      {showQuizViewer && (
        <QuizViewer
          questions={quizQuestions}
          onClose={() => setShowQuizViewer(false)}
        />
      )}
    </div>
  );
}
