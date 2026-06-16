## Diagnóstico

El fallo principal no parece ser la base de datos ni las credenciales: la app publicada está sirviendo el `index.html` de desarrollo, que intenta cargar `/src/main.tsx`. En producción ese archivo no debe existir; por eso el navegador recibe HTML como si fuera JavaScript y bloquea la app con:

```text
Failed to load module script: ... /src/main.tsx ... MIME type "text/html"
```

También detecté que falta el entrypoint cliente (`src/main.tsx` o `src/client.tsx`) en el repo, mientras `index.html` todavía referencia `/src/main.tsx`. Esto deja el preview de desarrollo dependiendo de un entry no confirmado y rompe el despliegue estático/SSR.

## Plan de corrección

1. **Restaurar el arranque cliente correcto de TanStack Start**
   - Crear/normalizar el entry cliente en `src/main.tsx` usando `StartClient` y `hydrateRoot(document, ...)`.
   - Mantener el shell SSR actual (`src/routes/__root.tsx`) como fuente del HTML real.

2. **Corregir `index.html` para que no rompa producción**
   - Actualizarlo para que apunte al entry cliente real y sea compatible con Vite/TanStack Start.
   - Evitar que el build publicado quede con referencias crudas a `/src/main.tsx` sin transformar.

3. **Reordenar configuración de deploy**
   - Revisar y ajustar `vite.config.ts` para no forzar un preset que pueda romper el deploy de Lovable Cloud.
   - Mantener compatibilidad con Vercel solo si el entorno realmente es Vercel.
   - Evitar que PWA escriba assets en un directorio incorrecto para Lovable vs Vercel.

4. **Simplificar/aislar Vercel**
   - Revisar `vercel.json`; si se usa Build Output API, asegurar que no trate `.vercel/output` como carpeta estática.
   - Si el build estándar de TanStack/Nitro ya genera salida correcta, quitar restos del adaptador manual obsoleto para evitar confusión.

5. **Verificar variables sin exponer secretos**
   - Confirmar que las variables esperadas existen en `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.
   - No modificar los archivos autogenerados de integración ni imprimir valores sensibles.

6. **Añadir guardas de error SSR si faltan**
   - Revisar si conviene añadir error boundary/default error component para que errores server-side no se conviertan en página en blanco.
   - Mantenerlo mínimo y enfocado al deploy.

7. **Validación final**
   - Comprobar en preview que la app carga y ya no intenta pedir `/src/main.tsx` como asset publicado.
   - Inspeccionar red/console para confirmar que el error MIME desaparece.

## Archivos probables a tocar

- `src/main.tsx` o `src/client.tsx`
- `index.html`
- `vite.config.ts`
- `vercel.json`
- opcionalmente `src/router.tsx` / `src/routes/__root.tsx` solo si hace falta boundary de error

No tocaré claves privadas ni archivos autogenerados de la integración backend.