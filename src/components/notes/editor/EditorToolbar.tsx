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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { marked } from 'marked';

interface EditorToolbarProps {
  editor: Editor;
  noteId: string;
}

export function EditorToolbar({ editor, noteId }: EditorToolbarProps) {
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
      
      const { data, error } = await supabase.functions.invoke('format-note', {
        body: { rawText: plainText },
      });

      if (error) throw error;

      if (data?.formatted) {
        // Step 1: Strip markdown code blocks if present
        let cleaned = data.formatted.trim();
        if (cleaned.startsWith('```markdown')) {
          cleaned = cleaned.replace(/^```markdown\s*/, '').replace(/\s*```$/, '');
        } else if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Step 2: Convert markdown to HTML using marked
        const html = await marked(cleaned);
        
        // Step 3: Set content in TipTap editor
        editor.commands.setContent(html);
        
        toast({
          title: 'Success',
          description: 'Note formatted successfully with proper styling',
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
