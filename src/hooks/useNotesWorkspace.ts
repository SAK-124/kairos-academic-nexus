import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type NoteRow = Database['public']['Tables']['notes']['Row'];

type CourseRow = { id: string; name: string };
type FolderRow = { id: string; name: string };

interface UseNotesWorkspaceOptions {
  userId?: string;
}

export function useNotesWorkspace({ userId }: UseNotesWorkspaceOptions) {
  const queryClient = useQueryClient();

  const notesQuery = useQuery({
    queryKey: ['notes', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId!)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as NoteRow[];
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
    queryClient.invalidateQueries({ queryKey: ['notes', userId] });

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
        .select()
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
      await queryClient.cancelQueries({ queryKey: ['notes', userId] });
      const previous = queryClient.getQueryData<NoteRow[]>(['notes', userId]);

      queryClient.setQueryData<NoteRow[]>(['notes', userId], (old) => {
        if (!old) return old;
        return old.map((note) =>
          note.id === noteId ? { ...note, is_favorite: !isFavorite } : note
        );
      });

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notes', userId], context.previous);
      }
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
      await queryClient.cancelQueries({ queryKey: ['notes', userId] });
      const previous = queryClient.getQueryData<NoteRow[]>(['notes', userId]);
      queryClient.setQueryData<NoteRow[]>(['notes', userId], (old) =>
        old?.filter((note) => note.id !== noteId) ?? old
      );
      return { previous };
    },
    onError: (_err, _noteId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notes', userId], context.previous);
      }
    },
    onSettled: () => {
      invalidateNotes();
    },
  });

  const moveToCourse = useMutation({
    mutationFn: async ({ noteId, courseId }: { noteId: string; courseId: string | null }) => {
      const { error } = await supabase
        .from('notes')
        .update({ course_id: courseId })
        .eq('id', noteId)
        .eq('user_id', userId!);

      if (error) throw error;
      return { noteId, courseId };
    },
    onMutate: async ({ noteId, courseId }) => {
      await queryClient.cancelQueries({ queryKey: ['notes', userId] });
      const previous = queryClient.getQueryData<NoteRow[]>(['notes', userId]);
      queryClient.setQueryData<NoteRow[]>(['notes', userId], (old) =>
        old?.map((note) =>
          note.id === noteId ? { ...note, course_id: courseId } : note
        ) ?? old
      );
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notes', userId], context.previous);
      }
    },
    onSettled: () => invalidateNotes(),
  });

  const moveToFolder = useMutation({
    mutationFn: async ({ noteId, folderId }: { noteId: string; folderId: string | null }) => {
      const { error } = await supabase
        .from('notes')
        .update({ folder_id: folderId })
        .eq('id', noteId)
        .eq('user_id', userId!);

      if (error) throw error;
      return { noteId, folderId };
    },
    onMutate: async ({ noteId, folderId }) => {
      await queryClient.cancelQueries({ queryKey: ['notes', userId] });
      const previous = queryClient.getQueryData<NoteRow[]>(['notes', userId]);
      queryClient.setQueryData<NoteRow[]>(['notes', userId], (old) =>
        old?.map((note) =>
          note.id === noteId ? { ...note, folder_id: folderId } : note
        ) ?? old
      );
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notes', userId], context.previous);
      }
    },
    onSettled: () => invalidateNotes(),
  });

  const notes = useMemo(() => notesQuery.data ?? [], [notesQuery.data]);

  return {
    notes,
    courses: coursesQuery.data ?? [],
    folders: foldersQuery.data ?? [],
    isLoading: notesQuery.isLoading,
    createNote: createNote.mutateAsync,
    toggleFavorite: toggleFavorite.mutateAsync,
    deleteNote: deleteNote.mutateAsync,
    moveToCourse: moveToCourse.mutateAsync,
    moveToFolder: moveToFolder.mutateAsync,
    refetchNotes: notesQuery.refetch,
  };
}
