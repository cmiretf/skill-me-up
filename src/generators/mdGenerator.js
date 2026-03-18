import { writeFileSync } from 'fs'
import { join } from 'path'
import { buildFolderTree } from '../analyzer/structureAnalyzer.js'

// ═══════════════════════════════════════════════════════════════════════════════
// Role-Specific Knowledge Base
// ═══════════════════════════════════════════════════════════════════════════════

const ROLE_KNOWLEDGE = {
  controller: {
    scope: 'This module is the entry point for incoming HTTP requests. It receives requests, validates inputs at the boundary, delegates processing to the service layer, and formats responses. Controllers should never contain business logic — they are thin adapters between the HTTP transport and the application core.',
    dos: [
      'Keep handler methods under 20 lines — extract validation, transformation, and mapping logic to private helpers or the service layer',
      'Return consistent response envelopes with appropriate HTTP status codes (200 OK, 201 Created, 204 No Content, 400 Bad Request, 404 Not Found, 409 Conflict)',
      'Validate all incoming request parameters, headers, and body at the controller level before passing to services',
      'Use DTOs (Data Transfer Objects) for request and response shapes — never expose domain entities directly to clients',
      'Document each endpoint with its HTTP method, path, expected parameters, and response format',
      'Group related endpoints by resource — all `/users` endpoints in one controller, all `/orders` in another',
    ],
    donts: [
      'Never put business logic in controllers — delegate to services for anything beyond input parsing and output formatting',
      'Never access repositories, databases, or external services directly — always go through the service layer',
      'Never catch and swallow exceptions silently — let error-handling middleware produce proper error responses',
      'Never expose internal entity IDs, database column names, or stack traces in API responses',
      'Never hardcode URLs, paths, or configuration values — inject them or read from configuration module',
    ],
    testing: [
      'Write integration tests for each endpoint: valid input → expected status + body, invalid input → 400, missing resource → 404',
      'Test authorization: verify that protected endpoints reject unauthenticated/unauthorized requests with 401/403',
      'Mock the service layer to isolate controller logic — controller tests should NOT hit real databases or external APIs',
      'Test edge cases: empty request bodies, missing optional parameters, malformed JSON, boundary values for numeric inputs',
      'Verify response content-type headers, pagination metadata, and HATEOAS links where applicable',
    ],
    changeGuidance: [
      'Create a new handler method or file following the existing naming convention in this folder',
      'Wire it to the routing configuration (annotations, decorators, or route file)',
      'Delegate ALL logic to the service layer — the controller only parses input and formats output',
      'Add input validation for all new parameters using the project\'s validation approach',
      'Write integration tests covering success, validation failure, and authorization scenarios',
    ],
  },
  service: {
    scope: 'This module contains the core business logic of the application. Services orchestrate operations between repositories/DAOs, enforce business rules, and manage transactions. They are the heart of the application — all domain decisions happen here.',
    dos: [
      'Encapsulate each business operation in a well-named public method (e.g., `createOrder`, `approveRequest`, `calculateDiscount`)',
      'Use transactions for operations that modify multiple entities or require atomicity guarantees',
      'Validate business rules before performing state changes — throw domain-specific exceptions for violations',
      'Keep service methods focused on a single business operation — break complex workflows into composable methods',
      'Inject repositories and other services through constructor injection for testability and loose coupling',
    ],
    donts: [
      'Never depend on HTTP request/response objects — services must be completely transport-agnostic',
      'Never call controllers or access any presentation-layer classes from services',
      'Never create circular dependencies between services — extract shared logic into a new service',
      'Never expose repository internals (SQL queries, ORM-specific APIs) through the service interface',
      'Never mix read and write operations without clear intent — separate queries from commands when possible',
    ],
    testing: [
      'Write unit tests for each business rule with mock repositories — test the decision logic, not data access',
      'Test exception paths: what happens when a business rule is violated? Verify the correct exception type and message',
      'Test with edge case data: null inputs, empty collections, boundary values, conflicting concurrent modifications',
      'Test transaction semantics: verify that partial failures roll back correctly and don\'t leave inconsistent state',
      'Use integration tests sparingly for complex multi-service workflows that can\'t be meaningfully unit-tested',
    ],
    changeGuidance: [
      'Add a new public method for the business operation with a descriptive name',
      'If an interface exists for this service, add the method signature to the interface first',
      'Inject any new dependencies (repositories, services) through the constructor',
      'Throw domain-specific exceptions for business rule violations (not generic RuntimeException)',
      'Write unit tests with mocked dependencies covering success, failure, and edge cases',
    ],
  },
  dao: {
    scope: 'This module abstracts all database and storage operations. It provides a clean interface for data access, hiding the underlying persistence technology. All queries and mutations to persistent storage flow through this layer.',
    dos: [
      'Keep query methods focused and well-named — use conventions like `findByEmail`, `findAllByStatus`, `saveUser`, `deleteById`',
      'Use parameterized queries to prevent SQL injection — never concatenate user input into query strings',
      'Return domain objects from repository methods, not raw database rows or ORM-specific proxy types',
      'Handle and translate database-specific exceptions into domain exceptions (e.g., `DuplicateKeyException` → `UserAlreadyExistsException`)',
      'Write database migrations for schema changes — never apply DDL manually or inline in application code',
    ],
    donts: [
      'Never put business logic in data access methods — queries should retrieve or persist data, not make domain decisions',
      'Never use SELECT * — specify the exact columns you need to avoid leaking sensitive data and improve performance',
      'Never write N+1 queries — use JOINs, batch loading, or eager fetching to load related entities efficiently',
      'Never return database-specific types (ResultSet, Cursor, ORM proxy objects) outside the data access layer',
      'Never modify data access methods without checking the impact on all service-layer callers',
    ],
    testing: [
      'Use integration tests with a real database or in-memory equivalent (H2, SQLite) — mocking SQL queries tests nothing useful',
      'Test CRUD operations: create → read → update → delete for each entity type with valid data',
      'Test query edge cases: empty result sets, large result sets, queries with NULL values, boundary conditions',
      'Test constraint violations: unique key conflicts, foreign key violations, NOT NULL constraints, check constraints',
      'Test concurrent access patterns: optimistic locking, concurrent writes to the same record',
    ],
    changeGuidance: [
      'Add new query methods following the existing naming convention (findBy*, save*, delete*)',
      'Use parameterized queries for all new methods — never concatenate input',
      'Return domain objects, not raw database types or ORM proxies',
      'Write integration tests against a real or in-memory database',
      'If adding a new entity, create the corresponding migration first',
    ],
  },
  model: {
    scope: 'This module defines the data structures, entities, DTOs, and interfaces that represent the domain. These types are the shared language used across all layers of the application. Changes here propagate widely — modify with care.',
    dos: [
      'Keep each model focused on a single domain concept — one class per entity or value object',
      'Use validation annotations or decorators on fields to enforce data integrity at the type level',
      'Define relationships explicitly (foreign keys, associations, references) with clear ownership semantics',
      'Document field constraints, valid ranges, and business rules in comments or annotations',
      'Provide meaningful toString/equals/hashCode implementations for entities used in collections or logs',
    ],
    donts: [
      'Never put business logic in model classes — models define data structure, services define behavior',
      'Never expose mutable internal collections — return defensive copies or unmodifiable wrappers',
      'Never mix persistence annotations with serialization annotations without understanding the tight coupling this creates',
      'Never change field types or names without checking ALL serialization consumers (API responses, events, cache, queue messages)',
      'Never add fields without considering nullability, default values, and backward compatibility with existing data',
    ],
    testing: [
      'Test validation rules: verify that invalid field values are rejected at the model level with the correct error',
      'Test serialization and deserialization roundtrips: JSON, XML, or whatever wire format the project uses',
      'Test equality semantics: verify two entities with the same ID are equal, different IDs are not',
      'Test builder or factory methods if the model uses them — verify all required fields are enforced',
    ],
    changeGuidance: [
      'Create a new class or type for the domain concept with validation annotations',
      'Define relationships to other entities if applicable (foreign keys, references)',
      'Update serialization configuration if the model will be sent over APIs or queues',
      'Add migration scripts if the model maps to a database table',
      'Write tests for validation rules and serialization roundtrips',
    ],
  },
  middleware: {
    scope: 'This module contains cross-cutting concerns that run across multiple requests — authentication, authorization, logging, rate limiting, error handling, and request transformation. Middleware executes before or after the main handler in the request pipeline.',
    dos: [
      'Keep each middleware focused on a single concern — one middleware for auth, one for logging, one for rate limiting',
      'Always call next() or the equivalent to continue the middleware chain unless intentionally short-circuiting (e.g., auth rejection)',
      'Handle errors gracefully — catch exceptions and pass them to error-handling middleware or return proper error responses',
      'Log meaningful context (request ID, user ID, action, duration) for debugging and audit trails',
      'Make middleware configurable — accept options for paths to include/exclude, rate limits, log levels',
    ],
    donts: [
      'Never put business logic in middleware — keep it limited to infrastructure cross-cutting concerns',
      'Never modify the request or response in surprising ways that downstream handlers can\'t anticipate',
      'Never throw unhandled exceptions from middleware — this can break the entire request pipeline for all users',
      'Never rely on middleware execution order implicitly — document the required registration order explicitly',
      'Never block the event loop with synchronous operations in middleware (especially in Node.js)',
    ],
    testing: [
      'Test each middleware in isolation with mock request/response/next objects',
      'Test the happy path: middleware passes through to next() with the expected request/response modifications',
      'Test rejection: middleware short-circuits the chain with the correct error status and response body',
      'Test error propagation: middleware handles errors thrown by downstream handlers correctly',
      'Test configuration: middleware respects include/exclude paths, timeouts, and other option settings',
    ],
    changeGuidance: [
      'Create a new middleware file following the naming convention of existing middlewares in this folder',
      'Focus on a single concern — if your middleware does two things, split it into two middlewares',
      'Register it in the correct position in the middleware chain (order matters!)',
      'Add tests with mock request/response objects covering pass-through and rejection scenarios',
      'Document the registration order requirement if it matters',
    ],
  },
  config: {
    scope: 'This module centralizes all application configuration — environment variables, feature flags, database connections, external service URLs, and initialization logic. It is the single source of truth for environment-dependent values.',
    dos: [
      'Use environment variables for all sensitive values (API keys, database passwords, secrets, tokens)',
      'Provide sensible defaults for optional configuration to enable zero-config local development',
      'Validate all required configuration at application startup — fail fast with clear error messages if values are missing',
      'Document each configuration option: what it controls, its default value, valid formats, and example values',
      'Group related configuration logically: database settings together, auth settings together, feature flags together',
    ],
    donts: [
      'Never hardcode secrets, passwords, API keys, or tokens anywhere in configuration files or source code',
      'Never commit environment-specific values (.env files, production configs, staging URLs) to version control',
      'Never scatter configuration reads across the codebase — centralize all config access through this module',
      'Never mix configuration parsing logic with application business logic',
      'Never ignore configuration validation errors — surface them immediately and clearly at startup',
    ],
    testing: [
      'Test with missing required configuration values — verify the application fails with a clear, actionable error message',
      'Test that default values are correctly applied when optional configuration is absent from the environment',
      'Test configuration validation: invalid formats, out-of-range values, conflicting settings, empty strings',
      'Test environment-specific overrides: verify that environment variables take precedence over file defaults',
    ],
    changeGuidance: [
      'Add the new configuration option with a sensible default value',
      'Add validation for the new option (required vs optional, format, range)',
      'Document the option: what it controls, format, default, example',
      'Update .env.example or equivalent with the new option',
      'Add tests for the validation and default behavior',
    ],
  },
  utils: {
    scope: 'This module provides stateless, reusable utility functions shared across the codebase. Utilities are low-level building blocks — they know nothing about the domain and should be usable in any context without modification.',
    dos: [
      'Keep all functions pure — no side effects, no external state, no file/network I/O, deterministic output for the same input',
      'Write comprehensive JSDoc/docstrings for each function: parameters, return value, edge cases, and usage examples',
      'Make functions generic — avoid coupling to application-specific types or business domain concepts',
      'Use descriptive function names that indicate the return value or transformation (e.g., `formatDate`, `slugify`, `truncateText`)',
      'Handle edge cases explicitly: null, undefined, empty strings, empty arrays, negative numbers, NaN',
    ],
    donts: [
      'Never put business logic in utility functions — if a function makes domain decisions, it belongs in a service',
      'Never import application-specific types, services, or configuration into utility files',
      'Never add database calls, API calls, or file system operations to utilities — they must be pure',
      'Never create god-utility files with dozens of unrelated functions — split into focused modules (stringUtils, dateUtils)',
      'Never mutate function arguments — always return new values and leave inputs unchanged',
    ],
    testing: [
      'Write exhaustive unit tests for every exported function — utilities are the easiest and most valuable code to test',
      'Test with null, undefined, empty string, empty array, zero, negative numbers, NaN, and Infinity for each parameter',
      'Test boundary conditions: maximum string lengths, integer overflow, timezone edge cases, Unicode special characters',
      'Test idempotency: calling the same function multiple times with the same input always produces the same output',
      'Consider property-based testing (e.g., fast-check) for mathematical or string-transformation utilities',
    ],
    changeGuidance: [
      'Create a new function in the appropriate utility file (or create a new focused utility file if none fits)',
      'Keep the function pure — no side effects, no imports from the application layer',
      'Add comprehensive JSDoc with parameter types, return type, and a usage example',
      'Write exhaustive unit tests including all edge cases listed in Testing Guidelines',
      'Verify no existing utility already does what you need — search before creating',
    ],
  },
  components: {
    scope: 'This module contains reusable UI building blocks — buttons, forms, cards, modals, navigation, and other visual components. Each component should be self-contained, receiving data via props and communicating changes via events or callbacks.',
    dos: [
      'Keep components small and focused — each component does one thing well (Single Responsibility Principle)',
      'Accept data through props and emit changes through events/callbacks — maintain unidirectional data flow',
      'Handle all visual states: default, loading, empty, error, disabled, hover, focus, and active',
      'Use semantic HTML elements and ARIA attributes for accessibility (screen readers, keyboard navigation)',
      'Extract repeated UI patterns into shared components to maintain visual and behavioral consistency',
    ],
    donts: [
      'Never directly mutate parent state or global store from inside components — always emit events upward',
      'Never put API calls or data fetching logic directly in UI components — use services, stores, or custom hooks',
      'Never use inline styles for complex styling — use CSS classes, CSS modules, or styled-components',
      'Never create deeply nested component hierarchies (>3 levels deep) — flatten with composition patterns',
      'Never hardcode user-facing text strings if the app supports or may support internationalization (i18n)',
    ],
    testing: [
      'Test rendering with different prop combinations: default state, empty data, maximum data, error state, disabled state',
      'Test user interactions: click handlers, form input changes, keyboard navigation, focus management',
      'Test conditional rendering: elements that appear or disappear based on props, state, or screen size',
      'Test accessibility: verify ARIA labels, keyboard navigation paths, and focus trapping in modals or dropdowns',
      'Use snapshot tests sparingly — prefer behavioral assertions over structural comparisons that break on every style change',
    ],
    changeGuidance: [
      'Create a new component file following the naming convention of existing components in this folder',
      'Define a clear props interface — document each prop\'s type, default value, and purpose',
      'Handle all visual states from the start: loading, empty, error, and populated',
      'Add ARIA attributes and keyboard support for accessibility',
      'Write tests covering prop variations, user interactions, and accessibility',
    ],
  },
  pages: {
    scope: 'This module contains top-level page components mapped to application routes. Pages compose smaller components, connect to state management, handle route parameters, and orchestrate data loading. They are the glue between navigation and the UI.',
    dos: [
      'Compose pages from smaller, reusable components defined in the components folder — keep pages thin',
      'Handle route parameters, query strings, and navigation state at the page level',
      'Implement all page states: loading (skeleton or spinner), empty (zero results), error (retry option), and populated',
      'Set page titles, meta tags, and breadcrumbs for each page for SEO and user orientation',
      'Use lazy loading or code splitting for pages that are not needed on initial application render',
    ],
    donts: [
      'Never implement complex business or UI logic directly in page components — extract to components or hooks',
      'Never duplicate shared layout code (headers, footers, sidebars) between pages — use layout components',
      'Never fetch the same data in multiple places on the same page — centralize in a single data loader or hook',
      'Never ignore loading and error states — users must always have visual feedback about what\'s happening',
    ],
    testing: [
      'Test page rendering with mock route parameters, query strings, and navigation state',
      'Test data loading: verify correct API calls are made when the page mounts or route parameters change',
      'Test all page states: loading spinner, empty state message, error state with retry button, populated content',
      'Test navigation: verify that links and buttons navigate to the correct routes with correct parameters',
    ],
    changeGuidance: [
      'Create a new page file following the existing naming convention in this folder',
      'Register the route in the router configuration with the correct path and parameters',
      'Compose the page from existing components — create new components only if they\'re genuinely reusable',
      'Implement loading, empty, and error states from the start — don\'t leave them for later',
      'Add route-level tests verifying data loading and state transitions',
    ],
  },
  store: {
    scope: 'This module manages global application state — shared data that multiple components need to read or modify. It provides a centralized, predictable state container with a defined API for reading (selectors/getters) and writing (actions/mutations).',
    dos: [
      'Keep state normalized — use flat structures with IDs as references instead of deeply nested object trees',
      'Use actions or mutations as the ONLY way to modify state — never write to the store directly from components',
      'Name actions descriptively by the business event, not the state change (e.g., `userLoggedIn` not `setUser`)',
      'Handle asynchronous operations with explicit loading/error/success state tracking',
      'Use selectors or getters for derived data — never compute the same value independently in multiple components',
    ],
    donts: [
      'Never access state directly from components — always read through selectors, getters, or computed properties',
      'Never put presentation or formatting logic in the store — that belongs in components or utility functions',
      'Never create a single "god store" — split state by domain area (auth, products, cart, notifications)',
      'Never store derived data that can be computed from existing state — use selectors or getters instead',
      'Never perform side effects (API calls, local storage, analytics) inside reducers or mutations — use actions',
    ],
    testing: [
      'Test actions: verify they dispatch the correct mutations/reducers and handle async operations properly',
      'Test reducers/mutations: verify each action type produces the expected state transition',
      'Test selectors: verify they compute the correct derived data from a given state shape',
      'Test error handling: verify loading/error states are set correctly when async operations fail or time out',
    ],
    changeGuidance: [
      'Add the new state slice with initial values, actions, and selectors',
      'Keep the state shape flat and normalized — avoid deeply nested structures',
      'Handle loading, success, and error states for any async operations',
      'Add selectors for any derived data that components will need',
      'Write tests for actions, reducers, and selectors independently',
    ],
  },
  composables: {
    scope: 'This module contains reusable stateful logic (hooks or composables) that encapsulate behavior for use across multiple components. Each hook manages its own lifecycle, state, and effects, exposing a clean API to consuming components.',
    dos: [
      'Name every hook with the `use` prefix: `useAuth`, `usePagination`, `useDebounce`, `useLocalStorage`',
      'Keep each hook focused on a single concern — composing multiple hooks is better than one hook doing everything',
      'Return a clean interface: an object or tuple with reactive values and action functions',
      'Handle cleanup: cancel timers, unsubscribe from events, abort pending requests when the component unmounts',
      'Document the hook\'s parameters, return value shape, and expected lifecycle behavior',
    ],
    donts: [
      'Never create hooks with more than 3-4 parameters — use an options object for complex configuration',
      'Never use hooks for simple stateless utility functions — use plain functions in the utils folder instead',
      'Never nest hook calls deeply — keep the hook dependency chain shallow and easy to reason about',
      'Never mutate external state directly from hooks — return action functions that the consuming component calls',
    ],
    testing: [
      'Test hook lifecycle: mount, update with changed inputs, and unmount/cleanup behavior',
      'Test with various input parameter combinations: defaults, edge cases, invalid or missing values',
      'Test cleanup: verify timers are cleared, subscriptions removed, and pending requests aborted on unmount',
      'Test reactivity: verify return values update correctly when input parameters change',
    ],
    changeGuidance: [
      'Create a new file named `use<Concept>` following the hook naming convention',
      'Keep the hook focused on one concern — if it does two things, split into two hooks',
      'Return a clean object or tuple API: `{ data, loading, error, refresh }` or similar',
      'Handle cleanup in the unmount lifecycle (clearTimeout, removeEventListener, AbortController.abort)',
      'Write tests covering lifecycle, reactivity, and cleanup behavior',
    ],
  },
  test: {
    scope: 'This module contains automated tests for the application. Tests verify correct behavior, catch regressions early, and document expected outcomes. They are the safety net that enables confident refactoring and feature development.',
    dos: [
      'Follow the Arrange-Act-Assert pattern: set up test data, perform the action, verify the expected outcome',
      'Name tests descriptively: `should return empty array when no users match the filter` — make the intent obvious',
      'Test one behavior per test case — multiple assertions are fine if they verify aspects of the same outcome',
      'Mirror the source folder structure: tests for `src/services/` live in `tests/services/` with matching file names',
      'Use factory functions or fixtures for test data to keep tests readable and avoid repetition',
    ],
    donts: [
      'Never test implementation details — test observable behavior and outcomes, not internal method calls',
      'Never write tests that depend on execution order or share mutable state between test cases',
      'Never ignore or skip flaky tests — diagnose the root cause (timing, shared state, external dependency) and fix it',
      'Never test framework or library behavior — only test YOUR code\'s integration with it',
      'Never use sleep/setTimeout in tests to wait for async operations — use proper async test utilities',
    ],
    testing: [
      'Ensure every test can run independently: a single test picked at random should pass in isolation',
      'Keep test execution fast: mock external dependencies (file system, network, database) unless testing integration',
      'Organize tests by feature or module, not by test type (unit vs integration)',
      'Review coverage reports for untested logic branches, not just line coverage percentages',
    ],
    changeGuidance: [
      'Create a new test file mirroring the source file you\'re testing (e.g., `userService.test.js` for `userService.js`)',
      'Use the Arrange-Act-Assert pattern for every test case',
      'Test the happy path first, then edge cases, then error scenarios',
      'Mock external dependencies but not the code under test',
      'Run the full test suite to verify no existing tests are broken',
    ],
  },
  api: {
    scope: 'This module defines API contracts, endpoint schemas, client adapters, and protocol-specific code (REST, GraphQL, gRPC). It is the boundary between the application and external systems — both the APIs exposed and the APIs consumed.',
    dos: [
      'Version API endpoints explicitly: `/v1/users`, `/v2/users` — never break backward compatibility silently',
      'Use consistent naming: plural nouns for resources (`/users`, `/orders`), no verbs in resource URLs',
      'Document every endpoint\'s request and response schema with types, validation rules, and concrete examples',
      'Handle pagination, filtering, and sorting consistently across all list endpoints with standard query parameters',
      'Implement proper error responses with structured error objects: status code, error code, human-readable message',
    ],
    donts: [
      'Never break backward compatibility in a published API version — add fields, don\'t remove or rename them',
      'Never expose internal data structures (database IDs, internal enum values, stack traces) in API responses',
      'Never mix different API styles inconsistently — keep REST endpoints RESTful, RPC endpoints RPC-style',
      'Never return unbounded lists without pagination — large payloads are a performance and reliability risk',
    ],
    testing: [
      'Test API contracts: verify response shapes match the documented schema for every endpoint and status code',
      'Test error responses: malformed request body, missing auth token, invalid parameters, exceeded rate limit',
      'Test backward compatibility: verify that clients using the previous version still get correct responses',
      'Use contract testing (Pact, OpenAPI validation) for APIs consumed by other teams or external services',
    ],
    changeGuidance: [
      'Define the new endpoint\'s request and response schema first, before writing any implementation code',
      'Add the endpoint with proper versioning — never modify an existing published version\'s contract',
      'Implement consistent error responses using the project\'s standard error format',
      'Add pagination, filtering, and sorting for list endpoints following existing conventions',
      'Write contract tests verifying the schema and error responses',
    ],
  },
}

