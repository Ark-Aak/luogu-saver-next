# Agents Guidelines

You are participating in the development of **luogu-saver-next**.
During the development process, you must strictly adhere to the rules in this document.

---

## 0. Agent Behavior

- You are an automated coding / tooling agent working inside this repository.
- You must **not** modify files outside the project root.
- Whenever you change observable behavior of the system, you **must**:
  1. Update the corresponding specification file under `spec/`.
  2. Update the implementation.
  3. Keep the spec and code exactly aligned.

If any rule in this document conflicts with ad-hoc instructions, this document takes precedence.

---

## 1. Specification First

**Scope:** The specification system applies **only to the backend** (`packages/backend`).
Frontend code does not require spec files.

For every backend subsystem, there must exist a corresponding `spec.md` file
under `[project root]/spec`. The filename should be of the form:

- `config-system.spec.md`
- `billing-engine.spec.md`
- `…`

Place each spec file **directly** under the `spec` directory.  
**Do not create subdirectories inside `spec/`.**

### 1.1 Style of the spec

The spec must be written in **low-entropy, concrete English that approximates mathematical language**.
This means:

- Each statement should be **testable**: it must have clear preconditions and postconditions.
- Avoid vague adjectives and marketing language (e.g. “fast”, “simple”, “seamless”)
  unless quantified.
- Avoid hidden assumptions: all inputs, outputs, and constraints must be explicit.
- Prefer describing **state, invariants, and transitions** over describing “how the UI feels”.

Example of vague requirement (❌):

> "I want multi-client cursor position synchronization."

Example of acceptable spec statement (✅):

> "Upon loading, the canvas component sends the current brush info and cursor position  
> to the WebSocket backend at a sampling rate of 15 Hz.  
> Each client is identified by a unique `client_id` and a color.  
> Synchronization packets use JSON with the following schema: …"

### 1.2 Workflow for new features

When implementing a new feature:

1. Translate the user’s vague requirement into spec language as defined above.
2. Update or create the corresponding `*.spec.md` under `spec/`.
3. Only after the spec is updated and logically sound, implement or modify the code.
4. In the same change / PR, ensure the implementation matches the spec exactly.

If you are missing information (e.g. sync frequency, limits, edge cases), you must
ask for clarification **before** finalizing the spec and implementation.

### 1.3 Workflow for bug fixes

When fixing a bug:

1. Read the relevant spec first.
2. Walk through the logic defined in the spec to locate the expected behavior.
3. If the spec itself is logically incorrect or incomplete:
   - Update the spec to the corrected behavior.
   - Then update the code to match the corrected spec.
4. If the spec is correct:
   - Compare the current implementation with the spec.
   - Fix the implementation so that it conforms to the spec.

Under all circumstances, the **spec is the single source of truth** for expected behavior.

### 1.4 Spec and code review

During code review:

- If no spec exists for the subsystem:
  - Derive a spec from the existing code behavior.
  - Write it into a new `*.spec.md` under `spec/`.
  - Then review both the spec’s logical soundness and the code quality.
- Always check alignment between code and spec.
- If the spec is not low-entropy, concrete, and written as specified above:
  - Reject the change and request a spec rewrite.

---

## 2. Meaningful Comments Only

Add comments **if and only if** the code logic:

- requires **reasoning / deduction** to be understood, or
- is **counter-intuitive** compared to a naive implementation, or
- encodes a non-obvious **invariant, complexity guarantee, or trade-off**.

All comments must be in English.

Examples of acceptable comments:

- Explaining an invariant or a tricky loop condition.
- Documenting a non-obvious performance optimization and its trade-offs.
- Explaining why a “weird-looking” branch is necessary to maintain correctness.

Examples of unacceptable comments:

```ts
i++ // increment i  (❌ redundant)

// fetch data
const res = await fetch(url) // (❌ restates the obvious)
```

Docstrings for public APIs (explaining inputs, outputs, and behavior) are allowed and
encouraged; they are part of the interface specification, not “noise”.

⸻

3. CLI First

Whenever possible, you must prefer using CLI tools rather than manual edits. For example:
•Use npm add to install packages instead of manually editing package.json.
•Use shadcn add to install UI components instead of manually copying component code.
•Use drizzle-kit migrate to generate SQL migrations instead of hand-writing migration files.

If a CLI does not support the required operation:
1.Confirm in the documentation that there is no supported CLI workflow.
2.Perform the minimal necessary manual edits.
3.Ensure that running the CLI again will not overwrite or conflict with your manual changes.

Manual edits must remain an exception, not the default.
