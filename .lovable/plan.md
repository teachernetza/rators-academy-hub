
# Sistema integral de actividades, asignación y revisión iterativa

Sistema completo de creación, asignación, resolución y revisión iterativa de actividades (tareas escritas, unir, ordenar) para la plataforma educativa, con biblioteca por nivel CEFR (A1–C2), aprobación por sección y bucle estudiante↔maestro hasta aprobación total.

## 1. Base de datos (Lovable Cloud)

Nuevas tablas (todas con RLS + GRANTs + timestamps + trigger updated_at):

**`activities`** — plantillas en la biblioteca
- `id`, `title`, `description`, `cefr_level` (enum A1/A2/B1/B2/C1/C2), `created_by` (uuid → profiles), `is_published` (bool), timestamps.

**`activity_sections`** — secciones ordenadas dentro de una plantilla
- `id`, `activity_id`, `order_index`, `title`, `instructions`,
- `section_type` enum: `open_text`, `match_pairs`, `order_words`,
- `config` (jsonb): para `match_pairs` `{ pairs:[{left,right}] }`; para `order_words` `{ items:[...], correct_order:[...] }`; vacío para `open_text`.

**`activity_assignments`** — asignación de plantilla a un estudiante
- `id`, `activity_id`, `student_id`, `assigned_by`, `assigned_at`, `due_date?`,
- `status` enum `assignment_status`: `pending`, `in_review`, `changes_requested`, `approved`,
- `current_reviewer_id` (uuid, maestro destinatario actual), `approved_at?`.

**`assignment_submissions`** — cada envío del estudiante (iteración)
- `id`, `assignment_id`, `attempt_number`, `submitted_at`, `submitted_to` (maestro), `reviewed_at?`, `reviewer_id?`, `overall_status` (`in_review`/`changes_requested`/`approved`), `overall_feedback?`.

**`submission_section_responses`** — respuesta por sección de un envío
- `id`, `submission_id`, `section_id`, `response` (jsonb: `{text}` | `{pairs:[{left,right}]}` | `{order:[...]}`),
- `section_status` enum: `pending_review`, `approved`, `changes_requested`,
- `teacher_comment?`, `reviewed_at?`.

**Políticas RLS clave** (vía `has_role` / nuevas funciones SECURITY DEFINER):
- Activities/sections: lectura para admin+teacher; escritura para admin y teacher creador.
- Assignments: estudiante ve los suyos; maestro ve donde es `assigned_by` o `current_reviewer_id`; admin ve todo.
- Submissions + responses: estudiante propietario lee/escribe sus respuestas mientras la asignación está en `pending`/`changes_requested`; maestro destinatario lee y actualiza estado/comentarios.
- GRANTs explícitos a `authenticated` y `service_role` en cada tabla.

## 2. Server functions (`src/lib/activities.functions.ts`, `assignments.functions.ts`)

Todas con `requireSupabaseAuth`:
- `listActivities({level?})`, `getActivity(id)`, `createActivity`, `updateActivity`, `deleteActivity`.
- `upsertActivitySections(activityId, sections[])` (reemplazo transaccional ordenado).
- `assignActivity({activityId, studentId, dueDate?})` — crea `activity_assignments` con status `pending`.
- `listStudentAssignments({status?})` y `listTeacherInbox()` (donde `current_reviewer_id = auth.uid()` y status `in_review`).
- `submitAssignment({assignmentId, teacherId, responses[]})` — crea `assignment_submissions` (attempt = max+1) + `submission_section_responses`, pone assignment en `in_review` y `current_reviewer_id = teacherId`.
- `reviewSection({responseId, status, comment})` — actualiza una sección.
- `finalizeReview({submissionId, decision: 'approved'|'changes_requested', overallFeedback?})` — al `approved` marca assignment `approved` y `approved_at`; al `changes_requested` pone assignment en `changes_requested` para que el estudiante itere.
- Validación de roles + ownership en cada handler (no confiar solo en RLS).

## 3. Rutas y UI

