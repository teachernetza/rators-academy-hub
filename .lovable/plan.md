## Objetivo

Dejar el sistema de autenticación, autorización y administración de usuarios completamente funcional en desarrollo y en producción (Vercel), eliminar el error `Missing Supabase environment variable(s): SUPABASE_SERVICE_ROLE_KEY`, y ampliar el panel de admin con edición, reset de contraseña, cambio de rol y búsqueda.

## Diagnóstico

1. **Causa del error del Service Role Key.** El proyecto está desplegado en Vercel (`vercel.json`). Las variables `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` existen en Lovable Cloud pero **no** están cargadas en Vercel. `src/integrations/supabase/client.server.ts` las exige y lanza ese mensaje exacto cuando faltan. Es un problema de configuración de entorno, no de código.
2. **Uso del Service Role.** Ya está aislado en `client.server.ts` y sólo se importa dinámicamente dentro de `.handler()` de server functions (`admin.functions.ts`, `activities.functions.ts`). Nunca llega al bundle del cliente. Se validará que ninguna nueva ruta lo importe a nivel de módulo.
3. **Panel de admin (`src/components/admin-users-page.tsx`).** Hoy sólo permite crear, borrar y activar/desactivar. Faltan: editar nombre, cambiar rol, resetear contraseña, y buscar/filtrar.
4. **RLS.** Las tablas ya tienen RLS habilitado con políticas basadas en `has_role()` y `auth.uid()`. Se ejecutará el linter de Supabase y se corregirá lo que reporte (p.ej. políticas faltantes en tablas nuevas o `security definer` sin `search_path`).
5. **`profiles` al crear usuario.** Existe trigger `handle_new_user` que auto-inserta en `profiles`. `adminCreateUser` además hace `upsert` de respaldo — correcto.

## Cambios de código

**Backend (server functions en `src/lib/admin.functions.ts`)** — agregar:
- `adminUpdateUser({ id, full_name })`
- `adminUpdateRole({ id, role })` — solo admin
- `adminResetPassword({ id })` — usa `auth.admin.updateUserById` con contraseña generada, devuelve la nueva contraseña una sola vez
- Validación estricta con Zod, `assertAdmin` en todas, manejo de errores explícito.

**RLS/Postgres** — migración para:
- Bloquear que un usuario cambie su propio `role` en `profiles` (política de UPDATE que excluye la columna `role` para no-admin, vía trigger `BEFORE UPDATE`).
- Añadir `GRANT` faltantes que reporte el linter.

**Frontend (`src/components/admin-users-page.tsx`)** — rediseñar tabla con:
- Barra de búsqueda (nombre/email) + filtro por rol y estado.
- Menú de acciones por fila: Editar, Cambiar rol, Resetear contraseña, Activar/Desactivar, Eliminar.
- Diálogos para cada acción con feedback vía `toast`.
- Los diálogos actuales de Perfil y Asignar actividad se conservan.

**Verificación** — ejecutar en el sandbox:
- Typecheck (`tsgo`).
- Linter de Supabase (`supabase--linter`) y arreglar hallazgos.
- Pruebas manuales por Playwright: login admin, crear teacher, editar, resetear password, cambiar rol, desactivar, borrar; login como teacher, verificar que no puede acceder a rutas admin ni cambiar su propio rol vía API.

## Variables de entorno

**No cambia** lo que Lovable Cloud ya inyecta. Lo que hay que configurar **manualmente en Vercel** (Project → Settings → Environment Variables, para *Production*, *Preview* y *Development*):

| Variable | Valor | Dónde obtenerla |
|---|---|---|
| `SUPABASE_URL` | igual a `VITE_SUPABASE_URL` de tu `.env` | Lovable → Backend → API |
| `SUPABASE_PUBLISHABLE_KEY` | igual a `VITE_SUPABASE_PUBLISHABLE_KEY` | Lovable → Backend → API |
| `SUPABASE_SERVICE_ROLE_KEY` | secret `service_role` | Lovable → Backend → API keys → *Service role* (Reveal) |
| `VITE_SUPABASE_URL` | mismo valor de `SUPABASE_URL` | idem |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | mismo valor | idem |
| `VITE_SUPABASE_PROJECT_ID` | ref del proyecto | Lovable → Backend → API |

`SUPABASE_SERVICE_ROLE_KEY` se marca como *Sensitive*. Nunca lleva prefijo `VITE_`. Tras agregarlas, redeploy en Vercel.

En Lovable no hay que tocar nada: las mismas variables ya están presentes como secrets del backend.

## Entregable final

Al terminar la implementación entregaré un reporte con: problemas encontrados, solución aplicada, archivos modificados, variables a configurar (arriba), configuraciones en Supabase (ninguna manual: todo vía migración) y resultados de las pruebas ejecutadas.
