import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Calendar, Clock, ArrowRight, CalendarDays } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

type DashboardCourse = {
  id?: string;
  code: string;
  title: string;
  days: string[] | string;
  startTime: string;
  endTime: string;
  location?: string;
  instructor?: string;
  credits?: number;
  notes?: string;
  classNumber?: string;
};

type SavedSchedule = {
  id: string;
  schedule_name: string;
  created_at: string;
  summary: {
    totalCredits: number;
    totalMeetings: number;
    averageDailyHours: number;
  };
  courses: DashboardCourse[];
};

type PreviewBlock = DashboardCourse & { day: string };

type DashboardStats = {
  totalNotes: number;
  recentNotes: RecentNote[];
};

type RecentNote = {
  id: string;
  title: string | null;
  updated_at: string;
};

type SavedScheduleRow = {
  id: string;
  schedule_name: string;
  created_at: string;
  summary: SavedSchedule["summary"] | null;
  courses: DashboardCourse[] | null;
  is_active: boolean | null;
};

const normalizeDayName = (day: string) => {
  const trimmed = day?.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  const abbreviations: Record<string, string> = {
    mon: "Monday",
    tue: "Tuesday",
    tues: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    thur: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday",
  };

  const directMatch = DAY_NAMES.find((dayName) => dayName.toLowerCase() === lower);
  if (directMatch) return directMatch;

  const abbrMatch = abbreviations[lower.slice(0, 3)];
  return abbrMatch ?? null;
};

const toArray = (days: DashboardCourse["days"]) => {
  if (Array.isArray(days)) return days;
  if (typeof days === "string") {
    return days
      .split(/[,&/]+/)
      .map((d) => d.trim())
      .filter(Boolean);
  }
  return [];
};

