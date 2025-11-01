import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  MessagesSquare,
  RefreshCw,
  Send,
  Sparkles,
  Upload,
  Edit2,
  Save,
  MapPin,
} from "lucide-react";
import * as XLSX from "xlsx";

import { Navigation } from "@/components/Navigation";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { cn } from "@/lib/utils";
import {
  GeminiClient,
  type GeminiMessage,
} from "@/integrations/gemini/client";
import { supabase } from "@/integrations/supabase/client";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";

const DAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type Step = "intro" | "upload" | "chat";

const MAX_SHEET_ROWS = 40;
const MAX_SHEET_COLUMNS = 20;

const COURSE_EXTRACTION_SYSTEM_PROMPT = `You are a meticulous academic catalog analyst. Convert messy university timetable spreadsheets into a clean JSON representation.

Return only valid JSON that matches this TypeScript interface:
{
  "courses": Array<{
    code: string;
    title: string;
    classNumber?: string;
    days: string[]; // Full day names like Monday
    startTime: string; // 24-hour HH:MM
    endTime: string; // 24-hour HH:MM
    location?: string;
    instructor?: string;
    credits?: number;
    notes?: string;
  }>;
}

Guidelines:
- Use the data from every sheet provided.
- Detect headers automatically even if they appear mid-sheet or span multiple rows.
- Ignore summary rows that do not include meeting times.
- Expand compact day strings (e.g. "MWF" -> Monday, Wednesday, Friday).
- Convert any times to 24-hour HH:MM.
- When a column holds both start and end time (e.g. "8:00 AM - 9:15 AM"), split it into startTime and endTime.
- When data is missing, use an empty string or omit the field.
- Only include rows that correspond to actual course meeting sections.
- Prefer the class number/CRN if available.
- Respond with an empty courses array if nothing usable is found.
`;

type CourseInput = {
  id: string;
  code: string;
  title: string;
  classNumber?: string;
  days: string[];
  startTime: string;
  endTime: string;
  location: string;
  instructor: string;
  credits: number;
  notes?: string;
};

type SchedulePreferences = {
  earliestStart: string;
  latestEnd: string;
  breakMinutes: number;
  allowEvening: boolean;
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

type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AiScheduleProposal = {
  courses: CourseInput[];
  notes?: string;
};

type SheetPreview = {
  name: string;
  rows: string[][];
  columnSamples?: { columnIndex: number; samples: string[] }[];
};

const DEFAULT_PREFERENCES: SchedulePreferences = {
  earliestStart: "07:00",
  latestEnd: "22:00",
  breakMinutes: 15,
  allowEvening: true,
};

const SYSTEM_PROMPT = `You are Kairos, an empathetic academic scheduling assistant helping a student build their semester timetable.\n\nFollow this workflow:\n1. Greet the student and briefly acknowledge you read the uploaded catalog.\n2. Ask in conversational English which courses they want and any preferences such as days, times, breaks, online/in-person, or workload balance.\n3. Ask for clarifications when needed before producing a full plan.\n4. When you have enough detail, propose a complete schedule. Provide a natural language explanation and include a fenced code block using the language label SCHEDULE_JSON with strictly valid JSON. The JSON must follow this schema:\n{\n  "courses": [\n    {\n      "code": "CS 201",\n      "title": "Data Structures",\n      "classNumber": "12345",\n      "days": ["Monday", "Wednesday"],\n      "startTime": "09:00",\n      "endTime": "10:15",\n      "location": "Engineering 210",\n      "instructor": "Dr. Smith",\n      "credits": 3,\n      "notes": "Optional extra information"\n    }\n  ],\n  "notes": "Any high level guidance or reminders for the student"\n}\n- Use 24-hour HH:MM format for times.\n- Use full day names (e.g. Monday).\n- Always populate code, title, days, startTime, and endTime for every course.\n- If class numbers or instructors are not provided in the catalog, leave them blank.\n5. If the student requests changes after a proposal, provide an updated recommendation with a new SCHEDULE_JSON block.\n6. Never invent courses that are not in the catalog. When suggesting sections, use the closest matching option from the uploaded data.\n\nDo not produce the JSON block until you are ready with a complete plan. Do not include multiple JSON blocks in the same response.`;

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
    .filter(day => DAY_OPTIONS.includes(day as typeof DAY_OPTIONS[number]));
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

const normalizeSheetCell = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
};

const readCourseField = (
  record: Record<string, unknown>,
  ...keys: string[]
) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
  }
  return "";
};

const readCourseNumber = (
  record: Record<string, unknown>,
  ...keys: string[]
) => {
  for (const key of keys) {
    const value = record[key];
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return NaN;
};

const normalizeAiDays = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .flatMap(item => (typeof item === "string" ? parseDayString(item) : []))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return parseDayString(value);
  }

  return [];
};

