import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Trash2, FolderOpen, Folder } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

interface NoteCardProps {
  note: {
    id: string;
    title: string;
    plain_text: string;
    tags: string[];
    is_favorite: boolean;
    updated_at: string;
  };
  onClick: () => void;
  onFavorite: (id: string, isFavorite: boolean) => void;
  onDelete: (id: string) => void;
  courses: Array<{ id: string; name: string }>;
  folders: Array<{ id: string; name: string }>;
  onMoveToCourse: (noteId: string, courseId: string | null) => void;
  onMoveToFolder: (noteId: string, folderId: string | null) => void;
}

export function NoteCard({ note, onClick, onFavorite, onDelete, courses, folders, onMoveToCourse, onMoveToFolder }: NoteCardProps) {
  const preview = note.plain_text?.slice(0, 150) || 'Empty note';
  const displayTags = note.tags?.slice(0, 3) || [];
  const remainingTags = note.tags?.length > 3 ? note.tags.length - 3 : 0;

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavorite(note.id, note.is_favorite);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(note.id);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Card
          onClick={onClick}
          className="p-4 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg bg-card/80 backdrop-blur border-border/50 group"
        >
          <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold line-clamp-2 flex-1 pr-2">
          {note.title}
        </h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleFavorite}
          >
            <Star
              className={`w-4 h-4 ${note.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
        {preview}
      </p>

      {displayTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {displayTags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
            >
              {tag}
            </span>
          ))}
          {remainingTags > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
              +{remainingTags} more
            </span>
          )}
        </div>
      )}

          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
          </div>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onFavorite(note.id, note.is_favorite); }}>
          <Star className="w-4 h-4 mr-2" />
          {note.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <FolderOpen className="w-4 h-4 mr-2" />
            Move to Course
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={(e) => { e.stopPropagation(); onMoveToCourse(note.id, null); }}>
              None
            </ContextMenuItem>
            {courses.map(course => (
              <ContextMenuItem 
                key={course.id} 
                onClick={(e) => { e.stopPropagation(); onMoveToCourse(note.id, course.id); }}
              >
                {course.name}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Folder className="w-4 h-4 mr-2" />
            Move to Folder
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={(e) => { e.stopPropagation(); onMoveToFolder(note.id, null); }}>
              None
            </ContextMenuItem>
            {folders.map(folder => (
              <ContextMenuItem 
                key={folder.id} 
                onClick={(e) => { e.stopPropagation(); onMoveToFolder(note.id, folder.id); }}
              >
                {folder.name}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} className="text-destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete note
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
