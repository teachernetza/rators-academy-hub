import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { RoleGuard } from "@/components/role-guard";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GradeDialog } from "@/components/grade-dialog";
import { teacherListSubmissions } from "@/lib/grading.functions";
import { ClipboardList } from "lucide-react";

export const Route = createFileRoute("/teacher/grading")({
  component: () => <RoleGuard role="teacher"><Page /></RoleGuard>,
});

function Page() {
  const [tab, setTab] = useState<"pending" | "graded">("pending");
  const fn = useServerFn(teacherListSubmissions);
  const subs = useQuery({
    queryKey: ["teacher-submissions", tab],
    queryFn: () => fn({ data: { status: tab } }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Pending Reviews</h1>
        <p className="mt-1 text-muted-foreground">Grade activity submissions from your students.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="graded">Graded</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4 space-y-3">
          <SubmissionList subs={subs.data ?? []} pending />
        </TabsContent>
        <TabsContent value="graded" className="mt-4 space-y-3">
          <SubmissionList subs={subs.data ?? []} pending={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SubmissionList({ subs, pending }: { subs: any[]; pending: boolean }) {
  if (subs.length === 0) {
    return (
      <Card className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
        <ClipboardList className="h-8 w-8 text-primary/40" />
        {pending ? "No pending submissions. Nice work!" : "No graded submissions yet."}
      </Card>
    );
  }
  return (
    <>
      {subs.map((s) => (
        <Card key={s.id} className="p-5 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium truncate">{s.student_name}</p>
              <Badge variant="secondary" className="text-xs">{s.course_title}</Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">{s.lesson_title}</p>
            <p className="text-xs text-muted-foreground mt-1">Submitted {new Date(s.submitted_at).toLocaleString()}</p>
          </div>
          {!pending && s.grade != null && (
            <div className="text-right">
              <p className="text-2xl font-heading font-bold text-primary">{s.grade}</p>
              <p className="text-xs text-muted-foreground">/ 100</p>
            </div>
          )}
          <GradeDialog submission={s} trigger={<Button variant={pending ? "default" : "outline"} size="sm">{pending ? "Grade" : "Review"}</Button>} />
        </Card>
      ))}
    </>
  );
}
