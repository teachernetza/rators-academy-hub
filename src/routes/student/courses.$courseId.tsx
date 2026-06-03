import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { RoleGuard } from "@/components/role-guard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  getStudentCourse, getStudentLesson, markLessonComplete,
  requestUploadUrl, submitActivity, submitQuiz,
} from "@/lib/student-course.functions";
import { getCourseFileUrl } from "@/lib/courses.functions";
import { listComments, postComment, deleteComment } from "@/lib/comments.functions";
import { getNote, saveNote } from "@/lib/notes.functions";
import {
  CheckCircle2, Lock, Video, ClipboardList, HelpCircle, ChevronLeft, Loader2, Upload,
  BookOpen, FileText, MessageSquare, NotebookPen, Send, Trash2, Download, AlertTriangle, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/student/courses/$courseId")({
  component: () => <RoleGuard role="student"><Page /></RoleGuard>,
});

function Page() {
  const { courseId } = Route.useParams();
  const fn = useServerFn(getStudentCourse);
  const tree = useQuery({ queryKey: ["student-course", courseId], queryFn: () => fn({ data: { courseId } }) });
  const [activeId, setActiveId] = useState<string | null>(null);

  const allLessons = useMemo(() =>
    (tree.data?.sections ?? []).flatMap((s: any) => s.lessons),
    [tree.data]);

  const active = activeId
    ? allLessons.find((l: any) => l.id === activeId)
    : allLessons.find((l: any) => l.unlocked && !l.completed) ?? allLessons[0];

  if (tree.isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <Link to="/student/courses"><Button variant="ghost" size="sm"><ChevronLeft className="mr-1 h-4 w-4" />Back</Button></Link>
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <Card className="p-4 h-fit">
          <h2 className="font-heading font-bold mb-3">{tree.data?.course?.title}</h2>
          <div className="space-y-4">
            {(tree.data?.sections ?? []).map((s: any, si: number) => (
              <div key={s.id}>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Section {si + 1} · {s.title}</p>
                <div className="space-y-1">
                  {s.lessons.map((l: any) => {
                    const Icon = l.type === "video" ? Video : l.type === "activity" ? ClipboardList : l.type === "reading" ? BookOpen : l.type === "file" ? FileText : HelpCircle;
                    const disabled = !l.unlocked && !l.completed;
                    return (
                      <button
                        key={l.id}
                        disabled={disabled}
                        onClick={() => setActiveId(l.id)}
                        className={cn(
                          "w-full flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                          active?.id === l.id ? "bg-primary text-primary-foreground" : disabled ? "text-muted-foreground/60 cursor-not-allowed" : "hover:bg-accent",
                        )}
                      >
                        {l.completed ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> :
                          disabled ? <Lock className="h-4 w-4 shrink-0" /> :
                          <Icon className="h-4 w-4 shrink-0" />}
                        <span className="truncate">{l.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {active ? <LessonView lesson={active} courseId={courseId} key={active.id} /> :
          <Card className="p-12 text-center text-muted-foreground">No lessons yet.</Card>}
      </div>
    </div>
  );
}

function LessonView({ lesson, courseId }: { lesson: any; courseId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(getStudentLesson);
  const q = useQuery({ queryKey: ["student-lesson", lesson.id], queryFn: () => fn({ data: { lessonId: lesson.id } }) });

  const markFn = useServerFn(markLessonComplete);
  const markM = useMutation({
    mutationFn: () => markFn({ data: { lessonId: lesson.id } }),
    onSuccess: () => {
      toast.success("Marked complete");
      qc.invalidateQueries({ queryKey: ["student-course", courseId] });
      qc.invalidateQueries({ queryKey: ["student-lesson", lesson.id] });
      qc.invalidateQueries({ queryKey: ["my-courses"] });
    },
  });

  if (q.isLoading) return <Card className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></Card>;
  const data = q.data;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-heading text-2xl font-bold">{lesson.title}</h2>
            {lesson.due_date && (() => {
              const due = new Date(lesson.due_date).getTime();
              const overdue = due < Date.now() && !data.completed;
              const soon = !overdue && due - Date.now() < 86400000 * 3;
              return (
                <Badge variant={overdue ? "destructive" : soon ? "default" : "outline"} className="flex items-center gap-1">
                  {overdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  Due {new Date(lesson.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </Badge>
              );
            })()}
          </div>
          <Badge variant="secondary" className="capitalize">{lesson.type}</Badge>
        </div>

        {lesson.type === "video" && (
          <>
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              {(data.lesson.content as any)?.video_url ? (
                <iframe src={(data.lesson.content as any).video_url} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              ) : <div className="flex items-center justify-center h-full text-white/60">No video URL.</div>}
            </div>
            {!data.completed && (
              <Button onClick={() => markM.mutate()} disabled={markM.isPending}>
                {markM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<CheckCircle2 className="mr-2 h-4 w-4" />Mark as complete
              </Button>
            )}
            {data.completed && <p className="text-sm text-green-600 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Completed</p>}
          </>
        )}

        {lesson.type === "reading" && <ReadingView data={data} completed={data.completed} onComplete={() => markM.mutate()} pending={markM.isPending} />}
        {lesson.type === "file" && <FileLessonView data={data} completed={data.completed} onComplete={() => markM.mutate()} pending={markM.isPending} />}
        {lesson.type === "activity" && <ActivityView lesson={lesson} data={data} courseId={courseId} />}
        {lesson.type === "quiz" && <QuizView lesson={lesson} data={data} courseId={courseId} />}
      </Card>

      <LessonExtras lessonId={lesson.id} />
    </div>
  );
}

function ReadingView({ data, completed, onComplete, pending }: { data: any; completed: boolean; onComplete: () => void; pending: boolean }) {
  const body = data.lesson.content?.body ?? "";
  return (
    <div className="space-y-4">
      <div className="prose prose-sm max-w-none whitespace-pre-wrap rounded-lg bg-muted/30 p-5 text-foreground">{body || "No content."}</div>
      {!completed ? (
        <Button onClick={onComplete} disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<CheckCircle2 className="mr-2 h-4 w-4" />Mark as read
        </Button>
      ) : <p className="text-sm text-green-600 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Completed</p>}
    </div>
  );
}

function FileLessonView({ data, completed, onComplete, pending }: { data: any; completed: boolean; onComplete: () => void; pending: boolean }) {
  const content = data.lesson.content ?? {};
  const getUrl = useServerFn(getCourseFileUrl);
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    if (!content.file_path) return;
    setBusy(true);
    try {
      const { url } = await getUrl({ data: { path: content.file_path } });
      window.open(url, "_blank");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-5 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileText className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{content.file_name ?? "Download file"}</p>
          <p className="text-xs text-muted-foreground">Click to download the course material</p>
        </div>
        <Button onClick={handleDownload} disabled={!content.file_path || busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download
        </Button>
      </div>
      {!completed ? (
        <Button variant="outline" onClick={onComplete} disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<CheckCircle2 className="mr-2 h-4 w-4" />Mark as complete
        </Button>
      ) : <p className="text-sm text-green-600 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Completed</p>}
    </div>
  );
}

function LessonExtras({ lessonId }: { lessonId: string }) {
  return (
    <Card className="p-4">
      <Tabs defaultValue="discussion">
        <TabsList>
          <TabsTrigger value="discussion"><MessageSquare className="mr-1 h-4 w-4" />Discussion</TabsTrigger>
          <TabsTrigger value="notes"><NotebookPen className="mr-1 h-4 w-4" />My notes</TabsTrigger>
        </TabsList>
        <TabsContent value="discussion" className="mt-4"><CommentsPanel lessonId={lessonId} /></TabsContent>
        <TabsContent value="notes" className="mt-4"><NotesPanel lessonId={lessonId} /></TabsContent>
      </Tabs>
    </Card>
  );
}

function CommentsPanel({ lessonId }: { lessonId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listComments);
  const post = useServerFn(postComment);
  const del = useServerFn(deleteComment);
  const q = useQuery({ queryKey: ["comments", lessonId], queryFn: () => list({ data: { lessonId } }) });
  const [body, setBody] = useState("");
  const postM = useMutation({
    mutationFn: () => post({ data: { lessonId, body } }),
    onSuccess: () => { setBody(""); qc.invalidateQueries({ queryKey: ["comments", lessonId] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", lessonId] }),
  });
  const items = q.data ?? [];

  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); if (body.trim()) postM.mutate(); }} className="flex gap-2">
        <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ask a question or share a thought…" />
        <Button type="submit" disabled={!body.trim() || postM.isPending} size="icon">
          {postM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
      <div className="space-y-2">
        {items.map((c: any) => (
          <div key={c.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{c.author_name}</span>
              {c.author_role === "teacher" && <Badge variant="default" className="text-[10px]">Teacher</Badge>}
              {c.author_role === "admin" && <Badge variant="secondary" className="text-[10px]">Admin</Badge>}
              <span className="text-xs text-muted-foreground ml-auto">{new Date(c.created_at).toLocaleString()}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => delM.mutate(c.id)} title="Delete">
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
            <p className="text-sm whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first!</p>}
      </div>
    </div>
  );
}

function NotesPanel({ lessonId }: { lessonId: string }) {
  const getFn = useServerFn(getNote);
  const saveFn = useServerFn(saveNote);
  const q = useQuery({ queryKey: ["note", lessonId], queryFn: () => getFn({ data: { lessonId } }) });
  const [body, setBody] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  if (q.data && !loaded) { setBody(q.data.body ?? ""); setLoaded(true); }

  const handleBlur = async () => {
    setSaving(true);
    try { await saveFn({ data: { lessonId, body } }); }
    catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-2">
      <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} onBlur={handleBlur}
        placeholder="Your private notes for this lesson…" />
      <p className="text-xs text-muted-foreground">{saving ? "Saving…" : "Autosaves when you click out."}</p>
    </div>
  );
}

function ActivityView({ lesson, data, courseId }: { lesson: any; data: any; courseId: string }) {
  const qc = useQueryClient();
  const reqUrl = useServerFn(requestUploadUrl);
  const submit = useServerFn(submitActivity);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const { path, token } = await reqUrl({ data: { lessonId: lesson.id, filename: file.name } });
      const { error } = await supabase.storage.from("submissions").uploadToSignedUrl(path, token, file);
      if (error) throw error;
      await submit({ data: { lessonId: lesson.id, filePath: path } });
      toast.success("Submitted!");
      qc.invalidateQueries({ queryKey: ["student-course", courseId] });
      qc.invalidateQueries({ queryKey: ["student-lesson", lesson.id] });
      qc.invalidateQueries({ queryKey: ["my-courses"] });
      setFile(null);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/40 p-4 text-sm whitespace-pre-wrap">{data.lesson.content?.instructions ?? "No instructions."}</div>

      {data.submission ? (
        <Card className="p-4 bg-accent/30">
          <p className="text-sm font-semibold mb-2">Your submission</p>
          {data.signedFile && <a href={data.signedFile} target="_blank" rel="noreferrer" className="text-primary underline text-sm">Download file</a>}
          <p className="text-xs text-muted-foreground mt-1">Submitted {new Date(data.submission.submitted_at).toLocaleString()}</p>
          {data.submission.graded_at ? (
            <div className="mt-3 rounded-md border border-border bg-background p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Grade</p>
                <span className="font-heading text-2xl font-bold text-primary">{data.submission.grade}/100</span>
              </div>
              {data.submission.feedback && <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{data.submission.feedback}</p>}
            </div>
          ) : <Badge variant="outline" className="mt-2">Awaiting grade</Badge>}
        </Card>
      ) : (
        <div className="space-y-3">
          <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Button onClick={handleSubmit} disabled={!file || busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Submit
          </Button>
        </div>
      )}
    </div>
  );
}

function QuizView({ lesson, data, courseId }: { lesson: any; data: any; courseId: string }) {
  const qc = useQueryClient();
  const submit = useServerFn(submitQuiz);
  const questions: any[] = data.lesson.content?.questions ?? [];
  const [answers, setAnswers] = useState<number[]>(Array(questions.length).fill(-1));
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<{ score: number; total: number } | null>(data.attempt ? { score: data.attempt.score, total: data.attempt.total_points } : null);

  const m = useMutation({
    mutationFn: () => submit({ data: { lessonId: lesson.id, answers } }),
    onSuccess: (r: any) => {
      setResult(r);
      qc.invalidateQueries({ queryKey: ["student-course", courseId] });
      qc.invalidateQueries({ queryKey: ["my-courses"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (result) {
    const pct = result.total ? Math.round((result.score / result.total) * 100) : 0;
    return (
      <Card className="p-8 text-center bg-accent/30">
        <p className="text-sm text-muted-foreground">Your score</p>
        <p className="font-heading text-5xl font-bold text-primary mt-2">{result.score}/{result.total}</p>
        <p className="text-muted-foreground mt-1">{pct}%</p>
      </Card>
    );
  }

  if (questions.length === 0) return <p className="text-muted-foreground">No questions configured.</p>;

  const q = questions[step];
  const isLast = step === questions.length - 1;
  const canNext = answers[step] !== -1;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Question {step + 1} of {questions.length}</p>
      <h3 className="font-heading text-xl font-semibold">{q.text}</h3>
      <div className="grid gap-2">
        {q.options.map((opt: string, oi: number) => (
          <button
            key={oi}
            onClick={() => { const c = [...answers]; c[step] = oi; setAnswers(c); }}
            className={cn(
              "rounded-lg border p-4 text-left transition-colors",
              answers[step] === oi ? "border-primary bg-primary/10" : "border-border hover:bg-accent",
            )}
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs mr-3">
              {String.fromCharCode(65 + oi)}
            </span>
            {opt}
          </button>
        ))}
      </div>
      <div className="flex justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>Previous</Button>
        {isLast ? (
          <Button disabled={!canNext || m.isPending} onClick={() => m.mutate()}>
            {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit quiz
          </Button>
        ) : (
          <Button disabled={!canNext} onClick={() => setStep(step + 1)}>Next</Button>
        )}
      </div>
    </div>
  );
}
