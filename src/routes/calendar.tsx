import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGuard } from "@/components/role-guard";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, Clock, Loader2, AlertTriangle } from "lucide-react";
import { listUpcomingForStudent, listUpcomingForTeacher } from "@/lib/calendar.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (!profile) return null;
  if (profile.role === "admin") return <Navigate to="/admin/dashboard" />;
  return (
    <RoleGuard role={profile.role}>
      <Inner isTeacher={profile.role === "teacher"} />
    </RoleGuard>
  );
}

function Inner({ isTeacher }: { isTeacher: boolean }) {
  const sFn = useServerFn(listUpcomingForStudent);
  const tFn = useServerFn(listUpcomingForTeacher);
  const q = useQuery({
    queryKey: ["calendar", isTeacher ? "teacher" : "student"],
    queryFn: () => (isTeacher ? tFn({ data: { days: 90 } }) : sFn({ data: { days: 90 } })),
  });
  const [view, setView] = useState<"list" | "month">("list");
  const [month, setMonth] = useState<Date>(new Date());

  const items = q.data ?? [];
  const now = Date.now();

  const dayMap = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const it of items) {
      const key = new Date(it.due_date).toDateString();
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(it);
    }
    return m;
  }, [items]);

  const markedDates = useMemo(() => items.map((i: any) => new Date(i.due_date)), [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold">Calendar</h1>
          <p className="mt-1 text-muted-foreground">
            {isTeacher ? "Deadlines across your courses." : "Your upcoming lesson deadlines."}
          </p>
        </div>
        <div className="flex gap-1 rounded-md border border-border p-1">
          <Button size="sm" variant={view === "list" ? "default" : "ghost"} onClick={() => setView("list")}>List</Button>
          <Button size="sm" variant={view === "month" ? "default" : "ghost"} onClick={() => setView("month")}>Month</Button>
        </div>
      </div>

      {q.isLoading && <Card className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></Card>}

      {!q.isLoading && view === "list" && (
        <div className="space-y-3">
          {items.map((it: any) => {
            const due = new Date(it.due_date).getTime();
            const overdue = due < now;
            const soon = !overdue && due - now < 86400000 * 3;
            return (
              <Card key={it.id} className={cn("p-4 flex items-center gap-4", overdue && "border-destructive/50")}>
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  overdue ? "bg-destructive/10 text-destructive" : soon ? "bg-amber-500/10 text-amber-600" : "bg-accent text-primary",
                )}>
                  {overdue ? <AlertTriangle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{it.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {it.course_title} · <span className="capitalize">{it.type}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-semibold", overdue ? "text-destructive" : soon ? "text-amber-600" : "text-foreground")}>
                    {new Date(it.due_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(it.due_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                {!isTeacher && it.course_id && (
                  <Link to="/student/courses/$courseId" params={{ courseId: it.course_id }}>
                    <Button size="sm" variant="outline">Open</Button>
                  </Link>
                )}
              </Card>
            );
          })}
          {!q.isLoading && items.length === 0 && (
            <Card className="p-12 text-center text-muted-foreground">
              <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No upcoming deadlines.
            </Card>
          )}
        </div>
      )}

      {!q.isLoading && view === "month" && (
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <Card className="p-3 w-fit">
            <Calendar
              mode="single"
              month={month}
              onMonthChange={setMonth}
              modifiers={{ due: markedDates }}
              modifiersClassNames={{ due: "bg-primary/20 text-primary font-bold rounded-md" }}
            />
          </Card>
          <Card className="p-5">
            <h3 className="font-heading font-semibold mb-3">
              {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })} deadlines
            </h3>
            <div className="space-y-2">
              {Array.from(dayMap.entries())
                .filter(([k]) => {
                  const d = new Date(k);
                  return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
                })
                .map(([k, list]) => (
                  <div key={k} className="rounded-lg border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                      {new Date(k).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                    </p>
                    {list.map((it: any) => (
                      <div key={it.id} className="flex items-center justify-between py-1">
                        <span className="text-sm">{it.title}</span>
                        <Badge variant="secondary" className="text-[10px] capitalize">{it.type}</Badge>
                      </div>
                    ))}
                  </div>
                ))}
              {Array.from(dayMap.keys()).filter((k) => {
                const d = new Date(k);
                return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
              }).length === 0 && (
                <p className="text-sm text-muted-foreground">Nothing due this month.</p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
