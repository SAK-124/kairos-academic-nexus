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
        // Convert markdown to HTML for proper rendering
        const lines = data.formatted.split('\n');
        let html = '';
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) {
            html += '<p></p>';
          } else if (line.startsWith('# ')) {
            html += `<h1>${line.substring(2)}</h1>`;
          } else if (line.startsWith('## ')) {
            html += `<h2>${line.substring(3)}</h2>`;
          } else if (line.startsWith('### ')) {
            html += `<h3>${line.substring(4)}</h3>`;
          } else if (line.startsWith('- ') || line.startsWith('* ')) {
            const nextIsListItem = lines[i + 1]?.trim().match(/^[-*] /);
            const prevIsListItem = i > 0 && lines[i - 1]?.trim().match(/^[-*] /);
            if (!prevIsListItem) html += '<ul>';
            html += `<li>${line.substring(2)}</li>`;
            if (!nextIsListItem) html += '</ul>';
          } else if (line.match(/^\d+\. /)) {
            const nextIsListItem = lines[i + 1]?.trim().match(/^\d+\. /);
            const prevIsListItem = i > 0 && lines[i - 1]?.trim().match(/^\d+\. /);
            if (!prevIsListItem) html += '<ol>';
            html += `<li>${line.replace(/^\d+\. /, '')}</li>`;
            if (!nextIsListItem) html += '</ol>';
          } else {
            html += `<p>${line}</p>`;
          }
        }
        
        editor.commands.setContent(html);
        toast({
          title: 'Success',
          description: 'Note formatted successfully',
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
