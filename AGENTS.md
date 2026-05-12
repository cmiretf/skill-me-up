# skill-me-up — AGENTS.md

> Portable, vendor-neutral instructions for any AI coding agent operating on this repository.

## 1. Qué es este repo

**skill-me-up** — herramienta CLI que analiza un proyecto de código y genera archivos `agent_<folder>_instructions.md` automáticamente, para que cualquier agente de IA (Claude, Copilot, Cursor, etc.) entienda la estructura, los patrones y cómo contribuir correctamente al proyecto.

- v2.0.0. Publicado en npm: `skill-me-up`.
- License: MIT. Node >= 18.
- Author: Carlos Miret Fiuza.
- Repo PÚBLICO.

> **Nota meta**: este AGENTS.md fue escrito a mano. La herramienta misma se especializa en generar archivos similares (`agent_*_instructions.md`); se puede usar `skill-me-up .` para complementar este archivo con instrucciones más granulares por subcarpeta.

## 2. Setup

```bash
# Global
npm install -g skill-me-up

# Dev local
npm install
```

## 3. Comandos

| Acción | Comando |
| --- | --- |
| CLI principal | `skill-me-up <path>` |
| Dev (en el propio repo) | `npm run dev` |
| Start | `npm start` |
| Tests | `npm test` (jest con `--experimental-vm-modules`) |

Entry point: `bin/cli.js`. Programa expuesto por `package.json bin`.

## 4. Estructura

```
bin/
└── cli.js              # Entry point del CLI
src/
├── analyzer/           # Análisis del proyecto (parseo, detección de patrones)
├── config/             # Configuración por tipo de proyecto/lenguaje
└── generators/         # Generadores de los .md de instrucciones
tests/                  # Tests con jest
.planning/              # Notas internas de planificación
OPPORTUNITY.md          # Plan de negocio / oportunidad de mercado
test_carlos.md          # Test fixture (no es un AGENTS.md real)
```

## 5. Convenciones

- ESM modules (`"type": "module"` en `package.json`).
- Node >= 18.
- Jest con flag experimental para ESM (`--experimental-vm-modules`).
- Cero dependencias runtime — solo stdlib de Node. Mantener esa frugalidad.
- Output esperado: archivos `agent_<carpeta>_instructions.md` dentro de las carpetas analizadas.

## 6. Añadir soporte para un lenguaje/framework

1. Añadir detector en `src/config/` (regex + heurísticas para `package.json`, `pyproject.toml`, etc.).
2. Implementar analyzer en `src/analyzer/` que extraiga la info relevante (deps, scripts, estructura).
3. Crear generator en `src/generators/` con la plantilla del `agent_*_instructions.md` específico.
4. Añadir test en `tests/` con un fixture del lenguaje en cuestión.
5. Documentar en README la nueva detección.

## 7. Release flow

1. Bump version en `package.json`.
2. `npm test` debe pasar.
3. `npm publish` (requiere acceso de Carlos al paquete `skill-me-up` en npm).
4. Actualizar README si hay cambios de CLI o output.

## 8. Notas para agentes

- Repo **público** + publicado en npm: cuidar el tono y compatibilidad de API CLI. Cambios breaking → bump major.
- El propósito del repo es *generar* archivos tipo AGENTS.md, así que es una buena práctica que este propio repo predique con el ejemplo. Cualquier cambio que mejore la guía aquí ayuda como caso real.
- Si vas a refactorizar `bin/cli.js`, mantén la firma `skill-me-up <path> [options]` compatible (semver mayor para breaking).
- `test_carlos.md` y `.planning/` no se publican (ver `files` en `package.json`).
