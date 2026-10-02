# Estándares del proyecto

Estos estándares aplican a todo el código de este repositorio (y son la base para proyectos nuevos
del mismo autor). Respétalos al añadir o modificar código.

## Stack

- **TypeScript estricto** en todo el código (`strict: true`). Nada de JavaScript suelto.
- **Backend: NestJS** (`apps/api`). Lógica en funciones puras por dominio; los servicios Nest solo orquestan.
- **Frontend: Next.js (App Router) + React** (`apps/web`). Componentes cliente con `"use client"` cuando usan estado.
- **Tipos compartidos** en `packages/shared`: cualquier dato que viaje entre API y web se tipa ahí, una sola vez.
- Monorepo con **npm workspaces**.

## Clean code

- **Máximo 200 líneas por archivo** (código, estilos y scripts). Si un archivo crece, se divide por
  responsabilidad. Verificación obligatoria antes de cada commit: `npm run check`.
- Un archivo = una responsabilidad clara; nombres descriptivos en español para dominio y textos de UI.
- Funciones pequeñas y puras cuando sea posible (más fáciles de probar y de leer).
- Comentarios solo para explicar el *porqué* (decisiones, fórmulas, límites de Garmin), no el *qué*.
- `any` solo donde una librería lo obliga (respuestas crudas de Garmin, tipos de Chart.js), aislado y comentado.

## Seguridad y privacidad

- Nunca subir `.env`, `data/`, tokens ni bases de datos (ya están en `.gitignore`).
- La API escucha solo en `127.0.0.1`.
- Los textos de salud son orientativos: nunca presentarlos como diagnóstico.

## Flujo de trabajo

- Commits pequeños y descriptivos (en español), con `Co-Authored-By` de Claude cuando intervino la IA.
- Antes de subir: `npm run check` y probar la app (`npm run dev`) en el navegador.
- El autor publica en GitHub con su correo privado `noreply` de GitHub; nunca exponer su correo personal.
