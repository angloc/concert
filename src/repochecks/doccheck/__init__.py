"""Documentation rules: knowledge base, decision records, plan, links, size caps and policy hashes.

Each rule follows the documentation check specification of the repo-way-of-working skill and is numbered as there.
"""

import argparse
import hashlib
import os
import re
import tomllib
from pathlib import Path
from typing import NamedTuple

import yaml
from markdown_it import MarkdownIt

KB = Path("docs/knowledge")
DECISIONS = Path("docs/decisions")
AUDIENCE_DOCUMENTS = ["docs/user/README.md", "docs/installer/README.md"]
KNOWLEDGE_CAP = 20480
AGENTS_CAP = 12288
REQUIRED_CONCEPTS = ["architecture", "tech-stack", "open-questions"]
PLAN_FIELDS = ["Benefit", "Deliver", "Docs", "Publishes", "Acceptance", "Read first"]
STATUS = re.compile(r"^(Proposed|Accepted|Rejected|Withdrawn|Superseded by (\d{4}))$")
DECISION_NAME = re.compile(r"^(\d{4})-[a-z0-9]+(-[a-z0-9]+)*\.md$")
INDEX_ENTRY = re.compile(r"^\* \[[^\]]+\]\(([^)\s]+)\) - \S.*$")
YEAR = re.compile(r"\b(1[0-9]{3}|20[0-9]{2})\b")
PLATFORM_FILE = re.compile(r"^\* `([^`]+)` - \S")

_md = MarkdownIt("commonmark")


class Violation(NamedTuple):
    """One broken rule, with the rule number of the documentation check specification."""

    rule: int
    path: str
    message: str


class _Doc:
    """A parsed Markdown file: its headings, their anchors and its links."""

    def __init__(self, text: str):
        self.headings: list[tuple[int, str]] = []
        self.links: list[str] = []
        tokens = _md.parse(text)
        for i, token in enumerate(tokens):
            if token.type == "heading_open":
                self.headings.append((int(token.tag[1]), _plain(tokens[i + 1])))
            if token.type == "inline":
                for child in token.children or []:
                    if child.type == "link_open":
                        self.links.append(child.attrs["href"])
                    elif child.type == "image":
                        self.links.append(child.attrs["src"])
        self.anchors = _anchors([title for _, title in self.headings])


def _plain(inline) -> str:
    return "".join(
        child.content
        for child in inline.children or []
        if child.type in ("text", "code_inline")
    )


def _anchors(titles: list[str]) -> set[str]:
    """GitHub heading anchors, with -1, -2 suffixes for repeated titles."""
    seen: dict[str, int] = {}
    result = set()
    for title in titles:
        slug = re.sub(r"[^\w\- ]", "", title.lower()).replace(" ", "-")
        count = seen.get(slug, 0)
        seen[slug] = count + 1
        result.add(slug if count == 0 else f"{slug}-{count}")
    return result


