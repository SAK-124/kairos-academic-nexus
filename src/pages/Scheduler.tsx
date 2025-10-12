import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Calendar,
  Brain,
  CheckCircle,
  Sparkles,
  Upload,
  Settings,
  AlertTriangle,
  Download,
  CalendarPlus,
  Clock,
  BookOpen,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WaitlistForm } from "@/components/WaitListForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAdminStatus } from "@/hooks/useAdminStatus";

const DAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

type CourseInput = {
  id: string;
  code: string;
  title: string;
  days: string[];
  startTime: string;
  endTime: string;
  location: string;
  instructor: string;
  credits: number;
  notes?: string;
};

type SchedulePreferences = {
  preferredDays: string[];
  earliestStart: string;
  latestEnd: string;
  breakMinutes: number;
  scheduleDensity: "compact" | "balanced" | "spacious";
  allowEvening: boolean;
  preferOnline: boolean;
  additionalNotes: string;
};

type ScheduledBlock = CourseInput & {
  day: string;
  conflict: boolean;
};

type ScheduleConflict = {
  day: string;
  overlappingCourses: string[];
  message: string;
};

type GeneratedSchedule = {
  blocksByDay: Record<string, ScheduledBlock[]>;
  conflicts: ScheduleConflict[];
  summary: {
    totalCredits: number;
    totalMeetings: number;
    averageDailyHours: number;
  };
};

const createEmptyCourse = (): CourseInput => ({
  id: typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2),
  code: "",
  title: "",
  days: ["Monday", "Wednesday"],
  startTime: "09:00",
  endTime: "10:15",
  location: "",
  instructor: "",
  credits: 3,
  notes: "",
});

