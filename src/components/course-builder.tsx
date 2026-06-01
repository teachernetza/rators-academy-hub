import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getCourseTree, createSection, updateSection, deleteSection,
  createLesson, updateLesson, deleteLesson,
} from "@/lib/courses.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Video, ClipboardList, HelpCircle, Pencil, Loader2, FileText, BookOpen, Upload } from "lucide-react";
import { toast } from "sonner";
import { requestCourseFileUploadUrl } from "@/lib/courses.functions";
import { supabase } from "@/integrations/supabase/client";

export function CourseBuilder({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const fetch = useServerFn(getCourseTree);
  const tree = useQuery({ queryKey: ["course-tree", courseId], queryFn: () => fetch({ data: { courseId } }) });

  const newSection = useServerFn(createSection);
  const newSectionM = useMutation({
    mutationFn: (title: string) => newSection({ data: { course_id: courseId, title } }),
    onSuccess: () => { toast.success("Section added"); qc.invalidateQueries({ queryKey: ["course-tree", courseId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const [sectionTitle, setSectionTitle] = useState("");

  if (tree.isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  const data = tree.data;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Course</p>
            <h2 className="font-heading text-2xl font-bold">{data.course?.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{data.course?.description}</p>
          </div>
          <Badge variant={data.course?.status === "published" ? "default" : "outline"} className="capitalize">
            {data.course?.status}
          </Badge>
        </div>
      </Card>

      <Card className="p-6">
        <form onSubmit={(e) => { e.preventDefault(); if (sectionTitle.trim()) { newSectionM.mutate(sectionTitle); setSectionTitle(""); } }} className="flex gap-3">
          <Input placeholder="New section title…" value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} />
          <Button type="submit" disabled={newSectionM.isPending}><Plus className="mr-2 h-4 w-4" />Add section</Button>
        </form>
      </Card>

      {data.sections.map((s: any, idx: number) => (
        <SectionCard key={s.id} section={s} index={idx} courseId={courseId} />
      ))}

      {data.sections.length === 0 && (
        <Card className="p-12 text-center text-muted-foreground">No sections yet. Add your first section above.</Card>
      )}
    </div>
  );
}

function SectionCard({ section, index, courseId }: { section: any; index: number; courseId: string }) {
  const qc = useQueryClient();
  const updateS = useServerFn(updateSection);
  const deleteS = useServerFn(deleteSection);
  const updateSM = useMutation({
    mutationFn: (vars: { id: string; title?: string }) => updateS({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course-tree", courseId] }),
  });
  const deleteSM = useMutation({
    mutationFn: (id: string) => deleteS({ data: { id } }),
    onSuccess: () => { toast.success("Section deleted"); qc.invalidateQueries({ queryKey: ["course-tree", courseId] }); },
  });

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">{index + 1}</span>
          {editing ? (
            <form onSubmit={(e) => { e.preventDefault(); updateSM.mutate({ id: section.id, title }); setEditing(false); }} className="flex gap-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8" />
              <Button size="sm" type="submit">Save</Button>
            </form>
          ) : (
            <h3 className="font-heading text-lg font-semibold">{section.title}</h3>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => setEditing(!editing)}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this section and its lessons?")) deleteSM.mutate(section.id); }}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {section.lessons.map((l: any, i: number) => (
          <LessonRow key={l.id} lesson={l} index={i} courseId={courseId} />
        ))}
      </div>

      <NewLessonDialog sectionId={section.id} courseId={courseId} />
    </Card>
  );
}

const TYPE_ICON = { video: Video, activity: ClipboardList, quiz: HelpCircle, reading: BookOpen, file: FileText } as const;

function LessonRow({ lesson, index, courseId }: { lesson: any; index: number; courseId: string }) {
  const qc = useQueryClient();
  const del = useServerFn(deleteLesson);
  const delM = useMutation({
    mutationFn: () => del({ data: { id: lesson.id } }),
    onSuccess: () => { toast.success("Lesson deleted"); qc.invalidateQueries({ queryKey: ["course-tree", courseId] }); },
  });
  const Icon = TYPE_ICON[lesson.type as keyof typeof TYPE_ICON] ?? Video;
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-5">{index + 1}.</span>
        <Icon className="h-4 w-4 text-primary" />
        <span className="font-medium">{lesson.title}</span>
        <Badge variant="secondary" className="capitalize text-xs">{lesson.type}</Badge>
      </div>
      <div className="flex items-center gap-1">
        <EditLessonDialog lesson={lesson} courseId={courseId} />
        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete lesson?")) delM.mutate(); }}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function NewLessonDialog({ sectionId, courseId }: { sectionId: string; courseId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const create = useServerFn(createLesson);
  const m = useMutation({
    mutationFn: (vars: any) => create({ data: { section_id: sectionId, ...vars } }),
    onSuccess: () => { toast.success("Lesson added"); setOpen(false); qc.invalidateQueries({ queryKey: ["course-tree", courseId] }); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm" className="mt-3"><Plus className="mr-2 h-4 w-4" />Add lesson</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New lesson</DialogTitle></DialogHeader>
        <LessonForm courseId={courseId} onSubmit={(d) => m.mutate(d)} pending={m.isPending} />
      </DialogContent>
    </Dialog>
  );
}

function EditLessonDialog({ lesson, courseId }: { lesson: any; courseId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const update = useServerFn(updateLesson);
  const m = useMutation({
    mutationFn: (vars: any) => update({ data: { id: lesson.id, title: vars.title, content: vars.content } }),
    onSuccess: () => { toast.success("Lesson updated"); setOpen(false); qc.invalidateQueries({ queryKey: ["course-tree", courseId] }); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button></DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit lesson</DialogTitle></DialogHeader>
        <LessonForm courseId={courseId} initial={lesson} lockType onSubmit={(d) => m.mutate(d)} pending={m.isPending} />
      </DialogContent>
    </Dialog>
  );
}

function LessonForm({ courseId, initial, lockType, onSubmit, pending }: { courseId: string; initial?: any; lockType?: boolean; onSubmit: (d: any) => void; pending: boolean }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<"video" | "activity" | "quiz" | "reading" | "file">(initial?.type ?? "video");
  const [videoUrl, setVideoUrl] = useState(initial?.content?.video_url ?? "");
  const [instructions, setInstructions] = useState(initial?.content?.instructions ?? "");
  const [body, setBody] = useState(initial?.content?.body ?? "");
  const [filePath, setFilePath] = useState<string>(initial?.content?.file_path ?? "");
  const [fileName, setFileName] = useState<string>(initial?.content?.file_name ?? "");
  const [uploading, setUploading] = useState(false);
  const [questions, setQuestions] = useState<Array<{ text: string; options: string[]; correct: number; points: number }>>(
    initial?.content?.questions ?? [{ text: "", options: ["", "", "", ""], correct: 0, points: 1 }],
  );

  const reqUpload = useServerFn(requestCourseFileUploadUrl);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const { path, token } = await reqUpload({ data: { courseId, filename: file.name } });
      const { error } = await supabase.storage.from("course-files").uploadToSignedUrl(path, token, file);
      if (error) throw error;
      setFilePath(path);
      setFileName(file.name);
      toast.success("File uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally { setUploading(false); }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    let content: any = {};
    if (type === "video") content = { video_url: videoUrl };
    else if (type === "activity") content = { instructions };
    else if (type === "reading") content = { body };
    else if (type === "file") content = { file_path: filePath, file_name: fileName };
    else content = { questions };
    onSubmit({ title, type, content });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as any)} disabled={lockType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="reading">Reading</SelectItem>
            <SelectItem value="file">File / Download</SelectItem>
            <SelectItem value="activity">Interactive Activity</SelectItem>
            <SelectItem value="quiz">Quiz</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {type === "video" && (
        <div className="space-y-2">
          <Label>YouTube embed URL</Label>
          <Input placeholder="https://www.youtube.com/embed/..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required />
          <p className="text-xs text-muted-foreground">Use the /embed/VIDEO_ID format.</p>
        </div>
      )}

      {type === "activity" && (
        <div className="space-y-2">
          <Label>Instructions for student</Label>
          <Textarea rows={6} value={instructions} onChange={(e) => setInstructions(e.target.value)} required />
        </div>
      )}

      {type === "quiz" && (
        <div className="space-y-4">
          {questions.map((q, qi) => (
            <Card key={qi} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Question {qi + 1}</Label>
                {questions.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => setQuestions(questions.filter((_, i) => i !== qi))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              <Input placeholder="Question text" value={q.text} onChange={(e) => { const c = [...questions]; c[qi].text = e.target.value; setQuestions(c); }} required />
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="radio" name={`correct-${qi}`} checked={q.correct === oi} onChange={() => { const c = [...questions]; c[qi].correct = oi; setQuestions(c); }} className="accent-primary" />
                  <Input placeholder={`Option ${String.fromCharCode(65 + oi)}`} value={opt} onChange={(e) => { const c = [...questions]; c[qi].options[oi] = e.target.value; setQuestions(c); }} required />
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Label className="text-xs">Points:</Label>
                <Input type="number" min={1} max={100} value={q.points} onChange={(e) => { const c = [...questions]; c[qi].points = Number(e.target.value) || 1; setQuestions(c); }} className="w-24 h-8" />
              </div>
            </Card>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setQuestions([...questions, { text: "", options: ["", "", "", ""], correct: 0, points: 1 }])}>
            <Plus className="mr-2 h-4 w-4" />Add question
          </Button>
        </div>
      )}

      <DialogFooter>
        <Button type="submit" disabled={pending}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
      </DialogFooter>
    </form>
  );
}
