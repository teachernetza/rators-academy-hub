import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Volume2,
  Languages,
  Loader2,
  Download,
  RotateCcw,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  QuestionBank,
  computeScores,
  SECTION_NAMES,
  type Answers,
  type Translations,
  type Scores,
} from "@/lib/diagnostic-bank";
import { generateDiagnosticPdf } from "@/lib/diagnostic-pdf";

export const Route = createFileRoute("/diagnostic-exam")({
  head: () => ({
    meta: [
      { title: "Examen Diagnóstico de Inglés — Teacher Netza Varo" },
      {
        name: "description",
        content:
          "Descubre tu nivel real de inglés (CEFR A1–B2) en 15 minutos. Gramática, Reading, Vocabulary, Writing y Listening. Reporte PDF gratuito.",
      },
      { property: "og:title", content: "Examen Diagnóstico de Inglés — Teacher Netza Varo" },
      {
        property: "og:description",
        content:
          "Examen diagnóstico gratuito con reporte PDF. Mide gramática, lectura, escritura, vocabulario y comprensión auditiva.",
      },
    ],
  }),
  component: DiagnosticExam,
});

const STORAGE_KEY = "netza.diagnostic.v1";
const WA_NUMBER = "523323111642";

function emptyAnswers(): Answers {
  return { mcq: {}, reading: {}, vocab: {}, writing: {}, listening: {} };
}
function emptyTranslations(): Translations {
  return { mcq: {}, reading: {}, vocab: {}, writing: {}, listening: {} };
}

type SavedState = {
  studentName: string;
  step: number;
  answers: Answers;
  translations: Translations;
};

function loadState(): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedState;
  } catch {
    return null;
  }
}