const GENERIC_KNOWLEDGE = {
  scope: 'This module contains application code. Review the Module Responsibilities and File Analysis sections below to understand the specific role of each file.',
  dos: [
    'Read all existing files in this folder before adding or modifying code — understand current patterns before introducing changes',
    'Follow the naming conventions used by existing files in this folder (see Project Conventions section if present)',
    'Keep functions focused on a single responsibility — aim for under 40 lines per function body',
    'Add JSDoc or docstring comments to all exported/public functions describing parameters, return types, and behavior',
    'Handle errors explicitly with descriptive messages — never let exceptions propagate silently without logging or recovery',
    'Use early returns to reduce nesting depth and improve readability of conditional logic',
    'Keep file sizes manageable — consider splitting files that exceed 300 lines into focused, cohesive modules',
    'Prefer composition over inheritance — use dependency injection and interfaces for flexible, testable design',
  ],
  donts: [
    'Never introduce new third-party dependencies without evaluating alternatives and impact on bundle size or startup time',
    'Never create circular dependencies between files — if A imports B and B imports A, extract the shared part into C',
    'Never duplicate logic that already exists in utility or helper files — search the codebase before writing new code',
    'Never change the public API of exported functions without updating ALL callers across the entire codebase',
    'Never add commented-out code — use version control (git) to preserve old code and revert if needed',
    'Never mix different abstraction levels in the same function (e.g., raw SQL queries next to business rule checks)',
    'Never ignore linter or type-checker warnings — fix them, or suppress with a comment explaining why',
  ],
  testing: [
    'Write unit tests for each exported function covering: valid inputs, edge cases, and error/exception paths',
    'Place tests in the project\'s test directory, mirroring this folder\'s relative path for easy navigation',
    'Mock external dependencies (file system, network, databases) to keep unit tests fast and deterministic',
    'Test error paths explicitly: what happens when inputs are null, undefined, empty, malformed, or out of range?',
    'Keep tests independent — each test sets up its own data, makes no assumptions about execution order',
    'Aim for meaningful coverage of logic branches, not just line coverage percentage numbers',
  ],
  changeGuidance: [
    'Follow the patterns established by existing files in this folder — consistency is more important than personal preference',
    'Use consistent naming with existing code (check the Project Conventions section above)',
    'Keep new functions focused and under 40 lines',
    'Add tests for all new exported functionality and all changed behavior',
    'Run existing tests to verify nothing is broken after your modifications',
  ],
}