const extractCoursesWithGemini = async (sheets: SheetPreview[]) => {
  if (!sheets.length) return [];

  const payload = {
    context:
      "Each sheet lists rows from left to right exactly as they appear in the spreadsheet. Use all sheets, detect header rows automatically, and consult the optional columnSamples array to understand what values appear in each column.",
    sheets,
  };

  const response = await GeminiClient.json([
    { role: "system", content: COURSE_EXTRACTION_SYSTEM_PROMPT },
    {
      role: "user",
      content: JSON.stringify(payload),
    },
  ]);

  const aiCourses = Array.isArray(response?.courses)
    ? (response.courses as Record<string, unknown>[])
    : [];

  return aiCourses.map((course, index) => {
    const start = normalizeTimeString(
      readCourseField(course, "startTime", "start_time", "start"),
    );
    const end = normalizeTimeString(
      readCourseField(course, "endTime", "end_time", "end"),
    );
    const credits = readCourseNumber(course, "credits", "creditHours", "hours");

    return {
      id: `${index}-${Date.now()}`,
      code: readCourseField(course, "code", "courseCode", "subject"),
      title: readCourseField(course, "title", "name", "courseTitle"),
      classNumber: readCourseField(
        course,
        "classNumber",
        "class_number",
        "crn",
        "section",
      ),
      days: normalizeAiDays(course.days ?? course.day ?? course.daysText),
      startTime: start,
      endTime: end,
      location: readCourseField(course, "location", "room", "building"),
      instructor: readCourseField(course, "instructor", "professor", "faculty"),
      credits: Number.isFinite(credits) && credits > 0 ? credits : 3,
      notes: readCourseField(course, "notes", "comment"),
    };
  });
};

const splitCsvLine = (line: string) => {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === "\"") {
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

const buildSheetPreview = (name: string, rawRows: string[][]): SheetPreview | null => {
  const cleanedRows = rawRows
    .map(row => row.slice(0, MAX_SHEET_COLUMNS).map(cell => normalizeSheetCell(cell)))
    .filter(row => row.some(cell => cell.length));

  const limitedRows = cleanedRows.slice(0, MAX_SHEET_ROWS);
  if (!limitedRows.length) return null;

  const columnCount = limitedRows.reduce((max, row) => Math.max(max, row.length), 0);
  const rows = limitedRows.map(row =>
    Array.from({ length: columnCount }, (_, index) => row[index] ?? ""),
  );

  const columnSamples = Array.from({ length: columnCount })
    .map((_, index) => ({
      columnIndex: index,
      samples: rows
        .map(row => row[index])
        .filter(value => Boolean(value?.length))
        .slice(0, 5),
    }))
    .filter(sample => sample.samples.length);

  return {
    name,
    rows,
    columnSamples: columnSamples.length ? columnSamples : undefined,
  };
};

const parseWithGemini = async (previews: SheetPreview[]): Promise<CourseInput[]> => {
  if (!previews.length) return [];

  try {
    const aiCourses = await extractCoursesWithGemini(previews);
    return sanitizeCourses(aiCourses);
  } catch (error) {
    console.error("Gemini schedule extraction failed", error);
    throw new Error(
      "We couldn't analyze that file with AI. Please try again with a different file or try again later.",
    );
  }
};

const parseCsvWithGemini = async (
  fileName: string,
  text: string,
): Promise<CourseInput[]> => {
  const rows = text
    .split(/\r?\n/)
    .map(row => row.trim())
    .filter(Boolean)
    .map(line => splitCsvLine(line).map(cell => normalizeSheetCell(cell)));

  const preview = buildSheetPreview(fileName, rows);
  if (!preview) return [];

  return parseWithGemini([preview]);
};

const parseJsonWithGemini = async (
  fileName: string,
  text: string,
): Promise<CourseInput[]> => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse JSON upload", error);
    throw new Error("We couldn't read that JSON file. Check that it is valid JSON.");
  }

  const previews: SheetPreview[] = [];

  const processValue = (value: unknown, name: string) => {
    if (Array.isArray(value)) {
      if (!value.length) return;

      if (value.every(item => Array.isArray(item))) {
        const rows = value.map(row =>
          Array.isArray(row)
            ? row.map(cell => normalizeSheetCell(cell))
            : [normalizeSheetCell(row)],
        );
        const preview = buildSheetPreview(name, rows as string[][]);
        if (preview) previews.push(preview);
        return;
      }

      if (
        value.every(
          item =>
            Boolean(item) && typeof item === "object" && !Array.isArray(item),
        )
      ) {
        const keys = Array.from(
          new Set(
            value.flatMap(item =>
              Object.keys((item as Record<string, unknown>) ?? {}),
            ),
          ),
        );

        if (!keys.length) return;

        const rows = [
          keys,
          ...value.map(item =>
            keys.map(key => normalizeSheetCell((item as Record<string, unknown>)[key])),
          ),
        ];
        const preview = buildSheetPreview(name, rows);
        if (preview) previews.push(preview);
        return;
      }

      const rows = value.map(item => [normalizeSheetCell(item)]);
      const preview = buildSheetPreview(name, rows);
      if (preview) previews.push(preview);
      return;
    }

    if (value && typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(
        ([key, nested]) => processValue(nested, `${name}.${key}`),
      );
      return;
    }

    if (value === null || value === undefined) return;

    const preview = buildSheetPreview(name, [[normalizeSheetCell(value)]]);
    if (preview) previews.push(preview);
  };

  processValue(parsed, fileName.replace(/\.[^.]+$/, ""));

  return parseWithGemini(previews);
};

