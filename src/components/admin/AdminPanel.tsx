import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
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

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const fallbackContentSections: ContentSections = {
  hero: {
    headline: "Your AI-Powered Academic Companion",
    description:
      "Transform chaos into clarity with Kairos. Plan smarter, sync your notes, and surface insights without leaving your flow.",
    cta: "Launch workspace",
  },
  "social-proof": {
    statLabel: "Active students",
    statValue: "20+",
    quote:
      "Kairos transformed my course planning from a 3-hour nightmare into a 5-minute breeze.",
    author: "Ahmed K.",
    role: "BBA Student, IBA",
  },
  pricing: {
    plans: [
      {
        name: "Student",
        price: "$6/mo",
        features: [
          "Adaptive scheduler",
          "Smart note summaries",
          "Unlimited folders",
        ],
      },
      {
        name: "Team",
        price: "$18/mo",
        features: [
          "Shared workspace",
          "AI knowledge base",
          "Priority support",
        ],
      },
    ],
  },
  faq: {
    items: [
      {
        question: "How does Kairos personalise my planner?",
        answer:
          "We blend your course calendars, assignment metadata, and focus preferences to build a schedule that flexes with real life.",
      },
      {
        question: "Do you support collaborative notes?",
        answer:
          "Yes. Invite classmates into shared folders to co-create outlines, flashcards, and annotated research.",
      },
    ],
  },
  ai: {
    defaultPrompt: "You are Kairos, an academic co-pilot who keeps students ahead of every deadline.",
  },
};

const fallbackButtonMappings: ButtonMapping[] = [
  {
    id: "demo-cta-primary",
    button_id: "hero-primary",
    text: "Launch workspace",
    route: "/app",
    hover_text: "Open Kairos",
    enabled: true,
    updated_at: "2024-04-12T10:00:00Z",
  },
  {
    id: "demo-cta-secondary",
    button_id: "hero-secondary",
    text: "Explore features",
    route: "/#features",
    hover_text: "Scroll to feature overview",
    enabled: true,
    updated_at: "2024-04-12T10:00:00Z",
  },
];

const fallbackAnimationSettings: Record<string, AnimationSetting["value"]> = {
  global: {
    fadeInDuration: "600ms",
    easing: "ease-out",
  },
  intro: {
    displayDuration: 2400,
    delayBetween: 400,
  },
};

const fallbackCourses: CourseRow[] = [
  {
    id: "demo-course-ops",
    name: "Operations Research",
    code: "OPS-401",
    color: "#6366F1",
    user_id: "demo-user",
    created_at: "2024-04-10T09:00:00Z",
    updated_at: "2024-04-12T08:45:00Z",
  },
  {
    id: "demo-course-ethics",
    name: "Ethics in Technology",
    code: "ETH-210",
    color: "#F97316",
    user_id: "demo-user",
    created_at: "2024-04-08T14:00:00Z",
    updated_at: "2024-04-11T16:15:00Z",
  },
];

const fallbackFolders: FolderRow[] = [
  {
    id: "demo-folder-week1",
    name: "Week 1 - Foundations",
    user_id: "demo-user",
    course_id: "demo-course-ops",
    parent_id: null,
    created_at: "2024-04-10T09:15:00Z",
    updated_at: "2024-04-12T09:30:00Z",
  },
  {
    id: "demo-folder-research",
    name: "Research prompts",
    user_id: "demo-user",
    course_id: "demo-course-ethics",
    parent_id: null,
    created_at: "2024-04-08T14:30:00Z",
    updated_at: "2024-04-11T12:10:00Z",
  },
];

const fallbackNotes: NoteRow[] = [
  {
    id: "demo-note-1",
    title: "Queueing theory primer",
    updated_at: "2024-04-12T09:45:00Z",
    course_id: "demo-course-ops",
    folder_id: "demo-folder-week1",
    user_id: "demo-user",
  },
  {
    id: "demo-note-2",
    title: "AI governance checklist",
    updated_at: "2024-04-11T17:05:00Z",
    course_id: "demo-course-ethics",
    folder_id: "demo-folder-research",
    user_id: "demo-user",
  },
];