const CHANGE_CHECKLIST = [
  'Read all files in this folder to understand the current implementation, patterns, and conventions',
  'Identify which files need to change and trace their dependents using the Dependencies section below',
  'Locate existing tests that cover the code you are modifying — run them to establish a green baseline',
  'Make the smallest change that achieves the goal — avoid unrelated refactoring in the same changeset',
  'Run the full test suite and verify ALL tests pass (not just the ones you think are related)',
  'Add or update tests for any new functionality or any changed observable behavior',
  'Verify that dependent modules still work correctly by checking import/usage chains',
  'Review naming: ensure all new code matches the established conventions (see Project Conventions section)',
  'Check for accidentally introduced TODOs, debug logging, console.log, or temporary code that should be removed',
  'If this folder has antipatterns listed in the Don\'t Do section, verify your change does not make them worse',
  'Verify that no unused imports were added and no required imports were accidentally removed',
  'Run any available linter or formatter (ESLint, Prettier, etc.) and fix all new warnings before finalizing',
  'If you modified public function signatures, search the codebase for all call sites and update them',
  'Review your diff one final time before marking the change as complete — look for debug code, typos, and hardcoded values',
]

const UNIVERSAL_STANDARDS = {
  dos: [
    'Use descriptive variable and function names that reveal intent — avoid abbreviations and single-letter names except for loop indices',
    'Keep functions under 40 lines — if a function is longer, extract well-named helper functions for complex logic',
    'Validate inputs at module boundaries — don\'t trust data coming from outside this module without checking',
    'Prefer immutable data — avoid mutating function arguments or shared state, return new values instead',
    'Handle all error cases explicitly — never assume the happy path, always consider what can go wrong',
  ],
  donts: [
    'Never use magic numbers or strings — define named constants with explanatory names for all literals',
    'Never suppress or swallow errors silently — at minimum log them, prefer to handle or propagate them',
    'Never rely on implicit type coercion or truthy/falsy checks for critical logic — use explicit comparisons',
    'Never leave TODO or FIXME comments in production code without a linked issue or ticket number',
  ],
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates agent_<folderName>_instructions.md inside the given folder.
 * Uses writeFileSync which overwrites by default -- safe to re-run.
 */
export function generateInstructions(folderInfo, patternInfo, languageInfo, projectMeta) {
  const content = buildMarkdown(folderInfo, patternInfo, languageInfo, projectMeta)
  const fileName = `agent_${folderInfo.name.toLowerCase()}_instructions.md`
  const outputPath = join(folderInfo.path, fileName)
  writeFileSync(outputPath, content, 'utf8')
  return outputPath
}

// ═══════════════════════════════════════════════════════════════════════════════
// Markdown Assembly
// ═══════════════════════════════════════════════════════════════════════════════

function buildMarkdown(folderInfo, patternInfo, languageInfo, projectMeta) {
  const { name, relativePath, codeFiles, subdirNames, depth } = folderInfo
  const {
    patternId, role, description, agentHint, fileAnalysis,
    hasInterfaces, hasImplementations,
    deepAnalysis, detectedPatterns, dependencies, howToAdd,
    conventions, examples, antipatterns,
  } = patternInfo
  const { lang, framework } = languageInfo
  const date = projectMeta.testDate || new Date().toISOString().split('T')[0]
  const knowledge = ROLE_KNOWLEDGE[patternId] || GENERIC_KNOWLEDGE

  const sections = []

  // ─── Header ──────────────────────────────────────────────────────────────
  sections.push(`# ${name}/ — Agent Instructions`)
  sections.push(`> Generated by [skill-me-up](https://github.com/skill-me-up/skill-me-up) on ${date}`)
  sections.push(`> Project: **${projectMeta.name}** | Language: **${lang}** | Framework: **${framework}**`)
  sections.push('')

  // ─── Overview ────────────────────────────────────────────────────────────
  sections.push('## Overview')
  sections.push(`**Path:** \`${relativePath}/\``)
  sections.push(`**Role:** ${role}`)
  sections.push(`**Files:** ${codeFiles.length} code file(s)`)
  sections.push('')
  sections.push(description)
  sections.push('')
  sections.push(`**Scope:** ${knowledge.scope}`)
  sections.push('')

  // ─── Behavioral Rules ────────────────────────────────────────────────────
  sections.push(buildBehavioralRulesSection(patternId, detectedPatterns))
  sections.push('')

  // ─── Project Conventions (expanded) ──────────────────────────────────────
  const conventionsContent = conventions ? buildExpandedConventionsSection(conventions) : null
  if (conventionsContent) {
    sections.push('## Project Conventions')
    sections.push(conventionsContent)
    sections.push('')
  } else {
    sections.push('## Project Conventions')
    sections.push('')
    sections.push('No dominant naming conventions were detected in this folder (fewer than 5 code samples or no clear majority style).')
    sections.push('When adding new code, follow these guidelines:')
    sections.push('')
    sections.push('- Inspect existing files in this folder and match their naming style exactly')
    sections.push('- If files use camelCase, use camelCase for all new identifiers')
    sections.push('- If the project has a sibling folder with detected conventions, follow the same style for consistency')
    sections.push('- When in doubt, prefer the most common convention for the project\'s primary language')
    sections.push('')
  }

  // ─── Usage Examples ─────────────────────────────────────────────────────
  if (examples) {
    const examplesContent = buildUsageExamplesSection(examples)
    if (examplesContent) {
      sections.push(examplesContent)
      sections.push('')
    }
  }

  // ─── Don't Do (ANTIPATTERNS) ────────────────────────────────────────────
  if (antipatterns) {
    const dontDoContent = buildDontDoSection(antipatterns)
    if (dontDoContent) {
      sections.push(dontDoContent)
      sections.push('')
    }
  }

  // ─── Directory tree ─────────────────────────────────────────────────────
  const tree = buildFolderTree(folderInfo.path, relativePath)
  if (tree) {
    sections.push('## Structure')
    sections.push('```')
    sections.push(tree)
    sections.push('```')
    sections.push('')
  }

  // ─── Module Responsibilities ────────────────────────────────────────────
  const respSection = buildModuleResponsibilitiesSection(deepAnalysis)
  if (respSection) {
    sections.push(respSection)
    sections.push('')
  }

  // ─── Classes & Interfaces (DEEP ANALYSIS) ───────────────────────────────
  if (deepAnalysis && deepAnalysis.length > 0) {
    const classSection = buildClassesSection(deepAnalysis)
    if (classSection) {
      sections.push('## Classes & Interfaces')
      sections.push('')
      sections.push(classSection)
      sections.push('')
    }
  }

  // ─── Key Patterns (DETECTED PATTERNS) ───────────────────────────────────
  if (detectedPatterns && detectedPatterns.length > 0) {
    sections.push('## Key Patterns')
    sections.push('')
    for (const pattern of detectedPatterns) {
      sections.push(`### ${pattern.label}`)
      sections.push(pattern.description)
      sections.push('')
    }
  }

  // ─── Files breakdown (original categorized view) ────────────────────────
  sections.push('## Files by Category')
  sections.push(buildFilesSection(fileAnalysis, codeFiles))

  // ─── Interface / Implementation note ────────────────────────────────────
  if (hasInterfaces || hasImplementations) {
    sections.push('## Architecture Note')
    if (hasInterfaces && hasImplementations) {
      sections.push(
        'This folder contains both **interfaces** (contracts) and **implementations** (concrete classes). ' +
        'When modifying behavior, update the interface first if the contract changes, then the implementation.'
      )
    } else if (hasInterfaces) {
      sections.push(
        'This folder defines **interfaces / contracts**. ' +
        'Implementations live in a sibling folder (typically named `impl/` or `*Impl`).'
      )
    } else if (hasImplementations) {
      sections.push(
        'This folder contains **concrete implementations**. ' +
        'The corresponding interfaces/contracts are defined in a sibling folder.'
      )
    }
    sections.push('')
  }

  // ─── How to add new code here (CONTEXTUAL INSTRUCTIONS) ─────────────────
  if (howToAdd && howToAdd.length > 0) {
    sections.push('## How to Add New Code Here')
    sections.push('')
    for (const instruction of howToAdd) {
      sections.push(`### ${instruction.title}`)
      sections.push('')
      for (let i = 0; i < instruction.steps.length; i++) {
        sections.push(`${i + 1}. ${instruction.steps[i]}`)
      }
      sections.push('')
    }
  }

  // ─── Testing Guidelines ──────────────────────────────────────────────────
  sections.push(buildTestingGuidelinesSection(patternId, codeFiles))
  sections.push('')

  // ─── Dependencies (CROSS-FOLDER IMPORTS) ─────────────────────────────────
  if (dependencies && dependencies.length > 0) {
    sections.push('## Dependencies')
    sections.push('')
    sections.push('This folder imports from or depends on the following packages or folders:')
    sections.push('')
    for (const dep of dependencies) {
      sections.push(`- \`${dep.path}\` — ${dep.role}`)
    }
    sections.push('')
    sections.push('> **Impact note:** Changes to this folder\'s public API may break modules that import from here. Changes to dependencies listed above may break this folder. Always check both directions before modifying exports or imports.')
    sections.push('')
  }

  // ─── Coding Standards ────────────────────────────────────────────────────
  sections.push(buildCodingStandardsSection())
  sections.push('')

  // ─── Change Checklist ────────────────────────────────────────────────────
  sections.push(buildChangeChecklistSection())
  sections.push('')

  // ─── Subdirectories ─────────────────────────────────────────────────────
  if (subdirNames.length > 0) {
    sections.push('## Subdirectories')
    for (const sub of subdirNames) {
      sections.push(`- \`${sub}/\` — see \`agent_${sub.toLowerCase()}_instructions.md\` inside this folder`)
    }
    sections.push('')
  }

  // ─── Comprehensive Agent Instructions ────────────────────────────────────
  sections.push(buildComprehensiveAgentInstructions(
    patternId, role, agentHint, detectedPatterns, dependencies,
    conventions, hasInterfaces, hasImplementations, deepAnalysis
  ))
  sections.push('')

  // ─── Relationships (if not top-level) ────────────────────────────────────
  if (depth > 1) {
    sections.push('## Context')
    sections.push(`This folder is nested inside \`${relativePath.split('/').slice(0, -1).join('/')}/\`. ` +
      `Check the parent folder's instructions file for broader context.`)
    sections.push('')
  }

  // ─── Footer ──────────────────────────────────────────────────────────────
  sections.push('---')
  sections.push('*This file was auto-generated by skill-me-up. Re-run the tool to refresh (files are overwritten, not duplicated).*')

  return sections.join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW Section Builders
// ═══════════════════════════════════════════════════════════════════════════════

function buildBehavioralRulesSection(patternId, detectedPatterns) {
  const knowledge = ROLE_KNOWLEDGE[patternId] || GENERIC_KNOWLEDGE
  const lines = []

  lines.push('## Behavioral Rules')
  lines.push('')

  lines.push('### DO')
  lines.push('')
  for (const rule of knowledge.dos) {
    lines.push(`- ${rule}`)
  }
  lines.push('')

  lines.push("### DON'T")
  lines.push('')
  for (const rule of knowledge.donts) {
    lines.push(`- ${rule}`)
  }

  if (detectedPatterns && detectedPatterns.length > 0) {
    lines.push('')
    lines.push('### Pattern-Specific Guidelines')
    lines.push('')
    for (const pattern of detectedPatterns) {
      lines.push(`- **${pattern.label}:** ${pattern.description}`)
    }
  }

  lines.push('')
  lines.push('### Universal Standards')
  lines.push('')
  for (const rule of UNIVERSAL_STANDARDS.dos) {
    lines.push(`- ${rule}`)
  }
  for (const rule of UNIVERSAL_STANDARDS.donts) {
    lines.push(`- ${rule}`)
  }

  return lines.join('\n')
}

function buildModuleResponsibilitiesSection(deepAnalysis) {
  if (!deepAnalysis || deepAnalysis.length === 0) return null

  const validEntries = deepAnalysis.filter(fa => !fa.error)
  if (validEntries.length === 0) return null

  const lines = []
  lines.push('## Module Responsibilities')
  lines.push('')

  for (const fa of validEntries) {
    const typeLabel = fa.classType
      ? fa.classType.charAt(0).toUpperCase() + fa.classType.slice(1)
      : 'File'

    lines.push(`### \`${fa.file}\` — ${typeLabel}: ${fa.className || fa.file.replace(/\.[^.]+$/, '')}`)
    lines.push('')

    // Purpose line
    let purpose = `Defines the \`${fa.className || fa.file.replace(/\.[^.]+$/, '')}\` ${fa.classType || 'module'}`
    if (fa.extendsClass) purpose += ` extending \`${fa.extendsClass}\``
    if (fa.implementsInterfaces && fa.implementsInterfaces.length > 0) {
      purpose += ` implementing ${fa.implementsInterfaces.map(i => `\`${i}\``).join(', ')}`
    }
    lines.push(`- **Purpose:** ${purpose}`)

    // Language
    if (fa.language) {
      lines.push(`- **Language:** ${fa.language}`)
    }

    // Key exports
    if (fa.methods && fa.methods.length > 0) {
      const publicMethods = fa.methods.filter(m => m.isPublic !== false)
      if (publicMethods.length > 0) {
        const names = publicMethods.map(m => `\`${m.name}\``).slice(0, 8).join(', ')
        const extra = publicMethods.length > 8 ? ` (+${publicMethods.length - 8} more)` : ''
        lines.push(`- **Key exports:** ${names}${extra}`)
      }
    }

    // Package
    if (fa.packageName) {
      lines.push(`- **Package:** \`${fa.packageName}\``)
    }

    // Annotations
    if (fa.classAnnotations && fa.classAnnotations.length > 0) {
      lines.push(`- **Annotations:** ${fa.classAnnotations.map(a => `\`@${a}\``).join(', ')}`)
    }

    // Dependencies
    if (fa.imports && fa.imports.length > 0) {
      const deps = fa.imports.slice(0, 6).map(i => `\`${i}\``).join(', ')
      const extra = fa.imports.length > 6 ? ` (+${fa.imports.length - 6} more)` : ''
      lines.push(`- **Depends on:** ${deps}${extra}`)
    }

    lines.push('')
  }

  return lines.join('\n')
}

