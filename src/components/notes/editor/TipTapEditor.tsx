import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { common, createLowlight } from 'lowlight';
import { useAutoSave } from '@/hooks/useAutoSave';
import { EditorToolbar } from './EditorToolbar';
import './editor-styles.css';

const lowlight = createLowlight(common);

interface TipTapEditorProps {
  noteId: string;
  initialContent: any;
  onSave: (date: Date) => void;
}

export function TipTapEditor({ noteId, initialContent, onSave }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'rounded-lg bg-muted p-4 font-mono text-sm',
        },
      }),
      Table.configure({
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full',
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-border p-2',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-border p-2 font-bold bg-muted',
        },
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[500px] max-w-none',
      },
    },
  });

  useAutoSave({
    editor,
    noteId,
    onSave,
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-border/40 rounded-lg overflow-hidden bg-card/50 backdrop-blur">
      <EditorToolbar editor={editor} noteId={noteId} />
      <div className="p-6">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
