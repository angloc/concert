# Knowledge base structure

Read before adding or changing knowledge-base content or structure.

The knowledge base lives in `docs/knowledge/` and follows Open Knowledge Format (OKF) v0.2 with local rules: links are relative paths, where OKF recommends `/` links; a broken link fails the documentation check; indexes, frontmatter, size caps and the concept list below are mandatory.

## Concepts and indexes

Each concept is one Markdown file that opens with YAML frontmatter: `type` (non-empty and descriptive, such as `architecture`, `evidence`, `open-questions`, `glossary` or `reference`), `title`, and `description` (one line that says what the concept holds and when to read the concept). Do not add `timestamp`; Git holds dates. A topic directory groups concepts under one name, with an `index.md`.

Reserved `index.md` files have no frontmatter, except the root `index.md`, which carries `okf_version: "0.2"` and no other frontmatter. An `index.md` lists every concept and every subdirectory in the same directory, as bullets of the form `* [Title](file.md) - description` for a concept and `* [Title](subdir/index.md) - description` for a subdirectory. Do not use `log.md`.

Keep every file at most 20,480 bytes. Split a larger concept into concepts. Add a topic directory only when a directory would hold more than eight files. Do not reorganise the knowledge base during unrelated work. Prefer the smallest local change to a taxonomic redesign. Use cross-links instead of duplicated explanations.

## Required concepts

Each concept below exists, as a concept file or as a topic directory of the same name. Update the concept in the same change that makes the concept untrue.

| Topic | Concept | Update when |
| --- | --- | --- |
| Architecture (see below) | `architecture` | a change alters a module, a boundary, the state layout or a trust boundary |
| Tech stack: for each architectural component, the language, runtime, framework, datastore or tool chosen, with one line on why. State no versions and list no dependencies; the manifests and the Makefile hold those | `tech-stack` | a major implementation choice is made, replaced or dropped |
| Platforms (`policy/release.md`) | `platforms` | a deliverable or target platform is added, removed or renamed |
| Open questions and known risks | `open-questions` | a question is raised or resolved; a resolved question that is a significant decision becomes a decision record |

## Architecture

`architecture` explains how the parts of the system fit together, in text and in Mermaid diagrams of structure and behaviour. For each module, the concept states the design decision that the module hides, the role that the module plays in the architecture, the interface, the decision record and the path of the code. The link to the code of an implemented module is a relative link to the directory of the module, so that a reader goes from a design statement to the code. A module that is designed but not built gets its intended path as inline code, labelled "not yet built", and no link. A reviewer checks that every module has an entry.

Static diagrams show structure: the modules and the dependencies between the modules (a Mermaid flowchart or class diagram). Dynamic diagrams show behaviour: the main interactions (a sequence diagram) and the life cycle of each stateful component (a state diagram). The text states the meaning, and the diagrams show the relationships. Each diagram has a one-sentence caption. Draw a diagram where structure or behaviour exists and the diagram explains more than the text does; a small system needs few diagrams. Keep a diagram to about a dozen nodes, and split a larger diagram. Write each diagram as a Mermaid code block in the concept file.

Describe the current state and the approved design, and mark each capability that is designed but not built as "not yet built". Do not narrate changes. Headings hold no dates, versions or years, so that anchors stay stable.