function buildExpandedConventionsSection(conventions) {
  const baseContent = buildConventionsSection(conventions)
  if (!baseContent) return null

  const lines = [baseContent]
  lines.push('')
  lines.push('**Enforcement:**')
  lines.push('- All new code in this folder MUST follow the conventions listed above for consistency')
  lines.push('- When adding new methods, classes, or files, match the detected naming style exactly')
  lines.push('- If a convention seems wrong, verify by checking multiple existing files before deviating')
  lines.push('- Import style must be consistent within each file — do not mix relative and absolute imports')

  return lines.join('\n')
}

function buildTestingGuidelinesSection(patternId, codeFiles) {
  const knowledge = ROLE_KNOWLEDGE[patternId] || GENERIC_KNOWLEDGE
  const lines = []

  lines.push('## Testing Guidelines')
  lines.push('')

  for (const hint of knowledge.testing) {
    lines.push(`- ${hint}`)
  }

  const testableFiles = (codeFiles || [])
    .map(f => typeof f === 'string' ? f : f.name)
    .filter(name => name && !name.includes('.test.') && !name.includes('.spec.') && !name.startsWith('agent_'))
  if (testableFiles.length > 0) {
    lines.push('')
    lines.push('**Files in this folder that need test coverage:**')
    lines.push('')
    for (const file of testableFiles) {
      lines.push(`- \`${file}\``)
    }
  }

  return lines.join('\n')
}

