import { useState } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const COURSE_COLORS = [
  'hsl(262 83% 58%)', // Purple
  'hsl(221 83% 53%)', // Blue
  'hsl(142 71% 45%)', // Green
  'hsl(48 96% 53%)',  // Yellow
  'hsl(24 95% 53%)',  // Orange
  'hsl(0 84% 60%)',   // Red
  'hsl(280 65% 60%)', // Pink
  'hsl(173 80% 40%)', // Teal
];

export function CourseDialog({ open, onOpenChange, onSuccess }: CourseDialogProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [selectedColor, setSelectedColor] = useState(COURSE_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('courses').insert({
        user_id: user.id,
        name: name.trim(),
        code: code.trim() || null,
        color: selectedColor,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Course created successfully',
      });

      setName('');
      setCode('');
      setSelectedColor(COURSE_COLORS[0]);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating course:', error);
      toast({
        title: 'Error',
        description: 'Failed to create course',
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
          <DialogTitle>Create New Course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="course-name">Course Name</Label>
              <Input
                id="course-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Introduction to Psychology"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-code">Course Code (Optional)</Label>
              <Input
                id="course-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g., PSY101"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COURSE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: selectedColor === color ? 'hsl(var(--foreground))' : 'transparent',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              Create Course
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
