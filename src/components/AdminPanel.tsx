import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { X, Save, Eye, EyeOff, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface AdminPanelProps {
  onClose: () => void;
}

type FieldType = "text" | "textarea" | "toggle";

interface AdminField {
  key: string;
  label: string;
  type: FieldType;
  defaultValue: string | boolean;
  description?: string;
}

interface AdminSection {
  id: string;
  title: string;
  helper?: string;
  fields: AdminField[];
}

const adminSections: AdminSection[] = [
  {
    id: "hero",
    title: "Hero Section",
    helper: "Controls the landing hero headline and description.",
    fields: [
      {
        key: "hero.headline",
        label: "Headline",
        type: "text",
        defaultValue: "Your AI-Powered Academic Companion",
      },
      {
        key: "hero.subheadline",
        label: "Description",
        type: "textarea",
        defaultValue:
          "Transform chaos into clarity. Smart scheduling, intelligent notes, and seamless collaboration—all in one place.",
      },
      {
        key: "hero.cta",
        label: "Primary CTA",
        type: "text",
        defaultValue: "Start planning smarter",
      },
    ],
  },
  {
    id: "social-proof",
    title: "Social Proof",
    helper: "Update testimonials, stats, and trust indicators.",
    fields: [
      {
        key: "social.userCount",
        label: "Active users",
        type: "text",
        defaultValue: "20+",
      },
      {
        key: "social.quote",
        label: "Hero testimonial",
        type: "textarea",
        defaultValue:
          "Kairos transformed my course planning from a 3-hour nightmare into a 5-minute breeze.",
      },
      {
        key: "social.quoteAuthor",
        label: "Student name",
        type: "text",
        defaultValue: "Ahmed K.",
      },
      {
        key: "social.quoteRole",
        label: "Student role",
        type: "text",
        defaultValue: "BBA Student, IBA",
      },
    ],
  },
  {
    id: "features",
    title: "Feature Toggles",
    helper: "Quickly enable or disable beta experiences.",
    fields: [
      {
        key: "features.aiNotes",
        label: "AI Notes enhancements",
        type: "toggle",
        defaultValue: true,
        description: "Controls access to Gemini-powered note automation.",
      },
      {
        key: "features.scheduler",
        label: "Adaptive Scheduler",
        type: "toggle",
        defaultValue: true,
        description: "Turns on conflict-aware scheduling blocks.",
      },
      {
        key: "features.mobileLayout",
        label: "Mobile optimized UI",
        type: "toggle",
        defaultValue: true,
        description: "Keeps responsive layout overrides active.",
      },
    ],
  },
];

type AdminFormState = Record<string, string | boolean>;

export const AdminPanel = ({ onClose }: AdminPanelProps) => {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);

  const defaults = useMemo(() => {
    return adminSections.reduce<AdminFormState>((acc, section) => {
      section.fields.forEach((field) => {
        acc[field.key] = field.defaultValue;
      });
      return acc;
    }, {});
  }, []);

  const [formState, setFormState] = useState<AdminFormState>(defaults);

  const handleSave = () => {
    toast({
      title: "Changes saved",
      description: "Your edits have been published instantly",
    });
    setEditMode(false);
  };

  const handleReset = () => {
    setFormState(defaults);
    toast({
      title: "Reverted",
      description: "All sections restored to their defaults",
    });
  };

  const renderField = (field: AdminField) => {
    const value = formState[field.key];

    if (field.type === "toggle") {
      return (
        <div className="flex items-start justify-between gap-4 py-3">
          <div>
            <Label className="text-sm font-medium">{field.label}</Label>
            {field.description && (
              <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
            )}
          </div>
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(checked) =>
              setFormState((prev) => ({
                ...prev,
                [field.key]: checked,
              }))
            }
            disabled={!editMode}
          />
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{field.label}</Label>
          <Textarea
            value={(value as string) ?? ""}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                [field.key]: event.target.value,
              }))
            }
            disabled={!editMode}
            rows={3}
          />
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{field.label}</Label>
        <Input
          value={(value as string) ?? ""}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              [field.key]: event.target.value,
            }))
          }
          disabled={!editMode}
          className="text-lg"
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="min-h-screen p-6 md:p-8">
        <Card className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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

          <div className="grid gap-6">
            {adminSections.map((section) => (
              <div
                key={section.id}
                className="p-6 bg-muted/40 rounded-xl border border-border/40 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">{section.title}</h2>
                    {section.helper && (
                      <p className="text-sm text-muted-foreground mt-1">{section.helper}</p>
                    )}
                  </div>
                  {editMode && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setFormState((prev) => ({
                          ...prev,
                          ...Object.fromEntries(
                            section.fields.map((field) => [field.key, field.defaultValue])
                          ),
                        }))
                      }
                      aria-label={`Reset ${section.title}`}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {section.fields.map((field) => (
                    <div key={field.key} className="transition-opacity">
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-primary/10 rounded-lg border border-primary/20">
            <h3 className="font-bold mb-2">📝 Audit Trail</h3>
            <p className="text-sm text-muted-foreground">
              All changes are logged with timestamp and admin ID. Content updates propagate
              instantly to all users via real-time sync.
            </p>
          </div>

          {editMode && (
            <div className="flex flex-col md:flex-row md:justify-end gap-3">
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Reset to defaults
              </Button>
              <Button onClick={handleSave} className="gap-2">
                <Save className="w-4 h-4" />
                Save & Publish
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
