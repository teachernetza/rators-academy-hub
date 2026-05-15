import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { RoleGuard } from "@/components/role-guard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Settings2, Loader2, Users } from "lucide-react";
import { listCourses, createCourse } from "@/lib/courses.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/teacher/courses")({
  component: () => <RoleGuard role="teacher"><Page /></RoleGuard>,
});

function Page() {
  const qc = useQueryClient();
  const list = useServerFn(listCourses);
  const create = useServerFn(createCourse);
  const courses = useQuery({ queryKey: ["teacher-courses"], queryFn: () => list({}) });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", cover_image_url: "" });
  const m = useMutation({
    mutationFn: () => create({ data: { ...form, status: "draft" as const, description: form.description || null, cover_image_url: form.cover_image_url || null } }),
    onSuccess: () => { toast.success("Course created"); setOpen(false); setForm({ title: "", description: "", cover_image_url: "" }); qc.invalidateQueries({ queryKey: ["teacher-courses"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">My Courses</h1>
          <p className="mt-1 text-muted-foreground">Build and manage your courses.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New course</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create course</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
              <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="space-y-2"><Label>Cover image URL</Label><Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} /></div>
              <DialogFooter><Button type="submit" disabled={m.isPending}>{m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(courses.data ?? []).map((c) => (
          <Card key={c.id} className="overflow-hidden flex flex-col">
            <div className="h-32 bg-gradient-to-br from-primary/15 to-primary/5">
              {c.cover_image_url && <img src={c.cover_image_url} alt={c.title} className="h-full w-full object-cover" />}
            </div>
            <div className="p-5 flex flex-col gap-3 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-heading font-semibold">{c.title}</h3>
                <Badge variant={c.status === "published" ? "default" : "outline"} className="capitalize text-xs">{c.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{c.description ?? "—"}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span><Users className="inline h-3 w-3" /> {c.student_count}</span>
                <span>📊 {c.avg_progress}%</span>
              </div>
              <Link to="/teacher/courses/$courseId" params={{ courseId: c.id }} className="mt-auto">
                <Button variant="outline" size="sm" className="w-full"><Settings2 className="mr-2 h-4 w-4" />Open builder</Button>
              </Link>
            </div>
          </Card>
        ))}
        {(courses.data ?? []).length === 0 && !courses.isLoading && (
          <Card className="p-12 text-center text-muted-foreground md:col-span-2 lg:col-span-3">No courses yet — create your first.</Card>
        )}
      </div>
    </div>
  );
}
