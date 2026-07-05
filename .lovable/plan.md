## Diagnóstico

El error "Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY" viene del **cliente admin ejecutándose en el navegador**. En TanStack Start, los archivos `*.functions.ts` importan al top-level `supabaseAdmin` desde `@/integrations/supabase/client.server`, pero solo los cuerpos de los handlers se eliminan del bundle cliente — los imports de módulo se conservan. Al abrir el modal "Create course", el bundle intenta instanciar `supabaseAdmin` en el navegador, donde `process.env.SUPABASE_URL` es `undefined`, y lanza el error.

Esto rompe crear cursos, teachers, students, invitaciones, etc.

## Plan

### 1. Corregir importación del cliente admin (fix del bug)

En estos 13 archivos, reemplazar el `import` de nivel superior de `supabaseAdmin` por `await import(...)` dentro de cada `.handler()`:

- `src/lib/admin.functions.ts`
- `src/lib/courses.functions.ts`
- `src/lib/activities.functions.ts`
- `src/lib/announcements.functions.ts`
- `src/lib/calendar.functions.ts`
- `src/lib/catalog.functions.ts`
- `src/lib/certificates.functions.ts`
- `src/lib/comments.functions.ts`
- `src/lib/grading.functions.ts`
- `src/lib/invitations.functions.ts`
- `src/lib/notes.functions.ts`
- `src/lib/student-course.functions.ts`
- `src/routes/api/public/seed.ts` (route file — mismo problema)

Además, revisar si algunas funciones deben migrar a `requireSupabaseAuth` (usar el cliente con RLS del usuario) en vez de service-role, para reducir superficie de riesgo. Prioridad: dejar admin solo para operaciones realmente privilegiadas (invitaciones, seed, backfills).

### 2. Verificación

- Reproducir el flujo de "Create course" en el preview y confirmar que ya no aparece el error rojo.
- Probar crear teacher, student e invitación.

### 3. Mejoras y ampliaciones sugeridas (a discutir)

Áreas donde la app puede crecer, para que elijas cuáles atacar en siguientes iteraciones:

**UX/Producto**

- Onboarding de alumno: página de bienvenida con próximas clases, tareas pendientes y progreso semanal.
- Panel del profesor con métricas: alumnos activos, tareas por calificar, promedio del curso.
- Notificaciones (campana + email) para nuevas tareas, calificaciones, comentarios y anuncios.
- Búsqueda global de cursos, lecciones y alumnos.

**Contenido y evaluación**

- Editor de lecciones más rico: video embed (YouTube/Vimeo), audio, PDFs, imágenes.
- Nuevos tipos de actividad: fill-in-the-blanks, dictado (audio→texto), pronunciación (grabar y comparar), speaking prompts.
- Rúbricas configurables y feedback por voz en calificaciones.
- Banco de vocabulario y flashcards por lección con repaso espaciado.

**Landing/Marketing**

- Testimonios de alumnos, sección de FAQ, formulario de contacto que guarde leads.
- Integración con analytics (GA4/Plausible) y píxel de conversión.
- Blog para SEO (posts con MDX o desde DB).

**Operativo / negocio**

- Sistema de pagos (Stripe o Paddle) para el Plan Mensual y paquetes de horas.
- Reservas de clase con calendario (integración Google Calendar).
- Certificados con QR verificable públicamente.
- Reportes exportables (CSV/PDF) de progreso por alumno.

**Técnico**

- PWA con caché offline de lecciones ya vistas.
- Modo claro/oscuro (ya hay tokens; falta toggle).
- i18n español/inglés en la UI.

## Detalles técnicos

Patrón a aplicar en cada `.functions.ts`:

```ts
// ANTES (rompe el navegador)
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const createCourse = createServerFn(...)
  .handler(async ({ data }) => {
    await supabaseAdmin.from("courses").insert(...);
  });

// DESPUÉS
export const createCourse = createServerFn(...)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("courses").insert(...);
  });
```

Los archivos `.server.ts` (no `.functions.ts`) sí pueden importarlo al top-level; el bloqueo del bundle es por nombre `.server`.

---

¿Aplico el fix del bug (paso 1 y 2) ahora y luego elegimos qué mejoras del paso 3 priorizar en siguientes turnos? R: si, haz primero 1 y 2