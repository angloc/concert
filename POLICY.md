# Development policy

This policy (`POLICY.md`) governs development in a GitHub repository built with Make. Every repository installs the same text verbatim, with one language profile in `policy/<language>.md` for each language. Three add-ons in `policy/` hold task-specific rules. Read the add-on before the task:

| Task | Read |
| --- | --- |
| Open or review a pull request, record a decision, take an exception | `policy/pull-request.md` |
| Change CI, the `package` target, `dist/`, a tag or a release | `policy/release.md` |
| Add or change knowledge-base content or structure | `policy/knowledge.md` |

The policy is normative. Where AGENTS.md or another document disagrees with the policy, the policy wins, except where an approved exception allows otherwise. AGENTS.md holds only what the policy lacks: the project description, project mandates and project-specific commands.

A deliverable is anything that a release gives to users: a built file or image, or a publication (a deployed site, a pushed container image). The set of deliverables may be empty. An application is a deliverable that a user runs: a command-line program, a service or a site. Repository tooling that no release ships is not an application. The delivered interface is how users reach the deliverables: the command line, the public API or the pages. Rules that name an application apply only where the repository has one.

## Purpose

A developer or agent who knows nothing about a project should find, in a fixed place, what is true now, what is planned and why decisions were made. A change to code must not make a document false.

One place holds each kind of statement: `AGENTS.md` (project description and mandates), `docs/knowledge/` (what is true now, and the approved design; the `architecture` concept links to the code), `PROJECT_PLAN.md` (what comes next), `docs/decisions/` (why), audience documents (how to install and use the product) and `README.md` (the entry point).

The knowledge base follows Open Knowledge Format (OKF) v0.2: Markdown concept files with frontmatter, and an `index.md` that lists each directory. Local rules add to OKF (`policy/knowledge.md`). Tools check what tools can check: tests, links, structure and hashes. A reviewer judges the rest.

## 1. Apply four coding rules

For every change:

1. **Think before coding.** Understand the request, inspect the existing system and expose important assumptions.
   - State assumptions. If the request is unclear, ask. Do not guess.
   - If several readings are possible, present the readings. Do not choose one reading silently.
   - If a simpler approach exists, say so. Push back when warranted.
   - State the evidence and the expected effect before changing anything.
   - Search code for what the task touches. Do not read the source tree wholesale.
2. **Choose the smallest sufficient solution.** Do not solve problems that are not part of the requirement.
   - Write the minimum code that solves the stated problem.
   - Add no unrequested feature, single-use abstraction, speculative configurability or handling of impossible cases.
3. **Make surgical changes.** Change only what the increment needs.
   - Every changed line traces to the request, or to a policy rule that the request triggers.
   - Match the existing style. Make no drive-by refactoring, reformatting or comment edits.
   - Remove imports, variables and functions that your change orphaned. Mention unrelated dead code; do not delete unrelated dead code.
4. **Verify the result.** Define observable success and prove success before completion.
   - Before starting, turn the task into verifiable success criteria, such as a failing test that should pass.
   - Loop until the criteria are met and `make verify` passes.

## 2. Use TDD and simple design

For behaviour-changing production code, use test-driven development:

1. write a failing test, run the test, and confirm that the failure shows the missing behaviour; a setup or prerequisite failure is not a red test;
2. report the failing command and the result before implementing;
3. write the minimum code that passes the test, run the same test, and confirm that the test passes;
4. refactor while tests stay green.

Write a regression test first for a bug fix. Never claim retrospective red/green evidence. If test-first was missed, report the omission plainly. A documentation-only change needs no failing test.

Apply DRY (state each piece of knowledge once), KISS (keep each design simple) and YAGNI (build only what the plan needs).

Design modules after Parnas. A module hides one design decision, chosen because the decision is difficult or likely to change, and encapsulates all the consequences of the decision. Decompose by decision, not by processing step. Name each module for the decision that the module hides.

**Layout.** The directory layout shows the module structure: one directory for each design module. Entry points form a thin layer that only wires modules together. The language profile gives the unit of a module and the conventions of the language.

**Comments.** A comment states the current purpose of the code, or the reason for a choice that the code does not show. A comment never narrates history: not an earlier version, not the change that introduced the code, not who wrote the code. A comment may explain a current need, such as compatibility with an older file format or protocol. Keep a required copyright, licence or attribution notice. Delete a comment when the comment stops being true.