class _Checker:
    def __init__(self, root: Path, dist: Path, version: str):
        self.root = root
        self.dist = dist
        self.version = version
        self.violations: list[Violation] = []
        self._docs: dict[Path, _Doc] = {}

    def fail(self, rule: int, path: Path | str, message: str) -> None:
        self.violations.append(Violation(rule, str(path), message))

    def doc(self, path: Path) -> _Doc:
        if path not in self._docs:
            self._docs[path] = _Doc(path.read_text())
        return self._docs[path]

    def rel(self, path: Path) -> Path:
        return path.relative_to(self.root)

    def knowledge_files(self) -> list[Path]:
        base = self.root / KB
        return sorted(base.rglob("*.md")) if base.is_dir() else []

    # Rule 1
    def frontmatter(self) -> None:
        for path in self.knowledge_files():
            rel = self.rel(path)
            if path.name == "log.md":
                self.fail(1, rel, "log.md is not allowed")
                continue
            text = path.read_text()
            meta = _frontmatter(text)
            if path.name == "index.md":
                if path.parent == self.root / KB:
                    if meta != {"okf_version": "0.2"}:
                        self.fail(
                            1,
                            rel,
                            'the root index needs frontmatter with only okf_version: "0.2"',
                        )
                elif meta is not None:
                    self.fail(
                        1, rel, "an index.md other than the root has no frontmatter"
                    )
                continue
            if not isinstance(meta, dict):
                self.fail(
                    1,
                    rel,
                    "a concept opens with a --- block that parses as a YAML mapping",
                )
                continue
            for key in ("type", "title", "description"):
                if not isinstance(meta.get(key), str) or not meta[key].strip():
                    self.fail(1, rel, f"{key} must be a non-empty string")
            if (
                isinstance(meta.get("description"), str)
                and "\n" in meta["description"].strip()
            ):
                self.fail(1, rel, "description must be one line")
            if "tags" in meta and not (
                isinstance(meta["tags"], list)
                and all(isinstance(t, str) for t in meta["tags"])
            ):
                self.fail(1, rel, "tags must be a list of strings")
            if "timestamp" in meta:
                self.fail(1, rel, "timestamp is not allowed; Git holds dates")

    # Rule 2
    def indexes(self) -> None:
        base = self.root / KB
        if not base.is_dir():
            return
        for directory in [base, *sorted(p for p in base.rglob("*") if p.is_dir())]:
            index = directory / "index.md"
            if not index.is_file():
                self.fail(
                    2, self.rel(directory), "every knowledge directory has an index.md"
                )
                continue
            listed = set()
            for line in index.read_text().splitlines():
                if not line.startswith(("* ", "- ")):
                    continue
                match = INDEX_ENTRY.match(line)
                if not match:
                    self.fail(
                        2,
                        self.rel(index),
                        f"entry not in the form * [Title](file.md) - description: {line}",
                    )
                    continue
                target = (directory / match.group(1)).resolve()
                if not target.is_file():
                    self.fail(
                        2, self.rel(index), f"entry does not resolve: {match.group(1)}"
                    )
                listed.add(target)
            for child in sorted(directory.iterdir()):
                expected = child / "index.md" if child.is_dir() else child
                if child.name == "index.md" or (
                    child.is_file() and child.suffix != ".md"
                ):
                    continue
                if expected.resolve() not in listed:
                    self.fail(2, self.rel(index), f"{child.name} is not listed")

    # Rule 3
    def links(self) -> None:
        files = [p for p in self.knowledge_files() if p.name != "log.md"]
        decisions = self.root / DECISIONS
        if decisions.is_dir():
            files += sorted(decisions.glob("*.md"))
        files += [
            self.root / name
            for name in (
                "AGENTS.md",
                "PROJECT_PLAN.md",
                "README.md",
                *AUDIENCE_DOCUMENTS,
            )
        ]
        files += sorted((self.root / "skills").glob("*/SKILL.md"))
        for path in files:
            if not path.is_file():
                continue
            for href in self.doc(path).links:
                if re.match(r"^[a-z][a-z0-9+.-]*:", href):
                    continue
                target, _, fragment = href.partition("#")
                resolved = (path.parent / target).resolve() if target else path
                if not resolved.exists():
                    self.fail(3, self.rel(path), f"link does not resolve: {href}")
                elif fragment and (
                    resolved.suffix != ".md"
                    or fragment not in self.doc(resolved).anchors
                ):
                    self.fail(3, self.rel(path), f"fragment matches no heading: {href}")

    # Rule 4
    def sizes(self) -> None:
        for path in self.knowledge_files():
            if path.stat().st_size > KNOWLEDGE_CAP:
                self.fail(
                    4,
                    self.rel(path),
                    f"knowledge files are at most {KNOWLEDGE_CAP} bytes",
                )
        agents = self.root / "AGENTS.md"
        if agents.is_file() and agents.stat().st_size > AGENTS_CAP:
            self.fail(4, "AGENTS.md", f"AGENTS.md is at most {AGENTS_CAP} bytes")

    # Rule 5
    def plan(self) -> None:
        path = self.root / "PROJECT_PLAN.md"
        if not path.is_file():
            self.fail(5, "PROJECT_PLAN.md", "the plan is missing")
            return
        added: set[str] = set()
        for title, body in _sections(path.read_text()):
            if title == "Deferred":
                continue
            fields = {}
            for line in body.splitlines():
                name, sep, value = line.partition(":")
                if sep and name in PLAN_FIELDS:
                    fields[name] = value.strip()
            for name in PLAN_FIELDS:
                if name not in fields:
                    self.fail(5, "PROJECT_PLAN.md", f"{title}: no {name} line")
            if "Read first" in fields and not _Doc(fields["Read first"]).links:
                self.fail(
                    5, "PROJECT_PLAN.md", f"{title}: Read first needs at least one link"
                )
            if "Docs" in fields:
                for entry in [e.strip() for e in fields["Docs"].split(",")]:
                    verb, _, doc = entry.partition(" ")
                    if entry == "none":
                        continue
                    if verb not in ("add", "change") or not doc:
                        self.fail(
                            5,
                            "PROJECT_PLAN.md",
                            f"{title}: Docs entry must be none, add <path> or change <path>: {entry!r}",
                        )
                    elif verb == "add":
                        added.add(doc)
                    elif not (self.root / doc).exists() and doc not in added:
                        self.fail(
                            5,
                            "PROJECT_PLAN.md",
                            f"{title}: change {doc}: no such file, and no earlier increment adds it",
                        )

    # Rule 6
    def years(self) -> None:
        for path in self.knowledge_files():
            for _, title in self.doc(path).headings:
                if YEAR.search(title):
                    self.fail(6, self.rel(path), f"heading contains a year: {title}")

    # Rule 7
    def decisions(self) -> None:
        directory = self.root / DECISIONS
        if not directory.is_dir():
            return
        records = sorted(directory.glob("*.md"))
        numbers: dict[str, Path] = {}
        for path in records:
            match = DECISION_NAME.match(path.name)
            if not match:
                self.fail(7, self.rel(path), "decision file names are NNNN-slug.md")
                continue
            if match.group(1) in numbers:
                self.fail(7, self.rel(path), f"number {match.group(1)} is already used")
            numbers[match.group(1)] = path
        for path in numbers.values():
            sections = dict(_sections(path.read_text()))
            for name in ("Status", "Context", "Decision", "Consequences"):
                if name not in sections:
                    self.fail(7, self.rel(path), f"no {name} section")
            if "Status" in sections:
                status = sections["Status"].strip()
                match = STATUS.match(status)
                if not match:
                    self.fail(7, self.rel(path), f"invalid status: {status!r}")
                elif match.group(2) and match.group(2) not in numbers:
                    self.fail(
                        7,
                        self.rel(path),
                        f"superseding record {match.group(2)} does not exist",
                    )

    # Rule 8
    def required(self) -> None:
        base = self.root / KB
        needed = REQUIRED_CONCEPTS + (["platforms"] if self.dist_files() else [])
        for name in needed:
            if not (base / f"{name}.md").is_file() and not (base / name).is_dir():
                self.fail(8, KB / name, f"the {name} concept is required")

    # Rule 9
    def dist_files(self) -> set[str]:
        if not self.dist.is_dir():
            return set()
        return {
            p.relative_to(self.dist).as_posix()
            for p in self.dist.rglob("*")
            if p.is_file()
        }

    def distribution(self) -> None:
        present = self.dist_files()
        platforms = self.root / KB / "platforms.md"
        if not platforms.is_file():
            if present:
                self.fail(
                    9, "dist", "dist/ holds files but there is no platforms concept"
                )
            return
        listed = []
        for line in platforms.read_text().splitlines():
            match = PLATFORM_FILE.match(line)
            if match:
                listed.append(match.group(1).replace("<version>", self.version))
        covered = set()
        for entry in listed:
            if entry.endswith("/"):
                found = {f for f in present if f.startswith(entry)}
                if not found:
                    self.fail(
                        9, "dist", f"listed directory is missing or empty: {entry}"
                    )
                covered |= found
            elif entry in present:
                covered.add(entry)
            else:
                self.fail(9, "dist", f"listed file is missing: {entry}")
        if listed:
            covered.add("SHA256SUMS")
            if "SHA256SUMS" not in present:
                self.fail(9, "dist", "SHA256SUMS is missing")
        for extra in sorted(present - covered):
            self.fail(9, "dist", f"file not listed in platforms: {extra}")

    # Rule 10
    def policy(self) -> None:
        config = self.root / "pyproject.toml"
        recorded = {}
        if config.is_file():
            recorded = (
                tomllib.loads(config.read_text())
                .get("tool", {})
                .get("doccheck", {})
                .get("policy_hashes", {})
            )
        present = ["POLICY.md"] if (self.root / "POLICY.md").is_file() else []
        present += sorted(
            p.relative_to(self.root).as_posix()
            for p in (self.root / "policy").glob("*")
            if p.is_file()
        )
        for name in sorted(set(present) | set(recorded)):
            path = self.root / name
            if name not in recorded:
                self.fail(10, name, "no SHA-256 recorded for this policy file")
            elif not path.is_file():
                self.fail(10, name, "recorded policy file is missing")
            elif hashlib.sha256(path.read_bytes()).hexdigest() != recorded[name]:
                self.fail(
                    10,
                    name,
                    "SHA-256 differs from the recorded value: installed policy files are never edited",
                )


