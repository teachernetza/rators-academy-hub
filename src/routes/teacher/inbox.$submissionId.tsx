import { useState, useEffect } from "react";
import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGuard } from "@/components/role-guard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check, MessageSquareWarning, Loader2 } from "lucide-react";
import {
  getSubmissionForReview, reviewSection, finalizeReview,
} from "@/lib/activities.functions";
import { StatusBadge } from "@/components/activities/status-badge";
import { SectionResponseView } from "@/components/activities/section-response";
import { toast } from "sonner";

export const Route = createFileRoute("/teacher/inbox/$submissionId")({
  component: ReviewPageGuard,
});

function ReviewPageGuard() {
  const { submissionId } = useParams({ strict: false }) as { submissionId: string };
  return (
    <RoleGuard role="teacher">
      <ReviewPage id={submissionId} />
    </RoleGuard>
  );
}

function ReviewPage({ id }: { id: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchOne = useServerFn(getSubmissionForReview);
  const reviewFn = useServerFn(reviewSection);
  const finalizeFn = useServerFn(finalizeReview);

  const q = useQuery({ queryKey: ["submission", id], queryFn: () => fetchOne({ data: { id } }) });
  const [feedback, setFeedback] = useState("");
  const [comments, setComments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (q.data) {
      setFeedback(q.data.submission.overall_feedback ?? "");
      const c: Record<string, string> = {};
      (q.data.responses ?? []).forEach((r: any) => { c[r.id] = r.teacher_comment ?? ""; });
      setComments(c);
    }
  }, [q.data]);

  const reviewM = useMutation({
    mutationFn: (vars: { response_id: string; status: "approved" | "changes_requested"; comment: string }) =>
      reviewFn({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["submission", id] }),
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });

  const finalM = useMutation({
    mutationFn: (decision: "approved" | "changes_requested") =>
      finalizeFn({ data: { submission_id: id, decision, overall_feedback: feedback || null } }),
    onSuccess: (_d, dec) => {
      toast.success(dec === "approved" ? "Actividad aprobada" : "Devuelta al estudiante");
      qc.invalidateQueries({ queryKey: ["teacher", "inbox"] });
      navigate({ to: "/teacher/inbox" as any });
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });

  if (q.isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (q.error) return <p className="text-destructive">{(q.error as any).message}</p>;
  const { activity, sections, responses, student, submission } = q.data!;
  const byId = new Map(responses.map((r: any) => [r.section_id, r]));
  const someChanges = responses.some((r: any) => r.section_status === "changes_requested");
  const isApproved = submission.overall_status === "approved";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Link to={"/teacher/inbox" as any} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />Volver al buzón
        </Link>
        <StatusBadge status={submission.overall_status} />
      </div>

      <Card className="p-6">
        <h1 className="font-heading text-2xl font-bold">{activity?.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {student?.full_name} · Intento #{submission.attempt_number} · {new Date(submission.submitted_at).toLocaleString()}
        </p>
      </Card>

      <div className="space-y-4">
        {sections.map((s: any, i: number) => {
          const r: any = byId.get(s.id);
          return (
            <Card key={s.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Sección {i + 1}</p>
                  <h3 className="font-heading text-lg font-bold">{s.title}</h3>
                  {s.instructions && <p className="mt-1 text-sm text-muted-foreground">{s.instructions}</p>}
                </div>
                {r && <StatusBadge status={r.section_status} />}
              </div>
              {r ? (
                <>
                  <SectionResponseView section={s} response={r.response} />
                  <div className="space-y-1.5">
                    <Label className="text-xs">Comentario</Label>
                    <Textarea
                      rows={2}
                      placeholder="Observaciones para el estudiante…"
                      value={comments[r.id] ?? ""}
                      onChange={(e) => setComments({ ...comments, [r.id]: e.target.value })}
                      disabled={isApproved}
                    />
                  </div>
                  {!isApproved && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reviewM.mutate({ response_id: r.id, status: "approved", comment: comments[r.id] ?? "" })}
                      >
                        <Check className="mr-1.5 h-4 w-4" />Aprobar sección
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reviewM.mutate({ response_id: r.id, status: "changes_requested", comment: comments[r.id] ?? "" })}
                      >
                        <MessageSquareWarning className="mr-1.5 h-4 w-4" />Pedir cambios
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">Sin respuesta enviada.</p>
              )}
            </Card>
          );
        })}
      </div>

      {!isApproved && (
        <Card className="p-5 space-y-3">
          <h3 className="font-heading text-lg font-bold">Decisión final</h3>
          <div className="space-y-1.5">
            <Label>Comentario general (opcional)</Label>
            <Textarea rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => finalM.mutate("approved")}
              disabled={finalM.isPending || someChanges}
            >
              {finalM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Check className="mr-2 h-4 w-4" />Aprobar actividad
            </Button>
            <Button
              variant="outline"
              onClick={() => finalM.mutate("changes_requested")}
              disabled={finalM.isPending}
            >
              <MessageSquareWarning className="mr-2 h-4 w-4" />Devolver con observaciones
            </Button>
          </div>
          {someChanges && (
            <p className="text-xs text-warning-foreground">
              Hay secciones marcadas como "Requiere cambios". Devuelve la actividad o aprueba primero todas las secciones.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
