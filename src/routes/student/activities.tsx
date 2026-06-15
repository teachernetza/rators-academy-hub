import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGuard } from "@/components/role-guard";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, ClipboardCheck, ArrowRight } from "lucide-react";
import { listMyAssignments } from "@/lib/activities.functions";
import { StatusBadge } from "@/components/activities/status-badge";

export const Route = createFileRoute("/student/activities")({
  component: () => (
    <RoleGuard role="student">
      <StudentActivities />
    </RoleGuard>
  ),
});

function StudentActivities() {
  const fetchMine = useServerFn(listMyAssignments);
  const q = useQuery({ queryKey: ["assignments", "mine"], queryFn: () => fetchMine() });

  const groups = {
    pending: [] as any[],
    in_review: [] as any[],
    changes_requested: [] as any[],
    approved: [] as any[],
  };
  (q.data ?? []).forEach((a: any) => {
    (groups as any)[a.status]?.push(a);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Mis actividades</h1>
        <p className="mt-1 text-muted-foreground">Tareas asignadas por tus maestros.</p>
      </div>

      {q.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">Pendientes ({groups.pending.length + groups.changes_requested.length})</TabsTrigger>
            <TabsTrigger value="in_review">En revisión ({groups.in_review.length})</TabsTrigger>
            <TabsTrigger value="changes_requested">Cambios ({groups.changes_requested.length})</TabsTrigger>
            <TabsTrigger value="approved">Aprobadas ({groups.approved.length})</TabsTrigger>
          </TabsList>
          {(["pending", "in_review", "changes_requested", "approved"] as const).map((key) => (
            <TabsContent key={key} value={key} className="mt-4">
              <List items={key === "pending" ? [...groups.pending, ...groups.changes_requested] : groups[key]} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function List({ items }: { items: any[] }) {
  if (items.length === 0) {
    return (
      <Card className="p-12 text-center">
        <ClipboardCheck className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No hay actividades aquí.</p>
      </Card>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((a) => (
        <Link
          key={a.id}
          to={"/student/activities/$assignmentId" as any}
          params={{ assignmentId: a.id } as any}
          className="group block rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-heading text-base font-semibold leading-tight">
              {a.activity?.title ?? "—"}
            </h3>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              {a.activity?.cefr_level}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <StatusBadge status={a.status} />
            <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" />
          </div>
          {a.due_date && (
            <p className="mt-2 text-xs text-muted-foreground">
              Entrega: {new Date(a.due_date).toLocaleDateString()}
            </p>
          )}
          {a.approved_at && (
            <p className="mt-2 text-xs text-success">
              Aprobada el {new Date(a.approved_at).toLocaleDateString()}
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}