function buildCodingStandardsSection() {
  const lines = []

  lines.push('## Coding Standards')
  lines.push('')
  lines.push('The following standards apply to all code in this folder:')
  lines.push('')
  lines.push('### Readability')
  lines.push('- Use descriptive names that reveal intent — a reader should understand the purpose without reading the implementation')
  lines.push('- Keep functions short and focused — each function should do one thing and do it well')
  lines.push('- Use consistent formatting (indentation, spacing, brace style) matching the rest of the codebase')
  lines.push('- Add comments only for non-obvious "why" decisions — the code itself should explain "what" and "how"')
  lines.push('')
  lines.push('### Reliability')
  lines.push('- Handle all error cases explicitly — never assume operations will succeed')
  lines.push('- Use try/catch or error callbacks for operations that can fail (I/O, parsing, network, user input)')
  lines.push('- Validate data at module boundaries — don\'t trust input from outside this module')
  lines.push('- Prefer immutable data patterns — avoid mutating shared state or function arguments')
  lines.push('')
  lines.push('### Maintainability')
  lines.push('- Follow the Single Responsibility Principle — each function and file should have one reason to change')
  lines.push('- Keep coupling low — depend on interfaces and abstractions, not concrete implementations when possible')
  lines.push('- Make dependencies explicit through imports and injection — avoid global state or hidden singletons')
  lines.push('- Write code that is easy to delete — well-isolated modules can be replaced without cascading changes')

  return lines.join('\n')
}