const parsePlainTextWithGemini = async (
  fileName: string,
  text: string,
): Promise<CourseInput[]> => {
  const rows = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line =>
      line.includes("\t")
        ? line
            .split(/\t+/)
            .map(cell => normalizeSheetCell(cell))
        : [normalizeSheetCell(line)],
    );

  const preview = buildSheetPreview(fileName, rows);
  if (!preview) return [];

  return parseWithGemini([preview]);
};

function sanitizeCourses(courseList: CourseInput[]) {
  return courseList
    .map(course => ({
      ...course,
      startTime: normalizeTimeString(course.startTime),
      endTime: normalizeTimeString(course.endTime),
      days: course.days
        .map(day => normalizeDay(day))
        .filter(day => DAY_OPTIONS.includes(day as typeof DAY_OPTIONS[number])),
    }))
    .filter(
      course =>
        course.days.length > 0 &&
        Boolean(course.startTime) &&
        Boolean(course.endTime) &&
        (course.title || course.code),
    );
}

const parseSpreadsheetCourses = async (file: File): Promise<CourseInput[]> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const previews = workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name];
    const table = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
      sheet,
      {
        header: 1,
        defval: "",
        blankrows: false,
        raw: false,
      },
    ) as (string | number | boolean | null)[][];

    return buildSheetPreview(
      name,
      table.map(row => row.map(cell => normalizeSheetCell(cell))),
    );
  }).filter(Boolean) as SheetPreview[];

  return parseWithGemini(previews);
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

const computeScheduleBounds = (schedule: GeneratedSchedule | null) => {
  const defaultBounds = {
    start: timeStringToMinutes(DEFAULT_PREFERENCES.earliestStart),
    end: timeStringToMinutes(DEFAULT_PREFERENCES.latestEnd),
  };

  if (!schedule) return defaultBounds;

  const blocks = Object.values(schedule.blocksByDay).flat();
  if (!blocks.length) return defaultBounds;

  const earliest = Math.min(
    ...blocks.map(block => timeStringToMinutes(block.startTime)),
  );
  const latest = Math.max(
    ...blocks.map(block => timeStringToMinutes(block.endTime)),
  );

  const padding = 30;

  return {
    start: Math.max(0, Math.min(defaultBounds.start, earliest) - padding),
    end: Math.min(24 * 60, Math.max(defaultBounds.end, latest) + padding),
  };
};

const computeAvailableDays = (schedule: GeneratedSchedule | null) => {
  // Always show all 7 days for better context
  return Array.from(DAY_OPTIONS);
};

const computeScheduleDuration = (bounds: { start: number; end: number }) =>
  Math.max(60, bounds.end - bounds.start);

const extractScheduleProposal = (
  content: string,
): AiScheduleProposal | null => {
  const match = content.match(/```SCHEDULE_JSON\s*([\s\S]*?)```/i);
  if (!match) return null;

  try {
    const payload = JSON.parse(match[1].trim());
    const rawCourses = Array.isArray(payload?.courses) ? payload.courses : [];

    const courses = sanitizeCourses(
      rawCourses.map((course: Record<string, unknown>, index: number) => ({
        id:
          (typeof course.id === "string" && course.id) ||
          (typeof course.classNumber === "string" && course.classNumber) ||
          `${course.code ?? "course"}-${index}`,
        code: String(course.code ?? course.courseCode ?? ""),
        title: String(course.title ?? course.name ?? ""),
        classNumber:
          typeof course.classNumber === "string"
            ? course.classNumber
            : typeof course.section === "string"
              ? course.section
              : undefined,
        days: Array.isArray(course.days)
          ? course.days
              .map(value => (typeof value === "string" ? value : ""))
              .filter(Boolean)
          : parseDayString(String(course.days ?? "")),
        startTime: normalizeTimeString(
          typeof course.startTime === "string"
            ? course.startTime
            : typeof course.start === "string"
              ? course.start
              : "",
        ),
        endTime: normalizeTimeString(
          typeof course.endTime === "string"
            ? course.endTime
            : typeof course.end === "string"
              ? course.end
              : "",
        ),
        location: String(course.location ?? ""),
        instructor: String(course.instructor ?? ""),
        credits: Number(course.credits ?? 0) || 0,
        notes:
          typeof course.notes === "string"
            ? course.notes
            : typeof course.description === "string"
              ? course.description
              : undefined,
      })),
    );

    const notes =
      typeof payload?.notes === "string"
        ? payload.notes
        : typeof payload?.summary === "string"
          ? payload.summary
          : undefined;

    if (!courses.length) {
      return null;
    }

    return { courses, notes };
  } catch (error) {
    console.warn("Failed to parse SCHEDULE_JSON payload", error);
    return null;
  }
};
const ChatBubble = ({ message }: { message: AiChatMessage }) => {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-xl rounded-2xl px-4 py-3 text-sm shadow-lg",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-background/80 border border-white/10 backdrop-blur",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <MarkdownRenderer content={message.content} className="prose-p:leading-relaxed" />
        )}
      </div>
    </div>
  );
};