def _frontmatter(text: str):
    """The parsed frontmatter, None when there is no --- block, or False when the block is broken."""
    if not text.startswith("---\n"):
        return None
    end = text.find("\n---\n", 3)
    if end < 0:
        return False
    try:
        return yaml.safe_load(text[4:end]) or {}
    except yaml.YAMLError:
        return False


def _sections(text: str) -> list[tuple[str, str]]:
    """Level-two sections as (title, body); a plan increment's title is its id."""
    result = []
    for block in re.split(r"(?m)^## ", text)[1:]:
        title, _, body = block.partition("\n")
        result.append((title.split(":")[0].strip(), body))
    return result


def check(root: Path, dist: Path, version: str) -> list[Violation]:
    """Return every violation of the documentation rules in the repository at root."""
    checker = _Checker(root.resolve(), dist.resolve(), version)
    for rule in (
        checker.frontmatter,
        checker.indexes,
        checker.links,
        checker.sizes,
        checker.plan,
        checker.years,
        checker.decisions,
        checker.required,
        checker.distribution,
        checker.policy,
    ):
        rule()
    return checker.violations


def main(argv: list[str] | None = None) -> int:
    """Command-line entry point: doccheck ROOT DIST [--version VERSION]."""
    parser = argparse.ArgumentParser(
        prog="doccheck", description="Check the repository's documentation rules."
    )
    parser.add_argument("root", type=Path)
    parser.add_argument("dist", type=Path)
    parser.add_argument(
        "--version",
        help="the application version; default: VERSION_TAG without the leading v",
    )
    args = parser.parse_args(argv)
    version = args.version or os.environ.get("VERSION_TAG", "v0.0.0").removeprefix("v")
    violations = check(args.root, args.dist, version)
    for v in violations:
        print(f"rule {v.rule}: {v.path}: {v.message}")
    return 1 if violations else 0