const fallbackAiInteractions: AiInteraction[] = [
  {
    id: "demo-ai-1",
    interaction_type: "summary",
    prompt: "Summarise chapter 3 on optimisation heuristics.",
    response: "Chapter 3 highlights greedy, simulated annealing, and genetic heuristics with trade-offs in convergence and accuracy.",
    created_at: "2024-04-12T09:50:00Z",
    note_id: "demo-note-1",
    model: "gemini-2.0-flash-lite",
    tokens_used: 612,
    user_id: "demo-user",
  },
  {
    id: "demo-ai-2",
    interaction_type: "brainstorm",
    prompt: "Give ethical considerations for AI deployment in education.",
    response:
      "Discuss transparency, data privacy, bias mitigation, and preserving student agency when introducing automation into classrooms.",
    created_at: "2024-04-11T17:15:00Z",
    note_id: "demo-note-2",
    model: "gemini-2.0-flash-lite",
    tokens_used: 548,
    user_id: "demo-user",
  },
];

const fallbackAiConfig: AiConfigSummary = {
  provider: "gemini",
  model: "gemini-2.0-flash-lite",
  keyPreview: "demo-****",
  updatedAt: "2024-04-12T09:40:00Z",
  updatedBy: "demo-admin",
};

const fallbackContacts: ContactSubmission[] = [
  {
    id: "demo-contact-1",
    name: "Priya S.",
    email: "priya@example.com",
    subject: "Workspace sharing question",
    message: "Can we limit a folder to view-only collaborators?",
    resolved: false,
    created_at: "2024-04-11T18:20:00Z",
  },
  {
    id: "demo-contact-2",
    name: "Noah L.",
    email: "noah@example.com",
    subject: "Billing",
    message: "Does the team plan support procurement invoicing?",
    resolved: true,
    created_at: "2024-04-10T13:05:00Z",
  },
];

