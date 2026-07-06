// Diagnostic exam question bank & scoring logic.
// Adapted from Teacher Netza's standalone exam.

export type McqQ = { id: string; q: string; q_es: string; opts: string[]; ans: number };
export type ReadingQ = {
  id: string;
  text: string;
  text_es: string;
  q: string;
  q_es: string;
  opts: string[];
  ans: number;
};
export type VocabSentence = { id: string; text: string; text_post: string; ans: string };
export type WritingQ = { id: string; prompt: string; prompt_es: string };
export type ListeningQ = {
  id: string;
  audio: string;
  q: string;
  q_es: string;
  opts: string[];
  ans: number;
};

export const QuestionBank = {
  mcq: [
    { id: "m1", q: '"Excuse me, how much ___?"', q_es: '"Disculpe, ¿cuánto ___?"', opts: ["is this", "this is", "are this"], ans: 0 },
    { id: "m2", q: 'A: "Nice to meet you." / B: "___"', q_es: 'A: "Encantado de conocerte." / B: "___"', opts: ["Nice to meet you too", "Same to you", "I am fine"], ans: 0 },
    { id: "m3", q: '"I would ___ a cup of coffee, please."', q_es: '"Me ___ una taza de café, por favor."', opts: ["like", "want", "love"], ans: 0 },
    { id: "m4", q: 'A: "How\'s it going?" / B: "___"', q_es: 'A: "¿Cómo te va?" / B: "___"', opts: ["Not bad, thanks", "I am go", "It goes well"], ans: 0 },
    { id: "m5", q: '"What do you do for a ___?"', q_es: '"¿A qué te dedicas (para ganarte la ___)?"', opts: ["living", "work", "job"], ans: 0 },
    { id: "m6", q: '"I\'m looking ___ to seeing you."', q_es: '"Estoy deseando (esperando con ansias) verte."', opts: ["forward", "ahead", "front"], ans: 0 },
    { id: "m7", q: 'A: "I couldn\'t agree ___."', q_es: 'A: "No podría estar ___ de acuerdo."', opts: ["more", "much", "less"], ans: 0 },
    { id: "m8", q: '"Make yourself at ___."', q_es: '"Siéntete como en ___."', opts: ["home", "house", "room"], ans: 0 },
    { id: "m9", q: '"By the ___, what time is the meeting?"', q_es: '"Por ___, ¿a qué hora es la reunión?"', opts: ["way", "time", "road"], ans: 0 },
    { id: "m10", q: '"It goes without ___ that we are thrilled to have you."', q_es: '"No hace falta ___ que estamos encantados de tenerte."', opts: ["saying", "talking", "speaking"], ans: 0 },
    { id: "m11", q: '"Please ___ in mind that the schedule might change."', q_es: '"Por favor, ten en ___ que el horario podría cambiar."', opts: ["bear", "have", "put"], ans: 0 },
    { id: "m12", q: '"Out of the ___, she decided to quit her job."', q_es: '"De la ___, ella decidió renunciar a su trabajo."', opts: ["blue", "red", "dark"], ans: 0 },
  ] satisfies McqQ[],
  reading: [
    {
      id: "r1",
      text: "The new cafe downtown is very popular. It serves organic coffee and fresh pastries. However, it is quite small, so finding a table can be difficult during the morning rush. The prices are reasonable considering the quality.",
      text_es: "El nuevo café del centro es muy popular. Sirve café orgánico y pasteles frescos. Sin embargo, es bastante pequeño, por lo que encontrar mesa puede ser difícil durante las mañanas. Los precios son razonables considerando la calidad.",
      q: "What is a problem with the cafe?",
      q_es: "¿Cuál es un problema con el café?",
      opts: ["It is too expensive", "It lacks enough seating", "The food is stale"],
      ans: 1,
    },
    {
      id: "r2",
      text: "Many experts suggest that walking for at least thirty minutes a day improves overall health. It reduces stress, boosts mood, and helps maintain a healthy weight. Plus, it requires no special equipment or gym membership, making it accessible to everyone.",
      text_es: "Muchos expertos sugieren que caminar al menos treinta minutos al día mejora la salud. Reduce el estrés, mejora el estado de ánimo y ayuda a mantener un peso saludable. Además, no requiere equipo especial, haciéndolo accesible a todos.",
      q: "What is a main advantage of walking mentioned?",
      q_es: "¿Qué ventaja principal de caminar se menciona?",
      opts: ["It requires a gym", "It builds huge muscles", "It is free and easy"],
      ans: 2,
    },
    {
      id: "r3",
      text: "Next week, the city library will host a local author event. Visitors can meet the writer, buy signed copies of her latest mystery novel, and attend a free writing workshop. Registration is required online before Friday.",
      text_es: "La próxima semana, la biblioteca organizará un evento de un autor local. Los visitantes pueden conocer al escritor, comprar copias firmadas de su novela y asistir a un taller gratuito. Se requiere registro en línea antes del viernes.",
      q: "What must attendees do to participate in the workshop?",
      q_es: "¿Qué deben hacer los asistentes para participar en el taller?",
      opts: ["Buy a book", "Register on the internet", "Write a mystery novel"],
      ans: 1,
    },
  ] satisfies ReadingQ[],
  vocab: {
    words: ["procrastinate", "eloquent", "meticulous", "resilient", "inevitable"],
    sentences: [
      { id: "v1", text: "If you always", text_post: ", you will never finish your work on time.", ans: "procrastinate" },
      { id: "v2", text: "She is very", text_post: " and pays great attention to every small detail.", ans: "meticulous" },
      { id: "v3", text: "The speaker was so", text_post: " that everyone was moved by his speech.", ans: "eloquent" },
      { id: "v4", text: "Mistakes are", text_post: " when learning a new complex skill.", ans: "inevitable" },
      { id: "v5", text: "Children are often highly", text_post: " and recover quickly from difficulties.", ans: "resilient" },
    ] satisfies VocabSentence[],
  },
  writing: [
    { id: "w1", prompt: "How do you politely decline an invitation to a party?", prompt_es: "¿Cómo rechazas educadamente una invitación a una fiesta?" },
    { id: "w2", prompt: "Write a short message letting your boss know you are running 10 minutes late.", prompt_es: "Escribe un breve mensaje avisando a tu jefe que llegarás 10 minutos tarde." },
    { id: "w3", prompt: "Ask a stranger for directions to the nearest subway station.", prompt_es: "Pídele a un extraño indicaciones para llegar a la estación de metro más cercana." },
    { id: "w4", prompt: "How do you ask for the bill at a restaurant?", prompt_es: "¿Cómo pides la cuenta en un restaurante?" },
    { id: "w5", prompt: "Write a brief response to say thank you for a gift.", prompt_es: "Escribe una breve respuesta para agradecer un regalo." },
  ] satisfies WritingQ[],
  listening: [
    { id: "l1", audio: "The flight has been delayed by two hours.", q: "What happened to the flight?", q_es: "¿Qué le pasó al vuelo?", opts: ["It is late", "It departed early", "It was canceled"], ans: 0 },
    { id: "l2", audio: "Would you mind closing the window?", q: "What is the speaker requesting?", q_es: "¿Qué está pidiendo el hablante?", opts: ["To shut the window", "To look outside", "To open the door"], ans: 0 },
    { id: "l3", audio: "I used to play tennis a lot, but not anymore.", q: "Does the speaker play tennis now?", q_es: "¿El hablante juega tenis ahora?", opts: ["No", "Yes", "Sometimes"], ans: 0 },
    { id: "l4", audio: "Let's call it a day and finish this tomorrow.", q: "What does the speaker want to do?", q_es: "¿Qué quiere hacer el hablante?", opts: ["Stop working", "Make a phone call", "Work late"], ans: 0 },
    { id: "l5", audio: "It's pouring outside, don't forget your umbrella.", q: "What's the weather like?", q_es: "¿Cómo está el clima?", opts: ["Raining heavily", "Sunny", "Snowing"], ans: 0 },
  ] satisfies ListeningQ[],
};