function buildChangeChecklistSection() {
  const lines = []

  lines.push('## Change Checklist')
  lines.push('')
  lines.push('Before and after modifying files in this folder, follow these steps:')
  lines.push('')
  for (let i = 0; i < CHANGE_CHECKLIST.length; i++) {
    lines.push(`${i + 1}. ${CHANGE_CHECKLIST[i]}`)
  }

  return lines.join('\n')
}

function buildComprehensiveAgentInstructions(
  patternId, role, agentHint, detectedPatterns, dependencies,
  conventions, hasInterfaces, hasImplementations, deepAnalysis
) {
  const knowledge = ROLE_KNOWLEDGE[patternId] || GENERIC_KNOWLEDGE
  const lines = []

  lines.push('## Instructions for AI Agents')
  lines.push('')

  // Scope and context
  lines.push('### Module Purpose')
  lines.push('')
  lines.push(knowledge.scope)
  lines.push('')

  // Original agent hint (from pattern config)
  if (agentHint && agentHint !== 'Inspect the files inside to understand specific responsibilities.') {
    lines.push(`> **Quick rule:** ${agentHint}`)
    lines.push('')
  }

  // Architecture context
  lines.push('### Architecture Context')
  lines.push('')
  lines.push(`**Role in the system:** ${role}`)
  if (hasInterfaces && hasImplementations) {
    lines.push('**Architecture:** This folder uses interface-implementation separation. Modify interfaces to change contracts, implementations to change behavior. Always update the interface first.')
  } else if (hasInterfaces) {
    lines.push('**Architecture:** This folder defines contracts (interfaces). Concrete implementations are located in sibling folders.')
  } else if (hasImplementations) {
    lines.push('**Architecture:** This folder contains concrete implementations. The interfaces/contracts they fulfill are defined elsewhere.')
  }

  if (deepAnalysis && deepAnalysis.length > 0) {
    const fileList = deepAnalysis.filter(fa => !fa.error).map(fa => `\`${fa.file}\``)
    if (fileList.length > 0) {
      lines.push(`**Files:** ${fileList.join(', ')}`)
    }
  }

  if (dependencies && dependencies.length > 0) {
    lines.push(`**Dependencies:** This module has ${dependencies.length} dependency connection(s) — see the Dependencies section for details.`)
  }
  lines.push('')

  // Before you start
  lines.push('### Before You Start')
  lines.push('')
  lines.push('1. Read the **Behavioral Rules** section — it contains the most critical guidelines for working in this module')
  lines.push('2. Check the **Project Conventions** section to understand naming patterns you must follow')
  lines.push('3. Review the **Module Responsibilities** section to understand what each file does and what it exports')
  lines.push('4. Look at the **Dependencies** section to understand what this module connects to and what depends on it')
  lines.push('5. Check the **Testing Guidelines** section for the testing approach expected in this area')
  lines.push('')

  // Making changes
  lines.push('### Making Changes')
  lines.push('')
  lines.push('When adding new code to this folder:')
  lines.push('')
  for (const step of knowledge.changeGuidance) {
    lines.push(`- ${step}`)
  }
  lines.push('')

  // Dependency context
  if (dependencies && dependencies.length > 0) {
    lines.push('### Dependency Awareness')
    lines.push('')
    lines.push('This module\'s imports and exports create a dependency graph. Before modifying any public API:')
    lines.push('')
    lines.push('1. Search the codebase for all files that import from this folder')
    lines.push('2. Verify that your changes are backward-compatible, or update all callers')
    lines.push('3. If you change a function signature, update all call sites before running tests')
    lines.push('4. If you add a new dependency (import), verify it doesn\'t create a circular dependency chain')
    lines.push('')
  }

  // Verification
  lines.push('### Verification')
  lines.push('')
  lines.push('After making changes, verify your work:')
  lines.push('')
  lines.push('1. Run the project\'s test suite and confirm ALL tests pass (not just the ones you think are related)')
  lines.push('2. Check for linter, type-checker, or compiler warnings introduced by your changes')
  lines.push('3. Verify that dependent modules still function correctly by tracing the import chain')
  lines.push('4. Review your changes against the **Behavioral Rules** section — ensure no rules are violated')
  lines.push('5. If antipatterns are listed in the **Don\'t Do** section, verify your change doesn\'t add new ones')
  lines.push('6. Confirm all new code follows the **Project Conventions** for naming and import style')
  lines.push('')

  // Troubleshooting
  lines.push('### Troubleshooting')
  lines.push('')
  lines.push('When something goes wrong after your changes:')
  lines.push('')
  lines.push('1. Check test output for specific assertion failures — they point directly to the broken behavior')
  lines.push('2. Use `git diff` to review exactly what you modified — the problem is usually in the most recent change')
  lines.push('3. Verify that all dependencies are still installed and at compatible versions')
  lines.push('4. Check recently modified files in dependent modules that might have introduced breaking changes')
  lines.push('5. If a test is failing intermittently, investigate timing dependencies, shared mutable state, or external service calls')
  lines.push('6. If the error is in a module you didn\'t modify, check whether your change altered the data contract (types, shapes, or semantics)')

  return lines.join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════════
// Existing Section Builders (preserved for backward compatibility)
// ═══════════════════════════════════════════════════════════════════════════════

function buildClassesSection(deepAnalysis) {
  const lines = []

  for (const fa of deepAnalysis) {
    if (fa.error) {
      lines.push(`### \`${fa.file}\``)
      lines.push(`*Could not read file: ${fa.error}*`)
      lines.push('')
      continue
    }

    const typeLabel = fa.classType ? fa.classType.charAt(0).toUpperCase() + fa.classType.slice(1) : 'File'
    lines.push(`### \`${fa.file}\` — ${typeLabel}: **${fa.className}**`)
    lines.push('')

    if (fa.packageName) {
      lines.push(`- **Package:** \`${fa.packageName}\``)
    }
    if (fa.extendsClass) {
      lines.push(`- **Extends:** \`${fa.extendsClass}\``)
    }
    if (fa.implementsInterfaces && fa.implementsInterfaces.length > 0) {
      lines.push(`- **Implements:** ${fa.implementsInterfaces.map(i => `\`${i}\``).join(', ')}`)
    }
    if (fa.classAnnotations && fa.classAnnotations.length > 0) {
      lines.push(`- **Annotations:** ${fa.classAnnotations.map(a => `\`@${a}\``).join(', ')}`)
    }
    if (fa.fieldAnnotations && fa.fieldAnnotations.length > 0) {
      lines.push(`- **Field Annotations:** ${fa.fieldAnnotations.map(a => `\`@${a}\``).join(', ')}`)
    }

    if (fa.methods && fa.methods.length > 0) {
      lines.push('')
      lines.push('**Public Methods:**')
      lines.push('')
      lines.push('| Method | Parameters | Returns | Annotation |')
      lines.push('|--------|-----------|---------|------------|')
      for (const method of fa.methods) {
        const params = method.params || '—'
        const ret = method.returnType || '—'
        const ann = method.annotation ? `\`${method.annotation}\`` : '—'
        lines.push(`| \`${method.name}\` | \`${truncate(params, 60)}\` | \`${ret}\` | ${ann} |`)
      }
      lines.push('')
    } else {
      lines.push('')
    }
  }

  return lines.length > 0 ? lines.join('\n') : null
}