Diseño: navy `#0B1F3A` primario, turquesa `#2EC4B6` acento, blanco `#FFFFFF` fondo. Tokens semánticos en `src/styles.css` (`--primary`, `--accent`, `--background`, surfaces, `--shadow-elegant`, badges de estado). Sin colores hardcodeados.

**Badges de estado** (componente reutilizable `StatusBadge`): pending (gris), in_review (turquesa), changes_requested (ámbar), approved (verde sobrio).

### Admin / Maestro
- `src/routes/admin/activities.tsx` y `src/routes/teacher/activities.tsx` — **Biblioteca**: lista con tabs por nivel A1–C2, búsqueda, botón "Nueva actividad".
- `src/routes/admin/activities.$id.tsx` (y teacher equivalente) — **Editor de actividad**: metadatos + builder de secciones ordenables (drag/handle), selector de tipo por sección (texto abierto / unir / ordenar) con editor específico para `config`.
- En `src/routes/admin/students.tsx` (perfil del estudiante) y `src/routes/teacher/students.tsx`: botón **"Asignar actividad"** → modal `AssignActivityDialog` con filtro por nivel + lista buscable + fecha opcional.

### Estudiante
- `src/routes/student/activities.tsx` — panel con tabs: **Pendientes / En revisión / Requiere cambios / Aprobadas (historial)**.
- `src/routes/student/activities.$assignmentId.tsx` — **Resolución**: renderiza cada sección según `section_type`; si la asignación es iteración (`changes_requested`), muestra comentarios del maestro por sección encima del input; footer con `<Select>` de maestro destinatario + botón "Enviar para revisión".

### Maestro — Revisión
- `src/routes/teacher/inbox.tsx` — **Buzón**: tabla de entregas recibidas (estudiante, actividad, nivel, enviada el, intento #).
- `src/routes/teacher/inbox.$submissionId.tsx` — **Revisión**: por cada sección, ve respuesta + acciones inline "Aprobar sección" / "Pedir cambios" (textarea de comentario). Footer con dos acciones globales: **Aprobar actividad** (cierra y archiva) o **Devolver con observaciones** (requiere ≥1 sección en `changes_requested`).

### Navegación
Añadir entradas en `dashboard-layout` para Biblioteca (admin/teacher), Buzón (teacher) y Actividades (student). Eliminar/renombrar la "Grading" existente si se solapa.

## 4. Bucle iterativo

- Al `finalizeReview('changes_requested')`: assignment vuelve a `changes_requested`, estudiante ve la tarjeta con los comentarios; al re-enviar, se crea nuevo `assignment_submissions` con `attempt_number+1` al mismo maestro por defecto (selector permite cambiar). Histórico de intentos visible en una pestaña "Historial" del detalle.
- Al `finalizeReview('approved')`: assignment pasa a `approved`, desaparece del buzón del maestro y aparece en pestaña "Aprobadas" del estudiante con fecha.

## 5. Detalles técnicos

- Validación con Zod en `inputValidator` de cada server fn (longitudes, enums, arrays).
- Loaders en rutas autenticadas usan `ensureQueryData` + `useSuspenseQuery`; cada ruta define `errorComponent` y `notFoundComponent`.
- Realtime opcional (fase 2) sobre `activity_assignments` para actualizar buzón sin recargar.
- No tocar archivos auto-generados de Supabase ni de routeTree.

## 6. Entregables

- 1 migración SQL (enums + 5 tablas + GRANTs + RLS + funciones helper + triggers updated_at).
- Server fns: `activities.functions.ts`, `assignments.functions.ts`.
- Componentes: `StatusBadge`, `SectionEditor` (3 variantes), `SectionResponse` (3 variantes), `AssignActivityDialog`, `TeacherSelector`.
- 8 rutas nuevas (admin x2, teacher x3, student x2 + 1 detalle).
- Tokens de diseño actualizados en `src/styles.css`.

## Fuera de alcance (a confirmar después)

- Calificación numérica/rúbrica (el flujo es aprobado/cambios, no nota).
- Notificaciones por email.
- Adjuntar archivos en respuestas del estudiante.
