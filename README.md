# Pulso: salud y rendimiento con tu Garmin fēnix 8

Panel web local que descarga tus datos de **Garmin Connect** y los convierte en un
**entrenador personal**, **indicadores de riesgo de salud**, explicaciones en lenguaje
sencillo y consejos para configurar tu reloj.

**Stack:** TypeScript · NestJS (API) · Next.js + React (web) · SQLite · Chart.js · API de Claude (opcional)

## Cómo se construyó: desarrollo asistido por IA

Este proyecto lo desarrollé con **[Claude Code](https://claude.com/claude-code)** (Anthropic) como
asistente de programación.

**Mi parte:** definí el producto y sus prioridades, tomé las decisiones de diseño y de arquitectura,
probé la app con los datos reales de mi reloj y detecté lo que no funcionaba. **La parte de la IA:**
implementó el código, lo verificó en el navegador y propuso alternativas técnicas.

Cómo evolucionó:

1. **Base:** panel local conectado a Garmin Connect con secciones de sueño, recuperación y
   rendimiento, más índices propios de recuperación, esfuerzo y sueño.
2. **Diferenciación:** al ver que se parecía demasiado a la app de Garmin, pedí un entrenador personal,
   indicadores de riesgo de salud, explicaciones para una persona sin formación técnica y consejos
   de configuración del reloj.
3. **Integración selectiva:** evalué un servidor MCP de Garmin de la comunidad. En vez de añadirlo
   como dependencia, incorporamos lo que aportaba valor: el detalle de cada actividad (parciales,
   series de pulso y ritmo, clima, ejercicios de fuerza).
4. **Pruebas con datos reales:** salieron problemas que los datos de prueba no mostraban (bloqueo de
   inicios de sesión repetidos, una sesión de fuerza evaluada como intervalos, el ratio de carga
   calculado con muy pocos días) y los corregimos.
5. **Migración a estándares de la industria:** reescribí el proyecto de Python + JavaScript a
   **TypeScript con NestJS y Next.js**, en un monorepo con tipos compartidos y la regla de que
   **ningún archivo supere las 200 líneas** (se verifica con `npm run check:lines`).

Los commits incluyen la línea `Co-Authored-By: Claude`, por lo que GitHub muestra la coautoría
de la IA en cada cambio.

## Cómo abrirla

Requisitos: **Node.js 22.13 o superior** (LTS) y, para el primer inicio de sesión en Garmin, **Python 3.10+**.

1. Haz doble clic en **`iniciar.bat`**. La primera vez instala dependencias y compila (1–2 min).
2. Se abre **http://localhost:3000** en el navegador. No cierres la ventana negra mientras la uses.
3. Pulsa **Conectar** con tu cuenta de Garmin Connect (o **Ver demo** para probar con datos ficticios).
4. Usa **Sincronizar** cada día; desde *Cuenta Garmin* puedes bajar 90 o 180 días de historial.

Para desarrollar (recarga automática al guardar):

```bash
npm install
npm run dev
```

## Secciones

| Sección | Qué te da |
|---|---|
| **Hoy** | Resumen en palabras simples, la sesión recomendada, alertas de salud, índices del día y "Mi día" de Garmin |
| **Entrenador** | Recomendación diaria según tu recuperación, plan de 7 días, zonas y ritmos personales, revisión semanal, nota de 1 a 10 por sesión y chat con IA (opcional) |
| **Salud** | Life's Essential 8 (AHA) e indicadores de hipertensión, infarto, ACV, arritmias, apnea, diabetes tipo 2 y lesión por sobrecarga, con alerta temprana de enfermedad |
| **Sueño / Recuperación / Rendimiento** | Métricas de Garmin explicadas cada día y un botón **?** en cada una |
| **Actividades** | Historial con evaluación, parciales, pulso y ritmo, desacople aeróbico y clima |
| **Mi reloj** | Cómo usas el fēnix 8 y consejos de configuración priorizados |
| **Perfil** | Objetivo, carrera y cuestionario de salud para afinar los indicadores |

## Arquitectura

```
apps/
  api/   NestJS (puerto 8765): sincroniza Garmin y calcula todo
    src/garmin/     cliente HTTP, tokens, sincronización y login
    src/normalize/  JSON de Garmin → registros diarios tipados
    src/analytics/  índices de recuperación, esfuerzo y sueño
    src/coach/      evaluación de sesiones, revisión semanal y planes
    src/health/     factores de riesgo, Life's Essential 8 y alertas
    src/explain/    explicaciones en lenguaje sencillo
    src/device/     uso del reloj y consejos de configuración
    src/ai/         chat con Claude (opcional)
    src/demo/       datos de demostración deterministas
  web/   Next.js (puerto 3000): interfaz; /api/* se reenvía a la API
    src/views/      una carpeta por sección
    src/components/ piezas reutilizables (gráficos, tarjetas, actividad…)
packages/shared/    tipos TypeScript compartidos por api y web
tools/garmin-login/ puente en Python solo para el primer inicio de sesión
scripts/            check-lines.mjs (regla de 200 líneas)
```

**Por qué hay un script de Python:** Garmin bloquea los inicios de sesión de clientes que no imitan a
su app oficial, y la librería [`garminconnect`](https://github.com/cyberjunky/python-garminconnect) lo
resuelve con técnicas que no existen en Node. Se usa solo para el login con contraseña; la renovación
de la sesión y toda la descarga de datos están en TypeScript.

## Calidad

```bash
npm run typecheck     # TypeScript estricto en api y web
npm run check:lines   # ningún archivo de código supera 200 líneas
npm run check         # ambos
```

## Privacidad

- Todo corre en tu PC: la API solo escucha en `127.0.0.1`. Los datos están en `data/garmin.db`.
- La contraseña **no se guarda**: solo un token de sesión en `data/garmin_tokens/`. *Cerrar sesión* lo borra.
- El `.gitignore` excluye `.env` (credenciales y clave de API) y `data/` (salud y sesión).
- Con el entrenador con IA activado, cada pregunta envía un resumen de tus datos a Anthropic.

### Entrenador con IA (opcional)

Añade `ANTHROPIC_API_KEY=tu_clave` al archivo `.env` (cópialo desde `.env.example`) y reinicia.
Cada pregunta cuesta unos céntimos. Sin clave, todo lo demás funciona igual.

### Sobre los indicadores de salud

No son diagnósticos. Combinan factores de riesgo reconocidos (AHA, OMS, guías de hipertensión y
sueño) con lo que mide el reloj, que **no mide** presión arterial, colesterol ni glucosa:
regístralos en Garmin Connect o en el Perfil. Ante síntomas o valores preocupantes, consulta a tu médico.
