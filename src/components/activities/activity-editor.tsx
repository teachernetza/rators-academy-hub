import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, Trash2 } from "lucide-react";
import { SectionEditor, type EditorSection } from "@/components/activities/section-editor";
import {
  getActivity, updateActivity, deleteActivity, saveActivitySections, CEFR_LEVELS,
} from "@/lib/activities.functions";
import { toast } from "sonner";

export function ActivityEditor({
  id, basePath,
}: { id: string; basePath: "/admin/activities" | "/teacher/activities" }) {
  const qc = useQueryClient();
  const fetchOne = useServerFn(getActivity);
  const updateFn = useServerFn(updateActivity);
  const deleteFn = useServerFn(deleteActivity);
  const saveSectionsFn = useServerFn(saveActivitySections);

  const q = useQuery({ queryKey: ["activity", id], queryFn: () => fetchOne({ data: { id } }) });

  const [meta, setMeta] = useState({ title: "", description: "", cefr_level: "A1" as typeof CEFR_LEVELS[number] });
  const [sections, setSections] = useState<EditorSection[]>([]);

  useEffect(() => {
    if (!q.data) return;
    setMeta({
      title: q.data.activity.title,
      description: q.data.activity.description ?? "",
      cefr_level: q.data.activity.cefr_level,
    });
    setSections(
      (q.data.sections ?? []).map((s: any) => ({
        id: s.id,
        title: s.title,
        instructions: s.instructions,
        section_type: s.section_type,
        config: s.config ?? {},
      })),
    );
  }, [q.data]);

  const saveM = useMutation({
    mutationFn: async () => {
      await updateFn({
        data: {
          id,
          title: meta.title,
          description: meta.description || null,
          cefr_level: meta.cefr_level,
        },
      });
      await saveSectionsFn({ data: { activity_id: id, sections } });
    },
    onSuccess: () => {
      toast.success("Cambios guardados");
      qc.invalidateQueries({ queryKey: ["activity", id] });
      qc.invalidateQueries({ queryKey: ["activities"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar"),
  });

  const delM = useMutation({
    mutationFn: () => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Actividad eliminada");
      window.location.href = basePath;
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });

  if (q.isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (q.error) return <p className="text-destructive">{(q.error as any).message}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          to={basePath as any}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />Volver a biblioteca
        </Link>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => { if (confirm("¿Eliminar esta actividad?")) delM.mutate(); }}
          >
            <Trash2 className="mr-2 h-4 w-4" />Eliminar
          </Button>
          <Button onClick={() => saveM.mutate()} disabled={saveM.isPending}>
            {saveM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />Guardar
          </Button>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="font-heading text-xl font-bold">Detalles</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Nivel</Label>
            <Select value={meta.cefr_level} onValueChange={(v) => setMeta({ ...meta, cefr_level: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CEFR_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Descripción</Label>
          <Textarea rows={3} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
        </div>
      </Card>

      <div className="space-y-3">
        <h2 className="font-heading text-xl font-bold">Secciones</h2>
        <p className="text-sm text-muted-foreground">
          Cada sección se renderiza en orden. Combina texto abierto con ejercicios de unir o ordenar.
        </p>
        <SectionEditor sections={sections} onChange={setSections} />
      </div>
    </div>
  );
}