const StepBadge = ({
  label,
  active,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  icon: ComponentType<{ className?: string }>;
}) => (
  <div
    className={cn(
      "flex items-center gap-3 rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-wide",
      active
        ? "border-primary/60 bg-primary/10 text-primary"
        : "border-white/10 bg-background/40 text-muted-foreground",
    )}
  >
    <Icon className="h-3.5 w-3.5" />
    <span>{label}</span>
  </div>
);

const ScheduleGrid = ({
  schedule,
  bounds,
  duration,
}: {
  schedule: GeneratedSchedule;
  bounds: { start: number; end: number };
  duration: number;
}) => {
  const availableDays = computeAvailableDays(schedule);
  
  // Generate time labels for left axis (hourly increments)
  const timeLabels: string[] = [];
  const startHour = Math.floor(bounds.start / 60);
  const endHour = Math.ceil(bounds.end / 60);
  
  for (let hour = startHour; hour <= endHour; hour++) {
    timeLabels.push(formatMinutesToTime(hour * 60));
  }

  return (
    <div className="w-full overflow-hidden rounded-xl bg-surface-container-low shadow-[var(--elevation-2)]">
      {/* Header with day names and stats */}
      <div className="flex border-b border-border/30">
        <div className="w-20 flex-shrink-0 bg-surface-container-low border-r border-border/30" />
        {availableDays.map((day) => {
          const blocks = schedule.blocksByDay[day] ?? [];
          const hasConflicts = blocks.some((b) => b.conflict);
          
          return (
            <div key={day} className="flex-1 min-w-[140px] px-4 py-3 text-center border-r border-border/10 last:border-r-0">
              <div className="flex flex-col items-center gap-1">
                <h3 className="font-semibold text-sm">{day}</h3>
                <Badge 
                  variant={blocks.length === 0 ? "secondary" : hasConflicts ? "destructive" : "default"} 
                  className="text-[10px] px-2 py-0"
                >
                  {blocks.length === 0 ? "Free" : `${blocks.length} class${blocks.length > 1 ? "es" : ""}`}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      {/* Calendar body with horizontal scroll */}
      <div className="flex overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/50 hover:scrollbar-thumb-border/70 snap-x snap-mandatory">
        {/* Time axis (sticky left) */}
        <div className="w-20 flex-shrink-0 sticky left-0 bg-surface-container-low z-10 border-r border-border/30">
          <div className="relative" style={{ height: `${timeLabels.length * 60}px` }}>
            {timeLabels.map((time, idx) => (
              <div
                key={time}
                className="absolute left-0 right-0 text-xs text-muted-foreground font-mono text-center px-2"
                style={{ top: `${idx * 60}px` }}
              >
                {time}
              </div>
            ))}
          </div>
        </div>

        {/* Day columns */}
        {availableDays.map((day) => {
          const blocks = schedule.blocksByDay[day] ?? [];
          
          return (
            <div 
              key={day} 
              className="flex-1 min-w-[140px] relative border-r border-border/10 last:border-r-0 snap-center"
              style={{ height: `${timeLabels.length * 60}px` }}
            >
              {/* Horizontal gridlines */}
              {timeLabels.map((_, idx) => (
                <div
                  key={idx}
                  className="absolute left-0 right-0 border-t border-border/20"
                  style={{ top: `${idx * 60}px` }}
                />
              ))}

              {/* Course blocks */}
              {blocks.map((block, blockIdx) => {
                const start = timeStringToMinutes(block.startTime);
                const end = timeStringToMinutes(block.endTime);
                const top = ((start - bounds.start) / duration) * 100;
                const height = ((end - start) / duration) * 100;
                const isCompact = height < 15;

                return (
                  <HoverCard key={`${block.id || blockIdx}-${day}`}>
                    <HoverCardTrigger asChild>
                      <div
                        className={cn(
                          "absolute inset-x-2 rounded-xl p-3 transition-all duration-200 cursor-pointer group",
                          "bg-gradient-to-br from-surface-container-high to-surface-container",
                          "border shadow-[var(--elevation-2)]",
                          "hover:shadow-[var(--elevation-4)] hover:scale-[1.02]",
                          block.conflict
                            ? "border-destructive/50 border-l-4 border-l-destructive bg-destructive/5"
                            : "border-primary/20"
                        )}
                        style={{ top: `${top}%`, height: `${height}%` }}
                      >
                        {/* Conflict indicator */}
                        {block.conflict && (
                          <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                        )}

                        {/* Course code badge */}
                        <Badge 
                          variant={block.conflict ? "destructive" : "default"}
                          className="absolute top-2 right-2 text-[10px] px-1.5 py-0"
                        >
                          {block.code}
                        </Badge>

                        {/* Course title */}
                        <p className={cn(
                          "font-semibold pr-16 mb-1",
                          isCompact ? "text-xs line-clamp-1" : "text-sm line-clamp-2"
                        )}>
                          {block.title || block.code}
                        </p>

                        {/* Time */}
                        <p className="text-xs text-muted-foreground font-mono">
                          {block.startTime} - {block.endTime}
                        </p>

                        {/* Location (only if enough space) */}
                        {!isCompact && block.location && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 line-clamp-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {block.location}
                          </p>
                        )}
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80" side="right">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-base">{block.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {block.code}
                          {block.classNumber && ` • #${block.classNumber}`}
                        </p>
                        <Separator />
                        <div className="text-sm space-y-1">
                          <p>
                            <strong>Time:</strong> {block.startTime} - {block.endTime}
                          </p>
                          {block.instructor && (
                            <p>
                              <strong>Instructor:</strong> {block.instructor}
                            </p>
                          )}
                          {block.location && (
                            <p>
                              <strong>Location:</strong> {block.location}
                            </p>
                          )}
                          <p>
                            <strong>Credits:</strong> {block.credits}
                          </p>
                        </div>
                        {block.notes && (
                          <>
                            <Separator />
                            <p className="text-xs text-muted-foreground">{block.notes}</p>
                          </>
                        )}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
const Scheduler = () => {
  const navigate = useNavigate();
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = useAdminStatus(user);

  const [step, setStep] = useState<Step>("intro");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [courseCatalog, setCourseCatalog] = useState<CourseInput[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);

  const [displayMessages, setDisplayMessages] = useState<AiChatMessage[]>([]);
  const [geminiMessages, setGeminiMessages] = useState<GeminiMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [candidateProposal, setCandidateProposal] = useState<AiScheduleProposal | null>(null);
  const [acceptedSchedule, setAcceptedSchedule] = useState<GeneratedSchedule | null>(null);
  const [acceptedNotes, setAcceptedNotes] = useState<string>("");

  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Load saved schedule when scheduleId is present
  useEffect(() => {
    if (!scheduleId || !user) return;

    const loadSavedSchedule = async () => {
      try {
        // Fetch the saved schedule
        const { data: savedSchedule, error } = await supabase
          .from('saved_schedules')
          .select('*')
          .eq('id', scheduleId)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        if (!savedSchedule) return;

        // Fetch the schedule courses
        const { data: courses, error: coursesError } = await supabase
          .from('schedule_courses')
          .select('*')
          .eq('schedule_id', scheduleId)
          .order('display_order', { ascending: true });

        if (coursesError) throw coursesError;

        // Transform courses to CourseInput format
        const transformedCourses = courses.map(course => ({
          id: course.id,
          code: course.course_code,
          title: course.course_title,
          classNumber: course.class_number || "",
          days: course.days,
          startTime: course.start_time,
          endTime: course.end_time,
          location: course.location || "",
          instructor: course.instructor || "",
          credits: Number(course.credits) || 3,
          notes: course.notes,
        }));

        // Build the schedule
        const schedule = buildScheduleFromCourses(
          transformedCourses,
          DEFAULT_PREFERENCES,
        );

        // Update state to display the schedule
        setAcceptedSchedule(schedule);
        setAcceptedNotes(savedSchedule.schedule_name || "");
        
        // Set the candidate proposal so user can continue chatting
        setCandidateProposal({
          courses: transformedCourses,
          notes: savedSchedule.notes,
        });

        // Set the course catalog for AI context
        setCourseCatalog(transformedCourses);
        setStep("chat");

      } catch (error) {
        console.error('Error loading saved schedule:', error);
        toast({
          title: "Failed to load schedule",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    };

    loadSavedSchedule();
  }, [scheduleId, user, toast]);

  const candidatePreview = useMemo(() => {
    if (!candidateProposal?.courses.length) return null;
    return buildScheduleFromCourses(candidateProposal.courses, DEFAULT_PREFERENCES);
  }, [candidateProposal]);

  const candidateBounds = useMemo(
    () => computeScheduleBounds(candidatePreview),
    [candidatePreview],
  );
  const candidateDuration = useMemo(
    () => computeScheduleDuration(candidateBounds),
    [candidateBounds],
  );

  const acceptedBounds = useMemo(
    () => computeScheduleBounds(acceptedSchedule),
    [acceptedSchedule],
  );
  const acceptedDuration = useMemo(
    () => computeScheduleDuration(acceptedBounds),
    [acceptedBounds],
  );

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [displayMessages, isSending]);

  useEffect(() => {
    if (step !== "chat") return;
    if (!courseCatalog.length) return;
    if (geminiMessages.length) return;

    const baseMessages: GeminiMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Here is the course catalog JSON: ${JSON.stringify(
          courseCatalog,
        )}. Greet the student and ask what they would like to take.`,
      },
    ];

    setGeminiMessages(baseMessages);
    setDisplayMessages([]);
    setCandidateProposal(null);
    setAiError(null);
  }, [step, courseCatalog, geminiMessages.length]);

  useEffect(() => {
    if (step !== "chat") return;
    if (!geminiMessages.length) return;

    const last = geminiMessages[geminiMessages.length - 1];
    if (last.role !== "user") return;

    let cancelled = false;

    const send = async () => {
      setIsSending(true);
      try {
        const reply = await GeminiClient.chat(geminiMessages);
        if (cancelled) return;

        setGeminiMessages(prev => [...prev, { role: "model", content: reply }]);
        setDisplayMessages(prev => [...prev, { role: "assistant", content: reply }]);

        const proposal = extractScheduleProposal(reply);
        if (proposal?.courses.length) {
          setCandidateProposal(proposal);
        }
        setAiError(null);
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "We couldn't reach the Gemini service. Please try again.";
        setAiError(message);
        toast({
          title: "AI assistant unavailable",
          description: message,
          variant: "destructive",
        });
      } finally {
        if (!cancelled) {
          setIsSending(false);
        }
      }
    };

    send();

    return () => {
      cancelled = true;
    };
  }, [geminiMessages, step, toast]);

  const handleStart = () => setStep("upload");

  const handleReset = () => {
    setStep("intro");
    setUploadedFileName(null);
    setCourseCatalog([]);
    setDisplayMessages([]);
    setGeminiMessages([]);
    setCandidateProposal(null);
    setAcceptedSchedule(null);
    setAcceptedNotes("");
    setUserInput("");
    setAiError(null);
  };

  const parseFile = useCallback(
    async (file: File) => {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

      if (extension === "xlsx" || extension === "xls") {
        return parseSpreadsheetCourses(file);
      }

      const text = await file.text();

      if (extension === "csv" || file.type === "text/csv") {
        return parseCsvWithGemini(file.name, text);
      }

      if (extension === "json" || file.type === "application/json") {
        return parseJsonWithGemini(file.name, text);
      }

      if (extension === "tsv" || file.type === "text/tab-separated-values") {
        const tabRows = text
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean)
          .map(line => line.split(/\t+/).map(cell => normalizeSheetCell(cell)));
        const preview = buildSheetPreview(file.name, tabRows);
        if (!preview) return [];
        return parseWithGemini([preview]);
      }

      return parsePlainTextWithGemini(file.name, text);
    },
    [],
  );

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      setIsParsingFile(true);
      try {
        const parsed = await parseFile(file);
        if (!parsed.length) {
          throw new Error(
            "No courses detected. Please ensure the file contains course schedule information.",
          );
        }

        setCourseCatalog(parsed);
        setUploadedFileName(file.name);
        setStep("chat");
        toast({
          title: "Course list ready",
          description: `${parsed.length} course${parsed.length === 1 ? "" : "s"} loaded for planning.`,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "We couldn't read that file. Please try again.";
        toast({
          title: "Upload failed",
          description: message,
          variant: "destructive",
        });
      } finally {
        setIsParsingFile(false);
      }
    },
    [parseFile, toast],
  );

  const handleSendMessage = useCallback(() => {
    if (!userInput.trim()) return;
    const message = userInput.trim();
    setDisplayMessages(prev => [...prev, { role: "user", content: message }]);
    setGeminiMessages(prev => [...prev, { role: "user", content: message }]);
    setUserInput("");
  }, [userInput]);

  const handleAcceptSchedule = async () => {
    if (!candidateProposal?.courses.length || !user) {
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to save your schedule.",
          variant: "destructive",
        });
      }
      return;
    }
    
    const schedule = buildScheduleFromCourses(
      candidateProposal.courses,
      DEFAULT_PREFERENCES,
    );
    
    setAcceptedSchedule(schedule);
    setAcceptedNotes(candidateProposal.notes ?? "");
    
    try {
      // Save to database
      const { data: savedSchedule, error } = await supabase
        .from('saved_schedules')
        .insert({
          user_id: user.id,
          schedule_name: `Schedule ${new Date().toLocaleDateString()}`,
          courses: candidateProposal.courses,
          conflicts: schedule.conflicts,
          summary: schedule.summary,
          notes: candidateProposal.notes,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert individual courses
      const coursesToInsert = candidateProposal.courses.map((course, index) => ({
        schedule_id: savedSchedule.id,
        course_code: course.code,
        course_title: course.title,
        class_number: course.classNumber,
        days: course.days,
        start_time: course.startTime,
        end_time: course.endTime,
        location: course.location,
        instructor: course.instructor,
        credits: course.credits,
        notes: course.notes,
        display_order: index,
      }));

      const { error: coursesError } = await supabase
        .from('schedule_courses')
        .insert(coursesToInsert);

      if (coursesError) throw coursesError;

      toast({
        title: "Schedule Saved!",
        description: "Your schedule has been saved and is now visible on your dashboard.",
      });
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: "Failed to save schedule",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const summaryCourses = courseCatalog.slice(0, 6);
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <Navigation
        user={user}
        isAdmin={isAdmin}
        onAdminClick={() => {}}
        onLoginClick={() => navigate("/")}
      />

      <div className="container mx-auto px-6 pt-24 pb-12">
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(scheduleId ? "/dashboard" : "/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {scheduleId ? "Back to Dashboard" : "Back to Home"}
          </Button>
        </div>

        {scheduleId && acceptedSchedule && (
          <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg max-w-5xl mx-auto">
            <p className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              📅 Viewing saved schedule: {acceptedNotes || "Unnamed Schedule"}
            </p>
          </div>
        )}

        <div className="max-w-5xl mx-auto text-center space-y-10 animate-fade-in">
          <div className="inline-block">
            <h1 className="text-display-large font-bold text-foreground mb-6">
              AI Course Scheduler
            </h1>
            <div className="h-1 w-24 bg-primary mx-auto" />
          </div>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Collaborate with Gemini to design a personalised, conflict-aware semester plan. Upload your catalog, answer a few conversational prompts, and approve the schedule when it feels just right.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-3 justify-center">
          <StepBadge label="Overview" active={step === "intro"} icon={Sparkles} />
          <StepBadge label="Upload" active={step === "upload"} icon={FileSpreadsheet} />
          <StepBadge label="Plan" active={step === "chat"} icon={MessagesSquare} />
        </div>

        {step === "intro" && (
          <Card className="mt-12 bg-background/70 backdrop-blur-xl border border-primary/20 shadow-2xl max-w-4xl mx-auto">
            <CardHeader className="space-y-4 text-left">
              <CardTitle className="text-3xl flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-primary" />
                Plan your semester in minutes
              </CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Click below to start a guided, step-by-step experience. Kairos will review your course catalog, ask about your goals, and produce a weekly schedule you can tweak until it's perfect.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-wrap gap-4">
              <Button
                size="lg"
                variant="default"
                className="shadow-[var(--elevation-2)]"
                onClick={handleStart}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Schedule this semester's courses
              </Button>
              {authLoading ? null : user ? (
                <Badge variant="secondary" className="uppercase tracking-wide">
                  Signed in as {user.email ?? "student"}
                </Badge>
              ) : (
                <CardDescription className="text-sm">
                  Optional: sign in from the header to sync plans later.
                </CardDescription>
              )}
            </CardFooter>
          </Card>
        )}

        {step === "upload" && (
          <div className="mt-12 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <Card className="bg-background/70 backdrop-blur-xl border border-primary/20 shadow-2xl">
              <CardHeader className="text-left space-y-2">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Upload className="h-5 w-5 text-primary" /> Upload your course list
                </CardTitle>
                <CardDescription>
                  Accepts CSV, XLSX, or JSON exports. We'll parse the essentials like days, meeting times, instructors, and class numbers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isParsingFile && (
                  <div className="rounded-xl border border-primary/40 bg-primary/5 p-6">
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <div className="text-left">
                        <p className="font-semibold text-foreground">Processing your file...</p>
                        <p className="text-sm text-muted-foreground">Analyzing course catalog with AI</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-6">
                  <Label className="text-sm font-medium">Select a file to begin</Label>
                  <Input
                    type="file"
                    accept=".csv,.json,.xlsx,.xls"
                    className="mt-3 bg-background/70"
                    onChange={handleFileUpload}
                    disabled={isParsingFile}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Column names recognised: code, title, class_number, days, start_time, end_time, instructor, location, credits, notes.
                  </p>
                </div>

                <div className="space-y-3 text-left">
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Tips
                  </p>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>• Include every potential section so the AI can suggest the best fit.</li>
                    <li>• Times can be in 24-hour or 12-hour format—we'll normalise them automatically.</li>
                    <li>• You can always re-upload if you need to update the catalog.</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={handleReset} disabled={isParsingFile}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Start over
                </Button>
              </CardFooter>
            </Card>

            <Card className="bg-background/60 border border-white/10">
              <CardHeader className="space-y-1 text-left">
                <CardTitle className="text-lg">What happens next?</CardTitle>
                <CardDescription>
                  Once the file is parsed, Kairos will greet you and ask what you want to take. Answer naturally and the AI will build a schedule you can approve.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-left text-sm text-muted-foreground">
                <p>We'll only read the file locally in your browser before sending the structured data to Gemini with your permission.</p>
                <p>If you need a template, export your university's registration list as CSV or Excel.</p>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "chat" && (
          <div className="mt-12 grid gap-8 xl:grid-cols-[1.4fr_1fr]">
            <Card className="bg-background/70 backdrop-blur-xl border border-primary/20 shadow-2xl flex flex-col">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-left">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <MessagesSquare className="h-5 w-5 text-primary" /> Talk to Kairos
                  </CardTitle>
                  <CardDescription>
                    Share your goals, time preferences, and anything else the AI should consider. When a plan is ready, it'll appear on the right.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {uploadedFileName && (
                    <Badge variant="secondary" className="uppercase tracking-wide">
                      {uploadedFileName}
                    </Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Re-upload courses
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                {summaryCourses.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-background/60 p-4 text-left">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                      Sample from your catalog
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {summaryCourses.map(course => (
                        <Badge key={course.id} variant="outline" className="text-xs">
                          {course.code || course.title} {course.classNumber ? `• ${course.classNumber}` : ""}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div
                  ref={chatScrollRef}
                  className="flex-1 rounded-xl border border-white/10 bg-background/60 p-4 space-y-4 overflow-y-auto max-h-[28rem]"
                >
                  {displayMessages.length === 0 && !isSending ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Kairos is reading your catalog and will start the conversation shortly.
                    </div>
                  ) : (
                    displayMessages.map((message, index) => (
                      <ChatBubble key={index} message={message} />
                    ))
                  )}
                  {isSending && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-background/70 px-4 py-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Thinking...
                      </div>
                    </div>
                  )}
                </div>
                {aiError && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4" /> {aiError}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                {acceptedSchedule && (
                  <div className="w-full rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Schedule saved! You can continue chatting to request changes.
                    </p>
                  </div>
                )}
                <Textarea
                  value={userInput}
                  onChange={event => setUserInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={acceptedSchedule ? "Request changes or ask for suggestions..." : "Tell Kairos which classes you need, your ideal days, breaks, or any constraints."}
                  className="min-h-[90px]"
                  disabled={isSending}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Press Enter to send, or Shift + Enter for a new line.
                  </p>
                  <Button onClick={handleSendMessage} disabled={isSending || !userInput.trim()}>
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" /> Send message
                      </>
                    )}
                  </Button>
                </div>
              </CardFooter>
            </Card>

            <div className="space-y-6">
              {candidatePreview ? (
                <Card className="bg-background/70 border border-primary/20 shadow-2xl">
                  <CardHeader className="text-left space-y-2">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <CheckCircle2 className="h-5 w-5 text-primary" /> Proposed schedule
                    </CardTitle>
                    <CardDescription>
                      Review Kairos' latest suggestion. Accept it to pin the plan below, or continue the chat to request changes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {candidateProposal?.notes && (
                      <div className="rounded-lg border border-white/10 bg-background/60 p-4 text-sm text-left text-muted-foreground">
                        {candidateProposal.notes}
                      </div>
                    )}
                    {candidatePreview.conflicts.length > 0 && (
                      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-left text-sm text-destructive">
                        Gemini spotted {candidatePreview.conflicts.length} potential conflict{candidatePreview.conflicts.length === 1 ? "" : "s"}. Ask for adjustments or edit manually after accepting.
                      </div>
                    )}
                    <ScheduleGrid
                      schedule={candidatePreview}
                      bounds={candidateBounds}
                      duration={candidateDuration}
                    />
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button onClick={handleAcceptSchedule} disabled={!user}>
                      <Save className="mr-2 h-4 w-4" /> {acceptedSchedule ? "Save Changes" : "Save Schedule"}
                    </Button>
                    {!user && (
                      <p className="text-xs text-muted-foreground ml-2">Sign in to save</p>
                    )}
                  </CardFooter>
                </Card>
              ) : (
                <Card className="bg-background/60 border border-dashed border-primary/30">
                  <CardHeader className="text-left">
                    <CardTitle className="text-lg">Waiting for a proposal</CardTitle>
                    <CardDescription>
                      Keep the conversation going. When Kairos has a complete plan, it will appear here for review.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>
          </div>
        )}

        {acceptedSchedule && (
          <div className="mt-16 space-y-8">
            <Card className="bg-background/70 backdrop-blur-xl border border-primary/20">
              <CardHeader className="text-left">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" /> Your confirmed schedule
                </CardTitle>
                <CardDescription>
                  {acceptedSchedule.summary.totalCredits} credits • {acceptedSchedule.summary.totalMeetings} weekly meetings • {acceptedSchedule.summary.averageDailyHours} average hours per day
                </CardDescription>
              </CardHeader>
              {acceptedNotes && (
                <CardContent>
                  <div className="rounded-lg border border-white/10 bg-background/60 p-4 text-left text-sm text-muted-foreground">
                    {acceptedNotes}
                  </div>
                </CardContent>
              )}
            </Card>

            {acceptedSchedule.conflicts.length > 0 && (
              <Card className="border-destructive/40 bg-destructive/10">
                <CardHeader className="text-left">
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" /> Potential conflicts to review
                  </CardTitle>
                  <CardDescription>
                    Resolve or confirm these overlaps before final registration.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {acceptedSchedule.conflicts.map((conflict, index) => (
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

            <ScheduleGrid
              schedule={acceptedSchedule}
              bounds={acceptedBounds}
              duration={acceptedDuration}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Scheduler;
