import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, UserRound, CalendarClock } from "lucide-react";
import { listStudentAssignmentsForStaff } from "@/lib/activities.functions";
import { AssignActivityDialog } from "@/components/activities/assign-activity-dialog";
import { StatusBadge } from "@/components/activities/status-badge";

export function StudentProfileDialog({
  studentId,
  studentName,
  trigger,
}: {
  studentId: string;
  studentName?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const fetchProfile = useServerFn(listStudentAssignmentsForStaff);
  const q = useQuery({
    queryKey: ["student-profile", studentId],
    queryFn: () => fetchProfile({ data: { student_id: studentId } }),
    enabled: open,
  });

  const assignments = q.data?.assignments ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <UserRound className="mr-2 h-4 w-4" />Perfil
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Perfil de {studentName ?? q.data?.student.full_name ?? "estudiante"}</DialogTitle>
        </DialogHeader>

        {q.isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4">
              <div>
                <p className="font-heading text-lg font-bold">{q.data?.student.full_name ?? studentName ?? "—"}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge variant="secondary">{q.data?.student.is_active === false ? "Inactivo" : "Activo"}</Badge>
                  <Badge variant="outline">{assignments.length} actividades</Badge>
                </div>
              </div>
              <AssignActivityDialog studentId={studentId} studentName={studentName ?? q.data?.student.full_name} />
            </div>

            <div>
              <h3 className="mb-3 font-heading text-base font-bold">Actividades asignadas</h3>
              <ScrollArea className="max-h-80 pr-3">
                <div className="space-y-2">
                  {assignments.map((a: any) => (
                    <div key={a.id} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{a.activity?.title ?? "Actividad"}</p>
                          <p className="text-xs text-muted-foreground">Asignada por {a.assigned_by_name}</p>
                        </div>
                        <StatusBadge status={a.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span><CalendarClock className="mr-1 inline h-3 w-3" />{new Date(a.assigned_at).toLocaleDateString()}</span>
                        {a.due_date && <span>Entrega: {new Date(a.due_date).toLocaleDateString()}</span>}
                        {a.activity?.cefr_level && <span>Nivel {a.activity.cefr_level}</span>}
                      </div>
                    </div>
                  ))}
                  {assignments.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                      Aún no tiene actividades asignadas.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}