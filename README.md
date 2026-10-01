# Pulso: salud y rendimiento con tu Garmin fēnix 8

Panel web local que descarga tus datos de **Garmin Connect** y los organiza en
secciones, como la app de Garmin, con un **entrenador personal**, **indicadores
de riesgo de salud**, explicaciones en lenguaje sencillo y consejos para configurar tu reloj.

**Stack:** Python 3.11 · FastAPI · SQLite · JavaScript sin frameworks · Chart.js · API de Claude (opcional)

## Cómo se construyó: desarrollo asistido por IA

Este proyecto lo desarrollé con **[Claude Code](https://claude.com/claude-code)** (Anthropic) como
asistente de programación.

**Mi parte:** definí el producto y sus prioridades, tomé las decisiones de diseño, probé la app
con los datos reales de mi reloj y detecté lo que no funcionaba. **La parte de la IA:** implementó
el código, lo verificó en el navegador y propuso alternativas técnicas.

Cómo evolucionó:

1. **Base:** panel local conectado a Garmin Connect, con secciones de sueño, recuperación y
   rendimiento, más índices propios de recuperación, esfuerzo y sueño.
2. **Diferenciación:** al ver que se parecía demasiado a la app de Garmin, pedí un entrenador personal,
   indicadores de riesgo de salud, explicaciones para una persona sin formación técnica y consejos
   de configuración del reloj.
3. **Integración selectiva:** evalué un servidor MCP de Garmin de la comunidad. En vez de añadirlo
   como dependencia (necesitaba Node.js y otro inicio de sesión), incorporamos lo que aportaba
   valor: el detalle de cada actividad (parciales, series de pulso y ritmo, clima, ejercicios de fuerza).
4. **Pruebas con datos reales:** salieron problemas que los datos de prueba no mostraban. Por ejemplo,
   Garmin bloqueaba los inicios de sesión repetidos, una sesión de fuerza se evaluaba como
   intervalos y el ratio de carga se calculaba con muy pocos días. Los corregimos sobre la marcha.

Los commits incluyen la línea `Co-Authored-By: Claude`, por lo que GitHub muestra la coautoría
de la IA en cada cambio.

## Cómo abrirla

1. Haz doble clic en **`iniciar.bat`**. La primera vez instala las dependencias.
2. Se abre `http://localhost:8765` en el navegador.
3. Pulsa **Conectar** con tu correo y contraseña de Garmin Connect (y el código
   de verificación si Garmin lo pide), o **Ver demo** para probar con datos ficticios.
4. La primera sincronización descarga 60 días (tarda unos minutos). Luego usa
   **Sincronizar** cada día; desde *Cuenta Garmin* puedes bajar 90 o 180 días.

Requisito: Python 3.10 o superior.

## Secciones

| Sección | Qué te da |
|---|---|
| **Hoy** | Resumen en palabras simples, la sesión que te recomienda el entrenador, alertas de salud, índices de Recuperación/Esfuerzo/Sueño y "Mi día" de Garmin |
| **Entrenador** | Recomendación del día según tu recuperación, plan de 7 días según tu objetivo y fase, tus zonas de pulso y ritmos personales, revisión de la semana (carga, 80/20, descanso, monotonía), nota de 1 a 10 con comentarios para cada sesión y chat con IA (opcional) |
| **Salud** | Salud cardiovascular (AHA Life's Essential 8) e indicadores de riesgo de hipertensión, infarto, ACV, arritmias, apnea del sueño, diabetes tipo 2 y lesión por sobrecarga, cada uno con sus factores explicados y qué hacer. Detecta además señales tempranas de enfermedad y muestra la tendencia de tus signos vitales |
| **Sueño / Recuperación / Rendimiento** | Todas las métricas de Garmin con una explicación diaria en lenguaje sencillo y un botón **?** en cada métrica (qué es, por qué importa, valores de referencia y cómo mejorarla) |
| **Actividades** | Historial con la evaluación del entrenador para cada sesión |
| **Mi reloj** | Cómo usas el fēnix 8 (noches registradas, VFC, SpO₂, horas de uso) y consejos de configuración priorizados según tus actividades y tus datos |
| **Perfil** | Objetivo, fecha y tiempo de tu carrera, días de entrenamiento y cuestionario de salud (presión, colesterol, glucosa, tabaco, antecedentes) para afinar los indicadores |

### Entrenador con IA (opcional)

Añade `ANTHROPIC_API_KEY=tu_clave` al archivo `.env` (cópialo desde `.env.example`) y reinicia.
En la pestaña Entrenador podrás preguntarle a Claude sobre tus datos, pedir el análisis detallado
de una sesión o un plan a medida. Cada pregunta envía a Anthropic un resumen de tus últimas semanas
y tiene un coste de unos céntimos. Sin clave, todo lo demás funciona igual.

### Sobre los indicadores de salud

No son diagnósticos. Combinan factores de riesgo reconocidos (AHA, OMS, guías de hipertensión y
sueño) con lo que mide el reloj. El fēnix 8 **no mide** presión arterial, colesterol ni glucosa:
regístralos en Garmin Connect o en el Perfil para que los indicadores sean completos. Ante síntomas
o valores preocupantes, consulta a tu médico.

## Privacidad

- Todo corre en tu PC. Los datos se guardan en `data/garmin.db` (SQLite).
- La contraseña **no se guarda**: solo un token de sesión en `data/garmin_tokens/`.
  *Cerrar sesión* lo borra.
- Opcional: copia `.env.example` como `.env` con tus credenciales para que
  inicie sesión sola al arrancar.

### Qué NO está en este repositorio

El `.gitignore` excluye todo lo personal:

- `.env`: credenciales de Garmin y clave de API. Solo se publica la plantilla vacía `.env.example`.
- `data/`: base de datos con los datos de salud y tokens de sesión de Garmin.

Para probar la app sin una cuenta de Garmin, usa el **modo demo**, que genera datos ficticios.

## Notas

- Usa la librería no oficial [`garminconnect`](https://github.com/cyberjunky/python-garminconnect).
  La API oficial de Garmin (Health API) solo está disponible para empresas aprobadas.
  Si Garmin cambia su web, actualízala con `python -m pip install -U garminconnect`.
- Los índices de Recuperación (%), Esfuerzo (0–21) y Rendimiento del sueño son cálculos propios
  de Pulso con tus datos de Garmin (ver `backend/analytics.py`).
- La Recuperación necesita al menos 4 noches con VFC para calcular tu línea base.
- Para depurar un día: `http://localhost:8765/api/raw/AAAA-MM-DD` muestra lo que devolvió Garmin.

## Estructura

```
backend/
  app.py            servidor FastAPI (API + interfaz)
  garmin_client.py  inicio de sesión (con MFA) y descarga
  storage.py        caché SQLite
  normalizer.py     JSON de Garmin → registro diario limpio
  analytics.py      índices de Recuperación, Esfuerzo y Sueño
  coach.py          entrenador: evaluación de sesiones, semana, plan y zonas
  health.py         indicadores de riesgo y Life's Essential 8
  explain.py        explicaciones diarias en lenguaje sencillo
  device_tips.py    análisis de uso y consejos para el reloj
  ai_coach.py       chat con Claude (opcional)
  profile.py        objetivos y cuestionario de salud
  demo_data.py      datos de demostración
frontend/
  index.html, styles.css, app.js, views_extra.js   interfaz (Chart.js)
```
