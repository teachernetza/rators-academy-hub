import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { teacherGradeSubmission } from "@/lib/grading.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function GradeDialog({ submission, trigger }: { submission: any; trigger: React.ReactNode }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [grade, setGrade] = useState<number>(submission.grade ?? 80);
  const [feedback, setFeedback] = useState<string>(submission.feedback ?? "");
  const grader = useServerFn(teacherGradeSubmission);
  const m = useMutation({
    mutationFn: () => grader({ data: { id: submission.id, grade, feedback } }),
    onSuccess: () => {
      toast.success("Graded");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["teacher-submissions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Grade submission</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm space-y-1">
            <div><span className="text-muted-foreground">Student:</span> {submission.student_name}</div>
            <div><span className="text-muted-foreground">Lesson:</span> {submission.lesson_title}</div>
            <div><span className="text-muted-foreground">Course:</span> {submission.course_title}</div>
            {submission.signed_url && (
              <div className="pt-2">
                <a href={submission.signed_url} target="_blank" rel="noreferrer" className="text-primary underline">
                  Open submitted file
                </a>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Grade (0–100)</Label>
            <Input type="number" min={0} max={100} value={grade} onChange={(e) => setGrade(Number(e.target.value) || 0)} />
          </div>
          <div className="space-y-2">
            <Label>Feedback</Label>
            <Textarea rows={5} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={() => m.mutate()} disabled={m.isPending}>
              {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit grade
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
