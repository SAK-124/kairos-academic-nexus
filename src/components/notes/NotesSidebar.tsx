import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, FileText, Star, Archive } from 'lucide-react';

interface NotesSidebarProps {
  onCreateNote: () => void;
}

export function NotesSidebar({ onCreateNote }: NotesSidebarProps) {
  return (
    <div className="w-64 border-r border-border/40 bg-card/50 backdrop-blur">
      <div className="p-4">
        <Button
          onClick={onCreateNote}
          className="w-full bg-gradient-to-r from-primary to-accent"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Note
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-120px)]">
        <div className="p-4 space-y-2">
          <SidebarButton icon={FileText} label="All Notes" active />
          <SidebarButton icon={Star} label="Favorites" />
          <SidebarButton icon={Archive} label="Archived" />
        </div>

        <div className="p-4 border-t border-border/40">
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
            COURSES
          </h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="py-2">No courses yet</p>
          </div>
        </div>

        <div className="p-4 border-t border-border/40">
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
            FOLDERS
          </h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="py-2">No folders yet</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function SidebarButton({
  icon: Icon,
  label,
  active = false,
}: {
  icon: any;
  label: string;
  active?: boolean;
}) {
  return (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      className="w-full justify-start"
    >
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
}
