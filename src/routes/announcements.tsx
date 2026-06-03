import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGuard } from "@/components/role-guard";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Pin, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listAnnouncements, createAnnouncement, deleteAnnouncement,
  markAllAnnouncementsRead, listMyCoursesForAuthoring,
} from "@/lib/announcements.functions";

export const Route = createFileRoute("/announcements")({
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (!profile) return null;
  return (
    <RoleGuard role={profile.role}>
      <Inner canCompose={profile.role !== "student"} isAdmin={profile.role === "admin"} />
    </RoleGuard>
  );
}

function Inner({ canCompose, isAdmin }: { canCompose: boolean; isAdmin: boolean }) {
  const qc = useQueryClient();
  const list = useServerFn(listAnnouncements);
  const markAll = useServerFn(markAllAnnouncementsRead);
  const del = useServerFn(deleteAnnouncement);

  const q = useQuery({
    queryKey: ["announcements"],
    queryFn: () => list({ data: {} }),
  });

  const markAllM = useMutation({
    mutationFn: () => markAll({}),
    onSuccess: () => {
      toast.success("All marked as read");
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["announcements-unread"] });
    },
  });

  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Announcement deleted");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const items = q.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold">Announcements</h1>
          <p className="mt-1 text-muted-foreground">Stay in the loop on platform and course updates.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => markAllM.mutate()} disabled={markAllM.isPending}>
            Mark all read
          </Button>
          {canCompose && <ComposerDialog isAdmin={isAdmin} />}
        </div>
      </div>

      {q.isLoading && <Card className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></Card>}

      <div className="space-y-3">
        {items.map((a: any) => (
          <Card key={a.id} className={`p-5 ${!a.read ? "border-primary/40" : ""}`}>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                <Megaphone className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {a.pinned && <Pin className="h-3 w-3 text-amber-500" />}
                  <h3 className="font-heading font-semibold">{a.title}</h3>
                  {!a.read && <Badge variant="default" className="text-[10px]">New</Badge>}
                  {a.course_title ? (
                    <Badge variant="secondary" className="text-[10px]">{a.course_title}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Platform-wide</Badge>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{a.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {a.author_name} · {new Date(a.created_at).toLocaleString()}
                </p>
              </div>
              {canCompose && (
                <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this announcement?")) delM.mutate(a.id); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </Card>
        ))}
        {!q.isLoading && items.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground">No announcements yet.</Card>
        )}
      </div>
    </div>
  );
}

function ComposerDialog({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [courseId, setCourseId] = useState<string>(isAdmin ? "__platform__" : "");

  const create = useServerFn(createAnnouncement);
  const listCourses = useServerFn(listMyCoursesForAuthoring);
  const courses = useQuery({ queryKey: ["my-courses-author"], queryFn: () => listCourses(), enabled: open });

  const m = useMutation({
    mutationFn: () => create({
      data: {
        title, body, pinned,
        course_id: courseId === "__platform__" || !courseId ? null : courseId,
      },
    }),
    onSuccess: () => {
      toast.success("Announcement posted");
      setOpen(false); setTitle(""); setBody(""); setPinned(false);
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["announcements-unread"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />New announcement</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New announcement</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) m.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label>Scope</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger><SelectValue placeholder="Choose course or platform" /></SelectTrigger>
              <SelectContent>
                {isAdmin && <SelectItem value="__platform__">Platform-wide (all users)</SelectItem>}
                {(courses.data ?? []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="pinned" checked={pinned} onCheckedChange={(v) => setPinned(!!v)} />
            <Label htmlFor="pinned" className="font-normal">Pin to top</Label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={m.isPending || !title.trim() || !courseId}>
              {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Post
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
