import { useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { supabase } from '@/integrations/supabase/client';
import type { Editor } from '@tiptap/react';

interface UseAutoSaveProps {
  editor: Editor | null;
  noteId: string;
  onSave: (date: Date) => void;
}

export function useAutoSave({ editor, noteId, onSave }: UseAutoSaveProps) {
  const debouncedSave = useDebouncedCallback(async () => {
    if (!editor) return;

    const content = editor.getJSON();
    const plainText = editor.getText();
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;
    const characterCount = plainText.length;

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          content,
          plain_text: plainText,
          word_count: wordCount,
          character_count: characterCount,
          last_edited_at: new Date().toISOString(),
        })
        .eq('id', noteId);

      if (error) throw error;
      onSave(new Date());
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  }, 2000);

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      debouncedSave();
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, debouncedSave]);
}
