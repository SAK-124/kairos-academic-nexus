import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
}

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function FolderDialog({ open, onOpenChange, onSuccess }: FolderDialogProps) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadFolders();
    }
  }, [open]);

  const loadFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('name');

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('folders').insert({
        user_id: user.id,
        name: name.trim(),
        parent_id: parentId,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Folder created successfully',
      });

      setName('');
      setParentId(null);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to create folder',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Lecture Notes"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent-folder">Parent Folder (Optional)</Label>
              <Select value={parentId || 'none'} onValueChange={(v) => setParentId(v === 'none' ? null : v)}>
                <SelectTrigger id="parent-folder">
                  <SelectValue placeholder="No parent folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent folder</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
