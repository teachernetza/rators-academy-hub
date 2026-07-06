// PDF report generator for the diagnostic exam.
// Uses jsPDF vector primitives; called only from the client.
import { QuestionBank, type Answers, type Translations, type Scores } from "./diagnostic-bank";

type Payload = {
  studentName: string;
  answers: Answers;
  translations: Translations;
  scores: Scores;
  radarDataUrl: string | null;
};

export async function generateDiagnosticPdf({
  studentName,
  answers,
  translations,
  scores,
  radarDataUrl,
}: Payload) {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const m = 20;
  const w = 210 - m * 2;
  let y = m;

  const c = {
    primary: [59, 91, 254] as [number, number, number],
    dark: [15, 23, 42] as [number, number, number],
    slate: [100, 116, 139] as [number, number, number],
    amber: [180, 83, 9] as [number, number, number],
    bg: [248, 250, 252] as [number, number, number],
  };

  const addPageIfNeed = (need: number) => {
    if (y + need > 280) {
      doc.addPage();
      y = m;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...c.slate);
      doc.text(`Teacher Netza Varo · Reporte de ${studentName}`, m, 10);
      doc.setDrawColor(...c.slate);
      doc.line(m, 12, 210 - m, 12);
      y = 20;
    }
  };

  const printText = (text: string, size: number, style: "normal" | "bold" | "italic", color: [number, number, number], indent = 0) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, w - indent) as string[];
    lines.forEach((line) => {
      addPageIfNeed(size * 0.5);
      doc.text(line, m + indent, y);
      y += size * 0.45;
    });
  };

  // Cover
  doc.setFillColor(...c.primary);
  doc.rect(0, 0, 210, 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Reporte Diagnóstico de Inglés", m, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Teacher Netza Varo · Rators Academy", m, 40);
  doc.setFontSize(10);
  doc.text(new Date().toLocaleDateString("es-MX", { dateStyle: "long" }), m, 48);

  y = 75;
  printText(`Alumno: ${studentName}`, 14, "bold", c.dark);
  y += 4;
  printText(`Nivel estimado (CEFR): ${scores.cefr}`, 20, "bold", c.primary);
  y += 4;
  printText(`Puntaje objetivo total: ${scores.totalObjPoints.toFixed(1)} / 25`, 12, "normal", c.dark);
  printText(
    `Traducciones usadas: ${scores.totalPenalties} (−${(scores.totalPenalties * 0.5).toFixed(1)} pts)`,
    11,
    "italic",
    c.amber,
  );
  y += 6;

  // Radar
  if (radarDataUrl) {
    addPageIfNeed(90);
    printText("Perfil de habilidades", 14, "bold", c.dark);
    y += 2;
    try {
      doc.addImage(radarDataUrl, "PNG", m + 30, y, 110, 80);
      y += 85;
    } catch {
      // ignore invalid image
    }
  }

  // Breakdown
  addPageIfNeed(30);
  y += 4;
  printText("Desglose por sección", 14, "bold", c.dark);
  y += 2;
  const rows: Array<[string, string]> = [
    ["Use of English (Grammar)", `${scores.mcqPts} / 12`],
    ["Reading + Vocabulary", `${(scores.readPts + scores.vocabPts).toFixed(1)} / 8`],
    ["Listening", `${scores.listPts} / 5`],
    ["Writing (autonomía)", `${5 - scores.writePen} / 5 prompts sin traducción`],
  ];
  rows.forEach(([k, v]) => {
    addPageIfNeed(8);
    doc.setFillColor(...c.bg);
    doc.rect(m, y - 4, w, 7, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...c.dark);
    doc.text(k, m + 2, y);
    doc.setFont("helvetica", "bold");
    doc.text(v, 210 - m - 2, y, { align: "right" });
    y += 8;
  });

  // Writing responses
  y += 6;
  addPageIfNeed(20);
  printText("Respuestas de Writing", 14, "bold", c.dark);
  y += 2;
  QuestionBank.writing.forEach((q, i) => {
    addPageIfNeed(20);
    printText(`${i + 1}. ${q.prompt}`, 11, "bold", c.dark);
    const ans = answers.writing[q.id]?.trim();
    if (ans) printText(ans, 10, "normal", c.slate, 4);
    else printText("(Sin respuesta)", 10, "italic", c.slate, 4);
    if (translations.writing[q.id]) printText("Se consultó traducción.", 9, "italic", c.amber, 4);
    y += 2;
  });

  // Recommendations
  y += 4;
  addPageIfNeed(30);
  printText("Recomendaciones", 14, "bold", c.dark);
  y += 2;
  const recs: string[] = [];
  if (scores.mcqPts < 8) recs.push("Reforzar gramática y expresiones cotidianas con los Labs interactivos.");
  if (scores.readPts + scores.vocabPts < 6) recs.push("Trabajar comprensión lectora y vocabulario con lecturas guiadas.");
  if (scores.listPts < 4) recs.push("Aumentar exposición auditiva; recomendamos Conversation Clubs.");
  if (scores.writePen > 2) recs.push("Practicar producción escrita sin depender de traducción.");
  if (scores.totalPenalties > 5) recs.push("Reducir uso de traducciones para acelerar la autonomía.");
  if (recs.length === 0) recs.push("¡Excelente desempeño! Recomendamos Masterclasses para pulir habilidades específicas.");
  recs.forEach((r) => printText(`• ${r}`, 11, "normal", c.dark));

  y += 8;
  addPageIfNeed(10);
  doc.setDrawColor(...c.slate);
  doc.line(m, y, 210 - m, y);
  y += 5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...c.slate);
  doc.text("Reporte generado por Rators Academy · Teacher Netza Varo", m, y);

  const safe = studentName.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "alumno";
  doc.save(`diagnostico_ingles_${safe}.pdf`);
}
