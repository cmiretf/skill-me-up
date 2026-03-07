<br/>

<pre style="color: red; line-height: 1.4">
███████╗██╗  ██╗██╗██╗     ██╗     ███╗  ███╗███████╗  ██╗   ██╗██████╗
██╔════╝██║ ██╔╝██║██║     ██║     ██╔████╔██║██╔════╝  ██║   ██║██╔══██╗
███████╗█████╔╝ ██║██║     ██║     ██║╚██╔╝██║█████╗    ██║   ██║██████╔╝
╚════██║██╔═██╗ ██║██║     ██║     ██║ ╚═╝ ██║██╔══╝    ██║   ██║██╔═══╝
███████║██║  ██╗██║███████╗███████╗██║     ██║███████╗  ╚██████╔╝██║
╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚═╝     ╚═╝╚══════╝   ╚═════╝ ╚═╝
</pre>

<br/>

> **Analyze any code project and generate rich `agent_<folder>_instructions.md` files** — so AI agents (Claude, Copilot, Cursor) immediately understand your codebase structure, patterns, and how to contribute correctly.

---

**Created by [Carlos Miret Fiuza](https://www.linkedin.com/in/carlos-miret-fiuza-87026a52)**

---

## What it does

`skill-me-up` scans your project, reads the actual source files, detects its architecture and generates a Markdown file **inside each relevant folder** with:

- The folder's role in the overall architecture
- A breakdown of every class, interface, and enum with their methods and annotations
- Detected architectural patterns (MVC, DAO, REST, JPA, DI, etc.)
- Step-by-step instructions for AI agents on how to add new code correctly
- Cross-folder dependency analysis from import statements
- Re-runnable: existing files are overwritten, never duplicated

## Quickstart

```bash
# Run in your project root (no install needed)
npx skill-me-up

# Run on a specific project
npx skill-me-up ./path/to/project

# Limit scan depth
npx skill-me-up --depth 4
```

## Example output

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
- **Type:** class  **Annotations:** @RestController, @RequestMapping
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

## Supported Languages & Frameworks

| Language | Auto-detected frameworks |
|----------|--------------------------|
| Java | Spring Boot, Spring MVC, Quarkus, Micronaut, Maven, Gradle |
| Kotlin | Spring Boot, Gradle |
| TypeScript | Angular, NestJS, Node.js |
| JavaScript | React, Vue, Next.js, Nuxt, Svelte, Express, Fastify |
| Python | Django, FastAPI, Flask |
| Go | Gin, Echo, Fiber |
| Rust | Actix, Axum |
| PHP | Laravel, Symfony |
| Ruby | Rails, Sinatra |
| C# | ASP.NET Core |

## Patterns detected

`skill-me-up` recognizes architectural patterns both at folder level (by name) and at file level (by content analysis):

**Folder patterns**

| Pattern | Keywords |
|---------|----------|
| Controller / HTTP Layer | `controller`, `handler`, `routes`, `router` |
| Service / Business Logic | `service`, `usecase`, `application` |
| DAO / Repository | `dao`, `repository`, `persistence`, `store` |
| Model / Entity | `model`, `entity`, `dto`, `schema`, `domain` |
| Middleware | `middleware`, `interceptor`, `guard`, `filter` |
| Config | `config`, `settings`, `environment` |
| Utilities | `utils`, `helpers`, `shared`, `lib` |
| UI Components | `components`, `ui`, `widgets` |
| Pages / Screens | `pages`, `views`, `screens` |
| State Management | `store`, `redux`, `pinia`, `context` |
| Composables / Hooks | `composables`, `hooks` |
| Tests | `test`, `spec`, `e2e` |

**Code-level patterns (detected from source)**

Annotations/decorators like `@RestController`, `@Service`, `@Entity`, `@Transactional`, `@Autowired`, `@Injectable`, `@Column`, `@ManyToOne` and many more are read directly from source files to generate context-aware instructions.

## Options

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

## Global install

```bash
npm install -g skill-me-up
skill-me-up
```

## Use cases

- **AI coding assistants** (Claude, Copilot, Cursor): drop the generated `.md` files into your agent's context for instant codebase awareness
- **Team onboarding**: new developers understand the project structure and conventions immediately
- **Living documentation**: re-run anytime to keep the docs in sync with the actual code

## Requirements

- Node.js >= 18

## License

MIT

---

## Author

**Carlos Miret Fiuza**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Carlos_Miret_Fiuza-0077B5?style=flat&logo=linkedin)](https://www.linkedin.com/in/carlos-miret-fiuza-87026a52)
[![npm](https://img.shields.io/npm/v/skill-me-up?color=CB3837&logo=npm)](https://www.npmjs.com/package/skill-me-up)
