## Objetivo

Integrar el **Advanced Diagnostic Exam** como una sección destacada de la landing page y como una ruta funcional dentro de la app, adaptada al look & feel de Rators Academy / Teacher Netza, sin depender del HTML original en `index.html`.

## Estructura de archivos

```
src/
├── routes/
│   └── diagnostic-exam.tsx          # Nueva ruta /diagnostic-exam
├── components/diagnostic/
│   ├── question-bank.ts             # QuestionBank extraído (MCQ, Reading, Vocab, Writing, Listening)
│   ├── use-diagnostic-store.ts      # Estado (Zustand-lite con useReducer + localStorage)
│   ├── audio-service.ts             # Wrapper de Web Speech API (con toast si no hay soporte)
│   ├── pdf-engine.ts                # Reporte PDF con jsPDF (colores/fuente de la marca)
│   ├── radar-chart.tsx              # Canvas de 5 ejes (Grammar, Reading, Listening, Writing, Autonomy)
│   ├── sections/
│   │   ├── start-screen.tsx         # Nombre + comenzar
│   │   ├── mcq-section.tsx          # 12 preguntas radio
│   │   ├── reading-section.tsx      # 3 lecturas
│   │   ├── vocab-section.tsx        # Drag & drop (con fallback click en móvil)
│   │   ├── writing-section.tsx      # 5 prompts texto abierto
│   │   ├── listening-section.tsx    # 5 audios TTS
│   │   └── results-dashboard.tsx    # Radar + puntajes + botón PDF
│   └── translate-toggle.tsx         # Botón "Translate / Hide ESP (-50%)"
└── routes/index.tsx                 # Landing: nueva sección highlight + link en nav
```

## Alcance

### 1. Ruta del examen: `/diagnostic-exam`
- Pública (no requiere login). Wizard multi-paso con progress bar y stepper como el original.
- **Secciones**: Use of English (12 MCQ) → Reading (3) → Vocabulary (drag & drop, 5) → Writing (5 respuestas libres) → Listening (5, TTS del navegador) → Results Dashboard.
- Estado persistente en `localStorage` (para no perder progreso si recarga).
- Botón "Translate" por pregunta: al usarlo aplica **penalización -50%** en el puntaje de esa pregunta (misma lógica que el original).
- Puntajes: objetivos (MCQ, Reading, Vocab, Listening = 25 pts) + Writing evaluado por presencia/longitud, más contador de penalizaciones por traducción.
- **Radar chart** dibujado en `<canvas>` con los mismos 5 ejes.
- **Descargar PDF** con `jsPDF` (agregar dependencia): portada con nombre del alumno, resumen de puntajes, radar renderizado como imagen, detalle por sección, recomendaciones. Colores adaptados a la paleta actual (primary/foreground/muted) en vez del navy+amber del original.
- **Guardar lead opcional**: al terminar, botón "Compartir con Teacher Netza" que abre WhatsApp con el resumen numérico prellenado (usa el mismo `WA_URL` de la landing). Sin backend nuevo.

### 2. Landing (`src/routes/index.tsx`)
- Añadir link **"Examen Diagnóstico"** en el nav (desktop y móvil), antes de "Iniciar Sesión".
- Nueva **sección highlight** entre el Hero y "Metodología":
  - Card grande con gradiente destacado (usa `--gradient-primary`).
  - Título "Descubre tu nivel real de inglés en 15 minutos".
  - Bullets: gratis, sin registro, resultado + PDF descargable, incluye Grammar, Reading, Vocabulary, Writing y Listening.
  - Botón primario `Iniciar Examen Diagnóstico` → `Link to="/diagnostic-exam"`.
  - CTA secundario mantiene el flujo hacia Planes/WhatsApp.
- Añadir CTA compacto al final del hero indicando "o haz el examen diagnóstico gratis".

### 3. Adaptaciones al stack
- Fuente: se usa `Plus Jakarta Sans` / `DM Sans` ya cargadas — se descartan `Outfit` y `Playfair` del HTML original.
- Colores: se reemplazan las variables navy/gold por los tokens semánticos existentes (`--primary`, `--secondary`, `--accent`, `--muted`, `--gradient-primary`, `--shadow-elegant`).
- Componentes UI: `Button`, `Input`, `Textarea`, `Card`, `Progress`, `RadioGroup` de shadcn ya presentes.
- Toasts: reutilizar `sonner` (`toast.success/info/error`) en lugar del `ToastService` original.
- Speech synthesis y jsPDF sólo se importan/ejecutan en el cliente (`useEffect`, chequeo `typeof window !== "undefined"`) para no romper SSR.
- Meta `head()` del route: `title` "Examen Diagnóstico de Inglés — Teacher Netza Varo", descripción SEO propia.

### 4. Dependencias nuevas
- `jspdf` (agregado vía `bun add jspdf`).
- No se añade nada más; el chart va en canvas nativo.

## Detalles técnicos relevantes

- `QuestionBank` se copia tal cual del archivo subido (preguntas, respuestas correctas, traducciones, textos de audio).
- La lógica de scoring y penalizaciones se replica fielmente: cada respuesta correcta suma su valor completo o el 50% si se activó la traducción antes de responder.
- El writing se autoevalúa por longitud mínima (>= ~15 caracteres útiles) igual que el original y se marca como "review recommended" en el PDF.
- Drag & drop de vocabulario: uso de HTML5 DnD con **fallback tap-to-select + tap-to-drop** para touch/móvil (el original falla en móvil, aquí lo cubrimos).
- Después de terminar, el estado se puede resetear con un botón "Rehacer examen".

## Fuera de alcance

- No se guarda el resultado en la base de datos ni se asocia a un usuario logueado (se puede añadir después si lo pides).
- No se traducen automáticamente las respuestas de writing; sólo los prompts (ya vienen en el bank).
- No se elimina ninguna funcionalidad existente del LMS.
