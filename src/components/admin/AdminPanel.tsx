import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  Activity,
  Bot,
  CheckCircle2,
  Database as DatabaseIcon,
  FileText,
  GaugeCircle,
  Loader2,
  Mail,
  Plus,
  RefreshCcw,
  Save,
  ShieldHalf,
  Trash2,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminPanelProps {
  onClose: () => void;
}

type JsonObject = Record<string, unknown>;
type ContentSections = Record<string, JsonObject>;

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type FolderRow = Database["public"]["Tables"]["folders"]["Row"];
type NoteRow = Pick<Database["public"]["Tables"]["notes"]["Row"], "id" | "title" | "updated_at" | "course_id" | "folder_id" | "user_id">;
type ButtonMapping = Database["public"]["Tables"]["button_mappings"]["Row"];
type AnimationSetting = Database["public"]["Tables"]["animation_settings"]["Row"];
type AiInteraction = Database["public"]["Tables"]["ai_interactions"]["Row"];
type ContactSubmission = Database["public"]["Tables"]["contact_submissions"]["Row"];
type AiConfigSummary = {
  provider: string;
  model: string;
  keyPreview: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

type LoadingState = {
  content: boolean;
  buttons: boolean;
  animations: boolean;
  courses: boolean;
  folders: boolean;
  notes: boolean;
  ai: boolean;
  engagement: boolean;
};

const defaultLoadingState: LoadingState = {
  content: false,
  buttons: false,
  animations: false,
  courses: false,
  folders: false,
  notes: false,
  ai: false,
  engagement: false,
};

const ensureSection = <T extends JsonObject>(sections: ContentSections, key: string, fallback: T) => {
  if (!(key in sections)) {
    sections[key] = fallback;
  }
  const value = sections[key];
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as T;
  }
  sections[key] = fallback;
  return fallback;
};

const toRecord = (value: AnimationSetting["value"] | undefined): JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as JsonObject) : {};

type HeroContent = {
  headline?: string;
  description?: string;
  cta?: string;
};

type SocialProofContent = {
  statLabel?: string;
  statValue?: string;
  quote?: string;
  author?: string;
  role?: string;
};

type PricingContent = {
  plans: Array<{ name?: string; price?: string; features?: string[] }>;
};

type FaqItem = { question: string; answer: string };

type FaqContent = {
  items: FaqItem[];
};

type AiContent = {
  defaultPrompt: string;
};

const defaultAiConfig: AiConfigSummary = {
  provider: "gemini",
  model: "gemini-2.0-flash-lite",
  keyPreview: null,
  updatedAt: null,
  updatedBy: null,
};

const toLocaleDate = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "Not available";

