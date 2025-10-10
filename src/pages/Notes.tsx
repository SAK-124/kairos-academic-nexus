import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { NoteCard } from '@/components/notes/NoteCard';
import { NotesSidebar } from '@/components/notes/NotesSidebar';
import { SearchBar } from '@/components/notes/SearchBar';
import { useToast } from '@/hooks/use-toast';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { FlashcardViewer } from '@/components/notes/FlashcardViewer';
import { QuizViewer } from '@/components/notes/QuizViewer';

interface Note {
  id: string;
  title: string;
  plain_text: string;
  course_id: string | null;
  folder_id: string | null;
  tags: string[];
  is_favorite: boolean;
  updated_at: string;
}

export default function Notes() {
  const [user, setUser] = useState<any>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadNotes();
    }
  }, [user]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/?auth=true');
    } else {
      setUser(session.user);
    }
  };

  const loadNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading notes',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: 'Untitled Note',
          content: {},
          plain_text: '',
        })
        .select()
        .single();

      if (error) throw error;
      navigate(`/notes/${data.id}`);
    } catch (error: any) {
      toast({
        title: 'Error creating note',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFavorite = async (noteId: string, isFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ is_favorite: !isFavorite })
        .eq('id', noteId);

      if (error) throw error;
      loadNotes();
    } catch (error: any) {
      toast({
        title: 'Error updating note',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      loadNotes();
      toast({
        title: 'Note deleted',
        description: 'Your note has been deleted successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error deleting note',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = !searchQuery || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.plain_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCourse = !selectedCourseId || note.course_id === selectedCourseId;
    const matchesFolder = !selectedFolderId || note.folder_id === selectedFolderId;
    return matchesSearch && matchesCourse && matchesFolder;
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <AnimatedLogo onClick={() => navigate('/')} />
          <h1 className="text-2xl font-bold">My Notes</h1>
        </div>
      </div>

      <div className="flex flex-1">
        <NotesSidebar 
          onCreateNote={handleCreateNote}
          onCourseClick={(courseId) => {
            setSelectedCourseId(courseId === selectedCourseId ? null : courseId);
            setSelectedFolderId(null);
          }}
          onFolderClick={(folderId) => {
            setSelectedFolderId(folderId === selectedFolderId ? null : folderId);
            setSelectedCourseId(null);
          }}
          onViewStudyMaterial={setViewingMaterial}
          selectedCourseId={selectedCourseId}
          selectedFolderId={selectedFolderId}
        />

        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <SearchBar onSearch={handleSearch} />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-12">
                <div className="mb-4">
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Plus className="w-12 h-12 text-primary" />
                  </div>
                </div>
                <h3 className="text-2xl font-semibold mb-2">No notes yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start your academic journey by creating your first note
                </p>
                <Button onClick={handleCreateNote} className="bg-gradient-to-r from-primary to-accent">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Note
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onClick={() => navigate(`/notes/${note.id}`)}
                    onFavorite={handleFavorite}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <Button
          className="fixed bottom-8 right-8 rounded-full w-14 h-14 shadow-lg"
          onClick={handleCreateNote}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {viewingMaterial && viewingMaterial.type === 'flashcard' && (
        <FlashcardViewer
          flashcards={viewingMaterial.content}
          onClose={() => setViewingMaterial(null)}
        />
      )}

      {viewingMaterial && viewingMaterial.type === 'quiz' && (
        <QuizViewer
          questions={viewingMaterial.content}
          onClose={() => setViewingMaterial(null)}
        />
      )}
    </div>
  );
}
