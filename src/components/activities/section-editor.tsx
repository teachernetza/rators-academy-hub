import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Trash2, ArrowUp, ArrowDown, Video, Volume2 } from "lucide-react";

export type EditorSection = {
  id?: string;
  title: string;
  instructions: string | null;
  section_type:
    | "open_text"
    | "match_pairs"
    | "order_words"
    | "multiple_choice"
    | "multi_select"
    | "video_questions"
    | "audio_questions";
  config: any;
};

export function SectionEditor({
  sections,
  onChange,
  disabled,
}: {
  sections: EditorSection[];
  onChange: (s: EditorSection[]) => void;
  disabled?: boolean;
}) {
  const update = (i: number, patch: Partial<EditorSection>) => {
    onChange(sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (i: number) => onChange(sections.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([
      ...sections,
      { title: `Sección ${sections.length + 1}`, instructions: "", section_type: "open_text", config: {} },
    ]);

  return (
    <div className="space-y-4">
      {sections.map((s, i) => (
        <Card key={i} className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {i + 1}
            </div>
            <div className="flex-1 space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                <div className="space-y-1.5">
                  <Label>Título</Label>
                  <Input
                    value={s.title}
                    onChange={(e) => update(i, { title: e.target.value })}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select
                    value={s.section_type}
                    onValueChange={(v) =>
                      update(i, { section_type: v as EditorSection["section_type"], config: {} })
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open_text">Texto abierto</SelectItem>
                      <SelectItem value="match_pairs">Unir parejas</SelectItem>
                      <SelectItem value="order_words">Ordenar palabras</SelectItem>
                      <SelectItem value="multiple_choice">Opción múltiple</SelectItem>
                      <SelectItem value="multi_select">Selección múltiple</SelectItem>
                      <SelectItem value="video_questions">Video + preguntas</SelectItem>
                      <SelectItem value="audio_questions">Audio + preguntas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Instrucciones</Label>
                <Textarea
                  rows={2}
                  value={s.instructions ?? ""}
                  onChange={(e) => update(i, { instructions: e.target.value })}
                  disabled={disabled}
                />
              </div>
              <ConfigEditor section={s} onChange={(config) => update(i, { config })} disabled={disabled} />
            </div>
            <div className="flex flex-col gap-1">
              <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={disabled}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={disabled}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove(i)} disabled={disabled}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
      <Button variant="outline" onClick={add} disabled={disabled}>
        <Plus className="mr-2 h-4 w-4" />Añadir sección
      </Button>
    </div>
  );
}

function ConfigEditor({
  section, onChange, disabled,
}: { section: EditorSection; onChange: (c: any) => void; disabled?: boolean }) {
  if (section.section_type === "open_text") {
    return (
      <p className="text-xs text-muted-foreground">
        El estudiante escribirá una respuesta libre en esta sección.
      </p>
    );
  }
  if (section.section_type === "multiple_choice") {
    return <QuestionBuilder config={section.config} onChange={onChange} disabled={disabled} multiple={false} />;
  }
  if (section.section_type === "multi_select") {
    return <QuestionBuilder config={section.config} onChange={onChange} disabled={disabled} multiple />;
  }
  if (section.section_type === "video_questions") {
    return <MediaQuestionBuilder config={section.config} onChange={onChange} disabled={disabled} type="video" />;
  }
  if (section.section_type === "audio_questions") {
    return <MediaQuestionBuilder config={section.config} onChange={onChange} disabled={disabled} type="audio" />;
  }
  if (section.section_type === "match_pairs") {
    const pairs: { left: string; right: string }[] = section.config?.pairs ?? [];
    const setPairs = (p: typeof pairs) => onChange({ pairs: p });
    return (
      <div className="space-y-2">
        <Label className="text-xs">Parejas a unir</Label>
        {pairs.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={p.left}
              placeholder="Columna A"
              onChange={(e) => setPairs(pairs.map((x, j) => (j === i ? { ...x, left: e.target.value } : x)))}
              disabled={disabled}
            />
            <span className="text-muted-foreground">↔</span>
            <Input
              value={p.right}
              placeholder="Columna B"
              onChange={(e) => setPairs(pairs.map((x, j) => (j === i ? { ...x, right: e.target.value } : x)))}
              disabled={disabled}
            />
            <Button size="icon" variant="ghost" onClick={() => setPairs(pairs.filter((_, j) => j !== i))} disabled={disabled}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => setPairs([...pairs, { left: "", right: "" }])} disabled={disabled}>
          <Plus className="mr-2 h-4 w-4" />Añadir pareja
        </Button>
      </div>
    );
  }
  if (section.section_type === "order_words") {
    const items: string[] = section.config?.items ?? [];
    const correct: number[] = section.config?.correct_order ?? items.map((_, i) => i);
    const setItems = (it: string[]) =>
      onChange({ items: it, correct_order: it.map((_, i) => i) });
    return (
      <div className="space-y-2">
        <Label className="text-xs">Palabras en orden correcto</Label>
        {items.map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
            <Input
              value={w}
              onChange={(e) => setItems(items.map((x, j) => (j === i ? e.target.value : x)))}
              disabled={disabled}
            />
            <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, j) => j !== i))} disabled={disabled}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => setItems([...items, ""])} disabled={disabled}>
          <Plus className="mr-2 h-4 w-4" />Añadir palabra
        </Button>
        <p className="text-xs text-muted-foreground">El estudiante verá las palabras desordenadas y deberá ordenarlas.</p>
        {correct.length === 0 && null}
      </div>
    );
  }
  return null;
}

type ChoiceQuestion = { text: string; options: string[]; correct: number[]; points: number };

const emptyQuestion = (): ChoiceQuestion => ({ text: "", options: ["", "", "", ""], correct: [], points: 1 });

function QuestionBuilder({
  config, onChange, disabled, multiple,
}: { config: any; onChange: (c: any) => void; disabled?: boolean; multiple: boolean }) {
  const questions: ChoiceQuestion[] = config?.questions ?? [emptyQuestion()];
  const setQuestions = (next: ChoiceQuestion[]) => onChange({ ...config, questions: next });
  const updateQuestion = (qi: number, patch: Partial<ChoiceQuestion>) =>
    setQuestions(questions.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  return (
    <div className="space-y-3">
      <Label className="text-xs">Preguntas</Label>
      {questions.map((q, qi) => (
        <Card key={qi} className="space-y-3 p-3">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-semibold">Pregunta {qi + 1}</Label>
            {questions.length > 1 && (
              <Button size="icon" variant="ghost" onClick={() => setQuestions(questions.filter((_, i) => i !== qi))} disabled={disabled}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
          <Input value={q.text} placeholder="Escribe la pregunta" onChange={(e) => updateQuestion(qi, { text: e.target.value })} disabled={disabled} />
          <div className="space-y-2">
            {q.options.map((opt, oi) => {
              const checked = (q.correct ?? []).includes(oi);
              const toggle = () => {
                const correct = multiple
                  ? checked
                    ? q.correct.filter((x) => x !== oi)
                    : [...(q.correct ?? []), oi]
                  : [oi];
                updateQuestion(qi, { correct });
              };
              return (
                <div key={oi} className="flex items-center gap-2">
                  <input type={multiple ? "checkbox" : "radio"} name={`correct-${qi}`} checked={checked} onChange={toggle} disabled={disabled} className="accent-primary" />
                  <Input value={opt} placeholder={`Opción ${oi + 1}`} onChange={(e) => {
                    const options = [...q.options];
                    options[oi] = e.target.value;
                    updateQuestion(qi, { options });
                  }} disabled={disabled} />
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Puntos</Label>
            <Input type="number" min={1} max={100} value={q.points} onChange={(e) => updateQuestion(qi, { points: Number(e.target.value) || 1 })} disabled={disabled} className="h-8 w-24" />
          </div>
        </Card>
      ))}
      <Button size="sm" variant="outline" onClick={() => setQuestions([...questions, emptyQuestion()])} disabled={disabled}>
        <Plus className="mr-2 h-4 w-4" />Añadir pregunta
      </Button>
    </div>
  );
}

function MediaQuestionBuilder({
  config, onChange, disabled, type,
}: { config: any; onChange: (c: any) => void; disabled?: boolean; type: "video" | "audio" }) {
  const set = (patch: any) => onChange({ ...config, ...patch });
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{type === "video" ? "Link de video" : "Link de audio"}</Label>
        <Input
          value={config?.media_url ?? ""}
          onChange={(e) => set({ media_url: e.target.value })}
          placeholder={type === "video" ? "https://www.youtube.com/embed/..." : "https://.../audio.mp3"}
          disabled={disabled}
        />
      </div>
      {config?.media_url && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          {type === "video" ? (
            <div className="aspect-video overflow-hidden rounded-md bg-foreground/10">
              <iframe src={config.media_url} title="Preview de video" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          ) : (
            <audio src={config.media_url} controls className="w-full" />
          )}
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {type === "video" ? <Video className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        Agrega preguntas para que el estudiante responda después de reproducir el material.
      </div>
      <QuestionBuilder config={config} onChange={onChange} disabled={disabled} multiple={false} />
    </div>
  );
}
