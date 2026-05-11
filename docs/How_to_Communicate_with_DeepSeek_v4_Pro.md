# How to Communicate with DeepSeek v4 Pro

This guide explains how to structure your prompts for DeepSeek to generate quality code efficiently.

## 1. Prompt Structure Template

Use this structure for every task:

```
[CONTEXT]
I'm working on [project name]. I have these documents:
- Project Design Document: [link or brief summary]
- CLAUDE.md: [link or brief summary]
- UI_DESIGN.md: [link or brief summary]

[TASK]
Generate [component/module/feature]: [exact name]

[REQUIREMENTS]
1. Must follow [specific standard from document]
2. Must implement [specific functionality]
3. Must use [specific technology/pattern]

[CONSTRAINTS]
- File must be < [line limit]
- Must include tests with [coverage target]
- Must use [specific imports/dependencies]

[DELIVERABLE FORMAT]
Provide:
1. Complete, production-ready code (no placeholders)
2. Inline comments for complex logic
3. Test cases (unit/integration as specified)
4. Any new dependencies needed in Cargo.toml / package.json
```

## 2. Example Prompts

### 2.1 Backend Task: WebSocket Client

```
[CONTEXT]
Building ntfy Desktop, a Tauri app for receiving ntfy notifications.

[TASK]
Generate Rust module: ntfy_client.rs

[REQUIREMENTS]
1. Implement WebSocket connection to ntfy servers
2. Handle messages with this structure:
   - title, body, timestamp, priority, topic
3. Implement exponential backoff reconnection (1s, 2s, 4s, max 60s)
4. Emit Tauri events for each received message
5. Graceful shutdown when app closes

[CONSTRAINTS]
- Use tokio-tungstenite for WebSocket
- All errors must return Result<T, CustomError>
- No panics or unwrap() in production code
- Max 300 lines

[DELIVERABLE FORMAT]
1. Complete ntfy_client.rs with all functions
2. Unit tests (70%+ coverage)
3. Doc comments for public API
4. Add required dependency to Cargo.toml
```

**Why this works for DeepSeek**:
- Explicit context (not assumed knowledge)
- Clear task boundaries
- Specific constraints prevent hallucinations
- Document references guide the AI

### 2.2 Frontend Task: Inbox Component

```
[CONTEXT]
ntfy Desktop React UI. Theme: Windows 11 Fluent Dark.

[TASK]
Generate React component: components/Inbox.tsx

[REQUIREMENTS]
1. Display message list with pagination
2. Each item shows: title, topic, timestamp, priority badge
3. Click to expand message detail panel
4. Delete/Archive buttons in detail panel
5. Search by title/body (debounced 300ms)
6. Use Zustand store from store/index.ts

[CONSTRAINTS]
- Follow UI_DESIGN.md Section 5.4 (Inbox Component)
- Use Tailwind only (no inline styles)
- Max 250 lines
- TypeScript interfaces for Message type
- Component tests: 75%+ coverage

[DELIVERABLE FORMAT]
1. Complete Inbox.tsx component
2. Component tests (Inbox.test.tsx)
3. Type definitions (in types/index.ts or inline)
4. Doc comments for complex logic
```

### 2.3 Database Task: Message Queries

```
[CONTEXT]
ntfy Desktop uses SQLite for storing messages.

[TASK]
Generate Rust module: database.rs - Query functions

[REQUIREMENTS]
1. Function: insert_messages(Vec<Message>) -> Result<()>
   - Use batch insert for performance
   - Wrap in single transaction
2. Function: get_messages_paginated(limit: i64, offset: i64) -> Result<Vec<Message>>
   - Return newest first
   - Join with subscription info (url, topic)
3. Function: delete_message(id: i64) -> Result<()>
4. Function: cleanup_old_messages(days: i64) -> Result<u64>
   - Delete messages older than N days
   - Return count deleted

[CONSTRAINTS]
- Use prepared statements with parameters
- All functions must be tested
- Database schema in Project Design Document Section 4.3
- Max 200 lines

[DELIVERABLE FORMAT]
1. Complete database.rs with all 4 functions
2. Unit tests for each function
3. Doc comments with examples
```

## 3. Response Validation Checklist

After DeepSeek generates code, verify it against:

### 3.1 Code Quality (CLAUDE.md Section 2)

- [ ] No `panic!()`, `unwrap()` in Rust
- [ ] No `any` types in TS
- [ ] All public functions have doc comments
- [ ] Error handling is explicit (`Result<T, E>`)
- [ ] No hardcoded values
- [ ] Imports are organized (std → external → local)

### 3.2 Completeness

- [ ] Code is production-ready (no `TODO`, `...`, placeholders)
- [ ] All promised functionality is implemented
- [ ] Tests are included (not just stubs)
- [ ] Dependencies listed if needed

### 3.3 Standards

- [ ] Rust: Follows CLAUDE.md Section 3
- [ ] React: Follows CLAUDE.md Section 4
- [ ] UI: Follows UI_DESIGN.md
- [ ] File size limits respected
- [ ] Test coverage targets met

### 3.4 Integration

- [ ] Code can be dropped into the project
- [ ] Imports align with project structure
- [ ] Type definitions match other modules
- [ ] No conflicts with existing code

## 4. Common Prompts You'll Use

### 4.1 "Implement feature X"

```
[CONTEXT]
[Project brief + links to docs]

[TASK]
Implement [feature]: [name]

[REQUIREMENTS]
- Reference [specific section] of [document]
- Must work with [module/component] already implemented
- Output should be [data structure/UI element]

[CONSTRAINTS]
- Use [specific technology]
- Max [line limit]
- Coverage: [percentage]

[DELIVERABLE]
1. [Complete code file(s)]
2. Tests
3. Any new dependencies
```