function buildFilesSection(fileAnalysis, allCodeFiles) {
  const lines = []
  const { interfaces, implementations, controllers, tests, models, configs, utils, other } = fileAnalysis

  const groups = [
    { label: 'Interfaces / Contracts', items: interfaces },
    { label: 'Implementations', items: implementations },
    { label: 'Controllers / Handlers', items: controllers },
    { label: 'Models / Entities / DTOs', items: models },
    { label: 'Configuration', items: configs },
    { label: 'Utilities / Helpers', items: utils },
    { label: 'Tests', items: tests },
    { label: 'Other', items: other },
  ]

  for (const group of groups) {
    if (group.items.length === 0) continue
    lines.push(`### ${group.label}`)
    for (const item of group.items) {
      lines.push(`- \`${item.file}\` — ${item.note}`)
    }
    lines.push('')
  }

  if (allCodeFiles.length === 0) {
    lines.push('*No code files detected in this folder.*')
    lines.push('')
  }

  return lines.join('\n')
}

// ─── Language → Fence Tag Map ─────────────────────────────────────────────────

const LANG_FENCE = {
  JavaScript: 'js',
  TypeScript: 'ts',
  Java: 'java',
  Kotlin: 'kotlin',
  Python: 'python',
  Go: 'go',
  'C#': 'csharp',
  PHP: 'php',
  Ruby: 'ruby',
}

