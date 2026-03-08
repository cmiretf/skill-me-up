# skill-me-up

## What This Is

`skill-me-up` es un CLI de Node.js (zero dependencias) que analiza cualquier proyecto de código y genera archivos `agent_<folder>_instructions.md` dentro de cada carpeta relevante. Estos archivos dan contexto estructural a los agentes AI (Claude, Copilot, Cursor) para que entiendan el codebase y contribuyan correctamente.

El siguiente milestone mejora la calidad y profundidad del output generado: `.md` más ricos que hagan que los agentes AI cometan menos errores.

## Core Value

Los `.md` generados deben ser tan buenos que un agente AI que solo los lea como contexto entienda el proyecto mejor que un desarrollador que lo lea superficialmente.

## Requirements

### Validated

- ✓ CLI invocable via `npx skill-me-up [path] [options]` — v1.0
- ✓ Detección automática de lenguaje y framework desde manifiestos — v1.0
- ✓ Escaneo recursivo de carpetas con filtros configurables — v1.0
- ✓ Generación de `agent_<folder>_instructions.md` por carpeta relevante — v1.0
- ✓ Análisis de clases, interfaces, métodos y anotaciones/decoradores — v1.0
- ✓ Detección de 14 patrones de carpeta (controller, service, dao, model, etc.) — v1.0
- ✓ Análisis de dependencias cross-folder desde imports — v1.0
- ✓ Instrucciones "How to Add New Code Here" por carpeta — v1.0
- ✓ Re-ejecutable sin duplicados — v1.0
- ✓ Zero dependencias externas (solo Node.js stdlib) — v1.0
- ✓ Publicado en npm como `skill-me-up` — v1.0

### Active

- [ ] Los `.md` incluyen ejemplos de código reales extraídos del propio codebase
- [ ] Los `.md` incluyen sección "Don't Do" con antipatrones detectados en el código
- [ ] Los `.md` incluyen contexto cross-carpeta: cómo esta carpeta interactúa con el resto del sistema
- [ ] Los `.md` incluyen convenciones específicas del proyecto (naming, estructura, estilo detectados)
- [ ] Mejor cobertura de lenguajes: mejora genérica que beneficia todos los lenguajes soportados
- [ ] Análisis más profundo: inferencia semántica del comportamiento del código, no solo firmas

### Out of Scope

- UI web o dashboard — complejidad no justificada para un CLI tool
- Plugin para IDEs — distribución separada, fuera del scope de este milestone
- LLM/AI calls en tiempo de análisis — mantener zero dependencias externas es un valor core
- Modo interactivo con prompts — el CLI debe seguir siendo no-interactivo y scriptable

## Context

**Arquitectura actual:** Pipeline funcional puro — CLI → Analyzer → Generator → File output. Sin estado persistente, sin clases, sin dependencias externas. El análisis ocurre en una sola invocación.

**Módulos clave:**
- `bin/cli.js` — entrada CLI, parsing de args
- `src/analyzer/index.js` — orquestación del pipeline
- `src/analyzer/patternDetector.js` — análisis profundo por carpeta (clases, métodos, imports, patrones)
- `src/generators/mdGenerator.js` — renderizado del Markdown y escritura de archivos
- `src/config/patterns.js` — lookup tables de patrones de carpeta y archivo

**El cuello de botella de calidad está en `patternDetector.js` y `mdGenerator.js`** — el primero determina qué se extrae del código, el segundo cómo se presenta.

## Constraints

- **Tech stack**: JavaScript ES Modules, Node.js >= 18 — sin transpilación, sin TypeScript
- **Dependencias**: Zero dependencias externas — mantener este principio es fundamental
- **Compatibilidad**: El análisis debe funcionar en proyectos de cualquier lenguaje, no solo JS
- **Performance**: El análisis debe completarse en segundos para proyectos medianos (<500 archivos)
- **Output**: Los archivos generados se escriben en el proyecto analizado — cuidado con qué se escribe

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Zero dependencias externas | Instalar `npx skill-me-up` debe ser instantáneo y funcionar en cualquier entorno | ✓ Good |
| Análisis estático (sin LLM) | Coste cero, velocidad máxima, funciona offline | ✓ Good — mantener |
| Archivos escritos en el proyecto analizado | El output está donde se necesita, listo para usar como contexto | ✓ Good |
| Mejoras enfocadas en riqueza del output, no en nueva funcionalidad | La herramienta ya funciona — mejorar calidad antes que añadir features | — Pending |

---
*Last updated: 2026-03-08 after initialization*
