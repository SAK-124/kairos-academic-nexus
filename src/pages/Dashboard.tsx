import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Calendar, TrendingUp, Clock, ArrowRight, CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const StatCard = ({ icon: Icon, title, value, color }: { 
  icon: any; 
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
  const [stats, setStats] = useState({
    totalNotes: 0,
    recentNotes: [] as any[],
  });
  const [savedSchedules, setSavedSchedules] = useState<any[]>([]);

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
        .from('notes')
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
      const { data, error } = await supabase
        .from('saved_schedules')
        .select('id, schedule_name, summary, created_at, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (data) setSavedSchedules(data);
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
                <CardContent>
                  <div className="space-y-3">
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
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      View Schedule
                    </Button>
                  </div>
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
