## Diagnóstico real

Tu sistema **no** es falso y el plan gratuito de Lovable Cloud **sí** soporta esto (crear usuarios vía Auth Admin API está incluido). El error real, visto en los logs del sitio publicado:

```
Error: Server function info not found for adminListUsers
POST /_serverFn/adminListUsers → 500
```

Causa: en `src/lib/admin.functions.ts` los `.handler(...)` de cada `createServerFn` usan helpers definidos a **nivel de módulo** (`admin()`, `assertAdmin()`, `getRole()`, `generatePassword()`). El transform de TanStack Start que separa server functions **elimina** el código de módulo al empaquetar el worker de producción; los handlers quedan huérfanos y no se registran en el manifest → 500 en producción, aunque en preview funciona porque el splitter se comporta distinto en dev.

Esto también afecta a `adminCreateUser`, `adminDeleteUser`, `adminToggleActive`, `adminUpdateUser`, `adminUpdateRole`, `adminResetPassword`, `adminListByRole`, `adminEnrollStudent`, `adminGetStats` — por eso "no puedes crear usuarios".

## Solución

Mover los helpers a un módulo server-only aparte y que los handlers los importen. Sin cambios de UI, sin cambios de DB, sin cambios de env vars.

### Cambios

1. **Nuevo archivo `src/lib/admin-helpers.server.ts`** (server-only por el sufijo `.server.ts`, bloqueado del bundle cliente):
   - Exporta `getSupabaseAdmin()` (obtiene `supabaseAdmin` dinámicamente).
   - Exporta `assertAdmin(userId)`.
   - Exporta `getRole(userId)`.
   - Exporta `generatePassword(length?)`.

2. **Reescribir `src/lib/admin.functions.ts`**:
   - Eliminar los helpers de módulo.
   - Cada `.handler()` hace `const { assertAdmin, getSupabaseAdmin, ... } = await import("./admin-helpers.server")` en su primera línea y luego los usa.
   - Nada más cambia: mismas firmas, mismos schemas Zod, mismo comportamiento.

3. **Verificación**:
   - `tsgo` typecheck.
   - `invoke-server-function` contra `/_serverFn/adminListUsers` con Authorization bearer para confirmar 200 (o 403 controlado, no 500).
   - Revisar logs del worker para confirmar que ya no aparece "Server function info not found".

### Lo que NO cambia

- `client.server.ts`, env vars, RLS, migraciones, UI, rutas — todo intacto.
- Sigues teniendo `SUPABASE_SERVICE_ROLE_KEY` ya inyectado por Lovable Cloud (no hay que configurar nada manual).
- El sitio publicado en `rators-academy-hub.lovable.app` recupera funcionalidad completa de admin tras el re-deploy automático.

## Sobre Vercel

Tu app publicada corre en Lovable (`.lovable.app`), no en Vercel. El `vercel.json` existe pero no está activo en esta URL. Si además desplegas en Vercel, ahí sí tendrías que agregar manualmente `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, y las `VITE_*`. Pero para el problema actual, no hace falta tocar Vercel.