### 4.2 "Fix bug in X"

```
[CONTEXT]
[Problem description]
[Link to relevant code/document section]

[ISSUE]
[Specific problem you're seeing]

[EXPECTED]
[What should happen]

[CONSTRAINTS]
- Don't change function signature
- Keep backwards compatible
- Coverage must stay above [percentage]

[DELIVERABLE]
1. Fixed code (show exact diff if possible)
2. Regression tests (to prevent re-occurrence)
3. Explanation of root cause
```

### 4.3 "Write tests for X"

```
[CONTEXT]
[Module/component being tested]

[TASK]
Write comprehensive tests for [module]

[COVERAGE TARGETS]
- [Function 1]: 80%
- [Function 2]: 75%
- Overall: 80%

[TEST SCENARIOS]
1. Happy path: [scenario]
2. Error case: [scenario]
3. Edge case: [scenario]

[DELIVERABLE]
1. Complete test file ([name].test.rs / .test.tsx)
2. All scenarios covered
3. Clear test names and comments
```

### 4.4 "Create component for UI spec"

```
[CONTEXT]
Windows 11 Fluent Dark design system.

[TASK]
Create React component: [ComponentName]

[UI SPEC]
Reference UI_DESIGN.md Section [X] - [component name]

[REQUIREMENTS]
- Exact layout from spec
- All colors from Section 2
- All spacing from Section 4
- Tailwind classes only

[PROPS]
interface Props {
  [prop1]: [type];
  [prop2]: [type];
}

[DELIVERABLE]
1. Complete component
2. Component tests
3. Storybook stories (optional)
```

## 5. Red Flags: When to Reject DeepSeek Output

❌ **Don't use if**:
- Code has `panic!()`, `unwrap()`, `expect()` in production
- Type is `any` without cast
- No tests or tests are incomplete
- Doc comments missing for public functions
- File exceeds size limits
- Uses non-approved dependencies
- Doesn't follow Tauri/React patterns from docs
- Performance not considered (no indices, batch ops, etc.)
- Error handling is missing

**Action**: Ask DeepSeek to fix specific issues with reference to CLAUDE.md

## 6. Tips for Better Responses

### 6.1 Be Specific

❌ Bad: "Write a component for messages"  
✅ Good: "Write Inbox.tsx component matching UI_DESIGN.md Section 5.4, with TypeScript interfaces, Zustand integration, and 75%+ test coverage"

### 6.2 Reference Documents Directly

❌ Bad: "Use the database structure"  
✅ Good: "Use schema from Project Design Document Section 4.3 (subscriptions table, messages table, settings table)"

### 6.3 Specify Constraints Early

❌ Bad: "Write the tests"  
✅ Good: "Write unit tests with 80%+ coverage, inline in the source file, using tokio::test for async functions"

### 6.4 Ask for One Task at a Time

❌ Bad: "Write config.rs, database.rs, and ntfy_client.rs"  
✅ Good: "Write config.rs first. Follow CLAUDE.md Section 3. Include tests. Then we'll do database.rs."

## 7. Iterative Workflow

**Typical cycle**:

```
1. Describe task with prompt template
   ↓
2. DeepSeek generates code
   ↓
3. You validate against checklist (Section 3.4)
   ↓
4. If issues:
   - Reference specific CLAUDE.md/UI_DESIGN.md section
   - Ask to fix by name ("Remove all unwrap()", "Add doc comments")
   ↓
5. If ok:
   - Copy to project
   - Run tests locally
   - Commit with Conventional Commit message
```

## 8. Prompt Template (Copy-Paste Ready)

```
---COPY BELOW THIS LINE---

[CONTEXT]
I'm building ntfy Desktop (Tauri app, React + Rust).
- Project Design Document: [link]
- CLAUDE.md: [link]
- UI_DESIGN.md: [link]

[TASK]
Generate: [file name and purpose]

[REQUIREMENTS]
1. [Requirement 1]
2. [Requirement 2]
3. [Requirement 3]

[CONSTRAINTS]
- Max [line count] lines
- Coverage: [%+]
- Use [specific tech]
- Follow [specific doc section]

[DELIVERABLE FORMAT]
1. Complete production-ready code (no TODO/placeholders)
2. Unit tests with inline #[test] or equivalent
3. Doc comments for public API
4. List any new dependencies

---END TEMPLATE---
```

## 9. When DeepSeek Gets Confused

**Symptom**: Code doesn't match requirements, has errors, or is incomplete

**Fix**: Provide a reference example

```
Here's a similar function that's already working:
[paste working code]

Now generate [new thing] following the exact same pattern.
```

**Or**: Break it into smaller steps

```
Step 1: Generate just the data structures (models.rs)
Then: I'll review, and we'll do functions.rs next.
```

## 10. Success Criteria

When DeepSeek output is ready to use:

- ✅ Code compiles without errors
- ✅ Tests pass locally (coverage target met)
- ✅ Follows CLAUDE.md standards
- ✅ Matches UI_DESIGN.md if UI component
- ✅ Can be directly committed (no "cleanup" needed)
- ✅ Doc comments clear and accurate
- ✅ No console.log, println!, or debug code

---

**Key insight**: DeepSeek is a "smart copy-paster". Give it exact specs and examples, it will follow them precisely. Vague requests → vague/wrong output.

**Use the documents. Reference them specifically. Get great code.**
