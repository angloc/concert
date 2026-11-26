"""Fixtures for the repository checks: a minimal repository that satisfies every documentation rule."""

import hashlib
from pathlib import Path

import pytest

from repochecks.doccheck import check

VERSION = "1.2.3"

_KB = "docs/knowledge"


def _concept(type_: str, title: str, body: str = "") -> str:
    return f"---\ntype: {type_}\ntitle: {title}\ndescription: What {title.lower()} holds.\n---\n\n# {title}\n{body}"


def _decision(status: str) -> str:
    return f"# Decision\n\n## Status\n\n{status}\n\n## Context\n\nWhy.\n\n## Decision\n\nWhat.\n\n## Consequences\n\nProject-wide.\n"


def valid_files() -> dict[str, str]:
    """Return the files of a repository that passes every documentation rule."""
    files = {
        "POLICY.md": "# Development policy\n",
        "policy/python.md": "# Python profile\n",
        "AGENTS.md": "# Agent rules\n\nRead [the policy](POLICY.md).\n",
        "README.md": "# Demo\n\nSee the [plan](PROJECT_PLAN.md#i1-first-step) and the [knowledge base](docs/knowledge/index.md).\n\n```\n[not a link](missing.md)\n```\n\nExternal [site](https://example.com).\n",
        "PROJECT_PLAN.md": (
            "# Project plan\n\n"
            "## I1: First step\n"
            "Benefit: one thing.\nDeliver:\n- it\nDocs: add docs/user/README.md\nPublishes: none\n"
            "Acceptance:\n- it works\nRead first: [architecture](docs/knowledge/architecture.md)\n\n"
            "## I2: Second step\n"
            "Benefit: another.\nDeliver: more\nDocs: change docs/user/README.md, change README.md\nPublishes: none\n"
            "Acceptance: it works\nRead first: [tech stack](docs/knowledge/tech-stack.md)\n\n"
            "## Deferred\n\nNothing.\n"
        ),
        f"{_KB}/index.md": (
            '---\nokf_version: "0.2"\n---\n\n# Knowledge base\n\n'
            "* [Architecture](architecture.md) - the modules\n"
            "* [Tech stack](tech-stack.md) - the choices\n"
            "* [Open questions](open-questions.md) - the unknowns\n"
            "* [Platforms](platforms.md) - the files\n"
            "* [Topic](topic/index.md) - grouped concepts\n"
        ),
        f"{_KB}/architecture.md": _concept(
            "architecture",
            "Architecture",
            "\n## Modules\n\nSee [the glossary](topic/glossary.md#terms) and [decision 1](../decisions/0001-first.md).\n",
        ),
        f"{_KB}/tech-stack.md": _concept("reference", "Tech stack"),
        f"{_KB}/open-questions.md": "---\ntype: open-questions\ntitle: Open questions\ndescription: Unknowns.\ntags: [risk, plan]\n---\n\n# Open questions\n",
        f"{_KB}/platforms.md": _concept(
            "reference",
            "Platforms",
            "\n## All platforms\n\n* `demo_<version>.html` - the page\n* `site/` - the site\n",
        ),
        f"{_KB}/topic/index.md": "# Topic\n\n* [Glossary](glossary.md) - terms\n",
        f"{_KB}/topic/glossary.md": _concept(
            "glossary", "Glossary", "\n## Terms\n\nWords.\n"
        ),
        "docs/decisions/0001-first.md": _decision("Superseded by 0002"),
        "docs/decisions/0002-second.md": _decision("Accepted"),
        "wip/scratch.md": "[broken](nowhere.md)\n",
        f"dist/demo_{VERSION}.html": "<!doctype html>\n",
        "dist/site/index.html": "<!doctype html>\n",
        "dist/SHA256SUMS": "sums\n",
    }
    hashes = ", ".join(
        f'"{name}" = "{hashlib.sha256(files[name].encode()).hexdigest()}"'
        for name in ("POLICY.md", "policy/python.md")
    )
    files["pyproject.toml"] = f"[tool.doccheck]\npolicy_hashes = {{ {hashes} }}\n"
    return files


def write_repo(root: Path, files: dict[str, str | None]) -> Path:
    """Write files under root; a value of None means the file is absent."""
    for name, text in files.items():
        if text is None:
            continue
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
    return root


@pytest.fixture
def files():
    """Return a fresh copy of the valid repository's files."""
    return valid_files()


@pytest.fixture
def run(tmp_path):
    """Return a function that writes the given files and returns their violations."""

    def go(files: dict[str, str | None], version: str = VERSION) -> list:
        root = write_repo(tmp_path / "repo", files)
        return check(root, root / "dist", version)

    return go


@pytest.fixture
def written(tmp_path):
    """Return a function that writes the given files and returns the repository root."""

    def go(files: dict[str, str | None]) -> Path:
        return write_repo(tmp_path / "repo", files)

    return go
