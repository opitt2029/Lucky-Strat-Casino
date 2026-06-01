---
name: gen-prompt
description: >
  Generates a professional, self-contained English implementation prompt for a Spring Boot
  microservice task. Use this skill immediately whenever the user mentions "提示詞", "prompt",
  "prompts", asks to "generate a prompt", "write a prompt", "make a prompt", or describes a
  task and wants a prompt for it (e.g. "幫我寫這個任務的提示詞", "give me the prompt for T-010",
  "I need a prompt for implementing the login API"). The skill reads the actual project files
  (pom.xml, application.yml, schema SQL) so every generated prompt is grounded in real code,
  not assumptions. Always invoke this skill — do NOT write the prompt inline yourself.
---

# gen-prompt — Implementation Prompt Generator

## CRITICAL: Output Language

**The generated prompt MUST be written entirely in English.**
- Section headers: English
- Field descriptions: English
- Step-by-step logic: English
- Security requirements: English
- Test case names and descriptions: English
- Code comments inside snippets: English

The only exception: Chinese is allowed inside code snippets if the existing project codebase
already uses Chinese comments (e.g. existing Javadoc in Chinese). Do NOT translate existing
Chinese comments — leave them as-is inside code blocks.

Do NOT add sections that are not in the output template below (no acceptance criteria tables,
no implementation order suggestions, no architecture diagrams).

---

## Step 1 — Collect Task Info

If the user has NOT already provided all of the following, ask before proceeding:

- **Task ID** (e.g. T-010)
- **API endpoint(s)** (method + path)
- **Business logic** (what the endpoint does, validations, side effects)
- **Deliverables** (e.g. API + unit tests)
- **Predecessor tasks** (which tasks are already done and what classes/files they created)

If the user pastes a task table, extract all fields automatically without asking.

---

## Step 2 — Read the Project Files

Before writing a single word of the prompt, read these files using Bash `cat`:

```
backend/<service-name>/pom.xml
backend/<service-name>/src/main/resources/application.yml
database/mysql/migration/V1__init_schema.sql
database/postgres/migration/V1__init_schema.sql   (only if task touches PostgreSQL)
```

Extract:
- Package root (groupId from pom.xml, e.g. `com.luckystar.member`)
- Java version from `<java.version>`
- All dependencies with pinned versions (especially JJWT, Spring Boot, etc.)
- application.yml config keys relevant to this task (jwt.*, redis.*, kafka.*)
- Exact CREATE TABLE SQL for every table the task will touch — column names, types, constraints

If a file cannot be read, state the assumption you made and why.

---

## Step 3 — Write the Prompt

Output a single fenced markdown code block containing the complete English prompt.
Follow the template below exactly. Fill in `<...>` placeholders with real values.
Do not add, remove, or rename any top-level section.

````
You are a Spring Boot backend engineer implementing <one-line task description>.

## Project Background
- Package root: <com.example.service>
- Java <version> + Spring Boot 3.x
- Service: <service-name>, port <port>
- Predecessor tasks completed: <list what already exists — class names that must not be recreated>

## Tech Stack (exact versions — do NOT use alternatives or newer APIs)
<list every relevant dependency exactly as it appears in pom.xml, one per line>
- Spring Boot Web / JPA / Security / Redis / Kafka: managed by parent BOM
- JJWT: <version> (jjwt-api + jjwt-impl + jjwt-jackson)
- MySQL Connector: runtime scope
- <other relevant deps>

## Exact API Usage
<Include this section ONLY when a dependency has version-specific APIs where wrong usage is
likely. For JJWT 0.12.x, always include this. Show working code snippets so the implementer
copies them instead of guessing from outdated training data.>

## application.yml Config Keys
<List only the keys the implementation must @Value-inject, with their resolved defaults>

## Database Schema (do not modify)
<Paste the exact CREATE TABLE SQL for every table this task touches.
Copy column names, types, constraints, and DEFAULT values verbatim from the migration file.>

## Implementation Goals

Implement the following layers in this order:

### 1. Entity
<Class name, @Entity @Table(name="..."), every field with JPA annotations>

### 2. Repository
<Interface name extends JpaRepository<X,Y>, every method signature needed>

### 3. DTO
<Request class: fields with Bean Validation annotations and their regex patterns>
<Response class: fields returned to the caller>
<Custom validator if needed: annotation class name + validator class name + regex>

### 4. Service
<Class name. For each public method:>
- Signature
- Step 1: <action> — if <condition>, throw <ExceptionClass>("<message>")
- Step 2: <action>
- ...
- Return: <what is returned>

### 5. Controller
<Class name, @RestController @RequestMapping("<base-path>")>
For each endpoint:
- <HTTP method> <path>: accepts <RequestType>, returns <ResponseType> with HTTP <status>

### 6. Exception Classes
<ExceptionClass> → HTTP <status> <REASON_PHRASE> → message: "<exact message string>"
GlobalExceptionHandler must catch: <list exception classes and their HTTP status mappings>

### 7. Security Config
- permitAll: <list paths>
- authenticated: <list paths>
- Filters to add: <filter class name, position relative to which existing filter>

### 8. Unit Tests
Test class: <ClassName> using @ExtendWith(MockitoExtension.class)
Mocks: <list of @Mock fields>

- Test 1: <method name> — <scenario description> → expects <outcome>
- Test 2: <method name> — <scenario description> → expects <outcome>
<enumerate every test case — do not use "etc." or "happy path">

## Unified API Response Format
All endpoints wrap responses in:
{ "success": true/false, "data": <object or null>, "message": "<human-readable string>" }

## Security Requirements
<List each constraint explicitly>

## File Boundary
New files (create from scratch):
- src/main/java/<package path>/<ClassName>.java

Modified files (add to existing — do not overwrite):
- src/main/java/<package path>/<ClassName>.java — add: <what to add>

Unchanged files (do not touch):
- src/main/java/<package path>/<ClassName>.java

Produce all files listed under "New files" and "Modified files".
For each file, state its full path on a line before the code block.
````

---

## Step 4 — After Writing the Prompt

Tell the user (in Traditional Chinese):
1. Which project files you read and what you extracted from each
2. Any assumption you had to make because a file was missing or ambiguous
3. If this task has predecessor tasks, confirm the File Boundary is consistent with what those tasks already built — flag any conflict