export const AdminPanel = ({ onClose }: AdminPanelProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState<LoadingState>(defaultLoadingState);
  const [contentSections, setContentSections] = useState<ContentSections>({});
  const [buttonMappings, setButtonMappings] = useState<ButtonMapping[]>([]);
  const [animationSettings, setAnimationSettings] = useState<Record<string, AnimationSetting["value"]>>({});
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [aiInteractions, setAiInteractions] = useState<AiInteraction[]>([]);
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [storedAiConfig, setStoredAiConfig] = useState<AiConfigSummary>(defaultAiConfig);
  const [aiConfig, setAiConfig] = useState<AiConfigSummary>(defaultAiConfig);
  const [aiApiKeyInput, setAiApiKeyInput] = useState("");
  const [aiConfigLoading, setAiConfigLoading] = useState(false);
  const [aiConfigSaving, setAiConfigSaving] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({
    aiWorkspace: true,
    adaptiveScheduler: true,
    offlineMode: false,
    auditLogging: true,
  });
  const [aiTestPrompt, setAiTestPrompt] = useState("Summarize upcoming releases in one paragraph.");
  const [aiTestResponse, setAiTestResponse] = useState("");

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const hasConfigChanges = useMemo(
    () =>
      aiApiKeyInput.trim().length > 0 ||
      aiConfig.provider !== storedAiConfig.provider ||
      aiConfig.model !== storedAiConfig.model,
    [aiApiKeyInput, aiConfig.model, aiConfig.provider, storedAiConfig.model, storedAiConfig.provider]
  );

  const setBusy = (key: keyof LoadingState, value: boolean) =>
    setLoading((prev) => ({ ...prev, [key]: value }));

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadContentSections(),
        loadButtons(),
        loadAnimationSettings(),
        loadLibrary(),
        loadAiInsights(),
        loadEngagement(),
      ]);
    } catch (error) {
      console.error("Failed to load admin panel", error);
      toast({
        title: "Failed to load data",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    loadAiInsights,
    loadAnimationSettings,
    loadButtons,
    loadContentSections,
    loadEngagement,
    loadLibrary,
    toast,
  ]);

  const loadContentSections = useCallback(async () => {
    setBusy("content", true);
    const { data, error } = await supabase.from("content_sections").select("section_name, content");
    if (error) {
      throw error;
    }

    const next: ContentSections = {};
    data?.forEach((section) => {
      const content = section.content;
      if (typeof content === "object" && content !== null && !Array.isArray(content)) {
        next[section.section_name] = content as JsonObject;
      }
    });

    ensureSection<HeroContent>(next, "hero", {
      headline: "Your AI-Powered Academic Companion",
      description: "Transform chaos into clarity. Smart scheduling, intelligent notes, and seamless collaboration—all in one place.",
      cta: "Start planning smarter",
    });

    ensureSection<SocialProofContent>(next, "social-proof", {
      statLabel: "Active students",
      statValue: "20+",
      quote: "Kairos transformed my course planning from a 3-hour nightmare into a 5-minute breeze.",
      author: "Ahmed K.",
      role: "BBA Student, IBA",
    });

    ensureSection<PricingContent>(next, "pricing", {
      plans: [],
    });

    ensureSection<FaqContent>(next, "faq", {
      items: [],
    });

    ensureSection<AiContent>(next, "ai", {
      defaultPrompt: "You are Kairos, an academic co-pilot.",
    });

    setContentSections(next);
    setBusy("content", false);
  }, []);

  const loadButtons = useCallback(async () => {
    setBusy("buttons", true);
    const { data, error } = await supabase
      .from("button_mappings")
      .select("*")
      .order("button_id", { ascending: true });
    if (error) throw error;
    setButtonMappings(data ?? []);
    setBusy("buttons", false);
  }, []);

  const loadAnimationSettings = useCallback(async () => {
    setBusy("animations", true);
    const { data, error } = await supabase.from("animation_settings").select("setting_name, value");
    if (error) throw error;
    const next: Record<string, AnimationSetting["value"]> = {};
    data?.forEach((setting) => {
      next[setting.setting_name] = setting.value;
    });
    setAnimationSettings(next);
    setBusy("animations", false);
  }, []);

  const loadLibrary = useCallback(async () => {
    setBusy("courses", true);
    setBusy("folders", true);
    setBusy("notes", true);

    const [{ data: courseData, error: courseError }, { data: folderData, error: folderError }, { data: noteData, error: noteError }] = await Promise.all([
      supabase
        .from("courses")
        .select("id, name, code, color, user_id, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50),
      supabase
        .from("folders")
        .select("id, name, description, user_id, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50),
      supabase
        .from("notes")
        .select("id, title, updated_at, course_id, folder_id, user_id")
        .order("updated_at", { ascending: false })
        .limit(100),
    ]);

    if (courseError) throw courseError;
    if (folderError) throw folderError;
    if (noteError) throw noteError;

    setCourses(courseData ?? []);
    setFolders(folderData ?? []);
    setNotes(noteData ?? []);

    setBusy("courses", false);
    setBusy("folders", false);
    setBusy("notes", false);
  }, []);

  const loadAiInsights = useCallback(async () => {
    setBusy("ai", true);
    setAiConfigLoading(true);
    try {
      const [interactionsResult, configResult] = await Promise.all([
        supabase
          .from("ai_interactions")
          .select("id, interaction_type, created_at, prompt, response, note_id")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.functions.invoke("ai-config", { method: "GET" }),
      ]);

      if (interactionsResult.error) throw interactionsResult.error;
      setAiInteractions(interactionsResult.data ?? []);

      if (configResult.error) {
        console.error("Failed to load AI configuration", configResult.error);
      } else {
        const configPayload = (configResult.data as { config?: Partial<AiConfigSummary> } | null)?.config;
        const summary = { ...defaultAiConfig, ...(configPayload ?? {}) };
        setStoredAiConfig(summary);
        setAiConfig(summary);
      }
    } finally {
      setBusy("ai", false);
      setAiConfigLoading(false);
    }
  }, []);

  const loadEngagement = useCallback(async () => {
    setBusy("engagement", true);
    const { data, error } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    setContacts(data ?? []);
    setBusy("engagement", false);
  }, []);

  const handleSaveAiConfig = async () => {
    if (!hasConfigChanges) return;
    setAiConfigSaving(true);
    try {
      const payload: Record<string, string> = {
        provider: aiConfig.provider,
        model: aiConfig.model,
      };

      if (aiApiKeyInput.trim().length > 0) {
        payload.apiKey = aiApiKeyInput.trim();
      }

      const { data, error } = await supabase.functions.invoke("ai-config", { body: payload });

      if (error) {
        throw new Error(error.message ?? "Failed to save AI configuration");
      }

      const configPayload = (data as { config?: Partial<AiConfigSummary> } | null)?.config;
      const summary = { ...defaultAiConfig, ...(configPayload ?? {}) };
      setStoredAiConfig(summary);
      setAiConfig(summary);
      setAiApiKeyInput("");

      toast({
        title: "AI configuration updated",
        description: "Gemini credentials refreshed successfully.",
      });
    } catch (error) {
      console.error("Failed to save AI config", error);
      toast({
        title: "Failed to save AI configuration",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setAiConfigSaving(false);
    }
  };

  const handleSaveContent = async (sectionName: string) => {
    const payload = contentSections[sectionName] ?? {};
    const { error } = await supabase
      .from("content_sections")
      .upsert({
        section_name: sectionName,
        content: payload,
        updated_at: new Date().toISOString(),
      });
    if (error) {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Saved", description: `${sectionName} updated` });
  };

  const handleSaveButton = async (button: ButtonMapping) => {
    const { error } = await supabase
      .from("button_mappings")
      .upsert({ ...button, updated_at: new Date().toISOString() });
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Button saved", description: `${button.button_id} updated` });
  };

  const handleSaveAnimation = async (settingName: string, value: AnimationSetting["value"]) => {
    const { error } = await supabase
      .from("animation_settings")
      .upsert({ setting_name: settingName, value, updated_at: new Date().toISOString() });
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Animation updated", description: `${settingName} saved` });
  };

  const handleUpdateCourse = async (courseId: string, patch: Partial<CourseRow>) => {
    const { error } = await supabase
      .from("courses")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", courseId);
    if (error) {
      toast({ title: "Failed to update course", description: error.message, variant: "destructive" });
      return;
    }
    setCourses((prev) => prev.map((course) => (course.id === courseId ? { ...course, ...patch } : course)));
    toast({ title: "Course updated" });
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Delete this course? Notes will remain but lose association.")) return;
    const { error } = await supabase.from("courses").delete().eq("id", courseId);
    if (error) {
      toast({ title: "Failed to delete course", description: error.message, variant: "destructive" });
      return;
    }
    setCourses((prev) => prev.filter((course) => course.id !== courseId));
    toast({ title: "Course deleted" });
  };

  const handleUpdateFolder = async (folderId: string, patch: Partial<FolderRow>) => {
    const { error } = await supabase
      .from("folders")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", folderId);
    if (error) {
      toast({ title: "Failed to update folder", description: error.message, variant: "destructive" });
      return;
    }
    setFolders((prev) => prev.map((folder) => (folder.id === folderId ? { ...folder, ...patch } : folder)));
    toast({ title: "Folder updated" });
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Delete this folder? Notes inside will become uncategorized.")) return;
    const { error } = await supabase.from("folders").delete().eq("id", folderId);
    if (error) {
      toast({ title: "Failed to delete folder", description: error.message, variant: "destructive" });
      return;
    }
    setFolders((prev) => prev.filter((folder) => folder.id !== folderId));
    toast({ title: "Folder deleted" });
  };

  const handleUpdateNote = async (noteId: string, patch: Partial<NoteRow>) => {
    const { error } = await supabase
      .from("notes")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", noteId);
    if (error) {
      toast({ title: "Failed to update note", description: error.message, variant: "destructive" });
      return;
    }
    setNotes((prev) => prev.map((note) => (note.id === noteId ? { ...note, ...patch } : note)));
    toast({ title: "Note updated" });
  };

  const handleTestAiPrompt = async () => {
    setBusy("ai", true);
    setAiTestResponse("");
    const { data, error } = await supabase.functions.invoke("chat", {
      body: {
        messages: [
          { role: "system", content: contentSections.ai?.defaultPrompt ?? "You are Kairos." },
          { role: "user", content: aiTestPrompt },
        ],
      },
    });

    if (error) {
      toast({ title: "AI test failed", description: error.message, variant: "destructive" });
    } else {
      setAiTestResponse(String(data?.reply ?? ""));
      toast({ title: "AI responded", description: "See preview below" });
    }
    setBusy("ai", false);
  };

  const handleToggleContact = async (id: string, resolved: boolean) => {
    const { error } = await supabase
      .from("contact_submissions")
      .update({ resolved })
      .eq("id", id);
    if (error) {
      toast({ title: "Failed to update contact", description: error.message, variant: "destructive" });
      return;
    }
    setContacts((prev) => prev.map((contact) => (contact.id === id ? { ...contact, resolved } : contact)));
    toast({ title: resolved ? "Marked resolved" : "Marked unresolved" });
  };

  const overviewMetrics = useMemo(() => {
    const totalNotes = notes.length;
    const totalCourses = courses.length;
    const totalFolders = folders.length;
    const activeIssues = contacts.filter((contact) => !contact.resolved).length;

    return [
      {
        label: "Notes indexed",
        value: totalNotes,
        icon: FileText,
        description: "Latest 100 synced",
      },
      {
        label: "Courses",
        value: totalCourses,
        icon: DatabaseIcon,
        description: "Managed across all users",
      },
      {
        label: "Folders",
        value: totalFolders,
        icon: GaugeCircle,
        description: "Knowledge hubs",
      },
      {
        label: "Open tickets",
        value: activeIssues,
        icon: Mail,
        description: "Contact submissions awaiting reply",
      },
    ];
  }, [notes.length, courses.length, folders.length, contacts]);

  const heroContent = (contentSections["hero"] as HeroContent | undefined) ?? {};
  const socialContent = (contentSections["social-proof"] as SocialProofContent | undefined) ?? {};
  const faqContent = (contentSections["faq"] as FaqContent | undefined) ?? { items: [] };
  const aiContent = (contentSections["ai"] as AiContent | undefined) ?? {
    defaultPrompt: "You are Kairos, an academic co-pilot.",
  };
  const globalAnimations = toRecord(animationSettings["global"]);
  const introAnimations = toRecord(animationSettings["intro"]);
  const fadeDurationValue = Number(
    String(globalAnimations.fadeInDuration ?? "")
      .replace(/[^0-9]/g, "")
      .trim() || "600"
  );
  const introDurationValue = Number(introAnimations.displayDuration ?? 2000);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur animate-in fade-in overflow-y-auto">
      <div className="min-h-screen p-6 md:p-10">
        <Card className="mx-auto max-w-7xl p-6 md:p-10 space-y-8 shadow-xl border border-border/60 bg-gradient-to-b from-background/90 to-background/70">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldHalf className="w-4 h-4" />
                Secure admin workspace
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Kairos Control Nexus</h1>
              <p className="text-muted-foreground max-w-xl mt-2">
                Manage content, AI behaviour, and engagement data in real time. Every change is auditable and synced instantly.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={loadAll} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                Refresh data
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close admin panel">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="library">Workspace Library</TabsTrigger>
              <TabsTrigger value="ai">AI Ops</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {overviewMetrics.map((metric) => (
                  <Card key={metric.label} className="p-5 border-border/70 bg-card/80 backdrop-blur">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{metric.label}</p>
                        <p className="text-2xl font-semibold mt-1">{metric.value}</p>
                      </div>
                      <metric.icon className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">{metric.description}</p>
                  </Card>
                ))}
              </div>

              <Card className="p-6 space-y-4 border-border/70 bg-card/80">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Global feature flags</h3>
                    <p className="text-sm text-muted-foreground">
                      Toggle beta surfaces instantly for all users.
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(featureFlags).map(([key, enabled]) => (
                    <div key={key} className="flex items-center justify-between border border-border/40 rounded-lg p-4">
                      <div>
                        <p className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
                        <p className="text-xs text-muted-foreground">
                          {enabled ? "Enabled for all workspaces" : "Disabled until re-enabled"}
                        </p>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(value) =>
                          setFeatureFlags((prev) => ({
                            ...prev,
                            [key]: value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 space-y-4 border-border/70 bg-card/80">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Animation cadence</h3>
                    <p className="text-sm text-muted-foreground">
                      Tune fade and intro timings for the marketing surface.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      void handleSaveAnimation("global", {
                        ...globalAnimations,
                        fadeInDuration: `${fadeDurationValue}ms`,
                      });
                      void handleSaveAnimation("intro", {
                        ...introAnimations,
                        displayDuration: introDurationValue,
                      });
                    }}
                    disabled={loading.animations}
                  >
                    {loading.animations ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save animation settings
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Fade-in duration (ms)</Label>
                    <Input
                      type="number"
                      value={fadeDurationValue}
                      min={100}
                      onChange={(event) =>
                        setAnimationSettings((prev) => ({
                          ...prev,
                          global: {
                            ...globalAnimations,
                            fadeInDuration: `${event.target.value || "0"}ms`,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Intro display duration (ms)</Label>
                    <Input
                      type="number"
                      value={introDurationValue}
                      min={500}
                      onChange={(event) =>
                        setAnimationSettings((prev) => ({
                          ...prev,
                          intro: {
                            ...introAnimations,
                            displayDuration: Number(event.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="space-y-6">
              <Card className="p-6 space-y-4 border-border/70 bg-card/80">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Hero messaging</h3>
                    <p className="text-sm text-muted-foreground">
                      Update copy shown on the landing hero in real time.
                    </p>
                  </div>
                  <Button size="sm" className="gap-2" onClick={() => handleSaveContent("hero")} disabled={loading.content}>
                    {loading.content ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save hero
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Headline</Label>
                    <Input
                      value={heroContent.headline ?? ""}
                      onChange={(event) =>
                        setContentSections((prev) => ({
                          ...prev,
                          hero: { ...heroContent, headline: event.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Primary CTA copy</Label>
                    <Input
                      value={heroContent.cta ?? ""}
                      onChange={(event) =>
                        setContentSections((prev) => ({
                          ...prev,
                          hero: { ...heroContent, cta: event.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    rows={3}
                    value={heroContent.description ?? ""}
                    onChange={(event) =>
                      setContentSections((prev) => ({
                        ...prev,
                        hero: { ...heroContent, description: event.target.value },
                      }))
                    }
                  />
                </div>
              </Card>

              <Card className="p-6 space-y-4 border-border/70 bg-card/80">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Social proof</h3>
                    <p className="text-sm text-muted-foreground">Update stats and testimonial copy.</p>
                  </div>
                  <Button size="sm" className="gap-2" onClick={() => handleSaveContent("social-proof")} disabled={loading.content}>
                    {loading.content ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save social proof
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Headline stat label</Label>
                    <Input
                      value={socialContent.statLabel ?? ""}
                      onChange={(event) =>
                        setContentSections((prev) => ({
                          ...prev,
                          "social-proof": { ...socialContent, statLabel: event.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Headline stat value</Label>
                    <Input
                      value={socialContent.statValue ?? ""}
                      onChange={(event) =>
                        setContentSections((prev) => ({
                          ...prev,
                          "social-proof": { ...socialContent, statValue: event.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Testimonial quote</Label>
                  <Textarea
                    rows={3}
                    value={socialContent.quote ?? ""}
                    onChange={(event) =>
                      setContentSections((prev) => ({
                        ...prev,
                        "social-proof": { ...socialContent, quote: event.target.value },
                      }))
                    }
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Author</Label>
                    <Input
                      value={socialContent.author ?? ""}
                      onChange={(event) =>
                        setContentSections((prev) => ({
                          ...prev,
                          "social-proof": { ...socialContent, author: event.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input
                      value={socialContent.role ?? ""}
                      onChange={(event) =>
                        setContentSections((prev) => ({
                          ...prev,
                          "social-proof": { ...socialContent, role: event.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6 space-y-6 border-border/70 bg-card/80">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">FAQ builder</h3>
                    <p className="text-sm text-muted-foreground">Curate the questions shown on the marketing site.</p>
                  </div>
                  <Button size="sm" className="gap-2" onClick={() => handleSaveContent("faq")} disabled={loading.content}>
                    {loading.content ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save FAQ
                  </Button>
                </div>
                <div className="space-y-4">
                  {faqContent.items.map((item, index) => (
                    <Card key={index} className="p-4 border-dashed border-border/60 bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Question {index + 1}</Label>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setContentSections((prev) => ({
                              ...prev,
                              faq: {
                                ...faqContent,
                                items: faqContent.items.filter((_, idx) => idx !== index),
                              },
                            }))
                          }
                          aria-label="Remove question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Input
                        value={item?.question ?? ""}
                        placeholder="Question"
                        onChange={(event) =>
                          setContentSections((prev) => ({
                            ...prev,
                            faq: {
                              ...faqContent,
                              items: faqContent.items.map((faqItem, idx) =>
                                idx === index ? { ...faqItem, question: event.target.value } : faqItem
                              ),
                            },
                          }))
                        }
                      />
                      <Textarea
                        rows={3}
                        placeholder="Answer"
                        value={item?.answer ?? ""}
                        onChange={(event) =>
                          setContentSections((prev) => ({
                            ...prev,
                            faq: {
                              ...faqContent,
                              items: faqContent.items.map((faqItem, idx) =>
                                idx === index ? { ...faqItem, answer: event.target.value } : faqItem
                              ),
                            },
                          }))
                        }
                      />
                    </Card>
                  ))}
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() =>
                      setContentSections((prev) => ({
                        ...prev,
                        faq: {
                          ...faqContent,
                          items: [...faqContent.items, { question: "", answer: "" }],
                        },
                      }))
                    }
                  >
                    <Plus className="w-4 h-4" /> Add question
                  </Button>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="library" className="space-y-6">
              <Card className="p-6 border-border/70 bg-card/80 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Courses</h3>
                    <p className="text-sm text-muted-foreground">Rename or remove study plans across accounts.</p>
                  </div>
                </div>
                <ScrollArea className="h-64 pr-2">
                  <div className="space-y-3">
                    {courses.map((course) => (
                      <Card key={course.id} className="p-4 border-border/60 bg-muted/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">{course.name || "Untitled course"}</p>
                            <p className="text-xs text-muted-foreground">User: {course.user_id}</p>
                            <p className="text-xs text-muted-foreground">Updated {toLocaleDate(course.updated_at)}</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCourse(course.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                              value={course.name ?? ""}
                              onChange={(event) =>
                                setCourses((prev) =>
                                  prev.map((item) =>
                                    item.id === course.id ? { ...item, name: event.target.value } : item
                                  )
                                )
                              }
                              onBlur={(event) => handleUpdateCourse(course.id, { name: event.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Code</Label>
                            <Input
                              value={course.code ?? ""}
                              onChange={(event) =>
                                setCourses((prev) =>
                                  prev.map((item) =>
                                    item.id === course.id ? { ...item, code: event.target.value } : item
                                  )
                                )
                              }
                              onBlur={(event) => handleUpdateCourse(course.id, { code: event.target.value })}
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </Card>

              <Card className="p-6 border-border/70 bg-card/80 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Folders</h3>
                    <p className="text-sm text-muted-foreground">Manage note collections and descriptions.</p>
                  </div>
                </div>
                <ScrollArea className="h-64 pr-2">
                  <div className="space-y-3">
                    {folders.map((folder) => (
                      <Card key={folder.id} className="p-4 border-border/60 bg-muted/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">{folder.name || "Untitled folder"}</p>
                            <p className="text-xs text-muted-foreground">User: {folder.user_id}</p>
                            <p className="text-xs text-muted-foreground">Updated {toLocaleDate(folder.updated_at)}</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteFolder(folder.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={folder.name ?? ""}
                            onChange={(event) =>
                              setFolders((prev) =>
                                prev.map((item) =>
                                  item.id === folder.id ? { ...item, name: event.target.value } : item
                                )
                              )
                            }
                            onBlur={(event) => handleUpdateFolder(folder.id, { name: event.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            rows={2}
                            value={folder.description ?? ""}
                            onChange={(event) =>
                              setFolders((prev) =>
                                prev.map((item) =>
                                  item.id === folder.id ? { ...item, description: event.target.value } : item
                                )
                              )
                            }
                            onBlur={(event) => handleUpdateFolder(folder.id, { description: event.target.value })}
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </Card>

              <Card className="p-6 border-border/70 bg-card/80 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Notes</h3>
                    <p className="text-sm text-muted-foreground">Quickly retitle and reassign notes between folders or courses.</p>
                  </div>
                </div>
                <ScrollArea className="h-80 pr-2">
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <Card key={note.id} className="p-4 border-border/60 bg-muted/30 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">{note.title || "Untitled note"}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Activity className="w-3 h-3" /> Updated {toLocaleDate(note.updated_at)}
                            </div>
                          </div>
                          <Badge variant="secondary">User: {note.user_id}</Badge>
                        </div>
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            value={note.title ?? ""}
                            onChange={(event) =>
                              setNotes((prev) =>
                                prev.map((item) =>
                                  item.id === note.id ? { ...item, title: event.target.value } : item
                                )
                              )
                            }
                            onBlur={(event) => handleUpdateNote(note.id, { title: event.target.value })}
                          />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Course</Label>
                            <Select
                              value={note.course_id ?? ""}
                              onValueChange={(value) =>
                                handleUpdateNote(note.id, { course_id: value || null })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Unassigned" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Unassigned</SelectItem>
                                {courses.map((course) => (
                                  <SelectItem key={course.id} value={course.id}>
                                    {course.name || course.id}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Folder</Label>
                            <Select
                              value={note.folder_id ?? ""}
                              onValueChange={(value) =>
                                handleUpdateNote(note.id, { folder_id: value || null })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Unassigned" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Unassigned</SelectItem>
                                {folders.map((folder) => (
                                  <SelectItem key={folder.id} value={folder.id}>
                                    {folder.name || folder.id}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>

            <TabsContent value="ai" className="space-y-6">
              <Card className="p-6 border-border/70 bg-card/80 space-y-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Gemini credentials</h3>
                    <p className="text-sm text-muted-foreground">
                      Centralize the Gemini API key, provider, and model consumed across the workspace.
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Current key: {storedAiConfig.keyPreview ?? "not configured"}.</p>
                      {storedAiConfig.updatedAt && (
                        <p>
                          Updated {toLocaleDate(storedAiConfig.updatedAt)}
                          {storedAiConfig.updatedBy ? ` • by ${storedAiConfig.updatedBy}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => void loadAiInsights()}
                      disabled={aiConfigLoading || aiConfigSaving}
                    >
                      {aiConfigLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="w-4 h-4" />
                      )}
                      Refresh
                    </Button>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={handleSaveAiConfig}
                      disabled={!hasConfigChanges || aiConfigSaving || aiConfigLoading}
                    >
                      {aiConfigSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save configuration
                    </Button>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ai-provider">Provider</Label>
                    <Input
                      id="ai-provider"
                      value={aiConfig.provider}
                      onChange={(event) =>
                        setAiConfig((prev) => ({ ...prev, provider: event.target.value }))
                      }
                      disabled={aiConfigLoading || aiConfigSaving}
                    />
                    <p className="text-xs text-muted-foreground">
                      Defaults to Gemini; update if migrating to another vendor.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-model">Model</Label>
                    <Input
                      id="ai-model"
                      value={aiConfig.model}
                      onChange={(event) =>
                        setAiConfig((prev) => ({ ...prev, model: event.target.value }))
                      }
                      disabled={aiConfigLoading || aiConfigSaving}
                    />
                    <p className="text-xs text-muted-foreground">
                      Applied for chat, formatting, and workspace assistants.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai-api-key">Gemini API key</Label>
                  <Input
                    id="ai-api-key"
                    type="password"
                    placeholder="Paste a new key to rotate credentials"
                    value={aiApiKeyInput}
                    onChange={(event) => setAiApiKeyInput(event.target.value)}
                    disabled={aiConfigSaving}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Stored encrypted through Supabase edge functions. Leave blank to retain the existing key.
                  </p>
                </div>
              </Card>
              <Card className="p-6 border-border/70 bg-card/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">System prompt</h3>
                    <p className="text-sm text-muted-foreground">
                      Adjust the baseline instruction that powers Gemini across the workspace.
                    </p>
                  </div>
                  <Button size="sm" className="gap-2" onClick={() => handleSaveContent("ai")} disabled={loading.content}>
                    {loading.content ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save AI prompt
                  </Button>
                </div>
                <Textarea
                  rows={4}
                  value={aiContent.defaultPrompt ?? ""}
                  onChange={(event) =>
                    setContentSections((prev) => ({
                      ...prev,
                      ai: { ...aiContent, defaultPrompt: event.target.value },
                    }))
                  }
                />
              </Card>

              <Card className="p-6 border-border/70 bg-card/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Prompt tester</h3>
                    <p className="text-sm text-muted-foreground">Send a quick prompt through the deployed Gemini gateway.</p>
                  </div>
                  <Button size="sm" className="gap-2" onClick={handleTestAiPrompt} disabled={loading.ai}>
                    {loading.ai ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                    Run test
                  </Button>
                </div>
                <Textarea
                  rows={3}
                  value={aiTestPrompt}
                  onChange={(event) => setAiTestPrompt(event.target.value)}
                />
                {aiTestResponse && (
                  <div className="rounded-md border border-border/60 bg-muted/40 p-4">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Gemini response</Label>
                    <p className="text-sm whitespace-pre-wrap mt-2">{aiTestResponse}</p>
                  </div>
                )}
              </Card>

              <Card className="p-6 border-border/70 bg-card/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Recent AI interactions</h3>
                    <p className="text-sm text-muted-foreground">Inspect last 20 calls logged via edge functions.</p>
                  </div>
                </div>
                <ScrollArea className="h-72 pr-2">
                  <div className="space-y-3">
                    {aiInteractions.map((interaction) => (
                      <Card key={interaction.id} className="p-4 border-border/60 bg-muted/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="capitalize">
                            {interaction.interaction_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {toLocaleDate(interaction.created_at)}
                          </span>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Prompt</Label>
                          <p className="text-sm whitespace-pre-wrap mt-1">{interaction.prompt.slice(0, 500)}</p>
                        </div>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Response preview</Label>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                            {interaction.response.slice(0, 400)}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>

            <TabsContent value="engagement" className="space-y-6">
              <Card className="p-6 border-border/70 bg-card/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Contact submissions</h3>
                    <p className="text-sm text-muted-foreground">Follow up with students reaching out for support.</p>
                  </div>
                </div>
                <ScrollArea className="h-80 pr-2">
                  <div className="space-y-3">
                    {contacts.map((contact) => (
                      <Card key={contact.id} className="p-4 border-border/60 bg-muted/30 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium">{contact.name}</p>
                            <p className="text-xs text-muted-foreground">{contact.email}</p>
                            <p className="text-xs text-muted-foreground">{toLocaleDate(contact.created_at)}</p>
                          </div>
                          <Button
                            variant={contact.resolved ? "secondary" : "outline"}
                            size="sm"
                            className="gap-2"
                            onClick={() => handleToggleContact(contact.id, !contact.resolved)}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {contact.resolved ? "Mark unresolved" : "Mark resolved"}
                          </Button>
                        </div>
                        {contact.subject && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Subject</Label>
                            <p className="text-sm">{contact.subject}</p>
                          </div>
                        )}
                        <div>
                          <Label className="text-xs text-muted-foreground">Message</Label>
                          <p className="text-sm whitespace-pre-wrap">{contact.message}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};