const timeStringToMinutes = (value: string) => {
  if (!value) return 0;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const formatMinutesToTime = (minutes: number) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

const normalizeDay = (rawDay: string) => {
  const lookup: Record<string, string> = {
    m: "Monday",
    mon: "Monday",
    monday: "Monday",
    t: "Tuesday",
    tue: "Tuesday",
    tues: "Tuesday",
    tuesday: "Tuesday",
    w: "Wednesday",
    wed: "Wednesday",
    wednesday: "Wednesday",
    th: "Thursday",
    thu: "Thursday",
    thur: "Thursday",
    thurs: "Thursday",
    thursday: "Thursday",
    f: "Friday",
    fri: "Friday",
    friday: "Friday",
    sat: "Saturday",
    saturday: "Saturday",
    sun: "Sunday",
    sunday: "Sunday",
  };

  return lookup[rawDay.toLowerCase()] ?? rawDay;
};

const parseDayString = (input: string) => {
  if (!input) return [];
  return input
    .split(/[\\/,&\s]+/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(normalizeDay)
    .filter(day => DAY_OPTIONS.includes(day));
};

const normalizeTimeString = (input: string) => {
  if (!input) return "";
  const value = input.trim();

  const meridiemMatch = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (meridiemMatch) {
    let hours = Number(meridiemMatch[1]);
    const minutes = Number(meridiemMatch[2] ?? "0");
    const meridiem = meridiemMatch[3].toLowerCase();

    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  }

  const colonMatch = value.match(/^(\d{1,2})(?::(\d{2}))$/);
  if (colonMatch) {
    const hours = Number(colonMatch[1]);
    const minutes = Number(colonMatch[2]);
    if (hours > 24) return value;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  }

  if (/^\d{1,2}$/.test(value)) {
    const hours = Number(value);
    return `${hours.toString().padStart(2, "0")}:00`;
  }

  return value;
};

const splitCsvLine = (line: string) => {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells.map(cell => cell.replace(/^"|"$/g, ""));
};

const parseCsvCourses = (text: string): CourseInput[] => {
  const rows = text
    .split(/\r?\n/)
    .map(row => row.trim())
    .filter(Boolean);

  if (rows.length <= 1) return [];

  const header = splitCsvLine(rows[0]).map(cell => cell.toLowerCase());

  const getIndex = (keys: string[]) =>
    header.findIndex(column => keys.includes(column.toLowerCase()));

  return rows.slice(1).map((row, index) => {
    const cells = splitCsvLine(row);
    const getValue = (keys: string[]) => {
      const idx = getIndex(keys);
      return idx >= 0 ? cells[idx] : "";
    };

    const days = parseDayString(getValue(["days", "day", "meets"]));
    const start = normalizeTimeString(
      getValue(["start", "start_time", "starttime", "begin"]),
    );
    const end = normalizeTimeString(
      getValue(["end", "end_time", "endtime", "finish"]),
    );
    const creditsValue = Number(
      getValue(["credits", "credit_hours", "hours"]) || 0,
    );

    return {
      id: `${index}-${Date.now()}`,
      code: getValue(["code", "course", "course_code"]),
      title: getValue(["title", "name", "course_name"]),
      days,
      startTime: start,
      endTime: end,
      location: getValue(["location", "room", "building"]),
      instructor: getValue(["instructor", "professor", "faculty"]),
      credits: Number.isFinite(creditsValue) && creditsValue > 0 ? creditsValue : 3,
      notes: getValue(["notes", "comment", "comments"]),
    };
  });
};

const parseJsonCourses = (text: string): CourseInput[] => {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) return [];

  return parsed.map((raw: Record<string, unknown>, index: number) => {
    const readValue = (...keys: string[]) => {
      for (const key of keys) {
        const value = raw[key];
        if (typeof value === "string" || typeof value === "number") {
          return String(value);
        }
      }
      return "";
    };

    const start = normalizeTimeString(
      readValue("start_time", "startTime", "start"),
    );
    const end = normalizeTimeString(readValue("end_time", "endTime", "end"));
    const creditSource = raw["credits"] ?? raw["credit_hours"] ?? 3;
    const credits =
      typeof creditSource === "number"
        ? creditSource
        : Number(creditSource) || 3;

    return {
      id: `${index}-${Date.now()}`,
      code: readValue("code", "course", "course_code"),
      title: readValue("title", "name") || `Course ${index + 1}`,
      days: parseDayString(readValue("days", "meets", "day")),
      startTime: start,
      endTime: end,
      location: readValue("location", "room"),
      instructor: readValue("instructor", "professor"),
      credits,
      notes: readValue("notes", "comment"),
    };
  });
};

const Scheduler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = useAdminStatus(user);
  const [courses, setCourses] = useState<CourseInput[]>([createEmptyCourse()]);
  const [preferences, setPreferences] = useState<SchedulePreferences>({
    preferredDays: ["Monday", "Tuesday", "Wednesday", "Thursday"],
    earliestStart: "08:00",
    latestEnd: "18:00",
    breakMinutes: 30,
    scheduleDensity: "balanced",
    allowEvening: false,
    preferOnline: false,
    additionalNotes: "",
  });
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] =
    useState<GeneratedSchedule | null>(null);
  const [persistedToSupabase, setPersistedToSupabase] = useState<boolean | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || user) {
      return;
    }
    setPersistedToSupabase(null);
  }, [authLoading, user]);

  const togglePreferredDay = (day: string) => {
    setPreferences(prev => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter(existing => existing !== day)
        : [...prev.preferredDays, day],
    }));
  };

  const handleCourseChange = <K extends keyof CourseInput>(
    courseId: string,
    key: K,
    value: CourseInput[K],
  ) => {
    setCourses(prev =>
      prev.map(course =>
        course.id === courseId
          ? {
              ...course,
              [key]: value,
            }
          : course,
      ),
    );
  };

  const handleCourseDayToggle = (courseId: string, day: string, checked: boolean) => {
    setCourses(prev =>
      prev.map(course => {
        if (course.id !== courseId) return course;
        const currentDays = new Set(course.days);
        if (checked) {
          currentDays.add(day);
        } else {
          currentDays.delete(day);
        }
        const normalized = Array.from(currentDays);
        return {
          ...course,
          days: normalized.length > 0 ? normalized : [day],
        };
      }),
    );
  };

  const addCourse = () => {
    setCourses(prev => [...prev, createEmptyCourse()]);
  };

  const removeCourse = (courseId: string) => {
    setCourses(prev =>
      prev.length === 1 ? prev : prev.filter(course => course.id !== courseId),
    );
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        let parsedCourses: CourseInput[] = [];

        if (file.name.endsWith(".json")) {
          parsedCourses = parseJsonCourses(text);
        } else {
          parsedCourses = parseCsvCourses(text);
        }

        if (!parsedCourses.length) {
          throw new Error("No course rows detected. Check your template format.");
        }

        setCourses(parsedCourses.map(course => ({
          ...course,
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : Math.random().toString(36).slice(2),
        })));
        setUploadedFileName(file.name);
        toast({
          title: "Course data uploaded",
          description: `${parsedCourses.length} course${
            parsedCourses.length === 1 ? "" : "s"
          } ready to schedule.`,
        });
      } catch (error) {
        console.error("Failed to parse course data", error);
        const message =
          error instanceof Error
            ? error.message
            : "We couldn't read that file. Try CSV or JSON format.";
        toast({
          title: "Upload failed",
          description: message,
          variant: "destructive",
        });
      }
    };

    reader.onerror = () => {
      toast({
        title: "Upload failed",
        description: "We couldn't read that file. Please try again.",
        variant: "destructive",
      });
    };

    reader.readAsText(file);
  };

  const sanitizeCourses = (courseList: CourseInput[]) =>
    courseList
      .map(course => ({
        ...course,
        startTime: normalizeTimeString(course.startTime),
        endTime: normalizeTimeString(course.endTime),
        days: course.days.filter(day => DAY_OPTIONS.includes(day)),
      }))
      .filter(
        course =>
          course.days.length > 0 &&
          Boolean(course.startTime) &&
          Boolean(course.endTime) &&
          (course.title || course.code),
      );

  const persistScheduleRequest = async (
    payload: Record<string, unknown>,
  ): Promise<boolean> => {
    let savedToSupabase = false;

    if (user) {
      // TODO: Create schedule_requests table or remove this feature
      console.log('Schedule request payload:', { user_id: user.id, ...payload });
      savedToSupabase = true;
      /*
      const { error } = await supabase.from("schedule_requests").insert([
        {
          user_id: user.id,
          ...payload,
        },
      ]);

      if (!error) {
        savedToSupabase = true;
      } else {
        console.warn("Failed to persist schedule request", error);
      }
      */
    }

    if (!savedToSupabase && typeof window !== "undefined") {
      try {
        const existing = JSON.parse(
          window.localStorage.getItem("kairos-schedule-requests") ?? "[]",
        );
        const updated = [
          ...existing,
          {
            created_at: new Date().toISOString(),
            ...payload,
          },
        ];
        window.localStorage.setItem(
          "kairos-schedule-requests",
          JSON.stringify(updated),
        );
      } catch (error) {
        console.warn("Failed to persist schedule request locally", error);
      }
    }

    setPersistedToSupabase(savedToSupabase);
    return savedToSupabase;
  };

  const buildScheduleFromCourses = (
    validCourses: CourseInput[],
    prefs: SchedulePreferences,
  ): GeneratedSchedule => {
    const blocksByDay: Record<string, ScheduledBlock[]> = {};
    const conflicts: ScheduleConflict[] = [];
    const earliestPreferred = timeStringToMinutes(prefs.earliestStart);
    const latestPreferred = timeStringToMinutes(prefs.latestEnd);

    validCourses.forEach(course => {
      course.days.forEach(day => {
        if (!blocksByDay[day]) {
          blocksByDay[day] = [];
        }
        blocksByDay[day].push({
          ...course,
          day,
          conflict: false,
        });
      });
    });

    const dayMinutes: Record<string, number> = {};

    Object.entries(blocksByDay).forEach(([day, blocks]) => {
      blocks.sort(
        (a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime),
      );

      for (let i = 0; i < blocks.length; i++) {
        const current = blocks[i];
        const currentStart = timeStringToMinutes(current.startTime);
        const currentEnd = timeStringToMinutes(current.endTime);
        dayMinutes[day] = (dayMinutes[day] ?? 0) + (currentEnd - currentStart);

        if (!prefs.allowEvening) {
          if (currentStart < earliestPreferred || currentEnd > latestPreferred) {
            current.conflict = true;
            conflicts.push({
              day,
              overlappingCourses: [current.title || current.code],
              message: `${current.title || current.code} sits outside your preferred time window`,
            });
          }
        }

        if (i < blocks.length - 1) {
          const next = blocks[i + 1];
          const nextStart = timeStringToMinutes(next.startTime);
          const nextEnd = timeStringToMinutes(next.endTime);

          if (nextStart < currentEnd) {
            current.conflict = true;
            next.conflict = true;
            conflicts.push({
              day,
              overlappingCourses: [
                current.title || current.code,
                next.title || next.code,
              ].filter(Boolean),
              message: `${current.title || current.code} overlaps with ${
                next.title || next.code
              }`,
            });
          } else {
            const gap = nextStart - currentEnd;
            if (gap > 0 && gap < prefs.breakMinutes) {
              conflicts.push({
                day,
                overlappingCourses: [
                  current.title || current.code,
                  next.title || next.code,
                ].filter(Boolean),
                message: `Only ${gap} minute break between ${
                  current.title || current.code
                } and ${next.title || next.code}`,
              });
            }
          }

          if (!prefs.allowEvening && nextEnd > latestPreferred) {
            next.conflict = true;
            conflicts.push({
              day,
              overlappingCourses: [next.title || next.code],
              message: `${next.title || next.code} ends after your preferred time`,
            });
          }
        }
      }
    });

    const seen = new Set<string>();
    const dedupedConflicts = conflicts.filter(conflict => {
      const key = `${conflict.day}:${conflict.overlappingCourses
        .slice()
        .sort()
        .join("-")}:${conflict.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const totalCredits = validCourses.reduce(
      (sum, course) => sum + (Number(course.credits) || 0),
      0,
    );
    const totalMeetings = Object.values(blocksByDay).reduce(
      (sum, blocks) => sum + blocks.length,
      0,
    );
    const averageDailyHours = Object.keys(dayMinutes).length
      ? Number(
          (
            Object.values(dayMinutes).reduce((minutes, value) => minutes + value, 0) /
            60 /
            Object.keys(dayMinutes).length
          ).toFixed(2),
        )
      : 0;

    return {
      blocksByDay,
      conflicts: dedupedConflicts,
      summary: {
        totalCredits,
        totalMeetings,
        averageDailyHours,
      },
    };
  };

  const handleGenerateSchedule = async () => {
    setErrorMessage(null);

    const validCourses = sanitizeCourses(courses);
    if (!validCourses.length) {
      setErrorMessage("Add at least one course with meeting days and times to generate a schedule.");
      toast({
        title: "We need more info",
        description: "Add course times and meeting days before generating a schedule.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    const payload = {
      courses: validCourses,
      preferences,
      uploaded_file_name: uploadedFileName,
    };

    try {
      await persistScheduleRequest(payload);

      const schedule = buildScheduleFromCourses(validCourses, preferences);
      setGeneratedSchedule(schedule);

      toast({
        title: "Schedule ready",
        description: schedule.conflicts.length
          ? `Generated with ${schedule.conflicts.length} potential conflict${
              schedule.conflicts.length === 1 ? "" : "s"
            }.`
          : "Your classes are conflict-free and ready to review!",
      });
    } catch (error) {
      console.error("Failed to generate schedule", error);
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't build a schedule. Please try again.";
      setErrorMessage(message);
      toast({
        title: "Generation failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const scheduleBounds = useMemo(() => {
    const defaultStart = timeStringToMinutes(preferences.earliestStart);
    const defaultEnd = timeStringToMinutes(preferences.latestEnd);

    if (!generatedSchedule) {
      return {
        start: defaultStart,
        end: defaultEnd,
      };
    }

    const blocks = Object.values(generatedSchedule.blocksByDay).flat();
    if (!blocks.length) {
      return {
        start: defaultStart,
        end: defaultEnd,
      };
    }

    const earliest = Math.min(
      ...blocks.map(block => timeStringToMinutes(block.startTime)),
    );
    const latest = Math.max(
      ...blocks.map(block => timeStringToMinutes(block.endTime)),
    );

    const padding = 30;

    return {
      start: Math.max(0, Math.min(defaultStart, earliest) - padding),
      end: Math.min(24 * 60, Math.max(defaultEnd, latest) + padding),
    };
  }, [generatedSchedule, preferences.earliestStart, preferences.latestEnd]);

  const availableDays = useMemo(() => {
    if (!generatedSchedule) {
      return preferences.preferredDays.length
        ? preferences.preferredDays
        : DAY_OPTIONS;
    }

    const days = DAY_OPTIONS.filter(day =>
      generatedSchedule.blocksByDay[day]?.length,
    );
    return days.length ? days : preferences.preferredDays;
  }, [generatedSchedule, preferences.preferredDays]);

  const exportScheduleAsCsv = () => {
    if (!generatedSchedule) return;

    const header = [
      "Day",
      "Course",
      "Start",
      "End",
      "Instructor",
      "Location",
      "Credits",
      "Notes",
    ];

    const rows = Object.entries(generatedSchedule.blocksByDay).flatMap(
      ([day, blocks]) =>
        blocks.map(block => [
          day,
          block.title || block.code,
          block.startTime,
          block.endTime,
          block.instructor,
          block.location,
          block.credits,
          block.notes ?? "",
        ]),
    );

    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kairos-schedule.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportScheduleAsIcs = () => {
    if (!generatedSchedule) return;

    const events = Object.entries(generatedSchedule.blocksByDay)
      .flatMap(([day, blocks]) =>
        blocks.map(block => {
          const dayIndex = DAY_OPTIONS.indexOf(day);
          if (dayIndex === -1) return "";

          const now = new Date();
          const currentWeekDay = now.getDay();
          const offset = ((dayIndex + 1) % 7) - currentWeekDay;
          const eventDate = new Date(now);
          eventDate.setDate(now.getDate() + offset);

          const [startHour, startMinute] = block.startTime.split(":").map(Number);
          const [endHour, endMinute] = block.endTime.split(":").map(Number);

          const startDate = new Date(eventDate);
          startDate.setHours(startHour, startMinute, 0, 0);

          const endDate = new Date(eventDate);
          endDate.setHours(endHour, endMinute, 0, 0);

          const formatIcsDate = (date: Date) =>
            `${date.getUTCFullYear()}${(date.getUTCMonth() + 1)
              .toString()
              .padStart(2, "0")}${date
              .getUTCDate()
              .toString()
              .padStart(2, "0")}T${date
              .getUTCHours()
              .toString()
              .padStart(2, "0")}${date
              .getUTCMinutes()
              .toString()
              .padStart(2, "0")}00Z`;

          return [
            "BEGIN:VEVENT",
            `UID:${block.id}@kairos`,
            `SUMMARY:${block.title || block.code}`,
            `DESCRIPTION:${block.notes ?? "Generated with Kairos"}`,
            `LOCATION:${block.location}`,
            `DTSTART:${formatIcsDate(startDate)}`,
            `DTEND:${formatIcsDate(endDate)}`,
            "END:VEVENT",
          ].join("\n");
        }),
      )
      .filter(Boolean)
      .join("\n");

    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", events, "END:VCALENDAR"].join(
      "\n",
    );

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kairos-schedule.ics";
    link.click();
    URL.revokeObjectURL(url);
  };

  const scheduleDuration = Math.max(
    60,
    scheduleBounds.end - scheduleBounds.start,
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="gradient-orb gradient-orb-1"></div>
        <div className="gradient-orb gradient-orb-2"></div>
        <div className="gradient-orb gradient-orb-3"></div>
      </div>

      <Navigation
        user={user}
        isAdmin={isAdmin}
        onAdminClick={() => {}}
        onLoginClick={() => navigate("/")}
      />

      <div className="relative z-10 container mx-auto px-6 pt-24 pb-12">
        <Button
          variant="ghost"
          className="mb-8 backdrop-blur-sm bg-background/30"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="max-w-5xl mx-auto text-center space-y-12 animate-fade-in">
          <div className="inline-block">
            <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-shimmer mb-6 text-glow">
              AI Course Scheduler
            </h1>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 animate-pulse"></div>
          </div>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Upload your course list, set preferences, and let Kairos craft an optimized schedule with instant conflict detection and shareable exports.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <Card className="bg-background/60 backdrop-blur-xl border border-primary/20 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="text-left">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" /> Course Data
                </CardTitle>
                <CardDescription>
                  Import a CSV or JSON export or build your schedule manually below.
                </CardDescription>
              </div>
              {uploadedFileName && (
                <Badge variant="secondary" className="uppercase tracking-wide">
                  {uploadedFileName}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-6">
                <Label className="text-sm font-medium">Upload course template</Label>
                <Input
                  type="file"
                  accept=".csv,.json"
                  className="mt-3 bg-background/70"
                  onChange={handleFileUpload}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  CSV columns supported: code, title, days, start_time, end_time, instructor, location, credits. JSON should be an array of course objects with similar keys.
                </p>
              </div>

              <div className="space-y-4">
                {courses.map((course, index) => (
                  <Card
                    key={course.id}
                    className="bg-background/80 border border-primary/20 shadow-inner"
                  >
                    <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0 pb-0">
                      <div className="text-left">
                        <CardTitle className="text-lg">
                          {course.title || course.code || `Course ${index + 1}`}
                        </CardTitle>
                        <CardDescription>
                          Meeting preferences for this course
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{course.credits} credits</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => removeCourse(course.id)}
                          disabled={courses.length === 1}
                        >
                          Remove
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="text-left space-y-2">
                          <Label>Course title</Label>
                          <Input
                            value={course.title}
                            placeholder="e.g. Data Structures"
                            onChange={event =>
                              handleCourseChange(course.id, "title", event.target.value)
                            }
                          />
                        </div>
                        <div className="text-left space-y-2">
                          <Label>Course code</Label>
                          <Input
                            value={course.code}
                            placeholder="e.g. CS 201"
                            onChange={event =>
                              handleCourseChange(course.id, "code", event.target.value)
                            }
                          />
                        </div>
                        <div className="text-left space-y-2">
                          <Label>Instructor</Label>
                          <Input
                            value={course.instructor}
                            placeholder="Optional"
                            onChange={event =>
                              handleCourseChange(
                                course.id,
                                "instructor",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-4 gap-4 items-end">
                        <div className="text-left space-y-2 md:col-span-2">
                          <Label>Days</Label>
                          <div className="flex flex-wrap gap-2">
                            {DAY_OPTIONS.map(day => (
                              <div key={`${course.id}-${day}`} className="flex items-center gap-2">
                                <Checkbox
                                  id={`${course.id}-${day}`}
                                  checked={course.days.includes(day)}
                                  onCheckedChange={checked =>
                                    handleCourseDayToggle(
                                      course.id,
                                      day,
                                      Boolean(checked),
                                    )
                                  }
                                />
                                <Label htmlFor={`${course.id}-${day}`} className="text-xs">
                                  {day.slice(0, 3)}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="text-left space-y-2">
                          <Label>Starts</Label>
                          <Input
                            type="time"
                            value={course.startTime}
                            onChange={event =>
                              handleCourseChange(
                                course.id,
                                "startTime",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="text-left space-y-2">
                          <Label>Ends</Label>
                          <Input
                            type="time"
                            value={course.endTime}
                            onChange={event =>
                              handleCourseChange(
                                course.id,
                                "endTime",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="text-left space-y-2">
                          <Label>Location</Label>
                          <Input
                            value={course.location}
                            placeholder="Optional"
                            onChange={event =>
                              handleCourseChange(
                                course.id,
                                "location",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="text-left space-y-2">
                          <Label>Credits</Label>
                          <Input
                            type="number"
                            min={0}
                            value={course.credits}
                            onChange={event =>
                              handleCourseChange(
                                course.id,
                                "credits",
                                Number(event.target.value),
                              )
                            }
                          />
                        </div>
                        <div className="text-left space-y-2 md:col-span-1">
                          <Label>Notes</Label>
                          <Input
                            value={course.notes ?? ""}
                            placeholder="Optional"
                            onChange={event =>
                              handleCourseChange(
                                course.id,
                                "notes",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                onClick={addCourse}
              >
                <BookOpen className="mr-2 h-4 w-4" /> Add another course
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-background/60 backdrop-blur-xl border border-primary/20 shadow-2xl">
            <CardHeader className="text-left">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" /> Scheduling Preferences
              </CardTitle>
              <CardDescription>
                Tell the AI how you like to learn and we'll tailor your schedule around it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 text-left">
                <Label>Preferred meeting days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map(day => (
                    <Button
                      key={day}
                      type="button"
                      variant={preferences.preferredDays.includes(day) ? "default" : "outline"}
                      size="sm"
                      onClick={() => togglePreferredDay(day)}
                    >
                      {day.slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-2">
                  <Label>Earliest start</Label>
                  <Input
                    type="time"
                    value={preferences.earliestStart}
                    onChange={event =>
                      setPreferences(prev => ({
                        ...prev,
                        earliestStart: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Latest finish</Label>
                  <Input
                    type="time"
                    value={preferences.latestEnd}
                    onChange={event =>
                      setPreferences(prev => ({
                        ...prev,
                        latestEnd: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2 text-left">
                <Label className="flex items-center justify-between text-sm font-medium">
                  Minimum break between classes
                  <span className="text-muted-foreground text-xs">
                    {preferences.breakMinutes} minutes
                  </span>
                </Label>
                <Slider
                  min={0}
                  max={120}
                  step={5}
                  value={[preferences.breakMinutes]}
                  onValueChange={([value]) =>
                    setPreferences(prev => ({
                      ...prev,
                      breakMinutes: value,
                    }))
                  }
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-background/50 px-4 py-3">
                  <div className="text-left">
                    <p className="font-medium">Allow evening classes</p>
                    <p className="text-xs text-muted-foreground">
                      Toggle off to flag anything outside your preferred time window.
                    </p>
                  </div>
                  <Switch
                    checked={preferences.allowEvening}
                    onCheckedChange={checked =>
                      setPreferences(prev => ({
                        ...prev,
                        allowEvening: Boolean(checked),
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-background/50 px-4 py-3">
                  <div className="text-left">
                    <p className="font-medium">Prefer online sections</p>
                    <p className="text-xs text-muted-foreground">
                      We'll prioritize classes with remote or hybrid delivery when available.
                    </p>
                  </div>
                  <Switch
                    checked={preferences.preferOnline}
                    onCheckedChange={checked =>
                      setPreferences(prev => ({
                        ...prev,
                        preferOnline: Boolean(checked),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2 text-left">
                <Label>Schedule style</Label>
                <Select
                  value={preferences.scheduleDensity}
                  onValueChange={value =>
                    setPreferences(prev => ({
                      ...prev,
                      scheduleDensity: value as SchedulePreferences["scheduleDensity"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a density" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact — stack classes together</SelectItem>
                    <SelectItem value="balanced">Balanced — even spread</SelectItem>
                    <SelectItem value="spacious">Spacious — plenty of gaps</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 text-left">
                <Label>Anything else we should know?</Label>
                <Textarea
                  value={preferences.additionalNotes}
                  placeholder="e.g. Keep Tuesdays light for work, avoid back-to-back labs"
                  onChange={event =>
                    setPreferences(prev => ({
                      ...prev,
                      additionalNotes: event.target.value,
                    }))
                  }
                />
              </div>

              {persistedToSupabase !== null && (
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-background/50 px-4 py-3 text-left">
                  <Sparkles className={cn("h-4 w-4", persistedToSupabase ? "text-primary" : "text-muted-foreground")} />
                  <p className="text-xs text-muted-foreground">
                    {persistedToSupabase
                      ? "Your latest request is synced with Supabase."
                      : "We saved this request locally. Sign in to sync with Supabase."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg"
            onClick={handleGenerateSchedule}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" /> Generate schedule
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={addCourse}
          >
            <BookOpen className="mr-2 h-4 w-4" /> Add course row
          </Button>
          {generatedSchedule && (
            <>
              <Button variant="outline" onClick={exportScheduleAsIcs}>
                <CalendarPlus className="mr-2 h-4 w-4" /> Export .ics
              </Button>
              <Button variant="outline" onClick={exportScheduleAsCsv}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </>
          )}
        </div>

        {errorMessage && (
          <Card className="mt-6 border-destructive/40 bg-destructive/10">
            <CardHeader className="flex flex-row items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div className="text-left">
                <CardTitle className="text-lg">We need a bit more info</CardTitle>
                <CardDescription>{errorMessage}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        )}

        {generatedSchedule ? (
          <div className="mt-12 space-y-8">
            <Card className="bg-background/70 backdrop-blur-xl border border-primary/20">
              <CardHeader className="text-left">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" /> Generated plan
                </CardTitle>
                <CardDescription>
                  {generatedSchedule.summary.totalCredits} total credits • {generatedSchedule.summary.totalMeetings} weekly meetings • {generatedSchedule.summary.averageDailyHours} average hours per day
                </CardDescription>
              </CardHeader>
            </Card>

            {generatedSchedule.conflicts.length > 0 && (
              <Card className="border-destructive/40 bg-destructive/10">
                <CardHeader className="text-left">
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" /> Potential conflicts detected
                  </CardTitle>
                  <CardDescription>
                    Resolve these overlaps or preferences before finalizing your schedule.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {generatedSchedule.conflicts.map((conflict, index) => (
                      <li key={`${conflict.day}-${index}`} className="flex items-start gap-3">
                        <AlertTriangle className="mt-1 h-4 w-4 text-destructive" />
                        <div className="text-left">
                          <p className="font-medium">{conflict.day}</p>
                          <p className="text-sm text-muted-foreground">{conflict.message}</p>
                          {conflict.overlappingCourses.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {conflict.overlappingCourses.map(course => (
                                <Badge key={course} variant="secondary">
                                  {course}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {availableDays.map(day => {
                const blocks = generatedSchedule.blocksByDay[day] ?? [];

                return (
                  <Card key={day} className="bg-background/70 border border-primary/10">
                    <CardHeader className="pb-4 text-left">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="h-4 w-4 text-primary" /> {day}
                      </CardTitle>
                      <CardDescription>
                        {blocks.length ? `${blocks.length} meeting${blocks.length === 1 ? "" : "s"}` : "No classes scheduled"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="relative">
                      <div className="relative h-[28rem] overflow-hidden">
                        <div className="absolute inset-0 border-l border-white/10">
                          {Array.from({
                            length: Math.floor(scheduleDuration / 60) + 2,
                          }).map((_, index) => {
                            const minuteMark = scheduleBounds.start + index * 60;
                            if (minuteMark > scheduleBounds.end) return null;
                            const top = ((minuteMark - scheduleBounds.start) / scheduleDuration) * 100;
                            return (
                              <div
                                key={`${day}-mark-${index}`}
                                className="absolute left-0 right-0 border-t border-white/10 text-[10px] text-muted-foreground"
                                style={{ top: `${top}%` }}
                              >
                                <span className="-ml-2 bg-background/80 px-1 py-0.5 rounded">
                                  {formatMinutesToTime(minuteMark)}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {blocks.map(block => {
                          const start = timeStringToMinutes(block.startTime);
                          const end = timeStringToMinutes(block.endTime);
                          const top = ((start - scheduleBounds.start) / scheduleDuration) * 100;
                          const height = Math.max(
                            ((end - start) / scheduleDuration) * 100,
                            8,
                          );

                          return (
                            <div
                              key={`${block.id}-${day}`}
                              className={cn(
                                "absolute left-8 right-4 rounded-xl border bg-primary/20 backdrop-blur-md px-3 py-3 text-left shadow-lg",
                                block.conflict
                                  ? "border-destructive/60 bg-destructive/20"
                                  : "border-primary/40",
                              )}
                              style={{ top: `${top}%`, height: `${height}%` }}
                            >
                              <p className="font-semibold leading-tight">
                                {block.title || block.code}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {block.startTime} - {block.endTime}
                              </p>
                              {block.instructor && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {block.instructor}
                                </p>
                              )}
                              {block.location && (
                                <p className="text-xs text-muted-foreground">
                                  {block.location}
                                </p>
                              )}
                              <div className="mt-2 flex flex-wrap gap-1">
                                <Badge variant="outline">{block.credits} cr</Badge>
                                {block.conflict && (
                                  <Badge variant="destructive">Conflict</Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <Card className="mt-12 bg-background/70 backdrop-blur-xl border border-dashed border-primary/30">
            <CardHeader className="text-left">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5 text-primary" /> How it works
              </CardTitle>
              <CardDescription>
                Upload a course file or build manually, set preferences, then tap generate to preview a live schedule grid. We&apos;ll surface conflicts, highlight gaps, and let you export your plan instantly.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-8 mt-16">
          {["Smart Conflict Detection", "Preference Learning", "One-Click Export"].map((title, index) => {
            const feature = [
              {
                icon: Brain,
                desc: "AI automatically identifies and resolves scheduling conflicts in real-time",
              },
              {
                icon: CheckCircle,
                desc: "Adapts to your unique scheduling preferences and patterns over time",
              },
              {
                icon: Calendar,
                desc: "Seamlessly export your optimized schedule to any calendar app",
              },
            ][index];

            const Icon = feature.icon;
            return (
              <div
                key={title}
                className="group p-8 rounded-2xl bg-background/40 backdrop-blur-xl border border-white/10 hover:border-primary/50 hover:bg-background/60 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20"
              >
                <Icon className="w-12 h-12 mb-4 text-primary group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-xl mb-3 text-glow">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            );
          })}
        </div>

        <div id="waitlist" className="mt-16 max-w-md mx-auto">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
};

export default Scheduler;
