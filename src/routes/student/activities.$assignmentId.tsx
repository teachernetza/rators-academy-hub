import { useState, useEffect } from "react";
import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGuard } from "@/components/role-guard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ArrowLeft, Send, Loader2, MessageCircle } from "lucide-react";
import { getAssignmentForStudent, submitAssignment } from "@/lib/activities.functions";
import { StatusBadge } from "@/components/activities/status-badge";
import { SectionResponseInput } from "@/components/activities/section-response";
import { toast } from "sonner";

export const Route = createFileRoute("/student/activities/$assignmentId")({
  component: StudentDetailGuard,
});

function StudentDetailGuard() {
  const { assignmentId } = useParams({ strict: false }) as { assignmentId: string };
  return (
    <RoleGuard role="student">
      <Detail id={assignmentId} />
    </RoleGuard>
  );
}

function Detail({ id }: { id: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchOne = useServerFn(getAssignmentForStudent);
  const submitFn = useServerFn(submitAssignment);

  const q = useQuery({ queryKey: ["assignment", id], queryFn: () => fetchOne({ data: { id } }) });

  const [responses, setResponses] = useState<Record<string, any>>({});
  const [teacherId, setTeacherId] = useState<string>("");

  useEffect(() => {
    if (!q.data) return;
    const initial: Record<string, any> = {};
    (q.data.sections ?? []).forEach((s: any) => {
      const last = q.data.lastResponses.find((r: any) => r.section_id === s.id);
      initial[s.id] = last?.response ?? {};
    });
    setResponses(initial);
    setTeacherId(q.data.lastSubmission?.submitted_to ?? q.data.teachers[0]?.id ?? "");
  }, [q.data]);

  const submitM = useMutation({
    mutationFn: () =>
      submitFn({
        data: {
          assignment_id: id,
          teacher_id: teacherId,
          responses: Object.entries(responses).map(([section_id, response]) => ({ section_id, response })),
        },
      }),
    onSuccess: () => {
      toast.success("Actividad enviada para revisión");
      qc.invalidateQueries({ queryKey: ["assignments", "mine"] });
      navigate({ to: "/student/activities" as any });
    },
    onError: (e: any) => toast.error(e.message ?? "Error al enviar"),
  });

  if (q.isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (q.error) return <p className="text-destructive">{(q.error as any).message}</p>;
  const { assignment, activity, sections, lastResponses } = q.data!;
  const canSubmit = assignment.status === "pending" || assignment.status === "changes_requested";
  const readOnly = assignment.status === "in_review" || assignment.status === "approved";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Link to={"/student/activities" as any} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />Mis actividades
        </Link>
        <StatusBadge status={assignment.status} />
      </div>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">{activity?.title}</h1>
            {activity?.description && (
              <p className="mt-2 text-sm text-muted-foreground">{activity.description}</p>
            )}
          </div>
          <span className="rounded-md bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
            {activity?.cefr_level}
          </span>
        </div>
      </Card>

      <div className="space-y-4">
        {sections.map((s: any, i: number) => {
          const lastR = lastResponses.find((r: any) => r.section_id === s.id);
          const teacherComment = lastR?.teacher_comment;
          const showComment =
            teacherComment && (assignment.status === "changes_requested" || assignment.status === "approved");
          return (
            <Card key={s.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Sección {i + 1}</p>
                  <h3 className="font-heading text-lg font-bold">{s.title}</h3>
                  {s.instructions && <p className="mt-1 text-sm text-muted-foreground">{s.instructions}</p>}
                </div>
                {lastR && <StatusBadge status={lastR.section_status} />}
              </div>
              {showComment && (
                <div className="flex gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm">
                  <MessageCircle className="h-4 w-4 shrink-0 text-warning-foreground" />
                  <div>
                    <p className="font-semibold">Observación del maestro</p>
                    <p className="mt-1 whitespace-pre-wrap">{teacherComment}</p>
                  </div>
                </div>
              )}
              <SectionResponseInput
                section={s}
                value={responses[s.id]}
                onChange={(v) => setResponses({ ...responses, [s.id]: v })}
                disabled={readOnly}
              />
            </Card>
          );
        })}
      </div>

      {canSubmit && (
        <Card className="p-5 space-y-3">
          <h3 className="font-heading text-lg font-bold">Enviar para revisión</h3>
          <div className="space-y-1.5">
            <Label>Maestro destinatario</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger><SelectValue placeholder="Selecciona un maestro" /></SelectTrigger>
              <SelectContent>
                {q.data!.teachers.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => submitM.mutate()} disabled={!teacherId || submitM.isPending}>
            {submitM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Send className="mr-2 h-4 w-4" />Enviar
          </Button>
        </Card>
      )}
      {assignment.status === "in_review" && (
        <Card className="p-5 text-sm text-muted-foreground">
          Tu entrega está siendo revisada. Recibirás retroalimentación pronto.
        </Card>
      )}
    </div>
  );
}
