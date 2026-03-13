# Requirements: skill-me-up

**Defined:** 2026-03-08
**Core Value:** Los `.md` generados deben ser tan buenos que un agente AI que solo los lea como contexto entienda el proyecto mejor que un desarrollador que lo lea superficialmente.

## v1 Requirements

Mejoras de calidad de output para el milestone v2.0.

### Analysis Enrichment

- [x] **ENRICH-01**: El analizador rastrea números de línea durante la extracción de métodos y clases (prerequisito para ejemplos y pointers)
- [x] **ENRICH-02**: El analizador detecta convenciones de naming por carpeta (camelCase vs snake_case vs PascalCase) con un mínimo de 5 muestras al 60% de cobertura antes de reportar
- [x] **ENRICH-03**: El analizador extrae snippets de código reales de los métodos más representativos de cada carpeta (limitados a 15 líneas por snippet)
- [x] **ENRICH-04**: El analizador detecta antipatrones con confidence threshold: métodos >40 líneas, anidamiento >3 niveles, god class (>20 métodos públicos), catch vacíos

### Output Sections

- [x] **OUTPUT-01**: Los `.md` generados incluyen sección "## Project Conventions" con naming style, import style y file naming patterns detectados
- [x] **OUTPUT-02**: Los `.md` generados incluyen sección "## Usage Examples" con snippets de código reales extraídos del codebase
- [x] **OUTPUT-03**: Los `.md` generados incluyen sección "## Don't Do" con antipatrones detectados y su frecuencia
- [x] **OUTPUT-04**: Los `.md` generados incluyen en "## Dependencies" no solo la lista de imports sino el rol funcional de cada dependencia (qué hace esta carpeta con cada módulo que importa)

### Output Quality

- [ ] **QUALITY-01**: Los `.md` generados no superan 300 líneas — hard limit enforced en `mdGenerator.js`
- [ ] **QUALITY-02**: Los `.md` generados incluyen un comentario de timestamp de generación (`<!-- generated: YYYY-MM-DD -->`) para detectar staleness
- [ ] **QUALITY-03**: El proyecto incluye fixtures de prueba (al menos 2 proyectos de ejemplo en distintos lenguajes) con snapshots del output esperado para validar regresiones

## v2 Requirements

Deferred para milestone siguiente.

### Advanced Analysis

- **ADVANCED-01**: File+line pointers en ejemplos como alternativa a snippets embebidos (para proyectos que prefieren no copiar código en los .md)
- **ADVANCED-02**: Vendored `acorn.min.js` en `src/vendor/` para AST parsing nativo de JS/TS sin dependencias externas
- **ADVANCED-03**: Archivo `agent_project_conventions.md` global en la raíz del proyecto analizado con convenciones agregadas de todo el repo

### Language Coverage

- **LANG-01**: Mejora de extracción de métodos/clases para Python (def, class con decoradores)
- **LANG-02**: Mejora de extracción para Kotlin y Go

## Out of Scope

| Feature | Reason |
|---------|--------|
| LLM calls durante el análisis | Viola el principio zero-deps e introduce coste/latencia inaceptables |
| UI web o dashboard | Complejidad no justificada para un CLI tool |
| Plugin para IDEs | Distribución separada, scope independiente |
| Modo interactivo con prompts | El CLI debe seguir siendo no-interactivo y scriptable |
| Análisis de runtime / ejecución de código | Análisis estático únicamente |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ENRICH-01 | Phase 1 | Complete |
| ENRICH-02 | Phase 1 | Complete |
| ENRICH-03 | Phase 2 | Complete |
| ENRICH-04 | Phase 3 | Complete |
| OUTPUT-01 | Phase 1 | Complete |
| OUTPUT-02 | Phase 2 | Complete |
| OUTPUT-03 | Phase 3 | Complete |
| OUTPUT-04 | Phase 2 | Complete |
| QUALITY-01 | Phase 4 | Pending |
| QUALITY-02 | Phase 4 | Pending |
| QUALITY-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-08 after roadmap creation*
