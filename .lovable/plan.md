## Diagnóstico

La página se queda en blanco porque el HTML que sirve el deploy (tanto Lovable como Vercel) es el `index.html` estático en la raíz del proyecto. Ese archivo contiene:

```html
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
```

Pero `src/main.tsx` **no existe** — este proyecto usa TanStack Start v1, que genera el HTML de SSR a través del `shellComponent` en `src/routes/__root.tsx`. El `index.html` heredado de un template anterior (Vite SPA) está secuestrando el build: el bundler lo trata como punto de entrada estático, no llama al SSR, y el navegador termina pidiendo `/src/main.tsx` que devuelve HTML → MIME error → pantalla en blanco.

Las redes confirman exactamente eso: el HTML servido lleva `<script src=".../src/main.tsx">` y no hay ningún bundle de cliente cargado.

## Plan

1. **Eliminar `index.html` de la raíz.** TanStack Start no lo usa; el HTML lo emite `__root.tsx` (`shellComponent` con `<HeadContent />` + `<Scripts />`).
2. **Verificar que `src/router.tsx` + `src/routes/__root.tsx` + `src/start.ts` están intactos** (ya confirmado: existen y son correctos).
3. **Verificar que no quedan referencias a `/src/main.tsx`** en otros archivos del proyecto.
4. **Dejar `vite.config.ts` y `vercel.json` como están** — `nitro: true` permite que Lovable use `cloudflare-module` y que Vercel auto-detecte `VERCEL=1` y emita `.vercel/output`. No tocar.
5. **Validar el preview** después del cambio para confirmar que el shell de TanStack se renderiza y la app monta.

## Archivos afectados

- borrar: `index.html`
- sin cambios: `vite.config.ts`, `vercel.json`, `package.json`, `src/router.tsx`, `src/routes/__root.tsx`, `src/start.ts`

Después de implementar, el deploy de Lovable y el de Vercel servirán el HTML generado por SSR con los scripts del bundle correctos, y la app cargará.