// ─── Usage Examples Section ───────────────────────────────────────────────────

function buildUsageExamplesSection(examples) {
  if (!examples || examples.length === 0) return null
  const lines = []
  lines.push('## Usage Examples')
  lines.push('')
  const byLang = {}
  for (const ex of examples) {
    const lang = ex.lang || 'unknown'
    if (!byLang[lang]) byLang[lang] = []
    byLang[lang].push(ex)
  }
  const langs = Object.keys(byLang)
  for (const lang of langs) {
    if (langs.length > 1) { lines.push(`#### ${lang}`); lines.push('') }
    for (const ex of byLang[lang]) {
      const fence = LANG_FENCE[lang] || ''
      lines.push(`### ${ex.methodName}`)
      lines.push(`See: \`${ex.relativePath}:${ex.lineNumber}\``)
      lines.push('')
      lines.push(`\`\`\`${fence}`)
      lines.push(...ex.snippet)
      lines.push('```')
      lines.push('')
    }
  }
  return lines.length > 0 ? lines.join('\n') : null
}

// ─── Don't Do Section ────────────────────────────────────────────────────────

function buildDontDoSection(antipatterns) {
  if (!antipatterns || antipatterns.length === 0) return null
  const lines = []
  lines.push("## Don't Do")
  lines.push('')
  lines.push('> Heuristically detected — review before treating as authoritative.')
  lines.push('')
  for (const ap of antipatterns) {
    lines.push(`- **${ap.label}**: found in ${ap.count} file${ap.count === 1 ? '' : 's'}`)
  }
  return lines.join('\n')
}

// ─── Project Conventions Section (original — used by tests) ───────────────────

function buildConventionsSection(conventions) {
  if (!conventions || Object.keys(conventions).length === 0) return null

  const IMPORT_LABELS = {
    'relative-with-extension': 'relative paths with `.js` extension',
    'relative-bare': 'relative paths without extension',
    'absolute-bare': 'absolute/package paths',
  }

  const lines = []

  if (conventions.methods) {
    if (Array.isArray(conventions.methods)) {
      for (const entry of conventions.methods) {
        lines.push(`- **Methods (${entry.lang})**: ${entry.style} (e.g. \`${entry.example}\`)`)
      }
    } else {
      lines.push(`- **Methods**: ${conventions.methods.style} (e.g. \`${conventions.methods.example}\`)`)
    }
  }

  if (conventions.classes) {
    if (Array.isArray(conventions.classes)) {
      for (const entry of conventions.classes) {
        lines.push(`- **Classes (${entry.lang})**: ${entry.style} (e.g. \`${entry.example}\`)`)
      }
    } else {
      lines.push(`- **Classes**: ${conventions.classes.style} (e.g. \`${conventions.classes.example}\`)`)
    }
  }

  if (conventions.files) {
    lines.push(`- **Files**: ${conventions.files.style} (e.g. \`${conventions.files.example}\`)`)
  }

  if (conventions.imports) {
    const label = IMPORT_LABELS[conventions.imports.style] || conventions.imports.style
    lines.push(`- **Imports**: ${label} (e.g. \`${conventions.imports.example}\`)`)
  }

  return lines.length > 0 ? lines.join('\n') : null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str
  return str.substring(0, maxLen - 3) + '...'
}

// ─── Test Exports ─────────────────────────────────────────────────────────────
export { buildConventionsSection, buildUsageExamplesSection, buildDontDoSection }