function DiagnosticExam() {
  // Step 0 = start screen, 1..5 = sections, 6 = results
  const [step, setStep] = useState(0);
  const [studentName, setStudentName] = useState("");
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [translations, setTranslations] = useState<Translations>(emptyTranslations);
  const [scores, setScores] = useState<Scores | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const radarRef = useRef<HTMLCanvasElement>(null);

  // Hydrate from localStorage
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      setStudentName(saved.studentName || "");
      setStep(saved.step || 0);
      setAnswers({ ...emptyAnswers(), ...saved.answers });
      setTranslations({ ...emptyTranslations(), ...saved.translations });
    }
  }, []);

  // Persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (step === 0 && !studentName) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ studentName, step, answers, translations }),
    );
  }, [studentName, step, answers, translations]);

  // Scroll to top on step change
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  function resetExam() {
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
    setStudentName("");
    setStep(0);
    setAnswers(emptyAnswers());
    setTranslations(emptyTranslations());
    setScores(null);
  }

  function goto(next: number) {
    setStep(Math.max(0, Math.min(6, next)));
  }

  function finish() {
    const s = computeScores(answers, translations);
    setScores(s);
    setStep(6);
    toast.success("¡Examen calificado!");
  }

  const progress = step === 0 ? 0 : Math.round(((step - 1) / 5) * 100);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-heading text-base font-bold sm:text-lg">
              Examen Diagnóstico
            </span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Volver al inicio
          </Link>
        </div>
        {step > 0 && step < 6 && (
          <div className="mx-auto max-w-5xl px-4 pb-3 sm:px-6">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Paso {step} de 5 · {SECTION_NAMES[step - 1]}
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        {step === 0 && (
          <StartScreen
            name={studentName}
            onName={setStudentName}
            hasProgress={Object.values(answers).some((s) => Object.keys(s).length > 0)}
            onStart={() => {
              if (!studentName.trim()) {
                toast.error("Escribe tu nombre para comenzar.");
                return;
              }
              goto(1);
            }}
            onReset={resetExam}
          />
        )}

        {step === 1 && (
          <McqSection
            answers={answers.mcq}
            translations={translations.mcq}
            onAnswer={(id, v) => setAnswers((a) => ({ ...a, mcq: { ...a.mcq, [id]: v } }))}
            onTranslate={(id) =>
              setTranslations((t) => ({ ...t, mcq: { ...t.mcq, [id]: !t.mcq[id] } }))
            }
          />
        )}

        {step === 2 && (
          <ReadingSection
            answers={answers.reading}
            translations={translations.reading}
            onAnswer={(id, v) =>
              setAnswers((a) => ({ ...a, reading: { ...a.reading, [id]: v } }))
            }
            onTranslate={(id) =>
              setTranslations((t) => ({
                ...t,
                reading: { ...t.reading, [id]: !t.reading[id] },
              }))
            }
          />
        )}

        {step === 3 && (
          <VocabSection
            answers={answers.vocab}
            onChange={(v) => setAnswers((a) => ({ ...a, vocab: v }))}
          />
        )}

        {step === 4 && (
          <WritingSection
            answers={answers.writing}
            translations={translations.writing}
            onAnswer={(id, v) =>
              setAnswers((a) => ({ ...a, writing: { ...a.writing, [id]: v } }))
            }
            onTranslate={(id) =>
              setTranslations((t) => ({
                ...t,
                writing: { ...t.writing, [id]: !t.writing[id] },
              }))
            }
          />
        )}

        {step === 5 && (
          <ListeningSection
            answers={answers.listening}
            translations={translations.listening}
            onAnswer={(id, v) =>
              setAnswers((a) => ({ ...a, listening: { ...a.listening, [id]: v } }))
            }
            onTranslate={(id) =>
              setTranslations((t) => ({
                ...t,
                listening: { ...t.listening, [id]: !t.listening[id] },
              }))
            }
          />
        )}

        {step === 6 && scores && (
          <ResultsScreen
            studentName={studentName}
            scores={scores}
            radarRef={radarRef}
            onReset={resetExam}
            onDownload={async () => {
              setPdfLoading(true);
              try {
                const dataUrl = radarRef.current?.toDataURL("image/png") ?? null;
                await generateDiagnosticPdf({
                  studentName,
                  answers,
                  translations,
                  scores,
                  radarDataUrl: dataUrl,
                });
                toast.success("PDF generado.");
              } catch (e) {
                console.error(e);
                toast.error("No se pudo generar el PDF.");
              } finally {
                setPdfLoading(false);
              }
            }}
            pdfLoading={pdfLoading}
          />
        )}

        {step > 0 && step < 6 && (
          <div className="mt-10 flex items-center justify-between border-t border-border/60 pt-6">
            <Button variant="outline" onClick={() => goto(step - 1)} disabled={step === 1}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            {step < 5 ? (
              <Button onClick={() => goto(step + 1)}>
                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={finish} className="shadow-[var(--shadow-elegant)]">
                Ver resultados <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ------------------------------- SCREENS ------------------------------- */

function StartScreen({
  name,
  onName,
  onStart,
  onReset,
  hasProgress,
}: {
  name: string;
  onName: (v: string) => void;
  onStart: () => void;
  onReset: () => void;
  hasProgress: boolean;
}) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
        <Sparkles className="h-3.5 w-3.5" /> Gratis · ~15 minutos
      </span>
      <h1 className="mt-6 font-heading text-3xl font-bold sm:text-4xl">
        Descubre tu nivel real de inglés
      </h1>
      <p className="mt-4 text-muted-foreground">
        5 secciones (Grammar, Reading, Vocabulary, Writing, Listening). Al final recibirás tu
        nivel CEFR estimado y un reporte PDF descargable.
      </p>

      <div className="mt-8 space-y-3 rounded-2xl border border-border bg-card p-6 text-left shadow-[var(--shadow-soft)]">
        <label className="text-sm font-medium">¿Cuál es tu nombre?</label>
        <Input
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Ej. María López"
          onKeyDown={(e) => e.key === "Enter" && onStart()}
        />
        <div className="pt-2 flex flex-col gap-2 sm:flex-row">
          <Button onClick={onStart} size="lg" className="w-full shadow-[var(--shadow-elegant)]">
            Comenzar examen
          </Button>
          {hasProgress && (
            <Button variant="ghost" onClick={onReset} size="lg" className="w-full sm:w-auto">
              <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar
            </Button>
          )}
        </div>
        <p className="pt-2 text-xs text-muted-foreground">
          Tip: usar el botón «Translate» reduce a la mitad el puntaje de esa pregunta.
        </p>
      </div>
    </div>
  );
}

/* --------------------------- REUSABLE PIECES --------------------------- */

function QuestionCard({
  index,
  title,
  translateActive,
  onTranslate,
  children,
}: {
  index: number;
  title: React.ReactNode;
  translateActive?: boolean;
  onTranslate?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pregunta {index}
          </div>
          <div className="mt-1 text-base font-medium leading-snug">{title}</div>
        </div>
        {onTranslate && (
          <button
            type="button"
            onClick={onTranslate}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition",
              translateActive
                ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground",
            )}
          >
            <Languages className="h-3.5 w-3.5" />
            {translateActive ? "Ocultar ES (−50%)" : "Traducir"}
          </button>
        )}
      </div>
      <div className="mt-4 space-y-2">{children}</div>
    </div>
  );
}

function OptionRadio({
  name,
  value,
  checked,
  onChange,
  label,
}: {
  name: string;
  value: number;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition",
        checked
          ? "border-primary bg-primary/5"
          : "border-border bg-background hover:border-primary/40",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-[hsl(var(--primary))]"
      />
      <span>{label}</span>
    </label>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-heading text-2xl font-bold sm:text-3xl">{title}</h2>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </div>
  );
}

/* ------------------------------ SECTIONS ------------------------------ */

function McqSection({
  answers,
  translations,
  onAnswer,
  onTranslate,
}: {
  answers: Record<string, number>;
  translations: Record<string, boolean>;
  onAnswer: (id: string, v: number) => void;
  onTranslate: (id: string) => void;
}) {
  return (
    <div>
      <SectionHeading
        title="Use of English"
        description="12 preguntas de gramática y expresiones cotidianas."
      />
      <div className="space-y-4">
        {QuestionBank.mcq.map((q, i) => {
          const trans = !!translations[q.id];
          return (
            <QuestionCard
              key={q.id}
              index={i + 1}
              translateActive={trans}
              onTranslate={() => onTranslate(q.id)}
              title={
                <>
                  <div>{q.q}</div>
                  {trans && (
                    <div className="mt-1 text-sm italic text-amber-700 dark:text-amber-400">
                      {q.q_es}
                    </div>
                  )}
                </>
              }
            >
              {q.opts.map((opt, oi) => (
                <OptionRadio
                  key={oi}
                  name={`mcq-${q.id}`}
                  value={oi}
                  checked={answers[q.id] === oi}
                  onChange={() => onAnswer(q.id, oi)}
                  label={opt}
                />
              ))}
            </QuestionCard>
          );
        })}
      </div>
    </div>
  );
}

function ReadingSection({
  answers,
  translations,
  onAnswer,
  onTranslate,
}: {
  answers: Record<string, number>;
  translations: Record<string, boolean>;
  onAnswer: (id: string, v: number) => void;
  onTranslate: (id: string) => void;
}) {
  return (
    <div>
      <SectionHeading title="Reading" description="3 lecturas cortas con una pregunta cada una." />
      <div className="space-y-4">
        {QuestionBank.reading.map((q, i) => {
          const trans = !!translations[q.id];
          return (
            <QuestionCard
              key={q.id}
              index={i + 1}
              translateActive={trans}
              onTranslate={() => onTranslate(q.id)}
              title={
                <>
                  <div className="rounded-lg bg-secondary/50 p-3 text-sm font-normal leading-relaxed">
                    {trans ? q.text_es : q.text}
                  </div>
                  <div className="mt-3 font-medium">
                    {trans ? q.q_es : q.q}
                  </div>
                </>
              }
            >
              {q.opts.map((opt, oi) => (
                <OptionRadio
                  key={oi}
                  name={`read-${q.id}`}
                  value={oi}
                  checked={answers[q.id] === oi}
                  onChange={() => onAnswer(q.id, oi)}
                  label={opt}
                />
              ))}
            </QuestionCard>
          );
        })}
      </div>
    </div>
  );
}

function VocabSection({
  answers,
  onChange,
}: {
  answers: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const usedWords = useMemo(() => new Set(Object.values(answers)), [answers]);

  function place(sentenceId: string, word: string) {
    // Remove word from any other sentence, then set
    const next: Record<string, string> = {};
    Object.entries(answers).forEach(([k, v]) => {
      if (v !== word && k !== sentenceId) next[k] = v;
    });
    next[sentenceId] = word;
    onChange(next);
  }

  function clear(sentenceId: string) {
    const next = { ...answers };
    delete next[sentenceId];
    onChange(next);
  }

  return (
    <div>
      <SectionHeading
        title="Vocabulary"
        description="Selecciona la palabra correcta para cada oración."
      />
      <div className="space-y-4">
        {QuestionBank.vocab.sentences.map((q, i) => {
          const current = answers[q.id];
          return (
            <div
              key={q.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
            >
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Oración {i + 1}
              </div>
              <p className="mt-2 text-base leading-relaxed">
                {q.text}{" "}
                <button
                  type="button"
                  onClick={() => current && clear(q.id)}
                  className={cn(
                    "inline-flex min-w-[100px] items-center justify-center rounded-md border-b-2 border-dashed px-2 py-0.5 text-sm font-semibold transition",
                    current
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground text-muted-foreground",
                  )}
                >
                  {current || "_______"}
                </button>{" "}
                {q.text_post}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {QuestionBank.vocab.words.map((w) => {
                  const inUse = usedWords.has(w) && current !== w;
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => !inUse && place(q.id, w)}
                      disabled={inUse}
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm transition",
                        current === w
                          ? "border-primary bg-primary text-primary-foreground"
                          : inUse
                            ? "cursor-not-allowed border-border bg-muted text-muted-foreground/50 line-through"
                            : "border-border bg-background hover:border-primary/50 hover:bg-primary/5",
                      )}
                    >
                      {w}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WritingSection({
  answers,
  translations,
  onAnswer,
  onTranslate,
}: {
  answers: Record<string, string>;
  translations: Record<string, boolean>;
  onAnswer: (id: string, v: string) => void;
  onTranslate: (id: string) => void;
}) {
  return (
    <div>
      <SectionHeading
        title="Writing"
        description="Responde en inglés con tus propias palabras. Escribe al menos 1 oración completa."
      />
      <div className="space-y-4">
        {QuestionBank.writing.map((q, i) => {
          const trans = !!translations[q.id];
          return (
            <QuestionCard
              key={q.id}
              index={i + 1}
              translateActive={trans}
              onTranslate={() => onTranslate(q.id)}
              title={
                <>
                  <div>{q.prompt}</div>
                  {trans && (
                    <div className="mt-1 text-sm italic text-amber-700 dark:text-amber-400">
                      {q.prompt_es}
                    </div>
                  )}
                </>
              }
            >
              <Textarea
                value={answers[q.id] || ""}
                onChange={(e) => onAnswer(q.id, e.target.value)}
                placeholder="Write your answer in English..."
                rows={3}
              />
            </QuestionCard>
          );
        })}
      </div>
    </div>
  );
}

function ListeningSection({
  answers,
  translations,
  onAnswer,
  onTranslate,
}: {
  answers: Record<string, number>;
  translations: Record<string, boolean>;
  onAnswer: (id: string, v: number) => void;
  onTranslate: (id: string) => void;
}) {
  const [playing, setPlaying] = useState<string | null>(null);

  function play(id: string, text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Tu navegador no soporta síntesis de voz.");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
    u.onstart = () => setPlaying(id);
    u.onend = () => setPlaying(null);
    u.onerror = () => setPlaying(null);
    window.speechSynthesis.speak(u);
  }

  return (
    <div>
      <SectionHeading
        title="Listening"
        description="Pulsa el botón para escuchar el audio. Puedes repetirlo cuantas veces necesites."
      />
      <div className="space-y-4">
        {QuestionBank.listening.map((q, i) => {
          const trans = !!translations[q.id];
          return (
            <QuestionCard
              key={q.id}
              index={i + 1}
              translateActive={trans}
              onTranslate={() => onTranslate(q.id)}
              title={
                <>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => play(q.id, q.audio)}
                    >
                      <Volume2 className="mr-2 h-4 w-4" />
                      {playing === q.id ? "Reproduciendo..." : "Escuchar"}
                    </Button>
                  </div>
                  <div className="mt-3 font-medium">{trans ? q.q_es : q.q}</div>
                </>
              }
            >
              {q.opts.map((opt, oi) => (
                <OptionRadio
                  key={oi}
                  name={`list-${q.id}`}
                  value={oi}
                  checked={answers[q.id] === oi}
                  onChange={() => onAnswer(q.id, oi)}
                  label={opt}
                />
              ))}
            </QuestionCard>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------ RESULTS ------------------------------ */

function ResultsScreen({
  studentName,
  scores,
  radarRef,
  onReset,
  onDownload,
  pdfLoading,
}: {
  studentName: string;
  scores: Scores;
  radarRef: React.RefObject<HTMLCanvasElement | null>;
  onReset: () => void;
  onDownload: () => void;
  pdfLoading: boolean;
}) {
  useEffect(() => {
    drawRadar(radarRef.current, scores);
  }, [scores, radarRef]);

  const waMsg = `Hola Teacher Netza, acabo de terminar el examen diagnóstico. Mi nivel estimado es ${scores.cefr} (${scores.totalObjPoints.toFixed(1)}/25). Me gustaría más información sobre los planes.`;
  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waMsg)}`;

  const stats = [
    { label: "Use of English", value: `${scores.mcqPts} / 12`, penalty: scores.mcqPen },
    {
      label: "Reading + Vocabulary",
      value: `${(scores.readPts + scores.vocabPts).toFixed(1)} / 8`,
      penalty: scores.readPen,
    },
    { label: "Listening", value: `${scores.listPts} / 5`, penalty: scores.listPen },
  ];

  return (
    <div>
      <div className="rounded-2xl border-2 border-primary bg-card p-8 text-center shadow-[var(--shadow-elegant)]">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Nivel estimado (CEFR)
        </div>
        <div className="mt-2 bg-[image:var(--gradient-primary)] bg-clip-text font-heading text-7xl font-black text-transparent">
          {scores.cefr}
        </div>
        <div className="mt-2 text-lg">
          <strong>{studentName}</strong> · {scores.totalObjPoints.toFixed(1)} / 25 pts objetivos
        </div>
        {scores.totalPenalties > 0 && (
          <div className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            Usaste {scores.totalPenalties} traducciones (−
            {(scores.totalPenalties * 0.5).toFixed(1)} pts)
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <h3 className="font-heading text-lg font-semibold">Perfil de habilidades</h3>
        <div className="mt-4 flex justify-center">
          <canvas ref={radarRef} width={360} height={280} className="max-w-full" />
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]"
          >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {s.label}
            </div>
            <div className="mt-1 font-heading text-2xl font-bold">{s.value}</div>
            {s.penalty > 0 && (
              <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                −{(s.penalty * 0.5).toFixed(1)} pts por traducción
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          onClick={onDownload}
          disabled={pdfLoading}
          className="flex-1 shadow-[var(--shadow-elegant)]"
        >
          {pdfLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Descargar reporte PDF
        </Button>
        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
          <Button
            size="lg"
            variant="outline"
            className="w-full bg-[#25D366] text-white hover:bg-[#1ebe57] hover:text-white"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Compartir con Teacher Netza
          </Button>
        </a>
      </div>

      <div className="mt-6 flex justify-center">
        <Button variant="ghost" onClick={onReset}>
          <RotateCcw className="mr-2 h-4 w-4" /> Rehacer examen
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------ RADAR ------------------------------ */

function drawRadar(cv: HTMLCanvasElement | null, s: Scores) {
  if (!cv) return;
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  const w = cv.width,
    h = cv.height;
  const cX = w / 2,
    cY = h / 2;
  const radius = Math.min(w, h) / 2.8;

  ctx.clearRect(0, 0, w, h);

  const data = [
    (s.mcqPts / 12) * 100,
    ((s.readPts + s.vocabPts) / 8) * 100,
    (s.listPts / 5) * 100,
    100 - s.writePen * 20,
    100 - s.totalPenalties * (100 / 25),
  ];
  const labels = ["Grammar", "Reading", "Listening", "Writing", "Autonomy"];
  const sides = 5;
  const step = (Math.PI * 2) / sides;

  // Grid
  ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
  ctx.lineWidth = 1;
  for (let ring = 1; ring <= 4; ring++) {
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = i * step - Math.PI / 2;
      const x = cX + Math.cos(a) * (radius / 4) * ring;
      const y = cY + Math.sin(a) * (radius / 4) * ring;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Axes + labels
  ctx.font = "600 11px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < sides; i++) {
    const a = i * step - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cX, cY);
    ctx.lineTo(cX + Math.cos(a) * radius, cY + Math.sin(a) * radius);
    ctx.stroke();
    ctx.fillText(labels[i], cX + Math.cos(a) * (radius + 22), cY + Math.sin(a) * (radius + 16));
  }

  // Data
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const val = Math.max(0, data[i]);
    const a = i * step - Math.PI / 2;
    const x = cX + Math.cos(a) * (radius * (val / 100));
    const y = cY + Math.sin(a) * (radius * (val / 100));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(59, 91, 254, 0.25)";
  ctx.fill();
  ctx.strokeStyle = "#3B5BFE";
  ctx.lineWidth = 2;
  ctx.stroke();

  for (let i = 0; i < sides; i++) {
    const val = Math.max(0, data[i]);
    const a = i * step - Math.PI / 2;
    const x = cX + Math.cos(a) * (radius * (val / 100));
    const y = cY + Math.sin(a) * (radius * (val / 100));
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.stroke();
  }
}