At security or authority boundaries, prefer least privilege and fail closed. Never commit a secret, and never write a secret to a log, a test fixture or a deliverable; rotate any secret that reaches Git history. Prefer idempotent operations where repetition is plausible.

## 3. Reuse before building

Before writing a capability, check the standard library, the existing dependencies and established tools. Do not reimplement an existing capability, and do not add a dependency that the standard library or an existing dependency replaces. Choose the smallest dependency that does the job.

A new dependency needs a pinned version in the manifest or lock file. The pull request description records the alternatives considered (`policy/pull-request.md`). A dependency that decides how an architectural component is built (a framework, a datastore) is a major choice: it gets a line in `tech-stack`. `make verify` fails on a vulnerability that the vulnerability check of the language profile reports, unless a decision record accepts that vulnerability. Custom code where an established tool exists needs a decision record.

## 4. Keep code, tests and documentation coherent

Code, tests, documentation and project state must describe the same system. A change is incomplete if the change makes any of them materially false. Update all of them in the same commit. Use `wip/` for ephemeral material; never rely on `wip/` as project state, and never ship anything from `wip/`.

Where a repository has an audience, the repository has a human document and an agent document for the audience:

| Audience | Human document | Agent document |
| --- | --- | --- |
| User (operator) | `docs/user/README.md` | `skills/operate/SKILL.md` |
| Installer | `docs/installer/README.md` | `skills/install/SKILL.md` |
| Developer | `docs/knowledge/` and the developer section of `README.md` | `AGENTS.md` |

Names that the source documents of the repository give replace these paths. Create a document only when an increment first needs the document. Write each procedure once, in the human document. The agent document links to the procedure and adds only when to use the procedure and how to read the results.

Update the README when user-visible behaviour or entry points change. The developer section of `README.md` says how to start (open the devcontainer, or run `make install` in a dedicated virtual machine) and documents each added Make target. Update the knowledge base in the same change that makes a concept untrue. Update PROJECT_PLAN.md as section 8 requires.

## 5. Test delivered behaviour

Test behaviour through public interfaces: the public interface of each module, and the delivered interface. Test each critical workflow end to end against the built deliverable. Do not test private internals. Help text, the reported version, written files and exit status are fair subjects for tests.

Do not mock or fake any feature of the application. Substitute only external boundaries, at the process or network boundary: third-party APIs, external processes and remote model services. A clock may be substituted through an interface of the code. Exercise substituted behaviour that matters to the product in a realistic integration or system test.

Every test is self-contained. A test that touches the file system or the environment makes a temporary working directory of the test's own, passes the test's own environment to the code under test, and never changes project files or the environment of the test process. A skipped test is never a pass. A missing tool or prerequisite fails the run.

**Test code.** Test code follows the coding rules of section 1, and DRY applies with particular force. When a pattern recurs in test setup, test configuration or test execution, move the pattern into a shared fixture or helper function, so that the test code stays small and the tests run fast. Build an expensive fixture once and share the fixture across tests. A shared fixture is read-only, or is rebuilt for each test that changes the fixture, so that every test stays self-contained. Extract a helper when a pattern has recurred, not in anticipation. Use the shared-fixture mechanism of the language profile.

**Coverage.** Each language profile that names a coverage command applies a floor of 95% statement coverage to the production code and development tooling that the repository owns in that language (not tests, generated code or vendored code), measured by that command. Coverage comes from in-process tests or from a separate instrumented build; never release an instrumented build. Platform-specific code that CI cannot run lives in a module for that platform and is excluded by the mechanism of the profile. No other code is excluded.

## 6. Use the Makefile as the development interface

Developers, agents and CI call Make targets instead of repeating the commands behind the targets. The standard targets are `install`, `verify` (the canonical pre-completion check), `package`, `test`, `fmt` and `docs-check`. A repository may add further targets, including application-specific targets. An added target never changes the meaning of a standard target.

Pin each tool version once. Where the ecosystem keeps an authoritative pin (the `toolchain` line of `go.mod`, a `uv` lock file), Make reads that pin. Pin every other tool in one block at the top of the Makefile.

