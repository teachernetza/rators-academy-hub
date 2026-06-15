import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGuard } from "@/components/role-guard";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Inbox } from "lucide-react";
import { listTeacherInbox } from "@/lib/activities.functions";
import { StatusBadge } from "@/components/activities/status-badge";

export const Route = createFileRoute("/teacher/inbox")({
  component: () => (
    <RoleGuard role="teacher">
      <InboxPage />
    </RoleGuard>
  ),
});

function InboxPage() {
  const fetchInbox = useServerFn(listTeacherInbox);
  const q = useQuery({ queryKey: ["teacher", "inbox"], queryFn: () => fetchInbox() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Buzón de revisión</h1>
        <p className="mt-1 text-muted-foreground">Entregas que tus estudiantes te han enviado para revisar.</p>
      </div>
      <Card className="p-0 overflow-hidden">
        {q.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (q.data ?? []).length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Inbox className="mx-auto h-8 w-8 opacity-50" />
            <p className="mt-2 text-sm">No tienes entregas pendientes.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Actividad</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Intento</TableHead>
                <TableHead>Enviada</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).map((s) => (
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/40">
                  <TableCell className="font-medium">
                    <Link
                      to={"/teacher/inbox/$submissionId" as any}
                      params={{ submissionId: s.id } as any}
                      className="hover:underline"
                    >
                      {s.student?.full_name ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell>{s.activity?.title ?? "—"}</TableCell>
                  <TableCell>
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      {s.activity?.cefr_level}
                    </span>
                  </TableCell>
                  <TableCell>#{s.attempt_number}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(s.submitted_at).toLocaleString()}
                  </TableCell>
                  <TableCell><StatusBadge status="in_review" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