export type Answers = {
  mcq: Record<string, number>;
  reading: Record<string, number>;
  vocab: Record<string, string>;
  writing: Record<string, string>;
  listening: Record<string, number>;
};

export type Translations = {
  mcq: Record<string, boolean>;
  reading: Record<string, boolean>;
  vocab: Record<string, boolean>;
  writing: Record<string, boolean>;
  listening: Record<string, boolean>;
};

export type Scores = {
  mcqPts: number;
  readPts: number;
  vocabPts: number;
  listPts: number;
  mcqPen: number;
  readPen: number;
  listPen: number;
  writePen: number;
  totalPenalties: number;
  totalObjPoints: number;
  cefr: "A1" | "A2" | "B1" | "B2";
};

export function computeScores(answers: Answers, translations: Translations): Scores {
  let mcqPts = 0,
    readPts = 0,
    vocabPts = 0,
    listPts = 0;
  let mcqPen = 0,
    readPen = 0,
    listPen = 0,
    writePen = 0;

  QuestionBank.mcq.forEach((q) => {
    if (answers.mcq[q.id] === q.ans) {
      if (translations.mcq[q.id]) {
        mcqPts += 0.5;
        mcqPen++;
      } else mcqPts += 1;
    } else if (translations.mcq[q.id]) mcqPen++;
  });
  QuestionBank.reading.forEach((q) => {
    if (answers.reading[q.id] === q.ans) {
      if (translations.reading[q.id]) {
        readPts += 0.5;
        readPen++;
      } else readPts += 1;
    } else if (translations.reading[q.id]) readPen++;
  });
  QuestionBank.vocab.sentences.forEach((q) => {
    if (answers.vocab[q.id] === q.ans) vocabPts += 1;
  });
  QuestionBank.listening.forEach((q) => {
    if (answers.listening[q.id] === q.ans) {
      if (translations.listening[q.id]) {
        listPts += 0.5;
        listPen++;
      } else listPts += 1;
    } else if (translations.listening[q.id]) listPen++;
  });
  Object.values(translations.writing).forEach((v) => {
    if (v) writePen++;
  });

  const totalPenalties = mcqPen + readPen + listPen + writePen;
  const totalObjPoints = mcqPts + readPts + vocabPts + listPts;

  let cefr: Scores["cefr"] = "A1";
  if (totalObjPoints >= 21) cefr = "B2";
  else if (totalObjPoints >= 15) cefr = "B1";
  else if (totalObjPoints >= 9) cefr = "A2";

  return { mcqPts, readPts, vocabPts, listPts, mcqPen, readPen, listPen, writePen, totalPenalties, totalObjPoints, cefr };
}

export const SECTION_NAMES = [
  "Use of English",
  "Reading",
  "Vocabulary",
  "Writing",
  "Listening",
  "Resultados",
] as const;
