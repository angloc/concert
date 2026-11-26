# Pull requests and decisions

Read before opening or reviewing a pull request, recording a decision or taking an exception.

## Pull requests

Every pull request leaves the repository working, coherent and releasable. Each pull request delivers one observable increment from the plan, or one maintenance change: a dependency update, a bug fix, or a correction to tooling or documents. Keep each increment as small as practical. Do not merge partial implementation, knowingly broken behaviour or speculative scaffolding that has no current use. The pull request leaves PROJECT_PLAN.md accurate.

The pull request description states the increment (or the maintenance reason), the red/green evidence, and, for a new dependency, the alternatives considered (including the standard library and existing dependencies), the maintenance state and the compatibility of the licence with the licence of the repository.

A pull request that changes a deliverable for a platform that CI cannot test merges only after a human reviewer approves the pull request, having tested the build from the pull request on that platform.

Each dependency update is an ordinary pull request. The update passes `make verify` and review, and changes `tech-stack` where a recorded version moves.

## Decisions

Record each significant decision in `docs/decisions/NNNN-slug.md`. Take the number after the highest number in use. Numbers may have gaps. Never reuse a number. Each record has the sections Status (`Proposed`, `Accepted`, `Rejected`, `Withdrawn` or `Superseded by NNNN`), Context, Decision and Consequences. The Consequences section names the module that encapsulates the decision, or states that the decision is project-wide.

Never edit an accepted record except the status, and except to repair a link or a clerical error that leaves the decision unchanged. A reversed decision gets a new record, and the old record is marked superseded. A decision record explains why; the knowledge base states the current result. Delivery history belongs to Git: commits, pull requests and release notes.

## Exceptions

An exception to the policy needs the approval of the user and an Accepted decision record. The Consequences section of the record names the policy rule and the scope of the exception. Within that scope, the record overrides the policy. AGENTS.md links to each such record.
