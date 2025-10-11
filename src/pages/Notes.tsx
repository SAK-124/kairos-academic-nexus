import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { useVirtualizer } from '@tanstack/react-virtual';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { NoteCard } from '@/components/notes/NoteCard';
import { NotesSidebar, type StudyMaterial } from '@/components/notes/NotesSidebar';
import { SearchBar } from '@/components/notes/SearchBar';
import { useToast } from '@/hooks/use-toast';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { FlashcardViewer } from '@/components/notes/FlashcardViewer';
import { QuizViewer } from '@/components/notes/QuizViewer';
import { useNotesWorkspace } from '@/hooks/useNotesWorkspace';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const PAGE_SIZE = 30;

export default function Notes() {
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<StudyMaterial | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const userId = user?.id;
  const orderStorageKey = `notes-order-${userId ?? 'guest'}-page-${page}`;
  const [noteOrder, setNoteOrder] = useLocalStorage<string[]>(orderStorageKey, []);

  const {
    notes,
    totalCount,
    courses,
    folders,
    isLoading,
    isFetching,
    createNote,
    toggleFavorite,
    deleteNote,
    moveToCourse,
    moveToFolder,
  } = useNotesWorkspace({
    userId,
    page,
    pageSize: PAGE_SIZE,
    search: searchQuery,
    courseId: selectedCourseId,
    folderId: selectedFolderId,
  });

  const handleToastError = useCallback(
    (title: string, error: unknown) => {
      const description = error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast({
        title,
        description,
        variant: 'destructive',
      });
    },
    [toast]
  );

  useEffect(() => {
    void checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setNoteOrder((prev) => {
      if (!notes.length) return [];
      const noteIds = notes.map((note) => note.id);
      const filtered = prev.filter((id) => noteIds.includes(id));
      const missing = noteIds.filter((id) => !filtered.includes(id));
      const combined = [...filtered, ...missing];
      if (combined.length === prev.length && combined.every((id, idx) => prev[idx] === id)) {
        return prev;
      }
      return combined;
    });
  }, [notes, setNoteOrder]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, selectedCourseId, selectedFolderId]);

  const orderedNotes = useMemo(() => {
    if (!noteOrder.length) return notes;
    const orderMap = new Map(noteOrder.map((id, index) => [id, index]));
    return [...notes].sort((a, b) => {
      const aIdx = orderMap.get(a.id);
      const bIdx = orderMap.get(b.id);
      if (aIdx === undefined && bIdx === undefined) {
        const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bTime - aTime;
      }
      if (aIdx === undefined) return 1;
      if (bIdx === undefined) return -1;
      return aIdx - bIdx;
    });
  }, [noteOrder, notes]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) {
      return orderedNotes;
    }
    const lowered = searchQuery.toLowerCase();
    return orderedNotes.filter((note) => {
      const matchesText = note.title?.toLowerCase().includes(lowered) || note.plain_text?.toLowerCase().includes(lowered);
      const matchesTags = note.tags?.some((tag) => tag.toLowerCase().includes(lowered));
      return Boolean(matchesText || matchesTags);
    });
  }, [orderedNotes, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const canPrevious = page > 0;
  const canNext = page + 1 < totalPages;

  const listParentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredNotes.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 280,
    overscan: 8,
  });

  async function checkAuth() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate('/?auth=true');
    } else {
      setUser(session.user);
    }
  }

  const handleCreateNote = useCallback(async () => {
    if (!userId) return;
    try {
      const note = await createNote();
      if (note) {
        navigate(`/notes/${note.id}`);
      }
    } catch (error) {
      handleToastError('Error creating note', error);
    }
  }, [createNote, handleToastError, navigate, userId]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleFavorite = useCallback(async (noteId: string, isFavorite: boolean) => {
    if (!userId) return;
    try {
      await toggleFavorite({ noteId, isFavorite });
    } catch (error) {
      handleToastError('Error updating note', error);
    }
  }, [handleToastError, toggleFavorite, userId]);

  const handleDelete = useCallback(async (noteId: string) => {
    if (!userId) return;
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await deleteNote(noteId);
      toast({
        title: 'Note deleted',
        description: 'Your note has been deleted successfully.',
      });
    } catch (error) {
      handleToastError('Error deleting note', error);
    }
  }, [deleteNote, handleToastError, toast, userId]);

  const handleMoveToCourse = useCallback(async (noteId: string, courseId: string | null) => {
    if (!userId) return;
    try {
      await moveToCourse({ noteId, courseId });
      toast({
        title: 'Success',
        description: courseId ? 'Note moved to course' : 'Note removed from course',
      });
    } catch (error) {
      handleToastError('Error', error);
    }
  }, [handleToastError, moveToCourse, toast, userId]);

  const handleMoveToFolder = useCallback(async (noteId: string, folderId: string | null) => {
    if (!userId) return;
    try {
      await moveToFolder({ noteId, folderId });
      toast({
        title: 'Success',
        description: folderId ? 'Note moved to folder' : 'Note removed from folder',
      });
    } catch (error) {
      handleToastError('Error', error);
    }
  }, [handleToastError, moveToFolder, toast, userId]);

  const handleDragStart = useCallback((noteId: string) => {
    setDraggingId(noteId);
  }, []);

  const handleDragEnter = useCallback((targetId: string) => {
    setNoteOrder((prev) => {
      if (!draggingId || draggingId === targetId) return prev;
      const updated = [...prev];
      const fromIndex = updated.indexOf(draggingId);
      const toIndex = updated.indexOf(targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, draggingId);
      return updated;
    });
  }, [draggingId, setNoteOrder]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

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
          userId={userId}
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

        <div className="flex-1 p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <SearchBar onSearch={handleSearch} />
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleCreateNote}
                  className="sm:hidden bg-gradient-to-r from-primary to-accent"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New note
                </Button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Page {page + 1} of {totalPages}</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={!canPrevious} onClick={() => canPrevious && setPage((prev) => prev - 1)}>
                      Prev
                    </Button>
                    <Button variant="outline" size="sm" disabled={!canNext} onClick={() => canNext && setPage((prev) => prev + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {isLoading ? (
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
              <div className="relative">
                <div
                  ref={listParentRef}
                  className="h-[70vh] overflow-auto pr-1"
                >
                  <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
                    {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                      const note = filteredNotes[virtualItem.index];
                      if (!note) return null;
                      return (
                        <div
                          key={virtualItem.key}
                          className="absolute top-0 left-0 w-full px-1 md:px-2 pb-3"
                          style={{ transform: `translateY(${virtualItem.start}px)` }}
                        >
                          <NoteCard
                            note={note}
                            onClick={() => navigate(`/notes/${note.id}`)}
                            onFavorite={handleFavorite}
                            onDelete={handleDelete}
                            courses={courses}
                            folders={folders}
                            onMoveToCourse={handleMoveToCourse}
                            onMoveToFolder={handleMoveToFolder}
                            draggable
                            isDragging={draggingId === note.id}
                            onDragStart={() => handleDragStart(note.id)}
                            onDragEnter={() => handleDragEnter(note.id)}
                            onDragEnd={handleDragEnd}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                {isFetching && !isLoading && (
                  <div className="absolute inset-x-0 top-2 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Button
          className="fixed bottom-8 right-8 rounded-full w-14 h-14 shadow-lg hidden sm:flex"
          onClick={handleCreateNote}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {viewingMaterial && viewingMaterial.type === 'flashcard' && (
        <FlashcardViewer
          flashcards={Array.isArray(viewingMaterial.content) ? viewingMaterial.content : []}
          onClose={() => setViewingMaterial(null)}
        />
      )}

      {viewingMaterial && viewingMaterial.type === 'quiz' && (
        <QuizViewer
          questions={Array.isArray(viewingMaterial.content) ? viewingMaterial.content : []}
          onClose={() => setViewingMaterial(null)}
        />
      )}
    </div>
  );
}
