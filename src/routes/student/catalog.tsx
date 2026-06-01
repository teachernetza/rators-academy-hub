import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGuard } from "@/components/role-guard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, CheckCircle2 } from "lucide-react";
import { listCatalog, enrollSelf } from "@/lib/catalog.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/student/catalog")({
  component: () => <RoleGuard role="student"><Page /></RoleGuard>,
});

function Page() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const list = useServerFn(listCatalog);
  const enroll = useServerFn(enrollSelf);
  const q = useQuery({ queryKey: ["catalog"], queryFn: () => list({}) });

  const m = useMutation({
    mutationFn: (courseId: string) => enroll({ data: { courseId } }),
    onSuccess: (_d, courseId) => {
      toast.success("Enrolled!");
      qc.invalidateQueries({ queryKey: ["catalog"] });
      qc.invalidateQueries({ queryKey: ["my-courses"] });
      navigate({ to: "/student/courses/$courseId", params: { courseId } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const courses = q.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Course catalog</h1>
        <p className="mt-1 text-muted-foreground">Browse and enroll in published courses.</p>
      </div>
      {q.isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c: any) => (
            <Card key={c.id} className="overflow-hidden flex flex-col">
              <div className="h-32 bg-gradient-to-br from-primary/15 to-primary/5">
                {c.cover_image_url && <img src={c.cover_image_url} alt={c.title} className="h-full w-full object-cover" />}
              </div>
              <div className="p-5 flex flex-col gap-3 flex-1">
                <h3 className="font-heading font-semibold">{c.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{c.description ?? "—"}</p>
                {c.teacher_name && <p className="text-xs text-muted-foreground">👩‍🏫 {c.teacher_name}</p>}
                <div className="mt-auto">
                  {c.enrolled ? (
                    <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Enrolled</Badge>
                  ) : (
                    <Button size="sm" className="w-full" onClick={() => m.mutate(c.id)} disabled={m.isPending}>
                      {m.isPending && m.variables === c.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Enroll
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {courses.length === 0 && (
            <Card className="md:col-span-2 lg:col-span-3 p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary/40" />
              No published courses yet.
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
