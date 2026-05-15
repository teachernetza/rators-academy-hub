import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGuard } from "@/components/role-guard";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle } from "lucide-react";
import { getMyProgress } from "@/lib/student-course.functions";

export const Route = createFileRoute("/student/progress")({
  component: () => <RoleGuard role="student"><Page /></RoleGuard>,
});

function Page() {
  const fn = useServerFn(getMyProgress);
  const q = useQuery({ queryKey: ["my-progress"], queryFn: () => fn({}) });
  const items = q.data ?? [];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">My Progress</h1>
        <p className="mt-1 text-muted-foreground">Detailed breakdown by course.</p>
      </div>
      {items.map((it: any) => (
        <Card key={it.course?.id} className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold">{it.course?.title}</h2>
            <span className="text-sm font-semibold text-primary">{it.progress}%</span>
          </div>
          <Progress value={it.progress} />
          <div className="space-y-3 pt-2">
            {it.sections.map((s: any) => (
              <div key={s.id}>
                <p className="text-sm font-semibold mb-1">{s.title}</p>
                <div className="space-y-1 pl-2">
                  {s.lessons.map((l: any) => (
                    <div key={l.id} className="flex items-center gap-2 text-sm">
                      {l.completed ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                      <span className={l.completed ? "" : "text-muted-foreground"}>{l.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
      {items.length === 0 && !q.isLoading && (
        <Card className="p-12 text-center text-muted-foreground">Enroll in a course to see your progress.</Card>
      )}
    </div>
  );
}
