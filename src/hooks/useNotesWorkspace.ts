import { useMemo } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type NoteRow = Database['public']['Tables']['notes']['Row'];

type CourseRow = { id: string; name: string };
type FolderRow = { id: string; name: string };

type NotesResult = {
  data: NoteRow[];
  count: number;
};

const NOTE_COLUMNS = 'id,title,plain_text,tags,is_favorite,updated_at,course_id,folder_id';

interface UseNotesWorkspaceOptions {
  userId?: string;
  page: number;
  pageSize: number;
  search?: string;
  courseId?: string | null;
  folderId?: string | null;
}

const sanitizeSearch = (value?: string) => value?.trim() ?? '';

export function useNotesWorkspace({ userId, page, pageSize, search, courseId, folderId }: UseNotesWorkspaceOptions) {
  const queryClient = useQueryClient();

  const notesQueryKey = useMemo(
    () => ['notes', userId, page, pageSize, search ?? '', courseId ?? '', folderId ?? ''] as const,
    [userId, page, pageSize, search, courseId, folderId]
  );

  const notesQuery = useQuery<NotesResult>({
    queryKey: notesQueryKey,
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (!userId) {
        return { data: [], count: 0 };
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;
      const searchTerm = sanitizeSearch(search);

      let query = supabase
        .from('notes')
        .select(`${NOTE_COLUMNS}`, { count: 'exact' })
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .range(from, to);

      if (searchTerm) {
        const normalised = searchTerm.replace(/\s+/g, ' ');
        const safeSearch = normalised.replace(/"/g, '');
        query = query.or(
          `title.ilike.%${safeSearch}%,plain_text.ilike.%${safeSearch}%,tags.cs.{"${safeSearch}"}`
        );
      }

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      if (folderId) {
        query = query.eq('folder_id', folderId);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return { data: (data ?? []) as NoteRow[], count: count ?? 0 };
    },
  });

  const coursesQuery = useQuery({
    queryKey: ['courses', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name')
        .eq('user_id', userId!)
        .order('name');

      if (error) throw error;
      return (data ?? []) as CourseRow[];
    },
  });

  const foldersQuery = useQuery({
    queryKey: ['folders', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('folders')
        .select('id, name')
        .eq('user_id', userId!)
        .order('name');

      if (error) throw error;
      return (data ?? []) as FolderRow[];
    },
  });

  const invalidateNotes = () =>
    queryClient.invalidateQueries({ queryKey: ['notes', userId], exact: false });

  const updateNotePages = (updater: (notes: NoteRow[]) => NoteRow[]) => {
    const allQueries = queryClient.getQueriesData<NotesResult>({ queryKey: ['notes', userId] });
    allQueries.forEach(([key, value]) => {
      if (!value) return;
      queryClient.setQueryData<NotesResult>(key, {
        ...value,
        data: updater(value.data),
      });
    });
  };

  const createNote = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: userId!,
          title: 'Untitled Note',
          content: {},
          plain_text: '',
        })
        .select(NOTE_COLUMNS)
        .single();

      if (error) throw error;
      return data as NoteRow;
    },
    onSuccess: () => {
      invalidateNotes();
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ noteId, isFavorite }: { noteId: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('notes')
        .update({ is_favorite: !isFavorite })
        .eq('id', noteId)
        .eq('user_id', userId!);

      if (error) throw error;
      return { noteId, isFavorite: !isFavorite };
    },
    onMutate: async ({ noteId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ['notes', userId], exact: false });
      updateNotePages((existing) =>
        existing.map((note) =>
          note.id === noteId ? { ...note, is_favorite: !isFavorite } : note
        )
      );
      return { noteId };
    },
    onError: () => {
      invalidateNotes();
    },
    onSettled: () => {
      invalidateNotes();
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', userId!);

      if (error) throw error;
      return noteId;
    },
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: ['notes', userId], exact: false });
      updateNotePages((existing) => existing.filter((note) => note.id !== noteId));
      return { noteId };
    },
    onError: () => {
      invalidateNotes();
    },
    onSettled: () => {
      invalidateNotes();
    },
  });

  const moveToCourse = useMutation({
    mutationFn: async ({ noteId, courseId: nextCourseId }: { noteId: string; courseId: string | null }) => {
      const { error } = await supabase
        .from('notes')
        .update({ course_id: nextCourseId })
        .eq('id', noteId)
        .eq('user_id', userId!);

      if (error) throw error;
      return { noteId, courseId: nextCourseId };
    },
    onMutate: async ({ noteId, courseId: nextCourseId }) => {
      await queryClient.cancelQueries({ queryKey: ['notes', userId], exact: false });
      updateNotePages((existing) =>
        existing.map((note) =>
          note.id === noteId ? { ...note, course_id: nextCourseId } : note
        )
      );
      return { noteId };
    },
    onError: () => {
      invalidateNotes();
    },
    onSettled: () => invalidateNotes(),
  });

  const moveToFolder = useMutation({
    mutationFn: async ({ noteId, folderId: nextFolderId }: { noteId: string; folderId: string | null }) => {
      const { error } = await supabase
        .from('notes')
        .update({ folder_id: nextFolderId })
        .eq('id', noteId)
        .eq('user_id', userId!);

      if (error) throw error;
      return { noteId, folderId: nextFolderId };
    },
    onMutate: async ({ noteId, folderId: nextFolderId }) => {
      await queryClient.cancelQueries({ queryKey: ['notes', userId], exact: false });
      updateNotePages((existing) =>
        existing.map((note) =>
          note.id === noteId ? { ...note, folder_id: nextFolderId } : note
        )
      );
      return { noteId };
    },
    onError: () => {
      invalidateNotes();
    },
    onSettled: () => invalidateNotes(),
  });

  return {
    notes: notesQuery.data?.data ?? [],
    totalCount: notesQuery.data?.count ?? 0,
    isLoading: notesQuery.isLoading,
    isFetching: notesQuery.isFetching,
    courses: coursesQuery.data ?? [],
    folders: foldersQuery.data ?? [],
    createNote: createNote.mutateAsync,
    toggleFavorite: toggleFavorite.mutateAsync,
    deleteNote: deleteNote.mutateAsync,
    moveToCourse: moveToCourse.mutateAsync,
    moveToFolder: moveToFolder.mutateAsync,
  };
}
