import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

export type EditorSection = {
  id?: string;
  title: string;
  instructions: string | null;
  section_type: "open_text" | "match_pairs" | "order_words";
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
