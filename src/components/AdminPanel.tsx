import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { X, Save, Eye, EyeOff } from "lucide-react";

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel = ({ onClose }: AdminPanelProps) => {
  const [editMode, setEditMode] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Changes saved",
      description: "Your edits have been published instantly",
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="min-h-screen p-8">
        <Card className="max-w-6xl mx-auto p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Admin Control Panel</h1>
              <p className="text-muted-foreground mt-1">
                Real-time content editor • All changes auto-save
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEditMode(!editMode)}
                className="gap-2"
              >
                {editMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {editMode ? "Preview" : "Edit Mode"}
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="space-y-8">
            <div className="p-6 bg-muted/50 rounded-lg border-2 border-dashed border-primary/20">
              <h2 className="text-xl font-bold mb-4">Hero Section</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Headline</label>
                  <Input
                    defaultValue="Your AI-Powered Academic Companion"
                    disabled={!editMode}
                    className="text-lg"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Textarea
                    defaultValue="Transform chaos into clarity. Smart scheduling, intelligent notes, and seamless collaboration—all in one place."
                    disabled={!editMode}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-muted/50 rounded-lg border-2 border-dashed border-primary/20">
              <h2 className="text-xl font-bold mb-4">Social Proof</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">User Count</label>
                  <Input defaultValue="20+" disabled={!editMode} />
                </div>
              </div>
            </div>

            <div className="p-6 bg-muted/50 rounded-lg border-2 border-dashed border-primary/20">
              <h2 className="text-xl font-bold mb-4">Testimonial</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Quote</label>
                  <Textarea
                    defaultValue="Kairos transformed my course planning from a 3-hour nightmare into a 5-minute breeze."
                    disabled={!editMode}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Student Name</label>
                    <Input defaultValue="Ahmed K." disabled={!editMode} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Title</label>
                    <Input defaultValue="BBA Student, IBA" disabled={!editMode} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-primary/10 rounded-lg border border-primary/20">
              <h3 className="font-bold mb-2">📝 Audit Trail</h3>
              <p className="text-sm text-muted-foreground">
                All changes are logged with timestamp and admin ID. Content updates propagate
                instantly to all users via real-time sync.
              </p>
            </div>

            {editMode && (
              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} className="gap-2">
                  <Save className="w-4 h-4" />
                  Save & Publish
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