`install` sets up the programs that every other target calls. `install` changes the machine, so `install` refuses to run unless `CI` is `true`, `/.dockerenv` exists, or `DEDICATED_ENVIRONMENT` is `1`. A developer never runs `install` on a personal host: work in the devcontainer, or in a dedicated virtual machine that provisioning sets up with `DEDICATED_ENVIRONMENT=1`. The base image of the devcontainer must provide `make`, `bash` and the package manager that `install` uses. `install` adds the toolchains of the secondary languages.

`verify` never rewrites tracked files. `verify` runs the formatter in check mode, the linter, the vulnerability check, `test`, the coverage gate and `docs-check`, and omits any part that the repository has nothing to check for. `fmt` rewrites files. `test` runs `package`, then the module tests and the end-to-end tests that drive the deliverables in `dist/`, applies the timeout of the language profile, and fails when the runner reports a skipped test. `package` builds every deliverable once, into `dist/`. A missing tool or prerequisite fails the target. A skip never counts as success.

## 7. Follow the language profile

Each language in the repository has a profile, installed verbatim at `policy/<language>.md`. Before changing code, tests, build or dependencies in a language, read the profile. Record the languages in `tech-stack`.

A profile states the formatter and linter; the test runner, timeout and skipped-test report; the coverage command and the platform exclusion; platform test selection; the vulnerability check; code layout, comments and shared test fixtures; the `install` bootstrap; and how `package` injects the application version. A profile marks an item that the language lacks as `none`. A profile that opens with `Scope: supporting scripts` covers scripts inside a repository whose tooling (checker, tag script, tests) is written in another language. For a language without a profile, propose a profile and confirm the profile with the user.

Where the repository has an application, the tag is the one source of the application version. The application version is the tag without the leading `v`, verbatim (`1.2.3`, or `1.2.3-rc.1`). Each profile says how `package` injects the application version. An ecosystem-required normalisation applies to package metadata and file names only. A command-line application reports the application version for `--version`; another application reports the application version through a documented interface. A test builds the application with a known tag and asserts the reported version.

## 8. Maintain a living plan

Read PROJECT_PLAN.md before work. PROJECT_PLAN.md is forward-looking: the ordered delivery increments, then a `## Deferred` section, and nothing else. Each increment is a section:

```
## <stable id>: <title>
Benefit: one sentence, the measurable gain to the user.
Deliver: the list.
Docs: the audience documents the increment adds or changes, each written add <path> or change <path>, or none.
Publishes: the deliverables the increment adds, changes or retires, or none.
Acceptance: checkable conditions.
Read first: links to knowledge concepts.
```

Increments have stable ids. Never renumber or reuse an id. Delete a finished increment. The plan is not a changelog. Risks and open questions belong in the knowledge base, and rationale belongs in decision records.

## 9. Use the knowledge base

Navigate by index. Start at `docs/knowledge/index.md`, or at the `Read first:` links of the current increment. Follow index entries to the concepts that the task needs, judging each concept by the description. Do not read the knowledge base wholesale.

The knowledge base describes the current system and the approved design. Mark each capability that is designed but not built as "not yet built". Describe the current state, not edit history. Headings hold no dates, versions or years. The concepts `architecture`, `tech-stack` and `open-questions` always exist; `platforms` exists where the set of deliverables is not empty.

`architecture` explains the role of each module in text and in Mermaid diagrams of structure and behaviour, and links to the code of each module (`policy/knowledge.md`).

## 10. Use clear text

Human-facing text (documentation, CLI help, errors, release notes) follows the Oxford Guide to Plain English in substance: plain words, active voice, the important point first, short sentences, concrete wording.

Agent-facing text (AGENTS.md, agent documents, skills, prompts) uses caveman-lite style: short direct sentences, commands and concrete nouns, one requirement per sentence, no filler. Clarity comes before brevity.

Agent-facing text and POLICY.md avoid ambiguous references. Repeat the noun wherever a pronoun, or a phrase such as "the next", could bind to more than one noun. Use British spelling in prose and comments. Identifiers taken from external APIs keep the spelling of the API.

## 11. Complete the work

`make verify` enforces the mechanical rules and the checks of the language profiles. A reviewer, human or agent, also rejects a change that adds speculative code, scatters the consequences of one design decision across modules, rests on an unstated assumption, claims red/green evidence after the fact, or leaves a document that disagrees with the application (for example, a command in the help output that the user document omits).

A change is done when the acceptance criteria hold, red/green evidence is reported where test-first development applies, `make verify` passes, realistic deployment behaviour has been exercised where relevant, and code, tests, documents and plan agree.