const timeStringToMinutes = (value: string) => {
  if (!value) return 0;
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

const formatMinutesToTime = (minutes: number) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

const buildBlocksByDay = (courses: DashboardCourse[]) => {
  const blocks: Record<string, PreviewBlock[]> = {};
  DAY_NAMES.forEach((day) => {
    blocks[day] = [];
  });

  courses?.forEach((course) => {
    const courseDays = toArray(course.days);
    courseDays.forEach((day) => {
      const normalized = normalizeDayName(day);
      if (!normalized) return;
      blocks[normalized] = blocks[normalized] || [];
      blocks[normalized].push({ ...course, day: normalized });
    });
  });

  DAY_NAMES.forEach((day) => {
    blocks[day]?.sort((a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime));
  });

  return blocks;
};

const computeBounds = (courses: DashboardCourse[]) => {
  if (!courses?.length) {
    return { start: 8 * 60, end: 17 * 60 };
  }

  let minStart = Number.POSITIVE_INFINITY;
  let maxEnd = Number.NEGATIVE_INFINITY;

  courses.forEach((course) => {
    const start = timeStringToMinutes(course.startTime);
    const end = timeStringToMinutes(course.endTime);
    if (start > 0) minStart = Math.min(minStart, start);
    if (end > 0) maxEnd = Math.max(maxEnd, end);
  });

  if (!Number.isFinite(minStart) || !Number.isFinite(maxEnd)) {
    return { start: 8 * 60, end: 17 * 60 };
  }

  const padding = 30;
  return {
    start: Math.max(6 * 60, minStart - padding),
    end: Math.min(22 * 60, maxEnd + padding),
  };
};

const SchedulePreview = ({ courses }: { courses: DashboardCourse[] }) => {
  const blocksByDay = buildBlocksByDay(courses);
  const bounds = computeBounds(courses);
  const duration = Math.max(bounds.end - bounds.start, 60);

  const timeLabels: string[] = [];
  const startHour = Math.floor(bounds.start / 60);
  const endHour = Math.ceil(bounds.end / 60);

  for (let hour = startHour; hour <= endHour; hour++) {
    timeLabels.push(formatMinutesToTime(hour * 60));
  }

  const hourHeight = 64;
  const totalHeight = Math.max(timeLabels.length * hourHeight, 320);

  return (
    <div className="rounded-2xl border border-border/30 bg-surface-container-low/80 shadow-[var(--elevation-2)] overflow-hidden">
      <div className="grid grid-cols-[5rem_repeat(7,minmax(0,1fr))] border-b border-border/20 bg-surface-container">
        <div className="h-full border-r border-border/20" />
        {DAY_NAMES.map((day) => {
          const blocks = blocksByDay[day] ?? [];
          return (
            <div key={day} className="px-2 py-3 text-center border-r border-border/10 last:border-r-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{day.slice(0, 3)}</p>
              <p className="text-[11px] font-medium text-muted-foreground/80">
                {blocks.length === 0 ? "Free" : `${blocks.length}×`}
              </p>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-[5rem_repeat(7,minmax(0,1fr))] text-xs">
        <div className="border-r border-border/20 bg-surface-container">
          <div className="relative" style={{ height: `${totalHeight}px` }}>
            {timeLabels.map((time, idx) => (
              <div
                key={time}
                className="absolute inset-x-0 text-[11px] font-medium text-muted-foreground font-mono text-center -translate-y-1/2"
                style={{ top: `${idx * hourHeight}px` }}
              >
                {time}
              </div>
            ))}
          </div>
        </div>
        {DAY_NAMES.map((day) => {
          const blocks = blocksByDay[day] ?? [];
          return (
            <div
              key={day}
              className="relative border-r border-border/10 last:border-r-0 bg-background/30"
              style={{ height: `${totalHeight}px` }}
            >
              {timeLabels.map((_, idx) => (
                <div
                  key={idx}
                  className="absolute left-0 right-0 border-t border-border/10"
                  style={{ top: `${idx * hourHeight}px` }}
                />
              ))}
              {blocks.map((block, blockIdx) => {
                const start = timeStringToMinutes(block.startTime);
                const end = timeStringToMinutes(block.endTime);
                if (start === 0 && end === 0) return null;
                const top = ((start - bounds.start) / duration) * 100;
                const height = Math.max(((end - start) / duration) * 100, 8);

                return (
                  <div
                    key={`${block.id || blockIdx}-${day}`}
                    className="absolute inset-x-2 flex h-full flex-col justify-between rounded-xl border border-primary/35 bg-primary/25 px-2 py-2 text-center text-primary-foreground shadow-[0_12px_28px_-24px_rgba(59,130,246,0.8)]"
                    style={{ top: `${top}%`, height: `${height}%` }}
                    title={`${block.title || block.code} • ${block.startTime} - ${block.endTime}`}
                  >
                    <div className="flex flex-1 flex-col items-center justify-center gap-1">
                      <p className="text-[11px] font-semibold leading-tight">{block.title || block.code}</p>
                      {block.code && (
                        <p className="text-[10px] font-medium uppercase tracking-wide text-primary-foreground/80">
                          {block.code}
                        </p>
                      )}
                    </div>
                    <p className="text-[10px] font-mono font-semibold text-primary-foreground/80">
                      {block.startTime} – {block.endTime}
                    </p>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, title, value, color }: {
  icon: LucideIcon;
  title: string;
  value: string | number;
  color: string;
}) => (
  <Card className="bg-surface-container hover:shadow-[var(--elevation-2)] transition-shadow">
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`h-12 w-12 rounded-full ${color} bg-opacity-10 flex items-center justify-center`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalNotes: 0,
    recentNotes: [],
  });
  const [savedSchedules, setSavedSchedules] = useState<SavedSchedule[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      // Fetch total notes count
      const { count: notesCount } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch recent notes
      const { data: recentNotes } = await supabase
        .from<RecentNote>('notes')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      setStats({
        totalNotes: notesCount || 0,
        recentNotes: recentNotes || [],
      });
    };

    const fetchSchedules = async () => {
      const { data } = await supabase
        .from<SavedScheduleRow>('saved_schedules')
        .select('id, schedule_name, summary, courses, created_at, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (data) {
        const sanitized = data.map((schedule) => ({
          id: schedule.id,
          schedule_name: schedule.schedule_name,
          created_at: schedule.created_at,
          summary: schedule.summary ?? { totalCredits: 0, totalMeetings: 0, averageDailyHours: 0 },
          courses: (schedule.courses as DashboardCourse[]) ?? [],
        }));
        setSavedSchedules(sanitized);
      }
    };

    fetchStats();
    fetchSchedules();
  }, [user]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-2 text-foreground">
          Welcome back!
        </h1>
        <p className="text-lg text-muted-foreground">
          Here's your academic overview
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard 
          icon={FileText} 
          title="Total Notes" 
          value={stats.totalNotes}
          color="text-blue-500"
        />
        <StatCard 
          icon={Calendar} 
          title="Active Courses" 
          value="—"
          color="text-green-500"
        />
        <StatCard 
          icon={Clock} 
          title="Study Sessions" 
          value="—"
          color="text-purple-500"
        />
      </div>

      {/* Saved Schedules Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-foreground">Your Schedules</h2>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/scheduler')}
            className="gap-2"
          >
            Create New
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        {savedSchedules.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {savedSchedules.map((schedule) => (
              <Card
                key={schedule.id}
                className="bg-surface-container hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                onClick={() => navigate(`/scheduler/${schedule.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{schedule.schedule_name}</CardTitle>
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    {new Date(schedule.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SchedulePreview courses={schedule.courses} />
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-semibold text-primary">{schedule.summary.totalCredits}</div>
                      <div className="text-muted-foreground">Credits</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-primary">{schedule.summary.totalMeetings}</div>
                      <div className="text-muted-foreground">Classes</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-primary">{schedule.summary.averageDailyHours}h</div>
                      <div className="text-muted-foreground">Avg/day</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    View Schedule
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-surface-container">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CalendarDays className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No schedules yet</p>
                <Button onClick={() => navigate('/scheduler')}>
                  Create Your First Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Recent Notes Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-foreground">Recent Notes</h2>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/notes')}
            className="gap-2"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <Card className="bg-surface-container">
          <CardContent className="pt-6">
            {stats.recentNotes.length > 0 ? (
              <div className="space-y-3">
                {stats.recentNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => navigate(`/notes/${note.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">
                          {note.title || 'Untitled Note'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(note.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No notes yet</p>
                <Button onClick={() => navigate('/notes')}>
                  Create Your First Note
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card 
            className="bg-surface-container hover:shadow-[var(--elevation-2)] transition-shadow cursor-pointer"
            onClick={() => navigate('/notes')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Smart Notes</CardTitle>
                  <CardDescription>AI-powered note-taking</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
          <Card 
            className="bg-surface-container hover:shadow-[var(--elevation-2)] transition-shadow cursor-pointer"
            onClick={() => navigate('/scheduler')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Course Scheduler</CardTitle>
                  <CardDescription>Build your schedule</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </section>
    </div>
  );
}
