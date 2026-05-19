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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Settings2, Trash2, Loader2, BookOpen, Users } from "lucide-react";
import { listCourses, createCourse, deleteCourse, updateCourse } from "@/lib/courses.functions";
import { adminListByRole } from "@/lib/admin.functions";
import { sendInvitation } from "@/lib/invitations.functions";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

export const Route = createFileRoute("/admin/courses")({
  component: () => <RoleGuard role="admin"><AdminCoursesPage /></RoleGuard>,
});

function AdminCoursesPage() {
  const qc = useQueryClient();
  const list = useServerFn(listCourses);
  const create = useServerFn(createCourse);
  const del = useServerFn(deleteCourse);
  const update = useServerFn(updateCourse);
  const teachersFn = useServerFn(adminListByRole);

  const courses = useQuery({ queryKey: ["admin-courses"], queryFn: () => list({}) });
  const teachers = useQuery({ queryKey: ["teachers-list"], queryFn: () => teachersFn({ data: { role: "teacher" } }) });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", cover_image_url: "", teacher_id: "", status: "draft" as "draft" | "published" });
  const createM = useMutation({
    mutationFn: () => create({ data: { ...form, teacher_id: form.teacher_id || null, cover_image_url: form.cover_image_url || null, description: form.description || null } }),
    onSuccess: () => { toast.success("Course created"); setOpen(false); setForm({ title: "", description: "", cover_image_url: "", teacher_id: "", status: "draft" }); qc.invalidateQueries({ queryKey: ["admin-courses"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-courses"] }); },
  });
  const togglePub = useMutation({
    mutationFn: (vars: { id: string; status: "draft" | "published" }) => update({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-courses"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Courses</h1>
          <p className="mt-1 text-muted-foreground">Create courses, assign teachers, and manage curricula.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New course</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create course</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createM.mutate(); }} className="space-y-4">
              <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="space-y-2"><Label>Cover image URL</Label><Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." /></div>
              <div className="space-y-2">
                <Label>Teacher</Label>
                <Select value={form.teacher_id} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Assign teacher" /></SelectTrigger>
                  <SelectContent>
                    {(teachers.data ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter><Button type="submit" disabled={createM.isPending}>{createM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create</Button></DialogFooter>
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
                <h3 className="font-heading font-semibold leading-tight">{c.title}</h3>
                <Badge variant={c.status === "published" ? "default" : "outline"} className="capitalize text-xs">{c.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{c.description ?? "—"}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>👩‍🏫 {c.teacher_name ?? "Unassigned"}</span>
                <span><Users className="inline h-3 w-3" /> {c.student_count}</span>
                <span>📊 {c.avg_progress}%</span>
              </div>
              <div className="mt-auto flex gap-2 pt-2">
                <Link to="/admin/courses/$courseId" params={{ courseId: c.id }} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full"><Settings2 className="mr-2 h-4 w-4" />Open builder</Button>
                </Link>
                <InviteDialog courseId={c.id} />
                <Button size="icon" variant="ghost" onClick={() => togglePub.mutate({ id: c.id, status: c.status === "published" ? "draft" : "published" })}>
                  <BookOpen className={`h-4 w-4 ${c.status === "published" ? "text-primary" : "text-muted-foreground"}`} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Delete ${c.title}?`)) delM.mutate(c.id); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {(courses.data ?? []).length === 0 && !courses.isLoading && (
          <Card className="p-12 text-center text-muted-foreground md:col-span-2 lg:col-span-3">No courses yet.</Card>
        )}
      </div>
    </div>
  );
}

function InviteDialog({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [inviteeId, setInviteeId] = useState("");
  const [message, setMessage] = useState("");
  const listFn = useServerFn(adminListByRole);
  const invite = useServerFn(sendInvitation);
  const people = useQuery({
    queryKey: ["people-list", role],
    queryFn: () => listFn({ data: { role } }),
    enabled: open,
  });
  const m = useMutation({
    mutationFn: () => invite({ data: { course_id: courseId, invitee_id: inviteeId, role, message: message || undefined } }),
    onSuccess: () => {
      toast.success("Invitation sent");
      setOpen(false); setInviteeId(""); setMessage("");
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" title="Invite to course"><UserPlus className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Invite to course</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Invite as</Label>
            <Select value={role} onValueChange={(v) => { setRole(v as any); setInviteeId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student (enroll)</SelectItem>
                <SelectItem value="teacher">Teacher (assign)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Person</Label>
            <Select value={inviteeId} onValueChange={setInviteeId}>
              <SelectTrigger><SelectValue placeholder={`Pick a ${role}`} /></SelectTrigger>
              <SelectContent>
                {(people.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Message (optional)</Label>
            <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Looking forward to having you in this class!" />
          </div>
          <DialogFooter>
            <Button onClick={() => m.mutate()} disabled={!inviteeId || m.isPending}>
              {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send invitation
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
