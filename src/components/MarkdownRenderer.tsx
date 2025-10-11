import { useMemo } from 'react';
import { marked } from 'marked';
import { cn } from '@/lib/utils';

marked.setOptions({
  breaks: true,
  gfm: true,
});

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = useMemo(() => {
    if (!content) return '';
    return marked.parse(content);
  }, [content]);

  if (!content) {
    return null;
  }

  return (
    <div
      className={cn('prose prose-sm dark:prose-invert max-w-none prose-headings:mt-3 prose-p:mt-2 prose-li:mt-1', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