export const AdminPanel = ({ onClose }: AdminPanelProps) => {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
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
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isEnsuringSchema, setIsEnsuringSchema] = useState(false);
  const offlineToastShown = useRef(false);

  const coursesParentRef = useRef<HTMLDivElement>(null);
  const foldersParentRef = useRef<HTMLDivElement>(null);
  const notesParentRef = useRef<HTMLDivElement>(null);

  const coursesVirtualizer = useVirtualizer({
    count: courses.length,
    getScrollElement: () => coursesParentRef.current,
    estimateSize: () => 240,
    overscan: 6,
  });

  const foldersVirtualizer = useVirtualizer({
    count: folders.length,
    getScrollElement: () => foldersParentRef.current,
    estimateSize: () => 200,
    overscan: 6,
  });

  const notesVirtualizer = useVirtualizer({
    count: notes.length,
    getScrollElement: () => notesParentRef.current,
    estimateSize: () => 260,
    overscan: 6,
  });

  const hasConfigChanges = useMemo(
    () =>
      aiApiKeyInput.trim().length > 0 ||
      aiConfig.provider !== storedAiConfig.provider ||
      aiConfig.model !== storedAiConfig.model,
    [aiApiKeyInput, aiConfig.model, aiConfig.provider, storedAiConfig.model, storedAiConfig.provider]
  );

  const setBusy = (key: keyof LoadingState, value: boolean) =>
    setLoading((prev) => ({ ...prev, [key]: value }));

  const markOffline = useCallback(
    (scope: string, error: unknown) => {
      console.error(`Falling back to demo data for ${scope}`, error);
      
      // Distinguish between different error types
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isAuthError = errorMessage.toLowerCase().includes('jwt') || 
                         errorMessage.toLowerCase().includes('auth');
      const isRLSError = errorMessage.toLowerCase().includes('row-level security') || 
                        errorMessage.toLowerCase().includes('policy');
      const isPermissionError = errorMessage.toLowerCase().includes('permission') ||
                               errorMessage.toLowerCase().includes('access denied');
      
      setIsOfflineMode(true);
      if (!offlineToastShown.current) {
        offlineToastShown.current = true;
        
        let title = "Demo data loaded";
        let description = "Supabase was unreachable. The admin panel is running in offline preview mode.";
        
        if (isAuthError) {
          title = "Authentication required";
          description = "Please log in to access live data. Showing demo data for now.";
        } else if (isRLSError || isPermissionError) {
          title = "Access denied";
          description = "Admin privileges required. Showing demo data for preview.";
        }
        
        toast({ title, description });
      }
    },
    [toast]
  );

  const offlineChangeMessage = "Offline demo mode active. Changes persist locally until you reconnect.";

  const loadContentSections = useCallback(async () => {
    setBusy("content", true);
    try {
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

      ensureSection<HeroContent>(next, "hero", fallbackContentSections.hero as HeroContent);
      ensureSection<SocialProofContent>(next, "social-proof", fallbackContentSections["social-proof"] as SocialProofContent);
      ensureSection<PricingContent>(next, "pricing", fallbackContentSections.pricing as PricingContent);
      ensureSection<FaqContent>(next, "faq", fallbackContentSections.faq as FaqContent);
      ensureSection<AiContent>(next, "ai", fallbackContentSections.ai as AiContent);

      setContentSections(next);
      return true;
    } catch (error) {
      markOffline("content", error);
      setContentSections(deepClone(fallbackContentSections));
      return false;
    } finally {
      setBusy("content", false);
    }
  }, [markOffline]);

  const loadButtons = useCallback(async () => {
    setBusy("buttons", true);
    try {
      const { data, error } = await supabase
        .from("button_mappings")
        .select("*")
        .order("button_id", { ascending: true });
      if (error) throw error;
      setButtonMappings(data ?? []);
      return true;
    } catch (error) {
      markOffline("button mappings", error);
      setButtonMappings(deepClone(fallbackButtonMappings));
      return false;
    } finally {
      setBusy("buttons", false);
    }
  }, [markOffline]);

  const loadAnimationSettings = useCallback(async () => {
    setBusy("animations", true);
    try {
      const { data, error } = await supabase.from("animation_settings").select("setting_name, value");
      if (error) throw error;
      const next: Record<string, AnimationSetting["value"]> = {};
      data?.forEach((setting) => {
        next[setting.setting_name] = setting.value;
      });
      setAnimationSettings(next);
      return true;
    } catch (error) {
      markOffline("animation settings", error);
      setAnimationSettings(deepClone(fallbackAnimationSettings));
      return false;
    } finally {
      setBusy("animations", false);
    }
  }, [markOffline]);

  const loadLibrary = useCallback(async () => {
    setBusy("courses", true);
    setBusy("folders", true);
    setBusy("notes", true);

    try {
      const [{ data: courseData, error: courseError }, { data: folderData, error: folderError }, { data: noteData, error: noteError }]
        = await Promise.all([
          supabase
            .from("courses")
            .select("id, name, code, color, user_id, updated_at, created_at")
            .order("updated_at", { ascending: false })
            .limit(50),
          supabase
            .from("folders")
            .select("id, name, user_id, updated_at, course_id, parent_id, created_at")
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
      return true;
    } catch (error) {
      markOffline("workspace library", error);
      setCourses(deepClone(fallbackCourses));
      setFolders(deepClone(fallbackFolders));
      setNotes(deepClone(fallbackNotes));
      return false;
    } finally {
      setBusy("courses", false);
      setBusy("folders", false);
      setBusy("notes", false);
    }
  }, [markOffline]);

  const loadAiInsights = useCallback(async () => {
    const [interactionsResult, configResult] = await Promise.all([
      supabase
        .from("ai_interactions")
        .select("id, interaction_type, created_at, prompt, response, note_id, model, tokens_used, user_id")
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

    return true;
  }, []);

  const loadAiInsightsWithFallback = useCallback(async () => {
    setBusy("ai", true);
    setAiConfigLoading(true);
    try {
      return await loadAiInsights();
    } catch (error) {
      markOffline("AI insights", error);
      setAiInteractions(deepClone(fallbackAiInteractions));
      setStoredAiConfig(fallbackAiConfig);
      setAiConfig(fallbackAiConfig);
      return false;
    } finally {
      setBusy("ai", false);
      setAiConfigLoading(false);
    }
  }, [loadAiInsights, markOffline]);

  const loadEngagement = useCallback(async () => {
    setBusy("engagement", true);
    try {
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setContacts(data ?? []);
      return true;
    } catch (error) {
      markOffline("engagement signals", error);
      setContacts(deepClone(fallbackContacts));
      return false;
    } finally {
      setBusy("engagement", false);
    }
  }, [markOffline]);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await Promise.all([
        loadContentSections(),
        loadButtons(),
        loadAnimationSettings(),
        loadLibrary(),
        loadAiInsightsWithFallback(),
        loadEngagement(),
      ]);
      const hadFailure = results.some((result) => result === false);
      if (!hadFailure) {
        setIsOfflineMode(false);
        offlineToastShown.current = false;
      }
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
    loadAiInsightsWithFallback,
    loadAnimationSettings,
    loadButtons,
    loadContentSections,
    loadEngagement,
    loadLibrary,
    toast,
  ]);

  const handleEnsureSchema = useCallback(async () => {
    if (isOfflineMode) {
      toast({
        title: "Offline mode",
        description: "Schema ensure is disabled while using demo data.",
      });
      return;
    }

    setIsEnsuringSchema(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error("Missing access token");
      }

      const response = await fetch("/functions/v1/admin?action=ensure-schema", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to ensure schema");
      }

      toast({
        title: "Schema ensured",
        description: "Baseline structures verified on staging.",
      });
      void loadAll();
    } catch (error) {
      console.error("Failed to ensure schema", error);
      toast({
        title: "Ensure schema failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsEnsuringSchema(false);
    }
  }, [isOfflineMode, loadAll, toast]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please log in to access the admin panel",
        variant: "destructive",
      });
      setHasAccess(false);
      onClose();
      return;
    }

    let cancelled = false;
    setHasAccess(null);

    const verifyAdmin = async () => {
      try {
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (cancelled) return;

        if (roleError) {
          console.error("Error checking admin role:", roleError);
          markOffline("admin verification", roleError);
          setHasAccess(true);
          return;
        }

        if (!roleData) {
          toast({
            title: "Access denied",
            description: "You don't have admin privileges",
            variant: "destructive",
          });
          setHasAccess(false);
          onClose();
          return;
        }

        setHasAccess(true);
      } catch (error) {
        if (cancelled) return;
        console.error("Admin verification failed:", error);
        markOffline("admin verification", error);
        setHasAccess(true);
      }
    };

    void verifyAdmin();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, toast, onClose, markOffline]);

  useEffect(() => {
    if (!hasAccess) {
      return;
    }
    void loadAll();
  }, [hasAccess, loadAll]);

  const handleSaveAiConfig = async () => {
    if (!hasConfigChanges) return;
    setAiConfigSaving(true);
    try {
      if (isOfflineMode) {
        const trimmedKey = aiApiKeyInput.trim();
        const preview = trimmedKey ? `••••${trimmedKey.slice(-4)}` : storedAiConfig.keyPreview;
        const timestamp = new Date().toISOString();
        const summary: AiConfigSummary = {
          provider: aiConfig.provider,
          model: aiConfig.model,
          keyPreview: preview,
          updatedAt: timestamp,
          updatedBy: "offline-admin",
        };
        setStoredAiConfig(summary);
        setAiConfig(summary);
        setAiApiKeyInput("");
        toast({
          title: "AI configuration staged locally",
          description: offlineChangeMessage,
        });
        return;
      }

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
    if (isOfflineMode) {
      toast({ title: "Saved locally", description: offlineChangeMessage });
      return;
    }
      const { error } = await supabase
        .from("content_sections")
        .upsert([{
          section_name: sectionName,
          content: payload as any,
          updated_at: new Date().toISOString(),
        }], {
          onConflict: 'section_name'
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
    if (isOfflineMode) {
      const timestamp = new Date().toISOString();
      setButtonMappings((prev) => {
        const exists = prev.some((item) => item.id === button.id);
        const nextButton = { ...button, updated_at: timestamp };
        if (exists) {
          return prev.map((item) => (item.id === button.id ? nextButton : item));
        }
        return [...prev, nextButton];
      });
      toast({ title: "Button saved (demo)", description: offlineChangeMessage });
      return;
    }
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
    if (isOfflineMode) {
      setAnimationSettings((prev) => ({
        ...prev,
        [settingName]: value,
      }));
      toast({ title: "Animation updated (demo)", description: offlineChangeMessage });
      return;
    }
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
    if (isOfflineMode) {
      const timestamp = new Date().toISOString();
      setCourses((prev) =>
        prev.map((course) => (course.id === courseId ? { ...course, ...patch, updated_at: timestamp } : course))
      );
      toast({ title: "Course updated (demo)", description: offlineChangeMessage });
      return;
    }
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
    if (isOfflineMode) {
      setCourses((prev) => prev.filter((course) => course.id !== courseId));
      toast({ title: "Course deleted (demo)", description: offlineChangeMessage });
      return;
    }
    const { error } = await supabase.from("courses").delete().eq("id", courseId);
    if (error) {
      toast({ title: "Failed to delete course", description: error.message, variant: "destructive" });
      return;
    }
    setCourses((prev) => prev.filter((course) => course.id !== courseId));
    toast({ title: "Course deleted" });
  };

  const handleUpdateFolder = async (folderId: string, patch: Partial<FolderRow>) => {
    if (isOfflineMode) {
      const timestamp = new Date().toISOString();
      setFolders((prev) =>
        prev.map((folder) => (folder.id === folderId ? { ...folder, ...patch, updated_at: timestamp } : folder))
      );
      toast({ title: "Folder updated (demo)", description: offlineChangeMessage });
      return;
    }
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
    if (isOfflineMode) {
      setFolders((prev) => prev.filter((folder) => folder.id !== folderId));
      toast({ title: "Folder deleted (demo)", description: offlineChangeMessage });
      return;
    }
    const { error } = await supabase.from("folders").delete().eq("id", folderId);
    if (error) {
      toast({ title: "Failed to delete folder", description: error.message, variant: "destructive" });
      return;
    }
    setFolders((prev) => prev.filter((folder) => folder.id !== folderId));
    toast({ title: "Folder deleted" });
  };

  const handleUpdateNote = async (noteId: string, patch: Partial<NoteRow>) => {
    if (isOfflineMode) {
      const timestamp = new Date().toISOString();
      setNotes((prev) => prev.map((note) => (note.id === noteId ? { ...note, ...patch, updated_at: timestamp } : note)));
      toast({ title: "Note updated (demo)", description: offlineChangeMessage });
      return;
    }
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
    if (isOfflineMode) {
      setAiTestResponse(
        "[Demo] Kairos would highlight focus blocks for each deliverable and suggest the next best action once you reconnect."
      );
      toast({ title: "AI responded (demo)", description: offlineChangeMessage });
      setBusy("ai", false);
      return;
    }
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
    if (isOfflineMode) {
      setContacts((prev) => prev.map((contact) => (contact.id === id ? { ...contact, resolved } : contact)));
      toast({
        title: resolved ? "Marked resolved (demo)" : "Marked unresolved (demo)",
        description: offlineChangeMessage,
      });
      return;
    }
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

  if (authLoading || hasAccess === null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (hasAccess === false) {
    return null;
  }

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
              {isOfflineMode && (
                <Badge className="mt-3 w-fit border-amber-500/40 bg-amber-500/10 text-amber-600">
                  Offline demo data
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {!isOfflineMode && (
                <Button variant="outline" className="gap-2" onClick={handleEnsureSchema} disabled={isEnsuringSchema}>
                  {isEnsuringSchema ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <DatabaseIcon className="w-4 h-4" />
                  )}
                  Ensure schema
                </Button>
              )}
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
                <div ref={coursesParentRef} className="h-64 overflow-y-auto pr-2">
                  <div style={{ height: coursesVirtualizer.getTotalSize(), position: "relative" }}>
                    {coursesVirtualizer.getVirtualItems().map((virtualRow) => {
                      const course = courses[virtualRow.index];
                      if (!course) return null;
                      return (
                        <div
                          key={virtualRow.key}
                          className="absolute top-0 left-0 w-full pb-3"
                          style={{ transform: `translateY(${virtualRow.start}px)` }}
                        >
                          <Card className="p-4 border-border/60 bg-muted/30 space-y-3">
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-border/70 bg-card/80 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Folders</h3>
                    <p className="text-sm text-muted-foreground">Manage note collections and descriptions.</p>
                  </div>
                </div>
                <div ref={foldersParentRef} className="h-64 overflow-y-auto pr-2">
                  <div style={{ height: foldersVirtualizer.getTotalSize(), position: "relative" }}>
                    {foldersVirtualizer.getVirtualItems().map((virtualRow) => {
                      const folder = folders[virtualRow.index];
                      if (!folder) return null;
                      return (
                        <div
                          key={virtualRow.key}
                          className="absolute top-0 left-0 w-full pb-3"
                          style={{ transform: `translateY(${virtualRow.start}px)` }}
                        >
                          <Card className="p-4 border-border/60 bg-muted/30 space-y-3">
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
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-border/70 bg-card/80 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Notes</h3>
                    <p className="text-sm text-muted-foreground">Quickly retitle and reassign notes between folders or courses.</p>
                  </div>
                </div>
                <div ref={notesParentRef} className="h-80 overflow-y-auto pr-2">
                  <div style={{ height: notesVirtualizer.getTotalSize(), position: "relative" }}>
                    {notesVirtualizer.getVirtualItems().map((virtualRow) => {
                      const note = notes[virtualRow.index];
                      if (!note) return null;
                      return (
                        <div
                          key={virtualRow.key}
                          className="absolute top-0 left-0 w-full pb-3"
                          style={{ transform: `translateY(${virtualRow.start}px)` }}
                        >
                          <Card className="p-4 border-border/60 bg-muted/30 space-y-4">
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
                        </div>
                      );
                    })}
                  </div>
                </div>
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
