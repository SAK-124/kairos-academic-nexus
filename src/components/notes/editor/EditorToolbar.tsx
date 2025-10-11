import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Heading2,
  Link as LinkIcon,
  Sparkles,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { GeminiClient } from '@/integrations/gemini/client';

interface EditorToolbarProps {
  editor: Editor;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [isFormatting, setIsFormatting] = useState(false);
  const { toast } = useToast();

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const handleAutoFormat = async () => {
    setIsFormatting(true);
    try {
      const plainText = editor.getText();
      if (!plainText.trim()) {
        toast({
          title: 'Nothing to format',
          description: 'Add some text to your note before using auto-format.',
        });
        return;
      }

      const messages = [
        {
          role: 'system' as const,
          content:
            'You are a meticulous academic editor. Rewrite the provided plain text into clean semantic HTML for a TipTap editor. Use headings, lists, and emphasis where it improves readability. Do not include <html> or <body> tags.',
        },
        {
          role: 'user' as const,
          content: `Format this content into HTML while preserving the intent:
${plainText}`,
        },
      ];

      const formatted = await GeminiClient.chat(messages);

      if (formatted) {
        editor.commands.setContent(formatted.trim());
        toast({
          title: 'Success',
          description: 'Note formatted successfully with Gemini.',
        });
      }
    } catch (error) {
      console.error('Error formatting note:', error);
      toast({
        title: 'Error',
        description: 'Failed to format note',
        variant: 'destructive',
      });
    } finally {
      setIsFormatting(false);
    }
  };

  return (
    <div className="flex items-center gap-1 p-2 border-b border-border/40 flex-wrap bg-muted/30">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bg-accent' : ''}
      >
        <Bold className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'bg-accent' : ''}
      >
        <Italic className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={editor.isActive('strike') ? 'bg-accent' : ''}
      >
        <Strikethrough className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={editor.isActive('code') ? 'bg-accent' : ''}
      >
        <Code className="w-4 h-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}
      >
        <Heading2 className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'bg-accent' : ''}
      >
        <List className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'bg-accent' : ''}
      >
        <ListOrdered className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={editor.isActive('blockquote') ? 'bg-accent' : ''}
      >
        <Quote className="w-4 h-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Button variant="ghost" size="icon" onClick={addLink}>
        <LinkIcon className="w-4 h-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={handleAutoFormat}
        disabled={isFormatting}
        className="gap-2"
      >
        <Sparkles className="w-4 h-4" />
        {isFormatting ? 'Formatting...' : 'Auto-Format'}
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo className="w-4 h-4" />
      </Button>
    </div>
  );
}
