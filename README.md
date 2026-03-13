<br/>

<pre style="color: red; line-height: 1.4">
███████╗██╗  ██╗██╗██╗     ██╗        ███╗  ███╗███████╗    ██╗   ██╗██████╗
██╔════╝██║ ██╔╝██║██║     ██║        ██╔████╔██║██╔════╝   ██║   ██║██╔══██╗
███████╗█████╔╝ ██║██║     ██║        ██║╚██╔╝██║█████╗     ██║   ██║██████╔╝
╚════██║██╔═██╗ ██║██║     ██║        ██║ ╚═╝ ██║██╔══╝     ██║   ██║██╔═══╝
███████║██║  ██╗██║███████╗███████╗   ██║     ██║███████╗   ╚██████╔╝██║
╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝   ╚═╝     ╚═╝╚══════╝    ╚═════╝ ╚═╝
</pre>

<br/>

> **Analyze any code project and generate rich `agent_<folder>_instructions.md` files** — so AI agents (Claude, Copilot, Cursor) immediately understand your codebase structure, patterns, and how to contribute correctly.

<div align="center">

[![npm version](https://img.shields.io/npm/v/skill-me-up?color=CB3837&logo=npm&label=npm)](https://www.npmjs.com/package/skill-me-up)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen?logo=node.js)](https://nodejs.org)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Carlos_Miret_Fiuza-0077B5?logo=linkedin)](https://www.linkedin.com/in/carlos-miret-fiuza-87026a52)

</div>

---

**Created by [Carlos Miret Fiuza](https://www.linkedin.com/in/carlos-miret-fiuza-87026a52)**

---

## Table of Contents

- [The Problem](#the-problem)
- [What it Does](#what-it-does)
- [How it Works](#how-it-works)
- [Quickstart](#quickstart)
- [Installation](#installation)
- [CLI Options](#cli-options)
- [Example Output](#example-output)
- [Supported Languages & Frameworks](#supported-languages--frameworks)
- [Detected Patterns](#detected-patterns)
- [Use Cases](#use-cases)
- [Requirements](#requirements)
- [License](#license)
- [Author](#author)

---

## The Problem

AI coding assistants are powerful, but they're blind to your project's conventions the moment you open a new chat. Every session starts from zero — no knowledge of your folder structure, naming patterns, which layer owns which responsibility, or how your team adds new code.

You end up spending the first few minutes of every session re-explaining context that should already be there.

**`skill-me-up` solves this by writing that context directly into your repository**, as Markdown files that agents pick up automatically.

---

## What it Does

`skill-me-up` scans your project, reads the actual source files, detects its architecture and generates a Markdown file **inside each relevant folder** with:

- The folder's role in the overall architecture
- A breakdown of every class, interface, and enum with their methods and annotations
- Detected architectural patterns (MVC, DAO, REST, JPA, DI, etc.)
- Step-by-step instructions for AI agents on how to add new code correctly
- Cross-folder dependency analysis from import statements
- Re-runnable: existing files are overwritten, never duplicated

---

## How it Works

```
your project/
    └── src/
        └── controller/
            ├── UserController.java
            └── agent_controller_instructions.md   ← skill-me-up writes this
```

1. **Scan** — walks your project tree up to a configurable depth
2. **Parse** — reads source files to extract classes, interfaces, enums, methods, and annotations/decorators
3. **Detect** — identifies architectural patterns both from folder names and from actual code content
4. **Generate** — writes a `agent_<folder>_instructions.md` file in each relevant folder with structured, agent-ready context
5. **Re-run anytime** — files are overwritten on each run so they always reflect the current state of the code

No build step, no configuration file, no dependencies to install. Just run it.

---

## Quickstart

```bash
# Run in your project root (no install needed)
npx skill-me-up

# Run on a specific project
npx skill-me-up ./path/to/project

# Limit scan depth
npx skill-me-up --depth 4
```

---

## Installation

**Run without installing (recommended)**

```bash
npx skill-me-up
```

**Global install**

```bash
npm install -g skill-me-up
skill-me-up
```

**Local install (per project)**

```bash
npm install --save-dev skill-me-up
npx skill-me-up
```

---

## CLI Options

```
skill-me-up [path] [options]

Arguments:
  path          Path to the project to analyze (default: current directory)

Options:
  -d, --depth   Maximum folder depth to scan (default: 6)
  -q, --quiet   Suppress console output
  -h, --help    Show help
  -v, --version Show version
```

---

## Example Output

Running `npx skill-me-up` on a Spring Boot MVC project generates:

```
src/main/java/com/example/
├── controller/
│   ├── UserController.java
│   └── agent_controller_instructions.md   ← generated
├── service/
│   ├── UserService.java
│   ├── impl/
│   │   ├── UserServiceImpl.java
│   │   └── agent_impl_instructions.md     ← generated
│   └── agent_service_instructions.md      ← generated
├── dao/
│   ├── UserDao.java
│   ├── UserDaoImpl.java
│   └── agent_dao_instructions.md          ← generated
└── model/
    ├── User.java
    └── agent_model_instructions.md        ← generated
```

Each generated file includes sections like:

```markdown
# controller/ — Agent Instructions

> Project: my-app | Language: Java | Framework: Spring Boot

## Overview

**Role:** HTTP / Presentation Layer

## Classes & Interfaces

### UserController.java

- **Type:** class **Annotations:** @RestController, @RequestMapping
- **Methods:**
  | Method | Parameters | Returns | Annotations |
  |--------|------------|---------|-------------|
  | getUser | Long id | ResponseEntity<User> | @GetMapping, @PathVariable |
  | createUser | User body | ResponseEntity<User> | @PostMapping, @RequestBody |

## Key Patterns

- REST API (Spring @RestController)
- Dependency Injection (@Autowired)

## How to Add New Code Here

1. Create a new class annotated with @RestController
2. Inject dependencies via constructor with @Autowired
3. Map endpoints using @GetMapping / @PostMapping / @PutMapping / @DeleteMapping
4. Delegate all business logic to the service layer — never put it here

## Dependencies

- com.example.service (UserService)
- com.example.model (User)
```

---

## Supported Languages & Frameworks

| Language   | Auto-detected frameworks                                   |
| ---------- | ---------------------------------------------------------- |
| Java       | Spring Boot, Spring MVC, Quarkus, Micronaut, Maven, Gradle |
| Kotlin     | Spring Boot, Gradle                                        |
| TypeScript | Angular, NestJS, Node.js                                   |
| JavaScript | React, Vue, Next.js, Nuxt, Svelte, Express, Fastify        |
| Python     | Django, FastAPI, Flask                                     |
| Go         | Gin, Echo, Fiber                                           |
| Rust       | Actix, Axum                                                |
| PHP        | Laravel, Symfony                                           |
| Ruby       | Rails, Sinatra                                             |
| C#         | ASP.NET Core                                               |

---

## Detected Patterns

`skill-me-up` recognizes architectural patterns both at folder level (by name) and at file level (by content analysis):

**Folder patterns**

| Pattern                  | Keywords                                       |
| ------------------------ | ---------------------------------------------- |
| Controller / HTTP Layer  | `controller`, `handler`, `routes`, `router`    |
| Service / Business Logic | `service`, `usecase`, `application`            |
| DAO / Repository         | `dao`, `repository`, `persistence`, `store`    |
| Model / Entity           | `model`, `entity`, `dto`, `schema`, `domain`   |
| Middleware               | `middleware`, `interceptor`, `guard`, `filter` |
| Config                   | `config`, `settings`, `environment`            |
| Utilities                | `utils`, `helpers`, `shared`, `lib`            |
| UI Components            | `components`, `ui`, `widgets`                  |
| Pages / Screens          | `pages`, `views`, `screens`                    |
| State Management         | `store`, `redux`, `pinia`, `context`           |
| Composables / Hooks      | `composables`, `hooks`                         |
| Tests                    | `test`, `spec`, `e2e`                          |

**Code-level patterns (detected from source)**

Annotations/decorators like `@RestController`, `@Service`, `@Entity`, `@Transactional`, `@Autowired`, `@Injectable`, `@Column`, `@ManyToOne` and many more are read directly from source files to generate context-aware instructions.

---

## Use Cases

- **AI coding assistants** (Claude, Copilot, Cursor): drop the generated `.md` files into your agent's context for instant codebase awareness
- **Team onboarding**: new developers understand the project structure and conventions immediately
- **Living documentation**: re-run anytime to keep the docs in sync with the actual code
- **Code reviews**: reviewers get immediate context on what each layer is responsible for
- **Cross-team collaboration**: teams working on unfamiliar codebases ramp up faster

---

## Requirements

- Node.js >= 18

---

## License

MIT — see [LICENSE](./LICENSE) for details.

---

## Author

**Carlos Miret Fiuza**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Carlos_Miret_Fiuza-0077B5?style=flat&logo=linkedin)](https://www.linkedin.com/in/carlos-miret-fiuza-87026a52)
[![npm](https://img.shields.io/npm/v/skill-me-up?color=CB3837&logo=npm)](https://www.npmjs.com/package/skill-me-up)
